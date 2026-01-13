from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import UserContext, get_current_user_context
from app.core.supabase import get_supabase
from app.schemas.category import CategoryCreate, CategoryOut

router = APIRouter()


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(current_user: UserContext = Depends(get_current_user_context)):
    supabase = get_supabase()
    tenant_user_id = current_user.effective_owner_id

    system = supabase.table("categories").select("*").eq("is_system", True).execute()
    user = (
        supabase.table("categories").select("*").eq("user_id", tenant_user_id).execute()
    )
    return (system.data or []) + (user.data or [])


@router.post(
    "/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED
)
def create_category(
    payload: CategoryCreate,
    current_user: UserContext = Depends(get_current_user_context),
):
    if current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can create categories",
        )

    tenant_user_id = current_user.effective_owner_id

    supabase = get_supabase()
    response = (
        supabase.table("categories")
        .insert(
            {
                "user_id": tenant_user_id,
                "name": payload.name,
                "parent_id": payload.parent_id,
                "icon": payload.icon,
                "sort_order": payload.sort_order or 0,
                "is_system": False,
            }
        )
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Category creation failed",
        )
    return data
