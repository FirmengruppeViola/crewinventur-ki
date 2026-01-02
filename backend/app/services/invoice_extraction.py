import base64
import logging

from app.core.gemini import generate_json, ThinkingLevel
from app.schemas.gemini_responses import InvoiceExtractionResponse

logger = logging.getLogger(__name__)


def _build_prompt() -> str:
    """Build prompt for invoice extraction."""
    return """Extrahiere Rechnungsdaten aus dem Dokument. Antworte NUR mit JSON im Schema:
{supplier_name, invoice_number, invoice_date, items, totals, confidence}.

invoice_date im Format YYYY-MM-DD.

items ist eine Liste von Positionen mit:
{
  description: Original-Text von der Rechnung (z.B. "Jägerm. 0.7 Kräuterl."),
  quantity: Menge als Integer,
  unit: Einheit (Stk, Fl, Kar, etc.),
  unit_price_net: Netto-Einzelpreis,
  unit_price_gross: Brutto-Einzelpreis,
  vat_rate: MwSt-Satz (7 oder 19),
  total_gross: Brutto-Gesamtpreis,

  normalized_name: WICHTIG! Erkenne das tatsächliche Produkt und schreibe den vollständigen,
                   sauberen Produktnamen (z.B. "Jägermeister 0,7l" statt "Jägerm. 0.7"),
  normalized_brand: Marke wenn erkennbar (z.B. "Mast-Jägermeister", "Coca-Cola"),
  normalized_size: Größe/Volumen einheitlich (z.B. "0,7l", "1L", "0,33l"),
  normalized_category: Kategorie (Spirituosen, Bier, Wein, Softdrinks, Säfte, Wasser,
                       Lebensmittel, Snacks, Tabak, Sonstiges)
}

WICHTIG für normalized_name:
- Entschlüssele Abkürzungen (Jägerm. → Jägermeister, CocaCola → Coca-Cola)
- Füge Größe hinzu wenn nicht vorhanden
- Schreibe Marken korrekt aus
- Das ist für Produktzuordnung essentiell!

totals: {net, vat_7, vat_19, gross}
confidence: 0.0 bis 1.0"""


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

    data = generate_json(
        prompt=prompt,
        image_bytes=file_bytes,
        mime_type=mime_type,
        thinking_level=ThinkingLevel.HIGH,
    )

    result = InvoiceExtractionResponse.model_validate(data)
    logger.info(
        f"Invoice extracted: supplier={result.supplier_name}, "
        f"items={len(result.items)}, confidence={result.confidence}"
    )
    return result
