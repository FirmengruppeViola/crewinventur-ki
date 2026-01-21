import base64
import logging
import mimetypes
from io import BytesIO
from zipfile import BadZipFile, ZipFile
from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Any

import anyio

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    HTTPException,
    UploadFile,
    status,
)

from app.api.deps import UserContext, get_current_user_context
from app.core.supabase import get_supabase
from app.schemas.invoice import InvoiceItemOut, InvoiceOut
from app.services.invoice_extraction import extract_invoice
from app.services.storage_service import get_storage_service
from app.services.product_matcher import (
    match_products_for_user,
    match_products_for_invoice,
)
from app.utils.query_helpers import escape_like_pattern

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_INVOICE_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
}


def _guess_mime_type(file_name: str) -> str:
    mime_type, _ = mimetypes.guess_type(file_name)
    if mime_type:
        return mime_type
    if file_name.lower().endswith(".pdf"):
        return "application/pdf"
    return "application/octet-stream"


def _is_allowed_invoice_file(file_name: str) -> bool:
    return file_name.lower().endswith(tuple(ALLOWED_INVOICE_EXTENSIONS))


def _normalize_alias_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip().lower()


def _process_invoice_background(invoice_id: str, user_id: str) -> None:
    # Runs in Starlette's threadpool (BackgroundTasks sync function).
    supabase = None

    try:
        supabase = get_supabase()
        storage = get_storage_service()

        # Idempotent lock: only one processing job per invoice.
        lock_resp = (
            supabase.table("invoices")
            .update(
                {
                    "status": "processing",
                    "processing_error": None,
                    "processed_at": None,
                }
            )
            .eq("id", invoice_id)
            .eq("user_id", user_id)
            .in_("status", ["pending", "error"])
            .neq("status", "processing")
            .execute()
        )

        if not lock_resp.data:
            # Already processing (or not found) -> no-op.
            return

        invoice_resp = (
            supabase.table("invoices")
            .select("*")
            .eq("id", invoice_id)
            .eq("user_id", user_id)
            .execute()
        )

        invoice_data = invoice_resp.data[0] if invoice_resp.data else None
        if not isinstance(invoice_data, dict):
            raise ValueError(f"Invoice {invoice_id} not found for user {user_id}")

        invoice: dict[str, Any] = invoice_data

        storage_key = invoice.get("file_url")
        if not isinstance(storage_key, str) or not storage_key:
            raise ValueError(f"Invalid invoice file_url for invoice {invoice_id}")

        file_bytes = anyio.run(storage.download, storage_key)
        file_name = invoice.get("file_name")
        mime_type = _guess_mime_type(file_name if isinstance(file_name, str) else "")
        _process_invoice(supabase, invoice, file_bytes=file_bytes, mime_type=mime_type)
    except Exception as exc:
        logger.exception(
            "Invoice processing failed in background (invoice_id=%s user_id=%s): %s",
            invoice_id,
            user_id,
            exc,
        )

        # Persist ANY background failure (including pre-download issues).
        if supabase is not None:
            try:
                (
                    supabase.table("invoices")
                    .update(
                        {
                            "status": "error",
                            "processing_error": str(exc),
                        }
                    )
                    .eq("id", invoice_id)
                    .eq("user_id", user_id)
                    .execute()
                )
            except Exception:
                logger.exception(
                    "Failed to persist invoice processing error (invoice_id=%s user_id=%s)",
                    invoice_id,
                    user_id,
                )

        return


