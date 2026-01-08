import base64
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status

from app.api.deps import get_current_user
from app.core.gemini import GeminiError
from app.core.supabase import get_supabase
from app.services.product_recognition import recognize_product, recognize_multiple_products
from app.services.invoice_extraction import extract_invoice

router = APIRouter()
logger = logging.getLogger(__name__)


def _strip_data_prefix(value: str) -> str:
    """Strip data URL prefix from base64 string."""
    if "," in value:
        return value.split(",", 1)[1]
    return value


@router.post("/ai/recognize-product")
async def recognize_product_endpoint(
    request: Request,
    image: UploadFile | None = None,
    current_user=Depends(get_current_user),
):
    """Recognize a single product from an image using AI."""
    supabase = get_supabase()
    image_base64: str | None = None
    save_if_new = False

    if image is not None:
        image_bytes = await image.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        form = await request.form()
        save_if_new = str(form.get("save_if_new", "false")).lower() == "true"
        mime_type = image.content_type or "image/jpeg"
    else:
        payload = await request.json()
        image_base64 = payload.get("image")
        save_if_new = bool(payload.get("save_if_new", False))
        mime_type = payload.get("mime_type", "image/jpeg")

    if not image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image is required",
        )

    image_base64 = _strip_data_prefix(image_base64)

    categories_resp = (
        supabase.table("categories")
        .select("name")
        .eq("is_system", True)
        .execute()
    )
    categories = [row["name"] for row in categories_resp.data or []]

    try:
        recognition = recognize_product(image_base64, categories, mime_type=mime_type)
    except GeminiError as e:
        logger.error(f"AI recognition failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"KI-Service nicht erreichbar. Bitte erneut versuchen.",
        ) from e

    existing_match = None
    is_new = True

    if recognition.barcode:
        existing = (
            supabase.table("products")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("barcode", recognition.barcode)
            .limit(1)
            .execute()
        )
        if existing.data:
            existing_match = existing.data[0]
            is_new = False

    if existing_match is None:
        query = (
            supabase.table("products")
            .select("*")
            .eq("user_id", current_user.id)
            .ilike("name", f"%{recognition.product_name}%")
        )
        if recognition.brand:
            query = query.ilike("brand", f"%{recognition.brand}%")
        response = query.limit(1).execute()
        if response.data:
            existing_match = response.data[0]
            is_new = False

    saved_product = None
    if save_if_new and is_new:
        insert_resp = (
            supabase.table("products")
            .insert(
                {
                    "user_id": current_user.id,
                    "name": recognition.product_name,
                    "brand": recognition.brand,
                    "variant": recognition.variant,
                    "size": recognition.size_display,
                    "unit": "Stueck",
                    "barcode": recognition.barcode,
                    "ai_description": f"{recognition.brand} {recognition.product_name}",
                    "ai_confidence": recognition.confidence,
                }
            )
            .execute()
        )
        saved_product = insert_resp.data[0] if insert_resp.data else None
        existing_match = saved_product
        is_new = saved_product is not None

    return {
        "product": recognition.model_dump(),
        "existing_match": existing_match,
        "is_new": is_new,
    }


@router.post("/ai/recognize-multiple")
async def recognize_multiple_endpoint(
    request: Request,
    image: UploadFile | None = None,
    current_user=Depends(get_current_user),
):
    """Recognize multiple products from an image (e.g., shelf scan)."""
    supabase = get_supabase()
    image_base64: str | None = None

    if image is not None:
        image_bytes = await image.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        mime_type = image.content_type or "image/jpeg"
    else:
        payload = await request.json()
        image_base64 = payload.get("image")
        mime_type = payload.get("mime_type", "image/jpeg")

    if not image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image is required",
        )

    image_base64 = _strip_data_prefix(image_base64)

    categories_resp = (
        supabase.table("categories")
        .select("name")
        .eq("is_system", True)
        .execute()
    )
    categories = [row["name"] for row in categories_resp.data or []]

    try:
        products = recognize_multiple_products(image_base64, categories, mime_type=mime_type)
    except GeminiError as e:
        logger.error(f"AI multi-recognition failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"KI-Service nicht erreichbar. Bitte erneut versuchen.",
        ) from e

    return {"products": [product.model_dump() for product in products]}


@router.post("/ai/extract-invoice")
async def extract_invoice_endpoint(
    request: Request,
    file: UploadFile | None = None,
    current_user=Depends(get_current_user),
):
    """Extract invoice data from a PDF or image using AI."""
    file_base64: str | None = None
    mime_type = "application/pdf"

    if file is not None:
        file_bytes = await file.read()
        file_base64 = base64.b64encode(file_bytes).decode("utf-8")
        mime_type = file.content_type or mime_type
    else:
        payload = await request.json()
        file_base64 = payload.get("file")
        mime_type = payload.get("mime_type", mime_type)

    if not file_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is required",
        )

    file_base64 = _strip_data_prefix(file_base64)

    try:
        extraction = extract_invoice(file_base64, mime_type=mime_type)
    except GeminiError as e:
        logger.error(f"AI invoice extraction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"KI-Service nicht erreichbar. Bitte erneut versuchen.",
        ) from e

    return extraction.model_dump()
