from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_current_user_context, UserContext
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


def _verify_session_access(
    supabase, session_id: str, current_user: UserContext
) -> dict:
    """
    Verify user has access to session.
    Returns session data if authorized, raises HTTPException otherwise.
    """
    response = (
        supabase.table("inventory_sessions").select("*").eq("id", session_id).execute()
    )
    session = response.data[0] if response.data else None

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    if current_user.is_owner:
        if session["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )
    else:
        # Manager: check if session's location is in allowed locations
        if session["location_id"] not in current_user.allowed_location_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )
        # Also verify session belongs to their owner
        if session["user_id"] != current_user.effective_owner_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )

    return session


@router.get("/inventory/sessions", response_model=list[InventorySessionOut])
def list_sessions(current_user: UserContext = Depends(get_current_user_context)):
    """
    List inventory sessions.
    - Owner: All their sessions
    - Manager: Only sessions for their assigned locations
    """
    supabase = get_supabase()

    if current_user.is_owner:
        response = (
            supabase.table("inventory_sessions")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
    else:
        # Manager: filter by allowed locations
        if not current_user.allowed_location_ids:
            return []
        response = (
            supabase.table("inventory_sessions")
            .select("*")
            .eq("user_id", current_user.effective_owner_id)
            .in_("location_id", current_user.allowed_location_ids)
            .order("created_at", desc=True)
            .execute()
        )

    return response.data or []


@router.post(
    "/inventory/sessions",
    response_model=InventorySessionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    payload: InventorySessionCreate,
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    Create a new inventory session.
    - Owner: Can create for any of their locations
    - Manager: Can only create for assigned locations
    """
    supabase = get_supabase()

    # Verify location access
    if current_user.is_owner:
        # Verify location belongs to owner
        loc_check = (
            supabase.table("locations")
            .select("id")
            .eq("id", payload.location_id)
            .eq("user_id", current_user.id)
            .execute()
        )
        if not loc_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )
        owner_id = current_user.id
    else:
        # Manager: verify location is in their allowed list
        if payload.location_id not in current_user.allowed_location_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this location",
            )
        owner_id = current_user.effective_owner_id

    previous = (
        supabase.table("inventory_sessions")
        .select("id")
        .eq("user_id", owner_id)
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
                "user_id": owner_id,  # Always use owner's ID for data ownership
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
def get_session(
    session_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Get a session by ID."""
    supabase = get_supabase()
    return _verify_session_access(supabase, session_id, current_user)


@router.put("/inventory/sessions/{session_id}", response_model=InventorySessionOut)
def update_session(
    session_id: str,
    payload: InventorySessionUpdate,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Update a session."""
    supabase = get_supabase()

    # Verify access
    _verify_session_access(supabase, session_id, current_user)

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
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return data


@router.post(
    "/inventory/sessions/{session_id}/complete", response_model=InventorySessionOut
)
def complete_session(
    session_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Complete an inventory session and calculate differences."""
    supabase = get_supabase()

    # Verify access and get session
    session = _verify_session_access(supabase, session_id, current_user)

    # Try to use the atomic RPC function if available
    try:
        result = supabase.rpc(
            "complete_inventory_session_atomic",
            {
                "p_session_id": session_id,
                "p_user_id": current_user.effective_owner_id,
                "p_location_id": session["location_id"],
                "p_completed_at": datetime.now(timezone.utc).isoformat(),
                "p_notes": session.get("notes"),
            },
        ).execute()

        if result.data and result.data.get("success"):
            return result.data
    except Exception as e:
        # RPC function may not be deployed yet, fall back to original logic
        logger.warning(f"RPC function not available, using fallback logic: {e}")

    # Fallback to original logic with improved safety
    previous_id = session.get("previous_session_id")
    if not previous_id:
        previous = (
            supabase.table("inventory_sessions")
            .select("id, completed_at")
            .eq("user_id", current_user.effective_owner_id)
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

    differences = []
    for item in current_items:
        prev_qty = previous_items.get(item["product_id"])
        difference = None
        if prev_qty is not None:
            difference = float(item["quantity"]) - float(prev_qty)
            if difference != 0:
                differences.append(
                    {
                        "product_id": item["product_id"],
                        "product_name": item.get("product_name", "Unknown"),
                        "quantity_diff": difference,
                        "previous_quantity": prev_qty,
                        "current_quantity": item["quantity"],
                    }
                )
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
                "differences": differences,
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


@router.get(
    "/inventory/sessions/{session_id}/items", response_model=list[InventoryItemOut]
)
def list_session_items(
    session_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """List all items in a session."""
    supabase = get_supabase()

    # Verify access
    _verify_session_access(supabase, session_id, current_user)

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
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    Add item to inventory session with support for:
    - Full + Partial quantity (Anbruch): full_quantity + partial_quantity
    - Legacy quantity field (backwards compatible)
    - Duplicate handling via merge_mode: 'add', 'replace', or 'new_entry'
    """
    supabase = get_supabase()

    # Verify access
    _verify_session_access(supabase, session_id, current_user)

    # Resolve quantity: new format (full+partial) or legacy (quantity)
    if payload.full_quantity is not None:
        full_qty = payload.full_quantity
        partial_qty = payload.partial_quantity or 0
        partial_pct = payload.partial_fill_percent or 0
    elif payload.quantity is not None:
        # Legacy: treat quantity as full_quantity
        full_qty = payload.quantity
        partial_qty = 0
        partial_pct = 0
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either full_quantity or quantity must be provided",
        )

    total_qty = full_qty + partial_qty

    # Get unit_price from product if not provided
    unit_price = payload.unit_price
    if unit_price is None:
        product = (
            supabase.table("products")
            .select("last_price")
            .eq("id", payload.product_id)
            .eq("user_id", current_user.effective_owner_id)
            .execute()
        )
        unit_price = product.data[0]["last_price"] if product.data else 0

    # Check for existing item in session (duplicate handling)
    existing = (
        supabase.table("inventory_items")
        .select("id, full_quantity, partial_quantity, quantity")
        .eq("session_id", session_id)
        .eq("product_id", payload.product_id)
        .execute()
    )

    if existing.data:
        existing_item = existing.data[0]
        merge_mode = payload.merge_mode or "add"  # Default: add to existing

        if merge_mode == "add":
            # Add quantities together
            existing_full = float(
                existing_item.get("full_quantity") or existing_item.get("quantity") or 0
            )
            existing_partial = float(existing_item.get("partial_quantity") or 0)
            new_full = existing_full + full_qty
            new_partial = existing_partial + partial_qty
            # Handle overflow: if partial >= 1, move to full
            if new_partial >= 1:
                new_full += int(new_partial)
                new_partial = new_partial - int(new_partial)

            update_resp = (
                supabase.table("inventory_items")
                .update(
                    {
                        "full_quantity": new_full,
                        "partial_quantity": new_partial,
                        "partial_fill_percent": partial_pct,
                        "quantity": new_full + new_partial,
                        "unit_price": unit_price,
                    }
                )
                .eq("id", existing_item["id"])
                .execute()
            )
            _recalculate_totals(supabase, session_id)
            return update_resp.data[0]

        elif merge_mode == "replace":
            # Replace existing with new values
            update_resp = (
                supabase.table("inventory_items")
                .update(
                    {
                        "full_quantity": full_qty,
                        "partial_quantity": partial_qty,
                        "partial_fill_percent": partial_pct,
                        "quantity": total_qty,
                        "unit_price": unit_price,
                        "notes": payload.notes,
                        "scan_method": payload.scan_method or "manual",
                        "ai_confidence": payload.ai_confidence,
                    }
                )
                .eq("id", existing_item["id"])
                .execute()
            )
            _recalculate_totals(supabase, session_id)
            return update_resp.data[0]

        # merge_mode == "new_entry" is not supported due to UNIQUE constraint
        # Fall through to create new entry with error
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="merge_mode='new_entry' is not supported. Use 'add' or 'replace' instead.",
        )

    # Create new item
    response = (
        supabase.table("inventory_items")
        .insert(
            {
                "session_id": session_id,
                "product_id": payload.product_id,
                "full_quantity": full_qty,
                "partial_quantity": partial_qty,
                "partial_fill_percent": partial_pct,
                "quantity": total_qty,
                "unit_price": unit_price,
                "notes": payload.notes,
                "scan_method": payload.scan_method or "manual",
                "ai_confidence": payload.ai_confidence,
                "ai_suggested_quantity": payload.ai_suggested_quantity,
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
def update_item(
    item_id: str,
    payload: InventoryItemUpdate,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Update an inventory item."""
    supabase = get_supabase()

    # Get item to find session_id
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

    # Verify session access
    _verify_session_access(supabase, session_id, current_user)

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
def delete_item(
    item_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Delete an inventory item."""
    supabase = get_supabase()

    # Get item to find session_id
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

    # Verify session access
    _verify_session_access(supabase, session_id, current_user)

    response = supabase.table("inventory_items").delete().eq("id", item_id).execute()
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    if session_id:
        _recalculate_totals(supabase, session_id)
    return data
