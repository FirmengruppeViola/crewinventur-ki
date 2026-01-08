from pydantic import BaseModel


class UnitSizeOut(BaseModel):
    """Response model for unit sizes."""
    id: str
    category: str
    value: str
    value_ml: int | None = None
    sort_order: int | None = None
    is_system: bool


class UnitSizeCreate(BaseModel):
    """Request model for creating custom unit sizes."""
    category: str
    value: str
    value_ml: int | None = None
    sort_order: int | None = None
