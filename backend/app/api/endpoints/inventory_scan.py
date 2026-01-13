"""
Inventory Scan Endpoints - KI-powered product scanning for inventory sessions.

Provides endpoints for:
- Single product scan (photo → recognize → add to session)
- Shelf scan (photo → recognize multiple → batch add)
"""

import base64
import logging
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status

from app.api.deps import UserContext, get_current_user_context
from app.core.gemini import GeminiError
from app.core.supabase import get_supabase
from app.services.product_recognition import (
    recognize_product,
    recognize_multiple_products,
)
from app.schemas.inventory import ScanResult, ShelfScanResult

router = APIRouter()
logger = logging.getLogger(__name__)


def _verify_scan_session_access(
    supabase, session_id: str, current_user: UserContext
) -> dict[str, Any]:
    response = (
        supabase.table("inventory_sessions")
        .select("id, status, user_id, location_id")
        .eq("id", session_id)
        .limit(1)
        .execute()
    )

    session: dict[str, Any] | None = None
    if response.data and isinstance(response.data, list) and response.data:
        if isinstance(response.data[0], dict):
            session = cast(dict[str, Any], response.data[0])

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if current_user.is_owner:
        if session["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
    else:
        if session["user_id"] != current_user.effective_owner_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
        if session["location_id"] not in current_user.allowed_location_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active",
        )

    return session


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


def _create_product_from_recognition(
    supabase, user_id: str, recognition
) -> dict[str, Any] | None:
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

    if insert_resp.data and isinstance(insert_resp.data, list) and insert_resp.data:
        if isinstance(insert_resp.data[0], dict):
            return cast(dict[str, Any], insert_resp.data[0])

    return None


@router.post("/inventory/sessions/{session_id}/scan", response_model=ScanResult)
async def scan_for_inventory(
    session_id: str,
    request: Request,
    image: UploadFile | None = None,
    current_user: UserContext = Depends(get_current_user_context),
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

    _verify_scan_session_access(supabase, session_id, current_user)

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
    categories_data = categories_resp.data or []
    categories = [
        cast(str, row["name"])
        for row in categories_data
        if isinstance(row, dict) and isinstance(row.get("name"), str)
    ]

    # Call Gemini for product recognition
    try:
        recognition = recognize_product(image_base64, categories, mime_type=mime_type)
    except GeminiError as e:
        logger.error(f"AI recognition failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"KI-Service nicht erreichbar. Bitte erneut versuchen.",
        ) from e

    tenant_user_id = current_user.effective_owner_id

    # Check if product exists in user's database
    existing_product = _find_existing_product(supabase, tenant_user_id, recognition)
    is_new = existing_product is None

    # Auto-create if requested and product is new
    if is_new and auto_create:
        existing_product = _create_product_from_recognition(
            supabase, tenant_user_id, recognition
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
    current_user: UserContext = Depends(get_current_user_context),
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

    _verify_scan_session_access(supabase, session_id, current_user)

    tenant_user_id = current_user.effective_owner_id

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
    categories_data = categories_resp.data or []
    categories = [
        cast(str, row["name"])
        for row in categories_data
        if isinstance(row, dict) and isinstance(row.get("name"), str)
    ]

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
        existing_product = _find_existing_product(supabase, tenant_user_id, recognition)
        is_new = existing_product is None

        if is_new and auto_create:
            existing_product = _create_product_from_recognition(
                supabase, tenant_user_id, recognition
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
