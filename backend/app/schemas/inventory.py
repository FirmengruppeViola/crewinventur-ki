from pydantic import BaseModel, Field
from typing import Literal


class InventorySessionBase(BaseModel):
    location_id: str
    name: str | None = None


class InventorySessionCreate(InventorySessionBase):
    pass


class InventorySessionUpdate(BaseModel):
    name: str | None = None
    status: str | None = None


class InventorySessionOut(InventorySessionBase):
    id: str
    user_id: str
    status: str
    started_at: str | None = None
    completed_at: str | None = None
    total_items: int
    total_value: float
    previous_session_id: str | None = None


class InventoryItemBase(BaseModel):
    product_id: str
    # New: Full + Partial quantity (Anbruch)
    full_quantity: float = Field(ge=0, description="Number of complete units")
    partial_quantity: float | None = Field(default=0, ge=0, le=1, description="Partial unit (0.0-1.0)")
    partial_fill_percent: int | None = Field(default=0, ge=0, le=100, description="Fill % for display")
    # Legacy field - computed from full + partial
    quantity: float | None = Field(default=None, description="Total quantity (computed)")
    unit_price: float | None = None
    notes: str | None = None
    scan_method: Literal["photo", "shelf", "barcode", "manual"] | None = None
    ai_confidence: float | None = None
    ai_suggested_quantity: int | None = None


class InventoryItemCreate(BaseModel):
    """Create inventory item - supports both new and legacy format."""
    product_id: str
    # New format: full + partial
    full_quantity: float | None = Field(default=None, ge=0)
    partial_quantity: float | None = Field(default=0, ge=0, le=1)
    partial_fill_percent: int | None = Field(default=0, ge=0, le=100)
    # Legacy format: just quantity (for backwards compatibility)
    quantity: float | None = Field(default=None, gt=0)
    unit_price: float | None = None
    notes: str | None = None
    scan_method: Literal["photo", "shelf", "barcode", "manual"] | None = None
    ai_confidence: float | None = None
    ai_suggested_quantity: int | None = None
    # Duplicate handling
    merge_mode: Literal["add", "replace", "new_entry"] | None = Field(
        default=None,
        description="How to handle if product already in session"
    )


class InventoryItemUpdate(BaseModel):
    full_quantity: float | None = Field(default=None, ge=0)
    partial_quantity: float | None = Field(default=None, ge=0, le=1)
    partial_fill_percent: int | None = Field(default=None, ge=0, le=100)
    quantity: float | None = Field(default=None, gt=0)  # Legacy
    unit_price: float | None = None
    notes: str | None = None


class InventoryItemOut(BaseModel):
    id: str
    session_id: str
    product_id: str
    full_quantity: float | None = None
    partial_quantity: float | None = None
    partial_fill_percent: int | None = None
    quantity: float | None = None
    unit_price: float | None = None
    total_price: float | None = None
    previous_quantity: float | None = None
    quantity_difference: float | None = None
    scanned_at: str | None = None
    scan_method: str | None = None
    ai_confidence: float | None = None
    ai_suggested_quantity: int | None = None
    notes: str | None = None


# =====================================================
# Scan-specific schemas
# =====================================================

class ScanResult(BaseModel):
    """Result of scanning a product image."""
    recognized_product: dict  # ProductRecognitionResponse
    matched_product: dict | None = None  # Existing product from DB
    is_new: bool = True
    duplicate_in_session: dict | None = None  # If product already in this session
    suggested_quantity: int | None = None  # AI-suggested count (for shelf scan)


class ShelfScanResult(BaseModel):
    """Result of scanning a shelf (multiple products)."""
    products: list[ScanResult]
    total_recognized: int
