"""
Inventory Scan Endpoints - KI-powered product scanning for inventory sessions.

Provides endpoints for:
- Single product scan (photo → recognize → add to session)
- Shelf scan (photo → recognize multiple → batch add)
"""

import base64
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status

from app.api.deps import get_current_user
from app.core.gemini import GeminiError
from app.core.supabase import get_supabase
from app.services.product_recognition import (
    recognize_product,
    recognize_multiple_products,
)
from app.schemas.inventory import ScanResult, ShelfScanResult

router = APIRouter()
logger = logging.getLogger(__name__)


def _strip_data_prefix(value: str) -> str:
    """Strip data URL prefix from base64 string."""
    if "," in value:
        return value.split(",", 1)[1]
    return value


def _find_existing_product(supabase, user_id: str, recognition) -> dict | None:
    """Find existing product by barcode or name match."""
    # First try barcode match (most accurate) - normalize case
    if recognition.barcode:
        existing = (
            supabase.table("products")
            .select("*")
            .eq("user_id", user_id)
            .eq("barcode", recognition.barcode.upper())
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]

    # Then try name + brand match (case-insensitive)
    query = (
        supabase.table("products")
        .select("*")
        .eq("user_id", user_id)
        .ilike("name", f"%{recognition.product_name}%")
    )
    if recognition.brand:
        query = query.ilike("brand", f"%{recognition.brand}%")
    response = query.limit(1).execute()

    if response.data:
        return response.data[0]

    return None


def _check_duplicate_in_session(
    supabase, session_id: str, product_id: str
) -> dict | None:
    """Check if product already exists in this session."""
    existing = (
        supabase.table("inventory_items")
        .select("*")
        .eq("session_id", session_id)
        .eq("product_id", product_id)
        .execute()
    )
    return existing.data[0] if existing.data else None


def _create_product_from_recognition(supabase, user_id: str, recognition) -> dict:
    """Auto-create a new product from AI recognition."""
    insert_resp = (
        supabase.table("products")
        .insert(
            {
                "user_id": user_id,
                "name": recognition.product_name,
                "brand": recognition.brand,
                "variant": recognition.variant,
                "size": recognition.size_display,
                "unit": "Stück",
                "barcode": recognition.barcode,
                "ai_description": f"{recognition.brand or ''} {recognition.product_name}".strip(),
                "ai_confidence": recognition.confidence,
            }
        )
        .execute()
    )
    return insert_resp.data[0] if insert_resp.data else None


@router.post("/inventory/sessions/{session_id}/scan", response_model=ScanResult)
async def scan_for_inventory(
    session_id: str,
    request: Request,
    image: UploadFile | None = None,
    current_user=Depends(get_current_user),
):
    """
    Scan a product image and prepare it for adding to inventory session.

    Flow:
    1. Receive image (file upload or base64)
    2. Send to Gemini for product recognition
    3. Check if product exists in user's database
    4. If not found and auto_create=true, create new product
    5. Check if product already in this session (duplicate warning)
    6. Return scan result with all info for frontend

    The frontend then shows the result and lets user enter quantity.
    """
    supabase = get_supabase()

    # Verify session exists and belongs to user
    session = (
        supabase.table("inventory_sessions")
        .select("id, status")
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not session.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    if session.data[0]["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active",
        )

    # Get image from request
    image_base64: str | None = None
    auto_create = False

    if image is not None:
        image_bytes = await image.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        form = await request.form()
        auto_create = str(form.get("auto_create", "true")).lower() == "true"
        mime_type = image.content_type or "image/jpeg"
    else:
        payload = await request.json()
        image_base64 = payload.get("image")
        auto_create = bool(payload.get("auto_create", True))
        mime_type = payload.get("mime_type", "image/jpeg")

    if not image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image is required",
        )

    image_base64 = _strip_data_prefix(image_base64)

    # Get categories for recognition
    categories_resp = (
        supabase.table("categories").select("name").eq("is_system", True).execute()
    )
    categories = [row["name"] for row in categories_resp.data or []]

    # Call Gemini for product recognition
    try:
        recognition = recognize_product(image_base64, categories, mime_type=mime_type)
    except GeminiError as e:
        logger.error(f"AI recognition failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"KI-Service nicht erreichbar. Bitte erneut versuchen.",
        ) from e

    # Check if product exists in user's database
    existing_product = _find_existing_product(supabase, current_user.id, recognition)
    is_new = existing_product is None

    # Auto-create if requested and product is new
    if is_new and auto_create:
        existing_product = _create_product_from_recognition(
            supabase, current_user.id, recognition
        )
        if existing_product:
            is_new = False  # Now it exists
            logger.info(f"Auto-created product: {existing_product['id']}")

    # Check for duplicate in session
    duplicate_in_session = None
    if existing_product:
        duplicate_in_session = _check_duplicate_in_session(
            supabase, session_id, existing_product["id"]
        )

    # Check if category needs user confirmation
    needs_category = recognition.category == "Unbekannt" or recognition.confidence < 0.8

    return ScanResult(
        recognized_product=recognition.model_dump(),
        matched_product=existing_product,
        is_new=is_new,
        duplicate_in_session=duplicate_in_session,
        suggested_quantity=None,  # User enters manually
        needs_category=needs_category,
    )


