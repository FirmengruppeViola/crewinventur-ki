from pydantic import BaseModel, EmailStr


class ProfileBase(BaseModel):
    display_name: str | None = None
    company_name: str | None = None
    accountant_name: str | None = None
    accountant_email: str | None = None


class ProfileUpdate(ProfileBase):
    pass


class ProfileOut(ProfileBase):
    id: str
    email: EmailStr