def require_owner(current_user: UserContext) -> None:
    if current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can access this feature",
        )


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _process_invoice_items(supabase, invoice_id: str, user_id: str, extraction):
    items = []
    product_updates = {}
    alias_map: dict[str, str] = {}

    supplier_key = _normalize_alias_text(getattr(extraction, "supplier_name", None))
    try:
        alias_resp = (
            supabase.table("invoice_item_aliases")
            .select("normalized_text, product_id")
            .eq("user_id", user_id)
            .eq("supplier_name", supplier_key)
            .execute()
        )
        alias_rows = alias_resp.data or []
        for row in alias_rows:
            if isinstance(row, dict):
                normalized = row.get("normalized_text")
                product_id = row.get("product_id")
                if normalized and product_id:
                    alias_map[normalized] = product_id

        if supplier_key:
            global_alias_resp = (
                supabase.table("invoice_item_aliases")
                .select("normalized_text, product_id")
                .eq("user_id", user_id)
                .eq("supplier_name", "")
                .execute()
            )
            global_rows = global_alias_resp.data or []
            for row in global_rows:
                if isinstance(row, dict):
                    normalized = row.get("normalized_text")
                    product_id = row.get("product_id")
                    if normalized and product_id and normalized not in alias_map:
                        alias_map[normalized] = product_id
    except Exception as exc:
        logger.warning("Alias lookup failed: %s", exc)

    for item in extraction.items:
        raw_text = item.description
        normalized_name = item.normalized_name or raw_text
        unit_price = item.unit_price_gross or item.unit_price_net
        total_price = item.total_gross

        matched = None
        match_confidence = None
        matched_product_id = None

        normalized_raw = _normalize_alias_text(raw_text)
        if normalized_raw and normalized_raw in alias_map:
            matched_product_id = alias_map[normalized_raw]
            match_confidence = 0.95

        if not matched_product_id and normalized_name:
            first_word = normalized_name.split()[0] if normalized_name.split() else ""
            matched = (
                supabase.table("products")
                .select("id, brand")
                .eq("user_id", user_id)
                .ilike("name", escape_like_pattern(first_word))
                .limit(5)
                .execute()
            )
            if matched.data and item.normalized_brand:
                matched_brands = [
                    p
                    for p in matched.data
                    if p.get("brand")
                    and item.normalized_brand.lower() in p["brand"].lower()
                ]
                if matched_brands:
                    matched.data = [matched_brands[0]]
                    match_confidence = 0.9

        if not matched_product_id and (not matched or not matched.data):
            matched = (
                supabase.table("products")
                .select("id")
                .eq("user_id", user_id)
                .ilike("name", escape_like_pattern(raw_text))
                .limit(1)
                .execute()
            )
            match_confidence = 0.7 if matched.data else None

        if not matched_product_id:
            matched_product_id = matched.data[0]["id"] if matched and matched.data else None

        if matched_product_id and not match_confidence:
            match_confidence = 0.8

        items.append(
            {
                "invoice_id": invoice_id,
                "user_id": user_id,
                "raw_text": raw_text,
                "product_name": normalized_name,
                "quantity": item.quantity,
                "unit": item.unit,
                "unit_price": unit_price,
                "total_price": total_price,
                "matched_product_id": matched_product_id,
                "match_confidence": match_confidence,
                "is_manually_matched": False,
                "ai_normalized_name": item.normalized_name,
                "ai_brand": item.normalized_brand,
                "ai_size": item.normalized_size,
                "ai_category": item.normalized_category,
            }
        )

        if matched_product_id and unit_price:
            product_updates[matched_product_id] = {
                "last_price": unit_price,
                "last_supplier": extraction.supplier_name,
                "last_price_date": extraction.invoice_date,
            }

    if items:
        supabase.table("invoice_items").insert(items).execute()

    for product_id, update_data in product_updates.items():
        (
            supabase.table("products")
            .update(update_data)
            .eq("id", product_id)
            .eq("user_id", user_id)
            .execute()
        )


