import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile, status
from app.api.deps import get_current_user
from app.core.supabase import get_supabase
from app.schemas.invoice import InvoiceItemOut, InvoiceOut
from app.services.invoice_extraction import extract_invoice

router = APIRouter()


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _process_invoice_items(supabase, invoice_id: str, user_id: str, extraction):
    items = []
    for item in extraction.items:
        product_name = item.description
        unit_price = item.unit_price_gross or item.unit_price_net
        total_price = item.total_gross

        matched = (
            supabase.table("products")
            .select("id")
            .eq("user_id", user_id)
            .ilike("name", f"%{product_name}%")
            .limit(1)
            .execute()
        )
        matched_product_id = matched.data[0]["id"] if matched.data else None
        match_confidence = 0.8 if matched_product_id else None

        items.append(
            {
                "invoice_id": invoice_id,
                "user_id": user_id,
                "raw_text": product_name,
                "product_name": product_name,
                "quantity": item.quantity,
                "unit": item.unit,
                "unit_price": unit_price,
                "total_price": total_price,
                "matched_product_id": matched_product_id,
                "match_confidence": match_confidence,
                "is_manually_matched": False,
            }
        )

        if matched_product_id and unit_price:
            supabase.table("products").update(
                {
                    "last_price": unit_price,
                    "last_supplier": extraction.supplier_name,
                    "last_price_date": extraction.invoice_date,
                }
            ).eq("id", matched_product_id).execute()

    if items:
        supabase.table("invoice_items").insert(items).execute()


def _process_invoice(supabase, invoice, file_bytes: bytes, mime_type: str):
    user_id = invoice["user_id"]
    file_base64 = base64.b64encode(file_bytes).decode("utf-8")

    try:
        supabase.table("invoice_items").delete().eq("invoice_id", invoice["id"]).execute()
        extraction = extract_invoice(file_base64, mime_type=mime_type)
        _process_invoice_items(supabase, invoice["id"], user_id, extraction)

        supabase.table("invoices").update(
            {
                "supplier_name": extraction.supplier_name,
                "invoice_number": extraction.invoice_number,
                "invoice_date": extraction.invoice_date,
                "status": "processed",
                "processed_at": _now_iso(),
                "total_amount": extraction.totals.gross,
                "item_count": len(extraction.items),
                "processing_error": None,
            }
        ).eq("id", invoice["id"]).execute()
    except Exception as exc:
        supabase.table("invoices").update(
            {
                "status": "error",
                "processing_error": str(exc),
            }
        ).eq("id", invoice["id"]).execute()
        raise


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(current_user=Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("invoices")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


@router.post("/invoices/upload", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def upload_invoice(file: UploadFile, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    file_bytes = await file.read()
    file_path = f"{current_user.id}/{file.filename}"

    supabase.storage.from_("invoices").upload(
        file_path,
        file_bytes,
        file_options={"content-type": file.content_type, "upsert": True},
    )

    invoice_resp = (
        supabase.table("invoices")
        .insert(
            {
                "user_id": current_user.id,
                "file_url": file_path,
                "file_name": file.filename,
                "file_size": len(file_bytes),
                "status": "pending",
            }
        )
        .execute()
    )
    invoice = invoice_resp.data[0] if invoice_resp.data else None
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invoice creation failed",
        )

    _process_invoice(
        supabase,
        invoice,
        file_bytes=file_bytes,
        mime_type=file.content_type or "application/pdf",
    )

    refreshed = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice["id"])
        .execute()
    )
    return refreshed.data[0] if refreshed.data else invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return data


@router.post("/invoices/{invoice_id}/process", response_model=InvoiceOut)
def process_invoice(invoice_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    invoice_resp = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    invoice = invoice_resp.data[0] if invoice_resp.data else None
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    file_path = invoice["file_url"]
    file_bytes = supabase.storage.from_("invoices").download(file_path)
    _process_invoice(supabase, invoice, file_bytes=file_bytes, mime_type="application/pdf")

    refreshed = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .execute()
    )
    return refreshed.data[0] if refreshed.data else invoice


@router.get("/invoices/{invoice_id}/items", response_model=list[InvoiceItemOut])
def list_invoice_items(invoice_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    invoice = (
        supabase.table("invoices")
        .select("id")
        .eq("id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not invoice.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    response = (
        supabase.table("invoice_items")
        .select("*")
        .eq("invoice_id", invoice_id)
        .execute()
    )
    return response.data or []


@router.post("/invoices/{invoice_id}/items/{item_id}/match")
def match_invoice_item(
    invoice_id: str,
    item_id: str,
    product_id: str = Body(..., embed=True),
    current_user=Depends(get_current_user),
):
    supabase = get_supabase()
    item_resp = (
        supabase.table("invoice_items")
        .select("*")
        .eq("id", item_id)
        .eq("invoice_id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    item = item_resp.data[0] if item_resp.data else None
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )

    updated = (
        supabase.table("invoice_items")
        .update(
            {
                "matched_product_id": product_id,
                "match_confidence": 1.0,
                "is_manually_matched": True,
            }
        )
        .eq("id", item_id)
        .execute()
    )

    invoice_resp = (
        supabase.table("invoices")
        .select("supplier_name, invoice_date")
        .eq("id", invoice_id)
        .execute()
    )
    invoice_data = invoice_resp.data[0] if invoice_resp.data else {}

    supabase.table("products").update(
        {
            "last_price": item["unit_price"],
            "last_supplier": invoice_data.get("supplier_name"),
            "last_price_date": invoice_data.get("invoice_date")
            or datetime.now(timezone.utc).date().isoformat(),
        }
    ).eq("id", product_id).execute()

    return updated.data[0] if updated.data else item
