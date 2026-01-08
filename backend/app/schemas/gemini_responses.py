from pydantic import BaseModel, Field


class ProductRecognitionResponse(BaseModel):
    brand: str = ""
    product_name: str = ""
    variant: str | None = None
    size_ml: int | None = None
    size_display: str | None = None
    category: str = "Unbekannt"
    packaging: str | None = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    barcode: str | None = None


class InvoiceItem(BaseModel):
    description: str  # Original text from invoice (e.g., "Jägerm. 0.7 Kräuterl.")
    quantity: int
    unit: str
    unit_price_net: float
    unit_price_gross: float
    vat_rate: float
    total_gross: float
    # AI-normalized fields for better matching
    normalized_name: str | None = None  # Clean product name (e.g., "Jägermeister 0,7l")
    normalized_brand: str | None = None  # Brand if detectable
    normalized_size: str | None = None  # Size/volume (e.g., "0,7l", "1L")
    normalized_category: str | None = None  # Category (e.g., "Spirituosen", "Softdrinks")


class InvoiceTotals(BaseModel):
    net: float
    vat_7: float
    vat_19: float
    gross: float


class InvoiceExtractionResponse(BaseModel):
    supplier_name: str | None = None
    invoice_number: str | None = None
    invoice_date: str | None = None
    items: list[InvoiceItem]
    totals: InvoiceTotals
    confidence: float = Field(ge=0.0, le=1.0)
