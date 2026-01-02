from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class TeamMemberBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr | None = None
    role: str = Field(default="manager")


class TeamMemberCreate(TeamMemberBase):
    location_ids: list[str] = Field(default_factory=list, description="UUIDs der zugewiesenen Locations")


class TeamMemberUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    location_ids: list[str] | None = None
    is_active: bool | None = None


class TeamMemberOut(TeamMemberBase):
    id: str
    owner_id: str
    user_id: str | None  # NULL bis Einladung angenommen
    invitation_code: str | None
    invitation_expires_at: datetime | None
    invitation_accepted_at: datetime | None
    is_active: bool
    created_at: datetime
    location_ids: list[str] = Field(default_factory=list)


class InvitationAccept(BaseModel):
    """Request body für Code-Einlösung"""
    invitation_code: str = Field(min_length=6, max_length=10)


class InvitationResult(BaseModel):
    """Response nach erfolgreicher Code-Einlösung"""
    success: bool
    message: str
    team_member_id: str | None = None
    owner_company_name: str | None = None
    location_names: list[str] = Field(default_factory=list)
    # Auth-Token wird separat gehandhabt (Supabase Session)


class SendInvitationRequest(BaseModel):
    """Request für Email-Versand"""
    team_member_id: str
    send_email: bool = True
