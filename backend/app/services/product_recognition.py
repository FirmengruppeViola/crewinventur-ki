import base64
from app.core.gemini import generate_json, MODEL_FALLBACK, MODEL_PRIMARY
from app.schemas.gemini_responses import ProductRecognitionResponse


def _build_prompt(categories: list[str]) -> str:
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
):
    image_bytes = base64.b64decode(image_base64)
    prompt = _build_prompt(categories)

    try:
        data = generate_json(prompt, image_bytes=image_bytes, mime_type=mime_type, model_name=MODEL_PRIMARY)
    except Exception:
        data = generate_json(prompt, image_bytes=image_bytes, mime_type=mime_type, model_name=MODEL_FALLBACK)

    return ProductRecognitionResponse.model_validate(data)


def recognize_multiple_products(
    image_base64: str,
    categories: list[str],
    mime_type: str = "image/jpeg",
):
    image_bytes = base64.b64decode(image_base64)
    categories_text = ", ".join(categories) if categories else "Unbekannt"
    prompt = (
        "Erkenne mehrere Produkte auf dem Bild. Antworte NUR mit JSON im Schema: "
        "{products: [ {brand, product_name, variant, size_ml, size_display, category, packaging, confidence, barcode} ]}. "
        f"Kategorie MUSS eine der folgenden sein: {categories_text}."
    )

    try:
        data = generate_json(prompt, image_bytes=image_bytes, mime_type=mime_type, model_name=MODEL_PRIMARY)
    except Exception:
        data = generate_json(prompt, image_bytes=image_bytes, mime_type=mime_type, model_name=MODEL_FALLBACK)

    items = data.get("products", data) if isinstance(data, dict) else data
    if not isinstance(items, list):
        items = []

    return [ProductRecognitionResponse.model_validate(item) for item in items]
