import base64
import logging

from pydantic import ValidationError

from app.core.gemini import generate_json, ThinkingLevel
from app.schemas.gemini_responses import ProductRecognitionResponse

logger = logging.getLogger(__name__)


def _safe_validate_product(data: dict) -> ProductRecognitionResponse:
    """
    Safely validate product recognition data.
    Returns a low-confidence fallback if validation fails.
    """
    try:
        return ProductRecognitionResponse.model_validate(data)
    except ValidationError as e:
        logger.warning(f"Product validation failed, using fallback: {e}")
        # Return a fallback with whatever data we can extract
        return ProductRecognitionResponse(
            brand=str(data.get("brand", "")) if data.get("brand") else "",
            product_name=str(data.get("product_name", "")) or "Nicht erkannt",
            variant=str(data.get("variant")) if data.get("variant") else None,
            size_ml=data.get("size_ml") if isinstance(data.get("size_ml"), int) else None,
            size_display=str(data.get("size_display")) if data.get("size_display") else None,
            category=str(data.get("category", "Unbekannt")) or "Unbekannt",
            packaging=str(data.get("packaging")) if data.get("packaging") else None,
            confidence=0.1,  # Low confidence for fallback
            barcode=str(data.get("barcode")) if data.get("barcode") else None,
        )


def _build_prompt(categories: list[str]) -> str:
    """Build prompt for single product recognition."""
    categories_text = ", ".join(categories) if categories else "Unbekannt"
    return (
        "Du bist eine KI fuer Produkt-Erkennung in der Gastronomie. "
        "Analysiere das Produkt auf dem Bild und antworte NUR mit JSON im Schema: "
        "{brand, product_name, variant, size_ml, size_display, category, packaging, confidence, barcode}. "
        f"Kategorie MUSS eine der folgenden sein: {categories_text}. "
        "confidence ist 0.0 bis 1.0. size_display ist z.B. '0.33l' oder '500ml'. "
        "barcode nur falls sichtbar."
    )


def recognize_product(
    image_base64: str,
    categories: list[str],
    mime_type: str = "image/jpeg",
) -> ProductRecognitionResponse:
    """
    Recognize a single product from an image.

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
    prompt = _build_prompt(categories)

    data = generate_json(
        prompt=prompt,
        image_bytes=image_bytes,
        mime_type=mime_type,
        thinking_level=ThinkingLevel.MINIMAL,
    )

    result = _safe_validate_product(data)
    logger.info(f"Product recognized: {result.brand} {result.product_name}, confidence={result.confidence}")
    return result


def recognize_multiple_products(
    image_base64: str,
    categories: list[str],
    mime_type: str = "image/jpeg",
) -> list[ProductRecognitionResponse]:
    """
    Recognize multiple products from an image (e.g., shelf scan).

    Args:
        image_base64: Base64 encoded image
        categories: List of valid categories
        mime_type: Image MIME type

    Returns:
        List of ProductRecognitionResponse for each recognized product

    Raises:
        GeminiError: When AI processing fails
    """
    logger.info(f"Recognizing multiple products, categories={len(categories)}")

    image_bytes = base64.b64decode(image_base64)
    categories_text = ", ".join(categories) if categories else "Unbekannt"
    prompt = (
        "Erkenne mehrere Produkte auf dem Bild. Antworte NUR mit JSON im Schema: "
        "{products: [ {brand, product_name, variant, size_ml, size_display, category, packaging, confidence, barcode} ]}. "
        f"Kategorie MUSS eine der folgenden sein: {categories_text}."
    )

    data = generate_json(
        prompt=prompt,
        image_bytes=image_bytes,
        mime_type=mime_type,
        thinking_level=ThinkingLevel.LOW,
    )

    items = data.get("products", data) if isinstance(data, dict) else data
    if not isinstance(items, list):
        logger.warning("Response was not a list, returning empty")
        items = []

    results = [_safe_validate_product(item) for item in items if isinstance(item, dict)]
    logger.info(f"Recognized {len(results)} products")
    return results
