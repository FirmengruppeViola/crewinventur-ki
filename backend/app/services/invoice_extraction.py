"""
Invoice Extraction Service using Gemini 3 Flash.

Uses HIGH thinking level for accurate extraction of:
- Supplier info
- Line items with prices and VAT
- Totals and calculations
- AI-normalized product names for matching
"""

import base64
import logging

from app.core.gemini import generate_structured, ThinkingLevel
from app.schemas.gemini_responses import InvoiceExtractionResponse

logger = logging.getLogger(__name__)


def _build_prompt() -> str:
    """Build prompt for invoice extraction."""
    return """Extrahiere alle Rechnungsdaten aus dem Dokument.

WICHTIG - Analysiere gruendlich:
1. Lieferant/Absender oben auf der Rechnung
2. Rechnungsnummer und -datum
3. ALLE Positionen mit Preisen und MwSt
4. Summen (Netto, MwSt 7%, MwSt 19%, Brutto)

invoice_date im Format YYYY-MM-DD.

Fuer jede Position:
- description: Original-Text von der Rechnung (exakt wie gedruckt)
- quantity: Menge als Integer
- unit: Einheit (Stk, Fl, Kar, Kis, etc.)
- unit_price_net: Netto-Einzelpreis
- unit_price_gross: Brutto-Einzelpreis
- vat_rate: MwSt-Satz (7 oder 19)
- total_gross: Brutto-Gesamtpreis der Position

WICHTIG - AI-Normalisierung fuer Produktzuordnung:
- normalized_name: Vollstaendiger, sauberer Produktname
  (z.B. "Jägerm. 0.7 Kräuterl." → "Jägermeister Kräuterlikör 0,7l")
- normalized_brand: Marke ausgeschrieben (z.B. "Mast-Jägermeister")
- normalized_size: Groesse einheitlich (z.B. "0,7l", "1L", "0,33l", "20x0,5l")
- normalized_category: Eine von:
  Spirituosen, Bier, Wein, Sekt, Softdrinks, Säfte, Wasser,
  Lebensmittel, Snacks, Tabak, Reinigung, Sonstiges

Entschluessele Abkuerzungen intelligent:
- "Jägerm." → "Jägermeister"
- "CoCo" → "Coca-Cola"
- "Kräuterl." → "Kräuterlikör"
- "MW" → "Mehrweg"

confidence: Deine Sicherheit bei der Extraktion (0.0-1.0)"""


def extract_invoice(
    file_base64: str,
    mime_type: str = "application/pdf",
) -> InvoiceExtractionResponse:
    """
    Extract invoice data from a PDF or image.

    Uses HIGH thinking level for maximum accuracy with
    complex tabular data and calculations.

    Args:
        file_base64: Base64 encoded file (PDF or image)
        mime_type: File MIME type

    Returns:
        InvoiceExtractionResponse with extracted data

    Raises:
        GeminiError: When AI processing fails
    """
    logger.info(f"Extracting invoice data, mime_type={mime_type}")

    file_bytes = base64.b64decode(file_base64)
    prompt = _build_prompt()

    # Use HIGH thinking for complex invoice analysis
    data = generate_structured(
        prompt=prompt,
        response_schema=InvoiceExtractionResponse,
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
