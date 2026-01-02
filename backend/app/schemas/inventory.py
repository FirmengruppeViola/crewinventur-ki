from pydantic import BaseModel, Field


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
    quantity: float = Field(gt=0)
    unit_price: float | None = None
    notes: str | None = None
    scan_method: str | None = None
    ai_confidence: float | None = None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    quantity: float | None = Field(default=None, gt=0)
    unit_price: float | None = None
    notes: str | None = None


class InventoryItemOut(InventoryItemBase):
    id: str
    session_id: str
    total_price: float | None = None
    previous_quantity: float | None = None
    quantity_difference: float | None = None
