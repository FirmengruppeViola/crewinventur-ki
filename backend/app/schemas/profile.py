from pydantic import BaseModel, EmailStr


class ProfileBase(BaseModel):
    display_name: str | None = None
    company_name: str | None = None


class ProfileUpdate(ProfileBase):
    pass


class ProfileOut(ProfileBase):
    id: str
    email: EmailStr
