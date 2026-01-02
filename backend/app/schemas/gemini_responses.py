from pydantic import BaseModel, Field


class ProductRecognitionResponse(BaseModel):
    brand: str
    product_name: str
    variant: str | None = None
    size_ml: int
    size_display: str
    category: str
    packaging: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    barcode: str | None = None


class InvoiceItem(BaseModel):
    description: str
    quantity: int
    unit: str
    unit_price_net: float
    unit_price_gross: float
    vat_rate: float
    total_gross: float


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
