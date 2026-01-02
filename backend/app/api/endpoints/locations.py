from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.core.supabase import get_supabase
from app.schemas.location import LocationCreate, LocationOut, LocationUpdate

router = APIRouter()


@router.get("/locations", response_model=list[LocationOut])
def list_locations(current_user=Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("locations")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("is_active", True)
        .order("created_at")
        .execute()
    )
    return response.data or []


@router.post("/locations", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(payload: LocationCreate, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    existing = (
        supabase.table("locations")
        .select("id")
        .eq("user_id", current_user.id)
        .eq("name", payload.name)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location name already exists",
        )

    response = (
        supabase.table("locations")
        .insert(
            {
                "user_id": current_user.id,
                "name": payload.name,
                "description": payload.description,
            }
        )
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Location creation failed",
        )
    return data


@router.get("/locations/{location_id}", response_model=LocationOut)
def get_location(location_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("locations")
        .select("*")
        .eq("id", location_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    return data


@router.put("/locations/{location_id}", response_model=LocationOut)
def update_location(
    location_id: str,
    payload: LocationUpdate,
    current_user=Depends(get_current_user),
):
    supabase = get_supabase()
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update",
        )

    response = (
        supabase.table("locations")
        .update(update_data)
        .eq("id", location_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    return data


@router.delete("/locations/{location_id}", response_model=LocationOut)
def delete_location(location_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    active_sessions = (
        supabase.table("inventory_sessions")
        .select("id")
        .eq("user_id", current_user.id)
        .eq("location_id", location_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    if active_sessions.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location has active inventory session",
        )

    response = (
        supabase.table("locations")
        .update({"is_active": False})
        .eq("id", location_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    return data
