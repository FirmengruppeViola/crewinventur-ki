import base64
import logging

from app.core.gemini import generate_json_with_fallback, ThinkingLevel, GeminiError
from app.schemas.gemini_responses import InvoiceExtractionResponse

logger = logging.getLogger(__name__)


def _build_prompt() -> str:
    """Build prompt for invoice extraction."""
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
) -> InvoiceExtractionResponse:
    """
    Extract invoice data from a PDF or image.

    Args:
        file_base64: Base64 encoded file (PDF or image)
        mime_type: File MIME type

    Returns:
        InvoiceExtractionResponse with extracted data

    Raises:
        GeminiError: When AI processing fails
        ValidationError: When response doesn't match schema
    """
    logger.info(f"Extracting invoice data, mime_type={mime_type}")

    file_bytes = base64.b64decode(file_base64)
    prompt = _build_prompt()

    data = generate_json_with_fallback(
        prompt=prompt,
        image_bytes=file_bytes,
        mime_type=mime_type,
        thinking_level=ThinkingLevel.HIGH,  # High reasoning for accurate numbers
    )

    result = InvoiceExtractionResponse.model_validate(data)
    logger.info(
        f"Invoice extracted: supplier={result.supplier_name}, "
        f"items={len(result.items)}, confidence={result.confidence}"
    )
    return result
