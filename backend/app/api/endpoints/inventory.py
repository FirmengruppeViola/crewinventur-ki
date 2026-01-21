import logging
from datetime import datetime, timezone
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user_context, UserContext
from app.core.supabase import get_supabase
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemOut,
    InventoryItemUpdate,
    InventorySessionCreate,
    InventorySessionOut,
    InventorySessionUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _log_inventory_action(
    supabase,
    action: str,
    user_id: str,
    session_id: str,
    item_id: str | None = None,
    before_data: dict[str, Any] | None = None,
    after_data: dict[str, Any] | None = None,
) -> None:
    """Best-effort audit log for inventory changes."""
    try:
        supabase.table("inventory_audit_logs").insert(
            {
                "session_id": session_id,
                "item_id": item_id,
                "user_id": user_id,
                "action": action,
                "before_data": before_data,
                "after_data": after_data,
            }
        ).execute()
    except Exception as exc:
        logger.warning(f"Failed to write inventory audit log: {exc}")


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

    def _fetch_session_row() -> dict[str, Any]:
        resp = (
            supabase.table("inventory_sessions")
            .select("*")
            .eq("id", session_id)
            .execute()
        )
        row: Any = resp.data[0] if resp.data else None
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
        if not isinstance(row, dict):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid session row returned from database",
            )
        return cast(dict[str, Any], row)

    # Try to use the atomic RPC function if available.
    # IMPORTANT: Never return the RPC JSON payload (it is not InventorySessionOut).
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

        rpc_data = result.data
        rpc_success = False
        if isinstance(rpc_data, dict):
            rpc_success = rpc_data.get("success") is True
        elif (
            isinstance(rpc_data, list)
            and rpc_data
            and isinstance(rpc_data[0], dict)
            and rpc_data[0].get("success") is True
        ):
            rpc_success = True

        if rpc_success:
            _recalculate_totals(supabase, session_id)
            return _fetch_session_row()
    except Exception as e:
        # RPC function may not be deployed yet (or may use different status semantics).
        logger.warning(
            f"RPC function not available or failed, using fallback logic: {e}"
        )

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
            .limit(5)
            .execute()
        )
        for prev in previous.data or []:
            if not isinstance(prev, dict):
                continue
            prev_id = prev.get("id")
            if prev_id and prev_id != session_id:
                previous_id = str(prev_id)
                break

    current_items_raw = (
        supabase.table("inventory_items")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    ).data or []
    current_items: list[dict[str, Any]] = [
        cast(dict[str, Any], item)
        for item in current_items_raw
        if isinstance(item, dict)
    ]

    product_ids_set: set[str] = set()
    for item in current_items:
        if not isinstance(item, dict):
            continue
        product_id = item.get("product_id")
        if product_id:
            product_ids_set.add(str(product_id))

    product_ids = list(product_ids_set)
    product_name_by_id: dict[str, str] = {}
    if product_ids:
        products_resp = (
            supabase.table("products")
            .select("id, name")
            .eq("user_id", current_user.effective_owner_id)
            .in_("id", product_ids)
            .execute()
        )
        for product in products_resp.data or []:
            if not isinstance(product, dict):
                continue
            pid = product.get("id")
            name = product.get("name")
            if pid and name:
                product_name_by_id[str(pid)] = str(name)

    def _qty(item_row: dict[str, Any]) -> float:
        quantity = item_row.get("quantity")
        if quantity is None:
            full = item_row.get("full_quantity") or 0
            partial = item_row.get("partial_quantity") or 0
            try:
                return float(full) + float(partial)
            except (TypeError, ValueError):
                return 0.0
        try:
            return float(quantity)
        except (TypeError, ValueError):
            return 0.0

    previous_items: dict[str, float] = {}
    if previous_id:
        prev_items_raw = (
            supabase.table("inventory_items")
            .select("product_id, quantity, full_quantity, partial_quantity")
            .eq("session_id", previous_id)
            .execute()
        ).data or []
        for prev_item in prev_items_raw:
            if not isinstance(prev_item, dict):
                continue
            prev_product_id = prev_item.get("product_id")
            if not prev_product_id:
                continue
            previous_items[str(prev_product_id)] = _qty(cast(dict[str, Any], prev_item))

    differences: list[dict[str, Any]] = []
    for item in current_items:
        product_id_raw = item.get("product_id")
        item_id_raw = item.get("id")
        if not product_id_raw or not item_id_raw:
            continue

        product_id = str(product_id_raw)
        item_id = str(item_id_raw)

        prev_qty = previous_items.get(product_id)
        difference = None
        current_qty = _qty(item)

        if prev_qty is not None:
            difference = current_qty - float(prev_qty)
            if difference != 0:
                differences.append(
                    {
                        "product_id": product_id,
                        "product_name": product_name_by_id.get(product_id, "Unknown"),
                        "quantity_diff": difference,
                        "previous_quantity": prev_qty,
                        "current_quantity": current_qty,
                    }
                )

        supabase.table("inventory_items").update(
            {
                "previous_quantity": prev_qty,
                "quantity_difference": difference,
            }
        ).eq("id", item_id).execute()

    # Persist differences (best-effort; don't block completion if this fails)
    try:
        supabase.table("inventory_session_differences").delete().eq(
            "session_id", session_id
        ).execute()
        if differences:
            diff_rows = [
                {
                    "session_id": session_id,
                    "product_id": diff["product_id"],
                    "previous_quantity": diff.get("previous_quantity"),
                    "current_quantity": diff.get("current_quantity"),
                    "quantity_difference": diff.get("quantity_diff"),
                }
                for diff in differences
            ]
            supabase.table("inventory_session_differences").insert(diff_rows).execute()
    except Exception as e:
        logger.warning(f"Failed to persist session differences: {e}")

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

    if not update_resp.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session completion failed",
        )

    _recalculate_totals(supabase, session_id)
    _log_inventory_action(
        supabase,
        action="complete_session",
        user_id=current_user.id,
        session_id=session_id,
        item_id=None,
        before_data={"status": session.get("status")},
        after_data={
            "status": "completed",
            "completed_at": completed_at,
            "previous_session_id": previous_id,
        },
    )
    return _fetch_session_row()


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


