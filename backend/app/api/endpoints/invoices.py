import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile, status
from app.api.deps import get_current_user
from app.core.supabase import get_supabase
from app.schemas.invoice import InvoiceItemOut, InvoiceOut
from app.services.invoice_extraction import extract_invoice
from app.services.storage_service import get_storage_service
from app.services.product_matcher import match_products_for_user, match_products_for_invoice

router = APIRouter()


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _process_invoice_items(supabase, invoice_id: str, user_id: str, extraction):
    items = []
    for item in extraction.items:
        raw_text = item.description
        # Use AI-normalized name for matching, fallback to raw text
        normalized_name = item.normalized_name or raw_text
        unit_price = item.unit_price_gross or item.unit_price_net
        total_price = item.total_gross

        # Try matching with normalized name first (better quality)
        matched = None
        match_confidence = None

        if normalized_name:
            # Try exact-ish match on normalized name
            matched = (
                supabase.table("products")
                .select("id")
                .eq("user_id", user_id)
                .ilike("name", f"%{normalized_name.split()[0]}%")  # First word
                .limit(5)
                .execute()
            )
            # If we have normalized brand, filter further
            if matched.data and item.normalized_brand:
                for product in matched.data:
                    brand_match = (
                        supabase.table("products")
                        .select("id")
                        .eq("id", product["id"])
                        .ilike("brand", f"%{item.normalized_brand}%")
                        .execute()
                    )
                    if brand_match.data:
                        matched.data = [brand_match.data[0]]
                        match_confidence = 0.9
                        break

        # Fallback to simple matching if nothing found
        if not matched or not matched.data:
            matched = (
                supabase.table("products")
                .select("id")
                .eq("user_id", user_id)
                .ilike("name", f"%{raw_text}%")
                .limit(1)
                .execute()
            )
            match_confidence = 0.7 if matched.data else None

        matched_product_id = matched.data[0]["id"] if matched.data else None
        if matched_product_id and not match_confidence:
            match_confidence = 0.8

        items.append(
            {
                "invoice_id": invoice_id,
                "user_id": user_id,
                "raw_text": raw_text,
                "product_name": normalized_name,  # Use normalized as display name
                "quantity": item.quantity,
                "unit": item.unit,
                "unit_price": unit_price,
                "total_price": total_price,
                "matched_product_id": matched_product_id,
                "match_confidence": match_confidence,
                "is_manually_matched": False,
                # New AI-normalized fields
                "ai_normalized_name": item.normalized_name,
                "ai_brand": item.normalized_brand,
                "ai_size": item.normalized_size,
                "ai_category": item.normalized_category,
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
    storage = get_storage_service()

    file_bytes = await file.read()

    # Generate storage key with user isolation
    storage_key = storage.generate_key(
        user_id=current_user.id,
        category="invoices",
        filename=file.filename,
        include_date=True
    )

    # Upload to R2/local storage
    try:
        file_url = await storage.upload(
            file_bytes,
            storage_key,
            file.content_type
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

    invoice_resp = (
        supabase.table("invoices")
        .insert(
            {
                "user_id": current_user.id,
                "file_url": storage_key,  # Store key, not URL
                "file_name": file.filename,
                "file_size": len(file_bytes),
                "status": "pending",
            }
        )
        .execute()
    )
    invoice = invoice_resp.data[0] if invoice_resp.data else None
    if invoice is None:
        # Cleanup uploaded file on DB error
        await storage.delete(storage_key)
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
async def process_invoice(invoice_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    storage = get_storage_service()

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

    storage_key = invoice["file_url"]
    try:
        file_bytes = await storage.download(storage_key)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file: {str(e)}"
        )

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

    # Verify product belongs to current user (prevent IDOR)
    product_check = (
        supabase.table("products")
        .select("id")
        .eq("id", product_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not product_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
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
    ).eq("id", product_id).eq("user_id", current_user.id).execute()

    return updated.data[0] if updated.data else item


@router.post("/invoices/{invoice_id}/auto-create-products")
def auto_create_products_from_invoice(
    invoice_id: str,
    current_user=Depends(get_current_user),
):
    """
    Create products from all unmatched invoice items.

    This solves the "chicken-egg" problem:
    - User uploads invoices first
    - Invoice items don't match any products
    - This endpoint creates products from those items
    - Now when they do inventory, prices are already there

    Returns list of created products.
    """
    supabase = get_supabase()

    # Verify invoice belongs to user
    invoice_resp = (
        supabase.table("invoices")
        .select("id, supplier_name, invoice_date")
        .eq("id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not invoice_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    invoice = invoice_resp.data[0]

    # Get all unmatched items
    items_resp = (
        supabase.table("invoice_items")
        .select("*")
        .eq("invoice_id", invoice_id)
        .is_("matched_product_id", "null")
        .execute()
    )
    unmatched_items = items_resp.data or []

    if not unmatched_items:
        return {"message": "No unmatched items", "created": [], "count": 0}

    created_products = []

    for item in unmatched_items:
        # Create product from invoice item
        product_data = {
            "user_id": current_user.id,
            "name": item["product_name"],
            "unit": item.get("unit") or "Stück",
            "last_price": item.get("unit_price"),
            "last_supplier": invoice.get("supplier_name"),
            "last_price_date": invoice.get("invoice_date"),
            "ai_description": f"Aus Rechnung: {invoice.get('supplier_name', 'Unbekannt')}",
        }

        try:
            product_resp = (
                supabase.table("products")
                .insert(product_data)
                .execute()
            )
            if product_resp.data:
                new_product = product_resp.data[0]
                created_products.append(new_product)

                # Update invoice item with match
                supabase.table("invoice_items").update({
                    "matched_product_id": new_product["id"],
                    "match_confidence": 1.0,
                    "is_manually_matched": False,  # Auto-created
                }).eq("id", item["id"]).execute()

        except Exception as e:
            # Skip duplicates (UNIQUE constraint on name/brand/variant/size)
            # Try to find existing and match instead
            existing = (
                supabase.table("products")
                .select("id")
                .eq("user_id", current_user.id)
                .eq("name", item["product_name"])
                .limit(1)
                .execute()
            )
            if existing.data:
                supabase.table("invoice_items").update({
                    "matched_product_id": existing.data[0]["id"],
                    "match_confidence": 0.9,
                    "is_manually_matched": False,
                }).eq("id", item["id"]).execute()

    return {
        "message": f"{len(created_products)} products created",
        "created": created_products,
        "count": len(created_products),
    }


@router.get("/invoices/{invoice_id}/unmatched-count")
def get_unmatched_count(
    invoice_id: str,
    current_user=Depends(get_current_user),
):
    """Get count of unmatched items in an invoice."""
    supabase = get_supabase()

    # Verify invoice belongs to user
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

    items_resp = (
        supabase.table("invoice_items")
        .select("id")
        .eq("invoice_id", invoice_id)
        .is_("matched_product_id", "null")
        .execute()
    )

    return {"unmatched_count": len(items_resp.data or [])}


@router.post("/invoices/smart-match-all")
def smart_match_all_invoices(current_user=Depends(get_current_user)):
    """
    Use AI to match ALL unmatched invoice items to products.

    This endpoint:
    1. Gets all products for the user
    2. Gets all unmatched invoice items
    3. Uses Gemini to intelligently match them
    4. Updates matches in database

    Use this after uploading multiple invoices to bulk-match.
    """
    result = match_products_for_user(current_user.id)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"],
        )

    return result


@router.post("/invoices/{invoice_id}/smart-match")
def smart_match_invoice(
    invoice_id: str,
    current_user=Depends(get_current_user),
):
    """
    Use AI to match unmatched items for a specific invoice.

    More efficient than match-all when working with single invoices.
    """
    result = match_products_for_invoice(current_user.id, invoice_id)

    if "error" in result and result["error"] == "Invoice not found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return result
