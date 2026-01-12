"""
Product Recognition Service using Gemini 3 Flash.

Provides AI-powered product recognition for:
- Single product scans (fast, MINIMAL thinking)
- Shelf scans with multiple products (MEDIUM thinking)

Prompts follow Gemini 3 best practices:
- Structured with XML tags
- Clear persona and context
- Few-shot examples
- Constraints at the end
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
    """Build optimized prompt for single product recognition."""
    categories_text = ", ".join(categories) if categories else "Unbekannt"

    return f"""<role>
Du bist ein Experte fuer Getraenke- und Lebensmittel-Erkennung in der deutschen Gastronomie.
Du arbeitest fuer ein Inventur-System das Gastronomen hilft, ihren Warenbestand zu erfassen.
</role>

<context>
Ein Gastronom fotografiert ein einzelnes Produkt (Flasche, Dose, Packung) fuer seine Inventur.
Das Foto zeigt typischerweise ein Etikett mit Marke, Produktname und Groessenangabe.
Korrekte Erkennung ist geschaeftskritisch fuer die Bestandsfuehrung.
</context>

<task>
Analysiere das Produktbild und extrahiere alle erkennbaren Informationen.
</task>

<examples>
Beispiel 1 - Spirituose:
Bild zeigt gruene Flasche mit Hirsch-Logo
Ergebnis: brand="Jaegermeister", product_name="Kraeuterlikor", size_display="0,7l", category="Spirituosen", confidence=0.95

Beispiel 2 - Softdrink:
Bild zeigt rote Dose mit weissem Schriftzug
Ergebnis: brand="Coca-Cola", product_name="Coca-Cola Classic", size_display="0,33l", category="Softdrinks", confidence=0.92

Beispiel 3 - Bier:
Bild zeigt braune Flasche, blaues Etikett, bayerisches Wappen
Ergebnis: brand="Paulaner", product_name="Weissbier", variant="Hefe-Weissbier", size_display="0,5l", category="Bier", confidence=0.88
</examples>

<output_fields>
- brand: Markenname (Hersteller)
- product_name: Produktbezeichnung (NIEMALS leer lassen!)
- variant: Variante falls erkennbar (z.B. "Zero", "Light", "Naturtrub")
- size_ml: Groesse in Millilitern als Zahl (z.B. 500, 700, 1000)
- size_display: Groesse lesbar (z.B. "0,5l", "330ml", "1L")
- category: Produktkategorie
- packaging: Verpackung (Flasche, Dose, Kasten, Fass, Tetra, PET)
- confidence: Deine Sicherheit 0.0-1.0
- barcode: EAN falls sichtbar, sonst null

WICHTIG fuer product_name:
- Bei teilweise erkennbarem Produkt: Beste Schaetzung + niedrige confidence
- Bei unerkennbarem Produkt: "Unbekanntes Produkt" + confidence unter 0.3
- NIEMALS leeren String zurueckgeben!
</output_fields>

<constraints>
- category MUSS exakt eine dieser sein: {categories_text}
- Bei unleserlichem/verdecktem Text: confidence unter 0.5 setzen
- Barcode NUR wenn tatsaechlich lesbare Ziffern sichtbar sind
- Deutsche Produktnamen bevorzugen
- Bei Unsicherheit: Lieber niedrige confidence als falsches Ergebnis
</constraints>"""


def _build_shelf_prompt(categories: list[str]) -> str:
    """Build optimized prompt for shelf/multi-product recognition."""
    categories_text = ", ".join(categories) if categories else "Unbekannt"

    return f"""<role>
Du bist ein Experte fuer Getraenke-Erkennung mit Fokus auf Mengenerfassung.
Du analysierst Regalfotos fuer ein Gastronomie-Inventursystem.
</role>

<context>
Ein Gastronom fotografiert ein Regal, eine Kuehltheke oder einen Getraenkebereich.
Das Bild enthaelt MEHRERE verschiedene Produkte, oft in unterschiedlichen Mengen.
Ziel ist die schnelle Erfassung des gesamten sichtbaren Bestands.
</context>

<task>
1. Identifiziere JEDES einzelne erkennbare Produkt im Bild
2. Fuer jedes Produkt einen separaten Eintrag erstellen
3. Auch teilweise sichtbare Produkte erfassen wenn erkennbar
</task>

<examples>
Beispiel - Kuehlregal:
Bild zeigt: Mehrere Paulaner Weissbier, einige Augustiner, zwei Erdinger

Ergebnis: 3 separate Eintraege:
1. brand="Paulaner", product_name="Weissbier", size_display="0,5l", category="Bier", confidence=0.9
2. brand="Augustiner", product_name="Helles", size_display="0,5l", category="Bier", confidence=0.85
3. brand="Erdinger", product_name="Weissbier Dunkel", size_display="0,5l", category="Bier", confidence=0.8
</examples>

<output_fields>
Fuer JEDES erkannte Produkt:
- brand, product_name, variant, size_ml, size_display, category, packaging
- confidence: Erkennungssicherheit fuer dieses spezifische Produkt
- barcode: nur falls lesbar

WICHTIG:
- Jedes unterschiedliche Produkt = ein Eintrag
- Gleiche Produkte NICHT mehrfach auflisten
- Bei teilweise verdeckten: Beste Schaetzung + niedrigere confidence
</output_fields>

<constraints>
- category MUSS eine dieser sein: {categories_text}
- Auch teilweise verdeckte Produkte erfassen wenn erkennbar
- Bei Unsicherheit: niedrige confidence, aber trotzdem erfassen
- Leere Liste nur wenn KEIN Produkt erkennbar
</constraints>"""


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

    # Ensure product_name is never empty
    if not result.product_name or result.product_name.strip() == "":
        result.product_name = "Unbekanntes Produkt"
        result.confidence = min(result.confidence, 0.2)

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
    logger.info(
        f"Recognizing multiple products (shelf scan), categories={len(categories)}"
    )

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

    results = []
    for item in items:
        result = ProductRecognitionResponse.model_validate(item)
        # Ensure product_name is never empty
        if not result.product_name or result.product_name.strip() == "":
            result.product_name = "Unbekanntes Produkt"
            result.confidence = min(result.confidence, 0.2)
        results.append(result)

    # Filter out low-confidence results (< 0.6)
    filtered_results = [r for r in results if r.confidence >= 0.6]
    logger.info(
        f"Recognized {len(results)} products, filtered to {len(filtered_results)} with confidence >= 0.6"
    )
    return filtered_results
