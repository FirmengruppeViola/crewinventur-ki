import base64
from app.core.gemini import generate_json, MODEL_FALLBACK, MODEL_PRIMARY
from app.schemas.gemini_responses import InvoiceExtractionResponse


def _build_prompt() -> str:
    return (
        "Extrahiere Rechnungsdaten aus dem Dokument. Antworte NUR mit JSON im Schema: "
        "{supplier_name, invoice_number, invoice_date, items, totals, confidence}. "
        "invoice_date im Format YYYY-MM-DD. items ist eine Liste von Positionen mit "
        "{description, quantity, unit, unit_price_net, unit_price_gross, vat_rate, total_gross}. "
        "totals: {net, vat_7, vat_19, gross}. confidence 0.0 bis 1.0."
    )


def extract_invoice(
    file_base64: str,
    mime_type: str = "application/pdf",
):
    file_bytes = base64.b64decode(file_base64)
    prompt = _build_prompt()

    try:
        data = generate_json(prompt, image_bytes=file_bytes, mime_type=mime_type, model_name=MODEL_PRIMARY)
    except Exception:
        data = generate_json(prompt, image_bytes=file_bytes, mime_type=mime_type, model_name=MODEL_FALLBACK)

    return InvoiceExtractionResponse.model_validate(data)