@router.post("/inventory/sessions/{session_id}/prefill")
def prefill_session_items(
    session_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Pre-fill a session with products from the previous completed session."""
    supabase = get_supabase()

    session = _verify_session_access(supabase, session_id, current_user)
    if session.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active",
        )

    existing = (
        supabase.table("inventory_items")
        .select("id")
        .eq("session_id", session_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session already has items",
        )

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

    if not previous_id:
        return {"inserted": 0}

    prev_items = (
        supabase.table("inventory_items")
        .select("product_id, unit_price")
        .eq("session_id", previous_id)
        .execute()
    ).data or []

    if not prev_items:
        return {"inserted": 0}

    product_ids = [item.get("product_id") for item in prev_items if item.get("product_id")]
    product_prices: dict[str, float] = {}
    if product_ids:
        products_resp = (
            supabase.table("products")
            .select("id, last_price")
            .in_("id", product_ids)
            .execute()
        )
        for product in products_resp.data or []:
            pid = product.get("id")
            if pid:
                product_prices[str(pid)] = product.get("last_price") or 0

    rows = []
    for item in prev_items:
        product_id = item.get("product_id")
        if not product_id:
            continue
        unit_price = item.get("unit_price")
        if unit_price in (None, 0):
            unit_price = product_prices.get(str(product_id)) or None
        rows.append(
            {
                "session_id": session_id,
                "product_id": product_id,
                "full_quantity": 0,
                "partial_quantity": 0,
                "partial_fill_percent": 0,
                "quantity": 0,
                "unit_price": unit_price,
            }
        )

    if not rows:
        return {"inserted": 0}

    insert_resp = supabase.table("inventory_items").insert(rows).execute()
    _recalculate_totals(supabase, session_id)
    _log_inventory_action(
        supabase,
        action="prefill",
        user_id=current_user.id,
        session_id=session_id,
        item_id=None,
        before_data=None,
        after_data={"count": len(insert_resp.data or rows), "previous_session_id": previous_id},
    )
    return {"inserted": len(insert_resp.data or rows), "previous_session_id": previous_id}


@router.get("/inventory/sessions/{session_id}/differences")
def list_session_differences(
    session_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """List quantity differences vs previous session."""
    supabase = get_supabase()

    _verify_session_access(supabase, session_id, current_user)

    response = (
        supabase.table("inventory_session_differences")
        .select(
            "product_id, previous_quantity, current_quantity, quantity_difference, products(name, brand)"
        )
        .eq("session_id", session_id)
        .execute()
    )
    return response.data or []


@router.get("/inventory/sessions/{session_id}/audit-logs")
def list_session_audit_logs(
    session_id: str,
    limit: int = 100,
    current_user: UserContext = Depends(get_current_user_context),
):
    """List audit log entries for a session."""
    supabase = get_supabase()

    if limit < 1:
        limit = 1
    if limit > 500:
        limit = 500

    _verify_session_access(supabase, session_id, current_user)

    response = (
        supabase.table("inventory_audit_logs")
        .select("id, action, user_id, item_id, before_data, after_data, created_at")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .limit(limit)
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
        partial_pct = payload.partial_fill_percent
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

    if partial_pct is None:
        try:
            partial_pct = int(round(float(partial_qty or 0) * 100))
        except (TypeError, ValueError):
            partial_pct = 0

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
            existing_full_raw = existing_item.get("full_quantity")
            if existing_full_raw is None:
                existing_full_raw = existing_item.get("quantity")
            existing_full = float(existing_full_raw or 0)
            existing_partial = float(existing_item.get("partial_quantity") or 0)
            new_full = existing_full + full_qty
            new_partial = existing_partial + partial_qty
            # Handle overflow: if partial >= 1, move to full
            if new_partial >= 1:
                new_full += int(new_partial)
                new_partial = new_partial - int(new_partial)
            merged_partial_pct = int(round(new_partial * 100))

            update_resp = (
                supabase.table("inventory_items")
                .update(
                    {
                        "full_quantity": new_full,
                        "partial_quantity": new_partial,
                        "partial_fill_percent": merged_partial_pct,
                        "quantity": new_full + new_partial,
                        "unit_price": unit_price,
                    }
                )
                .eq("id", existing_item["id"])
                .execute()
            )
            if update_resp.data:
                _log_inventory_action(
                    supabase,
                    action="update",
                    user_id=current_user.id,
                    session_id=session_id,
                    item_id=existing_item.get("id"),
                    before_data=existing_item,
                    after_data=update_resp.data[0],
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
            if update_resp.data:
                _log_inventory_action(
                    supabase,
                    action="update",
                    user_id=current_user.id,
                    session_id=session_id,
                    item_id=existing_item.get("id"),
                    before_data=existing_item,
                    after_data=update_resp.data[0],
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

    _log_inventory_action(
        supabase,
        action="create",
        user_id=current_user.id,
        session_id=session_id,
        item_id=data.get("id"),
        before_data=None,
        after_data=data,
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

    # Get item to find session_id and current quantities
    item_resp = (
        supabase.table("inventory_items")
        .select("id, session_id, full_quantity, partial_quantity, quantity")
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

    current_item = item_resp.data[0]
    current_full_raw = current_item.get("full_quantity")
    if current_full_raw is None:
        current_full_raw = current_item.get("quantity")
    current_full = float(current_full_raw or 0)
    current_partial = current_item.get("partial_quantity") or 0

    # Keep quantity consistent with full/partial inputs.
    if "full_quantity" in update_data or "partial_quantity" in update_data:
        full = (
            update_data.get("full_quantity")
            if "full_quantity" in update_data
            else current_full
        )
        partial = (
            update_data.get("partial_quantity")
            if "partial_quantity" in update_data
            else current_partial
        )
        try:
            update_data["quantity"] = float(full or 0) + float(partial or 0)
        except (TypeError, ValueError):
            update_data["quantity"] = 0
        if "partial_fill_percent" not in update_data:
            update_data["partial_fill_percent"] = int(
                round(float(partial or 0) * 100)
            )
    elif "quantity" in update_data:
        # Legacy update: align full/partial to keep data consistent
        if "full_quantity" not in update_data:
            update_data["full_quantity"] = update_data["quantity"]
        if "partial_quantity" not in update_data:
            update_data["partial_quantity"] = 0
        if "partial_fill_percent" not in update_data:
            update_data["partial_fill_percent"] = 0
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
        _log_inventory_action(
            supabase,
            action="update",
            user_id=current_user.id,
            session_id=session_id,
            item_id=item_id,
            before_data=current_item,
            after_data=data,
        )
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
        .select("*")
        .eq("id", item_id)
        .execute()
    )
    if not item_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    item_before = item_resp.data[0]
    session_id = item_before["session_id"]

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
        _log_inventory_action(
            supabase,
            action="delete",
            user_id=current_user.id,
            session_id=session_id,
            item_id=item_id,
            before_data=item_before,
            after_data=None,
        )
    return data