def _process_invoice(supabase, invoice, file_bytes: bytes, mime_type: str):
    user_id = invoice["user_id"]
    file_base64 = base64.b64encode(file_bytes).decode("utf-8")

    try:
        supabase.table("invoice_items").delete().eq(
            "invoice_id", invoice["id"]
        ).execute()
        extraction = extract_invoice(file_base64, mime_type=mime_type)
        _process_invoice_items(supabase, invoice["id"], user_id, extraction)

        (
            supabase.table("invoices")
            .update(
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
            )
            .eq("id", invoice["id"])
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        (
            supabase.table("invoices")
            .update(
                {
                    "status": "error",
                    "processing_error": str(exc),
                }
            )
            .eq("id", invoice["id"])
            .eq("user_id", user_id)
            .execute()
        )
        raise


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(current_user: UserContext = Depends(get_current_user_context)):
    require_owner(current_user)
    supabase = get_supabase()
    response = (
        supabase.table("invoices")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


@router.post(
    "/invoices/upload", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED
)
async def upload_invoice(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: UserContext = Depends(get_current_user_context),
):
    require_owner(current_user)
    supabase = get_supabase()
    storage = get_storage_service()

    file_bytes = await file.read()

    safe_filename = file.filename or "invoice.pdf"
    upload_mime_type = file.content_type or _guess_mime_type(safe_filename)

    # Generate storage key with user isolation
    storage_key = storage.generate_key(
        user_id=current_user.id,
        category="invoices",
        filename=safe_filename,
        include_date=True,
    )

    # Upload to R2/local storage
    try:
        await storage.upload(file_bytes, storage_key, upload_mime_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}",
        )

    invoice_resp = (
        supabase.table("invoices")
        .insert(
            {
                "user_id": current_user.id,
                "file_url": storage_key,  # Store key, not URL
                "file_name": safe_filename,
                "file_size": len(file_bytes),
                "status": "pending",
                "processing_error": None,
                "processed_at": None,
            }
        )
        .execute()
    )

    invoice_data = invoice_resp.data[0] if invoice_resp.data else None
    if not isinstance(invoice_data, dict):
        # Cleanup uploaded file on DB error
        await storage.delete(storage_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invoice creation failed",
        )

    invoice_id = invoice_data.get("id")
    if not isinstance(invoice_id, str) or not invoice_id:
        await storage.delete(storage_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invoice creation failed",
        )

    background_tasks.add_task(_process_invoice_background, invoice_id, current_user.id)

    refreshed = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    return refreshed.data[0] if refreshed.data else invoice_data


@router.post("/invoices/upload-zip", status_code=status.HTTP_201_CREATED)
async def upload_invoice_zip(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: UserContext = Depends(get_current_user_context),
):
    require_owner(current_user)
    supabase = get_supabase()
    storage = get_storage_service()

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a .zip file",
        )

    file_bytes = await file.read()

    try:
        zip_file = ZipFile(BytesIO(file_bytes))
    except BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ZIP file",
        )

    created: list[str] = []
    errors: list[dict[str, str]] = []
    valid_entries = 0

    with zip_file:
        for info in zip_file.infolist():
            if info.is_dir():
                continue

            entry_name = Path(info.filename).name
            if not entry_name:
                continue

            if not _is_allowed_invoice_file(entry_name):
                errors.append(
                    {
                        "file": entry_name,
                        "error": "Unsupported file type",
                    }
                )
                continue

            valid_entries += 1

            try:
                entry_bytes = zip_file.read(info)
                if not entry_bytes:
                    raise ValueError("File is empty")

                upload_mime_type = _guess_mime_type(entry_name)

                storage_key = storage.generate_key(
                    user_id=current_user.id,
                    category="invoices",
                    filename=entry_name,
                    include_date=True,
                )

                await storage.upload(entry_bytes, storage_key, upload_mime_type)

                invoice_resp = (
                    supabase.table("invoices")
                    .insert(
                        {
                            "user_id": current_user.id,
                            "file_url": storage_key,
                            "file_name": entry_name,
                            "file_size": len(entry_bytes),
                            "status": "pending",
                            "processing_error": None,
                            "processed_at": None,
                        }
                    )
                    .execute()
                )

                invoice_data = invoice_resp.data[0] if invoice_resp.data else None
                if not isinstance(invoice_data, dict):
                    await storage.delete(storage_key)
                    raise ValueError("Invoice creation failed")

                invoice_id = invoice_data.get("id")
                if not isinstance(invoice_id, str) or not invoice_id:
                    await storage.delete(storage_key)
                    raise ValueError("Invoice creation failed")

                background_tasks.add_task(
                    _process_invoice_background, invoice_id, current_user.id
                )
                created.append(invoice_id)
            except Exception as exc:
                logger.exception(
                    "Invoice ZIP upload failed for %s (user_id=%s): %s",
                    entry_name,
                    current_user.id,
                    exc,
                )
                errors.append(
                    {
                        "file": entry_name,
                        "error": str(exc),
                    }
                )

    if valid_entries == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ZIP contains no supported invoice files",
        )

    return {
        "created": len(created),
        "failed": len(errors),
        "errors": errors,
        "invoice_ids": created,
    }


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: str, current_user: UserContext = Depends(get_current_user_context)
):
    require_owner(current_user)
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
async def process_invoice(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    current_user: UserContext = Depends(get_current_user_context),
):
    require_owner(current_user)
    supabase = get_supabase()

    invoice_resp = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    invoice_data = invoice_resp.data[0] if invoice_resp.data else None
    if not isinstance(invoice_data, dict):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if invoice_data.get("status") in ("processing", "processed"):
        return invoice_data

    background_tasks.add_task(_process_invoice_background, invoice_id, current_user.id)

    refreshed = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    return refreshed.data[0] if refreshed.data else invoice_data


