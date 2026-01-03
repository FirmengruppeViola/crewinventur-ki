from datetime import datetime
from pydantic import BaseModel, Field


class LocationBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    is_active: bool | None = None


class LocationOut(LocationBase):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
