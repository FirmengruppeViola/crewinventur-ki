from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    brand: str | None = None
    variant: str | None = None
    size: str | None = None
    unit: str | None = None
    barcode: str | None = None
    category_id: str | None = None
    image_url: str | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    brand: str | None = None
    variant: str | None = None
    size: str | None = None
    unit: str | None = None
    barcode: str | None = None
    category_id: str | None = None
    image_url: str | None = None
    last_price: float | None = None
    last_supplier: str | None = None


class ProductOut(ProductBase):
    id: str
    user_id: str
    last_price: float | None = None
    last_supplier: str | None = None
    ai_description: str | None = None
    ai_confidence: float | None = None