@router.post(
    "/inventory/sessions/{session_id}/scan-shelf", response_model=ShelfScanResult
)
async def scan_shelf_for_inventory(
    session_id: str,
    request: Request,
    image: UploadFile | None = None,
    current_user=Depends(get_current_user),
):
    """
    Scan a shelf/rack image and recognize multiple products.

    Flow:
    1. Receive image of shelf
    2. Send to Gemini for multi-product recognition (with quantity estimation)
    3. For each recognized product:
       - Check if exists in database
       - Auto-create if requested
       - Check for duplicates in session
    4. Return list of scan results

    Frontend shows swipe cards for each product to confirm/enter quantities.
    """
    supabase = get_supabase()

    # Verify session
    session = (
        supabase.table("inventory_sessions")
        .select("id, status")
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not session.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    if session.data[0]["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active",
        )

    # Get image
    image_base64: str | None = None
    auto_create = True

    if image is not None:
        image_bytes = await image.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        form = await request.form()
        auto_create = str(form.get("auto_create", "true")).lower() == "true"
        mime_type = image.content_type or "image/jpeg"
    else:
        payload = await request.json()
        image_base64 = payload.get("image")
        auto_create = bool(payload.get("auto_create", True))
        mime_type = payload.get("mime_type", "image/jpeg")

    if not image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image is required",
        )

    image_base64 = _strip_data_prefix(image_base64)

    # Get categories
    categories_resp = (
        supabase.table("categories").select("name").eq("is_system", True).execute()
    )
    categories = [row["name"] for row in categories_resp.data or []]

    # Call Gemini for multi-product recognition
    try:
        products = recognize_multiple_products(
            image_base64, categories, mime_type=mime_type
        )
    except GeminiError as e:
        logger.error(f"AI shelf scan failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"KI-Service nicht erreichbar. Bitte erneut versuchen.",
        ) from e

    # Process each recognized product
    results: list[ScanResult] = []
    for recognition in products:
        existing_product = _find_existing_product(
            supabase, current_user.id, recognition
        )
        is_new = existing_product is None

        if is_new and auto_create:
            existing_product = _create_product_from_recognition(
                supabase, current_user.id, recognition
            )
            if existing_product:
                is_new = False

        duplicate_in_session = None
        if existing_product:
            duplicate_in_session = _check_duplicate_in_session(
                supabase, session_id, existing_product["id"]
            )

        # Check if category needs user confirmation
        needs_category = (
            recognition.category == "Unbekannt" or recognition.confidence < 0.8
        )

        results.append(
            ScanResult(
                recognized_product=recognition.model_dump(),
                matched_product=existing_product,
                is_new=is_new,
                duplicate_in_session=duplicate_in_session,
                suggested_quantity=None,  # User enters manually
                needs_category=needs_category,
            )
        )

    return ShelfScanResult(
        products=results,
        total_recognized=len(results),
    )
