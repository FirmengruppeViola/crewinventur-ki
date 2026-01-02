from pydantic import BaseModel


class BundleCreate(BaseModel):
    name: str
    session_ids: list[str]


class BundleOut(BaseModel):
    id: str
    user_id: str
    name: str
    created_at: str | None = None
    completed_at: str | None = None
    total_sessions: int
    total_items: int
    total_value: float


class BundleSessionOut(BaseModel):
    session_id: str
    location_name: str
    completed_at: str | None
    total_items: int
    total_value: float
