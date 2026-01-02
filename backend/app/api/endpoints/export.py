import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.supabase import get_supabase
from app.services.email_service import send_inventory_email
from app.services.pdf_generator import generate_bundle_pdf, generate_inventory_pdf

router = APIRouter()


class SendEmailRequest(BaseModel):
    email: EmailStr
    subject: str | None = None
    message: str | None = None


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


def _build_category_totals(items: list[dict], product_map: dict, category_map: dict) -> dict:
    totals: dict[str, dict[str, float]] = {}
    for item in items:
        product = product_map.get(item.get("product_id"), {})
        cat_id = product.get("category_id")
        cat_name = category_map.get(cat_id) if cat_id else None
        cat_key = cat_name or "Sonstige"
        if cat_key not in totals:
            totals[cat_key] = {"count": 0, "value": 0.0}
        totals[cat_key]["count"] += 1
        totals[cat_key]["value"] += float(item.get("total_price") or 0)
    return totals


def _build_summary_csv(
    session: dict,
    location: dict,
    profile: dict | None,
    category_totals: dict,
) -> str:
    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["Inventur-Zusammenfassung"])
    writer.writerow(["Firma", profile.get("company_name") if profile else ""])
    writer.writerow(["Location", location.get("name", "")])
    writer.writerow(["Datum", session.get("completed_at") or session.get("started_at")])
    writer.writerow([])

    writer.writerow(["Kategorie", "Anzahl Positionen", "Gesamtwert EUR"])
    for cat_name in sorted(category_totals):
        totals = category_totals[cat_name]
        writer.writerow([cat_name, int(totals["count"]), f"{totals['value']:.2f}"])
    writer.writerow([])

    writer.writerow(
        [
            "GESAMT",
            session.get("total_items") or 0,
            f"{float(session.get('total_value') or 0):.2f}",
        ]
    )
    return output.getvalue()


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


@router.get("/export/session/{session_id}/csv-summary")
def export_session_csv_summary(session_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    session, items, location, profile, product_map, category_map = _load_session_data(
        supabase, session_id, current_user.id
    )

    category_totals = _build_category_totals(items, product_map, category_map)
    summary_csv = _build_summary_csv(session, location, profile, category_totals)

    return Response(
        content=summary_csv,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=inventory-summary-{session_id}.csv"
        },
    )


@router.post("/export/session/{session_id}/send")
async def send_session_email(
    session_id: str,
    payload: SendEmailRequest,
    current_user=Depends(get_current_user),
):
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email service not configured",
        )

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

    category_totals = _build_category_totals(items, product_map, category_map)
    summary_csv = _build_summary_csv(session, location, profile, category_totals)
    csv_bytes = summary_csv.encode("utf-8")

    company = profile.get("company_name") if profile else "Inventur"
    loc_name = location.get("name", "")
    date = session.get("completed_at") or session.get("started_at")

    subject = payload.subject or f"Inventur {loc_name} - {date}"
    if payload.message:
        body = f"<p>{payload.message}</p>"
    else:
        body = f"""
        <h2>Inventur von {company}</h2>
        <p>Standort: {loc_name}</p>
        <p>Datum: {date}</p>
        <p>Gesamtwert: {float(session.get('total_value') or 0):.2f} EUR</p>
        <p>Im Anhang finden Sie die Inventurliste (PDF) sowie eine Zusammenfassung (CSV).</p>
        """

    success = await send_inventory_email(
        to_email=payload.email,
        subject=subject,
        body=body,
        pdf_attachment=pdf_bytes,
        csv_attachment=csv_bytes,
        session_id=session_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email konnte nicht gesendet werden",
        )

    return {"message": "Email erfolgreich gesendet"}


@router.get("/export/bundle/{bundle_id}/pdf")
def export_bundle_pdf(bundle_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()

    bundle_resp = (
        supabase.table("inventory_bundles")
        .select("*")
        .eq("id", bundle_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not bundle_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bundle not found")
    bundle = bundle_resp.data[0]

    links_resp = (
        supabase.table("inventory_bundle_sessions")
        .select("session_id")
        .eq("bundle_id", bundle_id)
        .execute()
    )
    session_ids = [link["session_id"] for link in links_resp.data or []]
    if not session_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bundle has no sessions",
        )

    sessions_data = []
    profile = None
    for session_id in session_ids:
        session, items, location, profile, product_map, category_map = _load_session_data(
            supabase, session_id, current_user.id
        )
        sessions_data.append(
            {
                "session": session,
                "items": items,
                "location": location,
                "product_map": product_map,
                "category_map": category_map,
            }
        )

    pdf_bytes = generate_bundle_pdf(
        bundle=bundle,
        profile=profile,
        sessions_data=sessions_data,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=inventory-bundle-{bundle_id}.pdf"},
    )
