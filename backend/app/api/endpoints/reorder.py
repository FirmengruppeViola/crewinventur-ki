from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import UserContext, get_current_user_context
from app.core.supabase import get_supabase

router = APIRouter()


class ReorderSettingIn(BaseModel):
    location_id: str
    product_id: str
    min_quantity: float = Field(ge=0)


def _require_location_access(
    current_user: UserContext, location_id: str, owner_id: str, supabase
) -> dict[str, Any]:
    if location_id not in current_user.allowed_location_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Location access denied",
        )

    location_resp = (
        supabase.table("locations")
        .select("id, name")
        .eq("id", location_id)
        .eq("user_id", owner_id)
        .maybe_single()
        .execute()
    )
    location = location_resp.data if isinstance(location_resp.data, dict) else None
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    return location


def _get_latest_completed_session(supabase, owner_id: str, location_id: str):
    session_resp = (
        supabase.table("inventory_sessions")
        .select("id, completed_at")
        .eq("user_id", owner_id)
        .eq("location_id", location_id)
        .eq("status", "completed")
        .order("completed_at", desc=True)
        .limit(1)
        .execute()
    )
    return session_resp.data[0] if session_resp.data else None


def _load_quantity_map(supabase, session_id: str) -> dict[str, float]:
    items_resp = (
        supabase.table("inventory_items")
        .select("product_id, full_quantity, partial_quantity, quantity")
        .eq("session_id", session_id)
        .execute()
    )
    quantity_map: dict[str, float] = {}
    for row in items_resp.data or []:
        if not isinstance(row, dict):
            continue
        product_id = row.get("product_id")
        if not product_id:
            continue
        full = row.get("full_quantity")
        partial = row.get("partial_quantity")
        qty = row.get("quantity")
        if full is not None or partial is not None:
            total = float(full or 0) + float(partial or 0)
        else:
            total = float(qty or 0)
        quantity_map[product_id] = total
    return quantity_map


@router.get("/reorder/locations/{location_id}")
def get_reorder_overview(
    location_id: str,
    only_below: bool = Query(True, description="Only items below minimum stock"),
    current_user: UserContext = Depends(get_current_user_context),
):
    supabase = get_supabase()
    owner_id = current_user.effective_owner_id
    location = _require_location_access(current_user, location_id, owner_id, supabase)

    session = _get_latest_completed_session(supabase, owner_id, location_id)
    quantity_map = _load_quantity_map(supabase, session["id"]) if session else {}

    settings_resp = (
        supabase.table("product_reorder_settings")
        .select("product_id, min_quantity")
        .eq("user_id", owner_id)
        .eq("location_id", location_id)
        .execute()
    )
    settings_map = {
        row.get("product_id"): float(row.get("min_quantity") or 0)
        for row in (settings_resp.data or [])
        if isinstance(row, dict)
    }

    products_resp = (
        supabase.table("products")
        .select("id, name, brand, size, unit")
        .eq("user_id", owner_id)
        .execute()
    )
    items: list[dict[str, Any]] = []
    for product in products_resp.data or []:
        if not isinstance(product, dict):
            continue
        product_id = product.get("id")
        if not product_id:
            continue
        min_qty = float(settings_map.get(product_id, 0) or 0)
        current_qty = float(quantity_map.get(product_id, 0))
        deficit = max(min_qty - current_qty, 0)

        if only_below:
            if min_qty <= 0 or deficit <= 0:
                continue

        items.append(
            {
                "product_id": product_id,
                "product_name": product.get("name"),
                "brand": product.get("brand"),
                "size": product.get("size"),
                "unit": product.get("unit"),
                "current_quantity": current_qty,
                "min_quantity": min_qty,
                "deficit": deficit,
            }
        )

    items.sort(key=lambda item: item.get("deficit", 0), reverse=True)

    return {
        "location_id": location_id,
        "location_name": location.get("name"),
        "session_id": session.get("id") if session else None,
        "completed_at": session.get("completed_at") if session else None,
        "items": items,
    }


@router.get("/reorder/locations/{location_id}/settings")
def get_reorder_settings(
    location_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    supabase = get_supabase()
    owner_id = current_user.effective_owner_id
    _require_location_access(current_user, location_id, owner_id, supabase)

    session = _get_latest_completed_session(supabase, owner_id, location_id)
    quantity_map = _load_quantity_map(supabase, session["id"]) if session else {}

    settings_resp = (
        supabase.table("product_reorder_settings")
        .select("product_id, min_quantity")
        .eq("user_id", owner_id)
        .eq("location_id", location_id)
        .execute()
    )
    settings = settings_resp.data or []

    product_ids = [
        row.get("product_id")
        for row in settings
        if isinstance(row, dict) and row.get("product_id")
    ]
    products_resp = (
        supabase.table("products")
        .select("id, name, brand, size, unit")
        .eq("user_id", owner_id)
        .in_("id", product_ids)
        .execute()
    )
    product_map = {
        row.get("id"): row for row in (products_resp.data or []) if isinstance(row, dict)
    }

    items: list[dict[str, Any]] = []
    for row in settings:
        if not isinstance(row, dict):
            continue
        product_id = row.get("product_id")
        if not product_id:
            continue
        product = product_map.get(product_id, {})
        min_qty = float(row.get("min_quantity") or 0)
        current_qty = float(quantity_map.get(product_id, 0))
        deficit = max(min_qty - current_qty, 0)
        items.append(
            {
                "product_id": product_id,
                "product_name": product.get("name"),
                "brand": product.get("brand"),
                "size": product.get("size"),
                "unit": product.get("unit"),
                "current_quantity": current_qty,
                "min_quantity": min_qty,
                "deficit": deficit,
            }
        )

    items.sort(key=lambda item: item.get("product_name") or "")

    return {
        "location_id": location_id,
        "items": items,
    }


@router.post("/reorder/settings")
def upsert_reorder_setting(
    payload: ReorderSettingIn,
    current_user: UserContext = Depends(get_current_user_context),
):
    supabase = get_supabase()
    owner_id = current_user.effective_owner_id
    _require_location_access(current_user, payload.location_id, owner_id, supabase)

    product_resp = (
        supabase.table("products")
        .select("id")
        .eq("id", payload.product_id)
        .eq("user_id", owner_id)
        .execute()
    )
    if not product_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    min_quantity = float(payload.min_quantity or 0)

    if min_quantity <= 0:
        (
            supabase.table("product_reorder_settings")
            .delete()
            .eq("user_id", owner_id)
            .eq("location_id", payload.location_id)
            .eq("product_id", payload.product_id)
            .execute()
        )
        return {"deleted": True}

    response = (
        supabase.table("product_reorder_settings")
        .upsert(
            {
                "user_id": owner_id,
                "location_id": payload.location_id,
                "product_id": payload.product_id,
                "min_quantity": min_quantity,
            },
            on_conflict="user_id,location_id,product_id",
        )
        .execute()
    )

    row = response.data[0] if response.data else None
    return row or {
        "user_id": owner_id,
        "location_id": payload.location_id,
        "product_id": payload.product_id,
        "min_quantity": min_quantity,
    }
