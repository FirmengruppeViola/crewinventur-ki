from __future__ import annotations

from typing import Any
from io import StringIO
import csv
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from app.api.deps import UserContext, get_current_user_context
from app.core.supabase import get_supabase
from app.services.pdf_generator import generate_reorder_pdf

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
        .select("id, completed_at, previous_session_id")
        .eq("user_id", owner_id)
        .eq("location_id", location_id)
        .eq("status", "completed")
        .order("completed_at", desc=True)
        .limit(1)
        .execute()
    )
    return session_resp.data[0] if session_resp.data else None


def _get_session_by_id(supabase, session_id: str) -> dict[str, Any] | None:
    response = (
        supabase.table("inventory_sessions")
        .select("id, completed_at")
        .eq("id", session_id)
        .maybe_single()
        .execute()
    )
    return response.data if isinstance(response.data, dict) else None


def _load_difference_map(supabase, session_id: str) -> dict[str, dict[str, float | None]]:
    response = (
        supabase.table("inventory_session_differences")
        .select("product_id, previous_quantity, current_quantity, quantity_difference")
        .eq("session_id", session_id)
        .execute()
    )
    diff_map: dict[str, dict[str, float | None]] = {}
    for row in response.data or []:
        if not isinstance(row, dict):
            continue
        product_id = row.get("product_id")
        if not product_id:
            continue
        diff_map[product_id] = {
            "previous_quantity": row.get("previous_quantity"),
            "current_quantity": row.get("current_quantity"),
            "quantity_difference": row.get("quantity_difference"),
        }
    return diff_map


def _parse_iso(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _calculate_day_span(current_completed_at: str | None, previous_completed_at: str | None) -> float:
    if not current_completed_at or not previous_completed_at:
        return 0.0
    current_dt = _parse_iso(current_completed_at)
    previous_dt = _parse_iso(previous_completed_at)
    if not current_dt or not previous_dt:
        return 0.0
    delta = current_dt - previous_dt
    days = delta.total_seconds() / 86400
    return max(days, 0.0)


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


def _build_reorder_overview(
    supabase,
    current_user: UserContext,
    location_id: str,
    only_below: bool,
    include_trends: bool = False,
    target_days: int = 7,
) -> dict[str, Any]:
    owner_id = current_user.effective_owner_id
    location = _require_location_access(current_user, location_id, owner_id, supabase)

    session = _get_latest_completed_session(supabase, owner_id, location_id)
    quantity_map = _load_quantity_map(supabase, session["id"]) if session else {}
    diff_map: dict[str, dict[str, float | None]] = {}
    previous_completed_at = None
    day_span = 0.0

    if include_trends and session:
        previous_id = session.get("previous_session_id")
        if previous_id:
            previous_session = _get_session_by_id(supabase, previous_id)
            previous_completed_at = (
                previous_session.get("completed_at") if previous_session else None
            )
            day_span = _calculate_day_span(session.get("completed_at"), previous_completed_at)
            diff_map = _load_difference_map(supabase, session["id"])

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

        item_data: dict[str, Any] = {
            "product_id": product_id,
            "product_name": product.get("name"),
            "brand": product.get("brand"),
            "size": product.get("size"),
            "unit": product.get("unit"),
            "current_quantity": current_qty,
            "min_quantity": min_qty,
            "deficit": deficit,
        }

        if include_trends:
            diff = diff_map.get(product_id, {})
            previous_qty = diff.get("previous_quantity")
            current_qty_from_diff = diff.get("current_quantity")
            if previous_qty is None and current_qty_from_diff is None:
                avg_daily = None
                consumption = None
            else:
                prev_val = float(previous_qty or 0)
                curr_val = float(current_qty_from_diff or current_qty)
                consumption = max(prev_val - curr_val, 0.0)
                avg_daily = (consumption / day_span) if day_span > 0 else None

            recommended = deficit
            if avg_daily is not None:
                recommended = max(deficit, avg_daily * max(target_days, 1))

            item_data.update(
                {
                    "previous_quantity": previous_qty,
                    "avg_daily_usage": avg_daily,
                    "recommended_quantity": recommended,
                }
            )

        items.append(item_data)

    items.sort(key=lambda item: item.get("deficit", 0), reverse=True)

    return {
        "location_id": location_id,
        "location_name": location.get("name"),
        "session_id": session.get("id") if session else None,
        "completed_at": session.get("completed_at") if session else None,
        "previous_completed_at": previous_completed_at,
        "day_span": day_span,
        "items": items,
    }


@router.get("/reorder/locations/{location_id}")
def get_reorder_overview(
    location_id: str,
    only_below: bool = Query(True, description="Only items below minimum stock"),
    include_trends: bool = Query(False, description="Include trend-based suggestions"),
    target_days: int = Query(7, ge=1, le=90),
    current_user: UserContext = Depends(get_current_user_context),
):
    supabase = get_supabase()
    return _build_reorder_overview(
        supabase,
        current_user,
        location_id,
        only_below,
        include_trends=include_trends,
        target_days=target_days,
    )


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


@router.get("/reorder/locations/{location_id}/export/{format}")
def export_reorder_list(
    location_id: str,
    format: str,
    only_below: bool = Query(True, description="Only items below minimum stock"),
    include_trends: bool = Query(True, description="Include trend-based suggestions"),
    target_days: int = Query(7, ge=1, le=90),
    current_user: UserContext = Depends(get_current_user_context),
):
    if format not in {"csv", "pdf"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported export format",
        )

    supabase = get_supabase()
    overview = _build_reorder_overview(
        supabase,
        current_user,
        location_id,
        only_below,
        include_trends=include_trends,
        target_days=target_days,
    )
    items = overview.get("items", [])

    if format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        headers = [
            "Produkt",
            "Marke",
            "Groesse",
            "Einheit",
            "Bestand",
            "Mindestbestand",
            "Fehlmenge",
        ]
        if include_trends:
            headers += ["Durchschnitt pro Tag", "Vorschlag"]
        writer.writerow(headers)
        for item in items:
            avg_daily = item.get("avg_daily_usage") if include_trends else None
            writer.writerow(
                [
                    item.get("product_name", ""),
                    item.get("brand") or "",
                    item.get("size") or "",
                    item.get("unit") or "",
                    item.get("current_quantity", 0),
                    item.get("min_quantity", 0),
                    item.get("deficit", 0),
                    f"{avg_daily:.2f}" if isinstance(avg_daily, (int, float)) else "",
                    f"{item.get('recommended_quantity', ''):.2f}"
                    if include_trends and isinstance(item.get("recommended_quantity"), (int, float))
                    else "",
                ]
            )

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=reorder-{location_id}.csv"
            },
        )

    pdf_bytes = generate_reorder_pdf(
        overview=overview,
        items=items,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=reorder-{location_id}.pdf"
        },
    )
