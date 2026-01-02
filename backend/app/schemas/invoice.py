from pydantic import BaseModel


class InvoiceBase(BaseModel):
    supplier_name: str | None = None
    invoice_number: str | None = None
    invoice_date: str | None = None


class InvoiceOut(InvoiceBase):
    id: str
    user_id: str
    file_url: str
    file_name: str
    file_size: int | None = None
    status: str
    processing_error: str | None = None
    processed_at: str | None = None
    total_amount: float | None = None
    item_count: int


class InvoiceItemOut(BaseModel):
    id: str
    invoice_id: str
    user_id: str
    raw_text: str
    product_name: str
    quantity: float | None = None
    unit: str | None = None
    unit_price: float
    total_price: float | None = None
    matched_product_id: str | None = None
    match_confidence: float | None = None
    is_manually_matched: bool
