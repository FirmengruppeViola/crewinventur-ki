"""
Product Recognition Service using Gemini 3 Flash.

Provides AI-powered product recognition for:
- Single product scans (fast, MINIMAL thinking)
- Shelf scans with multiple products (MEDIUM thinking)
"""

import base64
import logging

from app.core.gemini import (
    generate_structured,
    generate_structured_list,
    ThinkingLevel,
)
from app.schemas.gemini_responses import ProductRecognitionResponse

logger = logging.getLogger(__name__)


def _build_single_prompt(categories: list[str]) -> str:
    """Build prompt for single product recognition."""
    categories_text = ", ".join(categories) if categories else "Unbekannt"
    return (
        "Analysiere das Produkt auf dem Bild. "
        "Erkenne Marke, Name, Variante, Groesse und Kategorie. "
        f"Kategorie MUSS eine der folgenden sein: {categories_text}. "
        "confidence ist deine Sicherheit von 0.0 bis 1.0. "
        "size_display ist z.B. '0.33l', '500ml', '1L'. "
        "barcode nur falls auf dem Bild sichtbar, sonst null."
    )


def _build_shelf_prompt(categories: list[str]) -> str:
    """Build prompt for shelf/multi-product recognition."""
    categories_text = ", ".join(categories) if categories else "Unbekannt"
    return (
        "Erkenne ALLE sichtbaren Produkte auf dem Bild (Regal/Theke). "
        "Fuer jedes Produkt: Marke, Name, Variante, Groesse, Kategorie. "
        f"Kategorie MUSS eine der folgenden sein: {categories_text}. "
        "confidence ist deine Sicherheit pro Produkt (0.0-1.0). "
        "Zaehle wie viele von jedem Produkt sichtbar sind falls moeglich."
    )


def recognize_product(
    image_base64: str,
    categories: list[str],
    mime_type: str = "image/jpeg",
) -> ProductRecognitionResponse:
    """
    Recognize a single product from an image.

    Uses MINIMAL thinking for fast response (~1-2s).

    Args:
        image_base64: Base64 encoded image
        categories: List of valid categories
        mime_type: Image MIME type

    Returns:
        ProductRecognitionResponse with recognized product data

    Raises:
        GeminiError: When AI processing fails
    """
    logger.info(f"Recognizing single product, categories={len(categories)}")

    image_bytes = base64.b64decode(image_base64)
    prompt = _build_single_prompt(categories)

    # Use structured output with MINIMAL thinking for speed
    data = generate_structured(
        prompt=prompt,
        response_schema=ProductRecognitionResponse,
        image_bytes=image_bytes,
        mime_type=mime_type,
        thinking_level=ThinkingLevel.MINIMAL,
    )

    result = ProductRecognitionResponse.model_validate(data)
    logger.info(
        f"Product recognized: {result.brand} {result.product_name}, "
        f"confidence={result.confidence}"
    )
    return result


def recognize_multiple_products(
    image_base64: str,
    categories: list[str],
    mime_type: str = "image/jpeg",
) -> list[ProductRecognitionResponse]:
    """
    Recognize multiple products from an image (shelf scan).

    Uses MEDIUM thinking for accurate multi-product recognition.

    Args:
        image_base64: Base64 encoded image
        categories: List of valid categories
        mime_type: Image MIME type

    Returns:
        List of ProductRecognitionResponse for each recognized product

    Raises:
        GeminiError: When AI processing fails
    """
    logger.info(f"Recognizing multiple products (shelf scan), categories={len(categories)}")

    image_bytes = base64.b64decode(image_base64)
    prompt = _build_shelf_prompt(categories)

    # Use structured list output with MEDIUM thinking
    items = generate_structured_list(
        prompt=prompt,
        item_schema=ProductRecognitionResponse,
        image_bytes=image_bytes,
        mime_type=mime_type,
        thinking_level=ThinkingLevel.MEDIUM,
    )

    results = [ProductRecognitionResponse.model_validate(item) for item in items]
    logger.info(f"Recognized {len(results)} products from shelf scan")
    return results
