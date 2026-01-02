import base64
import logging

from app.core.gemini import generate_json_with_fallback, ThinkingLevel, GeminiError
from app.schemas.gemini_responses import ProductRecognitionResponse

logger = logging.getLogger(__name__)


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
        ValidationError: When response doesn't match schema
    """
    logger.info(f"Recognizing single product, categories={len(categories)}")

    image_bytes = base64.b64decode(image_base64)
    prompt = _build_prompt(categories)

    data = generate_json_with_fallback(
        prompt=prompt,
        image_bytes=image_bytes,
        mime_type=mime_type,
        thinking_level=ThinkingLevel.MINIMAL,  # Fast for single product
    )

    result = ProductRecognitionResponse.model_validate(data)
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

    data = generate_json_with_fallback(
        prompt=prompt,
        image_bytes=image_bytes,
        mime_type=mime_type,
        thinking_level=ThinkingLevel.LOW,  # More reasoning for multiple items
    )

    items = data.get("products", data) if isinstance(data, dict) else data
    if not isinstance(items, list):
        logger.warning("Response was not a list, returning empty")
        items = []

    results = [ProductRecognitionResponse.model_validate(item) for item in items]
    logger.info(f"Recognized {len(results)} products")
    return results
