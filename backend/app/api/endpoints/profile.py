from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.core.supabase import get_supabase
from app.schemas.profile import ProfileOut, ProfileUpdate

router = APIRouter()


@router.get("/profile", response_model=ProfileOut)
def get_profile(current_user=Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user.id

    response = (
        supabase.table("profiles")
        .select("id, email, display_name, company_name, accountant_name, accountant_email")
        .eq("id", user_id)
        .execute()
    )
    data = response.data[0] if response.data else None

    if data is None:
        insert_response = (
            supabase.table("profiles")
            .insert(
                {
                    "id": user_id,
                    "email": current_user.email or "",
                }
            )
            .execute()
        )
        data = insert_response.data[0] if insert_response.data else None

    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return data


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    current_user=Depends(get_current_user),
):
    supabase = get_supabase()
    user_id = current_user.id

    response = (
        supabase.table("profiles")
        .update(
            {
                "display_name": payload.display_name,
                "company_name": payload.company_name,
                "accountant_name": payload.accountant_name,
                "accountant_email": payload.accountant_email,
            }
        )
        .eq("id", user_id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return data
