from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import UserContext, get_current_user_context
from app.core.supabase import get_supabase
from app.schemas.unit_size import UnitSizeOut, UnitSizeCreate

router = APIRouter()


@router.get("/unit-sizes", response_model=list[UnitSizeOut])
def list_unit_sizes(
    category: str | None = None,
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    List all unit sizes (system + user-defined).
    Optionally filter by category.
    """
    supabase = get_supabase()

    # Build query for system units
    system_query = supabase.table("unit_sizes").select("*").eq("is_system", True)
    if category:
        system_query = system_query.eq("category", category)
    system_query = system_query.order("sort_order")
    system = system_query.execute()

    tenant_user_id = current_user.effective_owner_id

    # Build query for user units
    user_query = (
        supabase.table("unit_sizes")
        .select("*")
        .eq("user_id", tenant_user_id)
        .eq("is_system", False)
    )
    if category:
        user_query = user_query.eq("category", category)
    user_query = user_query.order("sort_order")
    user = user_query.execute()

    return (system.data or []) + (user.data or [])


@router.post(
    "/unit-sizes", response_model=UnitSizeOut, status_code=status.HTTP_201_CREATED
)
def create_unit_size(
    payload: UnitSizeCreate,
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    Create a custom unit size for the current user.
    """
    if current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can create unit sizes",
        )

    tenant_user_id = current_user.effective_owner_id

    supabase = get_supabase()

    response = (
        supabase.table("unit_sizes")
        .insert(
            {
                "user_id": tenant_user_id,
                "category": payload.category,
                "value": payload.value,
                "value_ml": payload.value_ml,
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
            detail="Unit size creation failed",
        )
    return data


@router.delete("/unit-sizes/{unit_size_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit_size(
    unit_size_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    Delete a custom unit size (only user-created, not system).
    """
    if current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can delete unit sizes",
        )

    tenant_user_id = current_user.effective_owner_id

    supabase = get_supabase()

    # Check ownership and is_system=false
    existing = (
        supabase.table("unit_sizes")
        .select("*")
        .eq("id", unit_size_id)
        .eq("user_id", tenant_user_id)
        .eq("is_system", False)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit size not found or cannot be deleted",
        )

    supabase.table("unit_sizes").delete().eq("id", unit_size_id).execute()
