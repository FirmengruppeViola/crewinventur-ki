import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, Response, status
from app.api.deps import get_current_user
from app.core.supabase import get_supabase
from app.services.pdf_generator import generate_inventory_pdf

router = APIRouter()


def _load_session_data(supabase, session_id: str, user_id: str):
    session_resp = (
        supabase.table("inventory_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    session = session_resp.data[0] if session_resp.data else None
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    items = (
        supabase.table("inventory_items")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    ).data or []

    location_resp = (
        supabase.table("locations")
        .select("*")
        .eq("id", session["location_id"])
        .execute()
    )
    location = location_resp.data[0] if location_resp.data else {}

    profile_resp = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .execute()
    )
    profile = profile_resp.data[0] if profile_resp.data else None

    product_ids = list({item["product_id"] for item in items})
    product_map = {}
    category_map = {}
    if product_ids:
        products_resp = (
            supabase.table("products")
            .select("id, name, category_id")
            .in_("id", product_ids)
            .execute()
        )
        products = products_resp.data or []
        product_map = {product["id"]: product for product in products}

        category_ids = list({p.get("category_id") for p in products if p.get("category_id")})
        if category_ids:
            categories_resp = (
                supabase.table("categories")
                .select("id, name")
                .in_("id", category_ids)
                .execute()
            )
            category_map = {cat["id"]: cat["name"] for cat in categories_resp.data or []}

    return session, items, location, profile, product_map, category_map


@router.get("/export/session/{session_id}/pdf")
def export_session_pdf(session_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    session, items, location, profile, product_map, category_map = _load_session_data(
        supabase, session_id, current_user.id
    )

    pdf_bytes = generate_inventory_pdf(
        session=session,
        location=location,
        profile=profile,
        items=items,
        product_map=product_map,
        category_map=category_map,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=inventory-{session_id}.pdf"},
    )


@router.get("/export/session/{session_id}/csv")
def export_session_csv(session_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    session, items, location, profile, product_map, category_map = _load_session_data(
        supabase, session_id, current_user.id
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Produkt", "Kategorie", "Menge", "Einzelpreis", "Gesamt"])

    for item in items:
        product = product_map.get(item["product_id"], {})
        category_name = category_map.get(product.get("category_id"), "-")
        writer.writerow(
            [
                product.get("name", "-"),
                category_name,
                item.get("quantity"),
                item.get("unit_price"),
                item.get("total_price"),
            ]
        )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=inventory-{session_id}.csv"},
    )