@router.get("/invoices/{invoice_id}/items", response_model=list[InvoiceItemOut])
def list_invoice_items(
    invoice_id: str, current_user: UserContext = Depends(get_current_user_context)
):
    require_owner(current_user)
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
    current_user: UserContext = Depends(get_current_user_context),
):
    require_owner(current_user)
    supabase = get_supabase()

    # Step 1: Verify invoice item belongs to user
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

    # Step 2: Verify product belongs to user (BEFORE updating)
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

    # Step 3: Update invoice item (WITH ownership check)
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
        .eq("user_id", current_user.id)
        .execute()
    )

    # Step 4: Update product price
    invoice_resp = (
        supabase.table("invoices")
        .select("supplier_name, invoice_date")
        .eq("id", invoice_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    invoice_data = invoice_resp.data[0] if invoice_resp.data else {}

    if invoice_data:
        supabase.table("products").update(
            {
                "last_price": item["unit_price"],
                "last_supplier": invoice_data.get("supplier_name"),
                "last_price_date": invoice_data.get("invoice_date")
                or datetime.now(timezone.utc).date().isoformat(),
            }
        ).eq("id", product_id).eq("user_id", current_user.id).execute()

    try:
        normalized_raw = _normalize_alias_text(item.get("raw_text"))
        supplier_key = _normalize_alias_text(invoice_data.get("supplier_name"))
        if normalized_raw:
            supabase.table("invoice_item_aliases").upsert(
                {
                    "user_id": current_user.id,
                    "supplier_name": supplier_key,
                    "raw_text": item.get("raw_text") or "",
                    "normalized_text": normalized_raw,
                    "product_id": product_id,
                },
                on_conflict="user_id,supplier_name,normalized_text",
            ).execute()
    except Exception as exc:
        logger.warning("Failed to store invoice alias: %s", exc)

    return updated.data[0] if updated.data else item


@router.post("/invoices/{invoice_id}/auto-create-products")
def auto_create_products_from_invoice(
    invoice_id: str,
    current_user: UserContext = Depends(get_current_user_context),
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
    require_owner(current_user)
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
            product_resp = supabase.table("products").insert(product_data).execute()
            if product_resp.data:
                new_product = product_resp.data[0]
                created_products.append(new_product)

                # Update invoice item with match
                supabase.table("invoice_items").update(
                    {
                        "matched_product_id": new_product["id"],
                        "match_confidence": 1.0,
                        "is_manually_matched": False,  # Auto-created
                    }
                ).eq("id", item["id"]).execute()

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
                supabase.table("invoice_items").update(
                    {
                        "matched_product_id": existing.data[0]["id"],
                        "match_confidence": 0.9,
                        "is_manually_matched": False,
                    }
                ).eq("id", item["id"]).execute()

    return {
        "message": f"{len(created_products)} products created",
        "created": created_products,
        "count": len(created_products),
    }


@router.get("/invoices/{invoice_id}/unmatched-count")
def get_unmatched_count(
    invoice_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Get count of unmatched items in an invoice."""
    require_owner(current_user)
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
def smart_match_all_invoices(
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    Use AI to match ALL unmatched invoice items to products.

    This endpoint:
    1. Gets all products for the user
    2. Gets all unmatched invoice items
    3. Uses Gemini to intelligently match them
    4. Updates matches in database

    Use this after uploading multiple invoices to bulk-match.
    """
    require_owner(current_user)
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
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    Use AI to match unmatched items for a specific invoice.

    More efficient than match-all when working with single invoices.
    """
    require_owner(current_user)
    result = match_products_for_invoice(current_user.id, invoice_id)

    if "error" in result and result["error"] == "Invoice not found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return result
