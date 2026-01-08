"""
Invoice Extraction Service using Gemini 3 Flash.

Uses HIGH thinking level for accurate extraction of:
- Supplier info
- Line items with prices and VAT
- Totals and calculations
- AI-normalized product names for matching

Prompts follow Gemini 3 best practices:
- Structured with XML tags
- Clear persona and context
- Few-shot examples
- Constraints at the end
"""

import base64
import logging

from app.core.gemini import generate_structured, ThinkingLevel
from app.schemas.gemini_responses import InvoiceExtractionResponse

logger = logging.getLogger(__name__)


def _build_prompt() -> str:
    """Build optimized prompt for invoice extraction."""
    return """<role>
Du bist ein Experte fuer die Analyse von Getraenke-Grosshandelsrechnungen in Deutschland.
Du verstehst MwSt-Berechnung (7% Lebensmittel, 19% Alkohol), Mengeneinheiten und Branchenabkuerzungen.
Du arbeitest fuer ein Gastronomie-Inventursystem das Einkaufspreise dokumentiert.
</role>

<context>
Ein Gastronom laedt eine Lieferantenrechnung hoch um seine Einkaufspreise zu dokumentieren.
Die Rechnung stammt von einem Getraenkegrosshaendler (Trinkgut, Getraenke Hoffmann, Fruehauf, etc.).
Korrekte Preiserfassung ist essentiell fuer Kalkulation, Buchhaltung und Preisvergleiche.
</context>

<task>
Extrahiere ALLE Daten aus der Rechnung:
1. Kopfdaten: Lieferant, Rechnungsnummer, Datum
2. JEDE einzelne Position mit allen Preisdetails
3. Summenblock: Netto, MwSt 7%, MwSt 19%, Brutto
4. Normalisiere Produktnamen fuer spaeteres Matching
</task>

<examples>
Beispiel Rechnungsposition:
Original auf Rechnung: "Jaegerm. 0.7 Kraeuterl. 6x0,7"

Extraktion:
- description: "Jaegerm. 0.7 Kraeuterl. 6x0,7" (exakt wie gedruckt)
- quantity: 6
- unit: "Fl"
- unit_price_net: 12.50
- unit_price_gross: 14.88
- vat_rate: 19
- total_gross: 89.28
- normalized_name: "Jaegermeister Kraeuterlikor 0,7l"
- normalized_brand: "Mast-Jaegermeister"
- normalized_size: "0,7l"
- normalized_category: "Spirituosen"

Beispiel Abkuerzungen die du kennen musst:
- "Jaegerm." = Jaegermeister
- "CoCo" oder "CC" = Coca-Cola
- "Kraeuterl." = Kraeuterlikor
- "MW" = Mehrweg
- "EW" = Einweg
- "Kis" oder "Kst" = Kasten
- "Fl" = Flasche
- "Do" = Dose
- "6er" = 6 Stueck
- "20x0,5" = 20 Flaschen a 0,5l (Kasten)
- "24x0,33" = 24 Dosen/Flaschen a 0,33l
</examples>

<output_fields>
Kopfdaten:
- supplier_name: Name des Lieferanten/Grosshaendlers
- invoice_number: Rechnungsnummer
- invoice_date: Datum im Format YYYY-MM-DD

Pro Position:
- description: EXAKT wie auf Rechnung gedruckt
- quantity: Menge als Integer
- unit: Einheit (Stk, Fl, Kar, Kis, Do, etc.)
- unit_price_net: Netto-Einzelpreis
- unit_price_gross: Brutto-Einzelpreis
- vat_rate: MwSt-Satz (7 oder 19)
- total_gross: Brutto-Gesamtpreis der Position

Normalisierung (WICHTIG fuer Produktzuordnung):
- normalized_name: Vollstaendiger, sauberer Produktname mit Groesse
- normalized_brand: Markenname ausgeschrieben
- normalized_size: Groesse einheitlich formatiert (z.B. "0,7l", "1L", "0,33l")
- normalized_category: Kategorie aus der Liste unten

Summen:
- totals.net: Netto-Gesamtsumme
- totals.vat_7: MwSt 7% Betrag
- totals.vat_19: MwSt 19% Betrag
- totals.gross: Brutto-Gesamtsumme

confidence: Deine Sicherheit bei der Extraktion (0.0-1.0)
</output_fields>

<constraints>
- invoice_date MUSS im Format YYYY-MM-DD sein
- Preise als Dezimalzahlen mit Punkt als Trenner (12.50 nicht 12,50)
- vat_rate: NUR 7 oder 19 (deutsche MwSt-Saetze)
- normalized_category MUSS eine dieser sein:
  Spirituosen, Bier, Wein, Sekt, Softdrinks, Saefte, Wasser,
  Lebensmittel, Snacks, Tabak, Reinigung, Sonstiges
- Bei unleserlichen Werten: confidence senken, NICHT raten
- ALLE Positionen extrahieren, auch Pfand und Leergut
- Bei Kaesten: Einzelpreis pro Flasche berechnen wenn moeglich
</constraints>"""


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

    # Log extraction results
    logger.info(
        f"Invoice extracted: supplier={result.supplier_name}, "
        f"items={len(result.items)}, confidence={result.confidence}"
    )

    # Warn if low confidence
    if result.confidence < 0.7:
        logger.warning(
            f"Low confidence extraction ({result.confidence:.2f}) for invoice "
            f"{result.invoice_number}"
        )

    return result
