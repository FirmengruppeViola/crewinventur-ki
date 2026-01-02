from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.core.supabase import get_supabase
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemOut,
    InventoryItemUpdate,
    InventorySessionCreate,
    InventorySessionOut,
    InventorySessionUpdate,
)

router = APIRouter()


def _recalculate_totals(supabase, session_id: str):
    items = (
        supabase.table("inventory_items")
        .select("total_price")
        .eq("session_id", session_id)
        .execute()
    ).data or []
    total_items = len(items)
    total_value = sum(item.get("total_price") or 0 for item in items)

    supabase.table("inventory_sessions").update(
        {"total_items": total_items, "total_value": total_value}
    ).eq("id", session_id).execute()


@router.get("/inventory/sessions", response_model=list[InventorySessionOut])
def list_sessions(current_user=Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("inventory_sessions")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


@router.post(
    "/inventory/sessions",
    response_model=InventorySessionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_session(payload: InventorySessionCreate, current_user=Depends(get_current_user)):
    supabase = get_supabase()

    previous = (
        supabase.table("inventory_sessions")
        .select("id")
        .eq("user_id", current_user.id)
        .eq("location_id", payload.location_id)
        .eq("status", "completed")
        .order("completed_at", desc=True)
        .limit(1)
        .execute()
    )
    previous_id = previous.data[0]["id"] if previous.data else None

    response = (
        supabase.table("inventory_sessions")
        .insert(
            {
                "user_id": current_user.id,
                "location_id": payload.location_id,
                "name": payload.name,
                "previous_session_id": previous_id,
            }
        )
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session creation failed",
        )
    return data


@router.get("/inventory/sessions/{session_id}", response_model=InventorySessionOut)
def get_session(session_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("inventory_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return data


@router.put("/inventory/sessions/{session_id}", response_model=InventorySessionOut)
def update_session(
    session_id: str,
    payload: InventorySessionUpdate,
    current_user=Depends(get_current_user),
):
    supabase = get_supabase()
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update",
        )

    response = (
        supabase.table("inventory_sessions")
        .update(update_data)
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return data


@router.post("/inventory/sessions/{session_id}/complete", response_model=InventorySessionOut)
def complete_session(session_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()

    session_resp = (
        supabase.table("inventory_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    session = session_resp.data[0] if session_resp.data else None
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    previous_id = session.get("previous_session_id")
    if not previous_id:
        previous = (
            supabase.table("inventory_sessions")
            .select("id")
            .eq("user_id", current_user.id)
            .eq("location_id", session["location_id"])
            .eq("status", "completed")
            .order("completed_at", desc=True)
            .limit(1)
            .execute()
        )
        previous_id = previous.data[0]["id"] if previous.data else None

    current_items = (
        supabase.table("inventory_items")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    ).data or []

    previous_items = {}
    if previous_id:
        prev_data = (
            supabase.table("inventory_items")
            .select("product_id, quantity")
            .eq("session_id", previous_id)
            .execute()
        ).data or []
        previous_items = {item["product_id"]: item["quantity"] for item in prev_data}

    for item in current_items:
        prev_qty = previous_items.get(item["product_id"])
        difference = None
        if prev_qty is not None:
            difference = float(item["quantity"]) - float(prev_qty)
        supabase.table("inventory_items").update(
            {
                "previous_quantity": prev_qty,
                "quantity_difference": difference,
            }
        ).eq("id", item["id"]).execute()

    completed_at = datetime.now(timezone.utc).isoformat()
    update_resp = (
        supabase.table("inventory_sessions")
        .update(
            {
                "status": "completed",
                "completed_at": completed_at,
                "previous_session_id": previous_id,
            }
        )
        .eq("id", session_id)
        .execute()
    )

    _recalculate_totals(supabase, session_id)

    data = update_resp.data[0] if update_resp.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session completion failed",
        )
    return data


@router.get("/inventory/sessions/{session_id}/items", response_model=list[InventoryItemOut])
def list_session_items(session_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    session = (
        supabase.table("inventory_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not session.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    response = (
        supabase.table("inventory_items")
        .select("*")
        .eq("session_id", session_id)
        .order("scanned_at", desc=True)
        .execute()
    )
    return response.data or []


@router.post(
    "/inventory/sessions/{session_id}/items",
    response_model=InventoryItemOut,
    status_code=status.HTTP_201_CREATED,
)
def add_session_item(
    session_id: str,
    payload: InventoryItemCreate,
    current_user=Depends(get_current_user),
):
    supabase = get_supabase()
    session = (
        supabase.table("inventory_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not session.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    unit_price = payload.unit_price
    if unit_price is None:
        product = (
            supabase.table("products")
            .select("last_price")
            .eq("id", payload.product_id)
            .eq("user_id", current_user.id)
            .execute()
        )
        unit_price = product.data[0]["last_price"] if product.data else 0

    existing = (
        supabase.table("inventory_items")
        .select("id, quantity")
        .eq("session_id", session_id)
        .eq("product_id", payload.product_id)
        .execute()
    )
    if existing.data:
        existing_item = existing.data[0]
        new_qty = float(existing_item["quantity"]) + float(payload.quantity)
        update_resp = (
            supabase.table("inventory_items")
            .update({"quantity": new_qty, "unit_price": unit_price})
            .eq("id", existing_item["id"])
            .execute()
        )
        _recalculate_totals(supabase, session_id)
        return update_resp.data[0]

    response = (
        supabase.table("inventory_items")
        .insert(
            {
                "session_id": session_id,
                "product_id": payload.product_id,
                "quantity": payload.quantity,
                "unit_price": unit_price,
                "notes": payload.notes,
                "scan_method": payload.scan_method or "manual",
                "ai_confidence": payload.ai_confidence,
            }
        )
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Item creation failed",
        )

    _recalculate_totals(supabase, session_id)
    return data


@router.put("/inventory/items/{item_id}", response_model=InventoryItemOut)
def update_item(item_id: str, payload: InventoryItemUpdate, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    item_resp = (
        supabase.table("inventory_items")
        .select("id, session_id")
        .eq("id", item_id)
        .execute()
    )
    if not item_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    session_id = item_resp.data[0]["session_id"]
    session_resp = (
        supabase.table("inventory_sessions")
        .select("user_id")
        .eq("id", session_id)
        .execute()
    )
    if not session_resp.data or session_resp.data[0]["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update",
        )
    response = (
        supabase.table("inventory_items")
        .update(update_data)
        .eq("id", item_id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    if session_id:
        _recalculate_totals(supabase, session_id)
    return data


@router.delete("/inventory/items/{item_id}", response_model=InventoryItemOut)
def delete_item(item_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    item_resp = (
        supabase.table("inventory_items")
        .select("id, session_id")
        .eq("id", item_id)
        .execute()
    )
    if not item_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    session_id = item_resp.data[0]["session_id"]
    session_resp = (
        supabase.table("inventory_sessions")
        .select("user_id")
        .eq("id", session_id)
        .execute()
    )
    if not session_resp.data or session_resp.data[0]["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )

    response = (
        supabase.table("inventory_items")
        .delete()
        .eq("id", item_id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    if session_id:
        _recalculate_totals(supabase, session_id)
    return data
