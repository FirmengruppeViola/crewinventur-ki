from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.supabase import get_supabase

security = HTTPBearer(auto_error=False)


@dataclass
class UserContext:
    """Extended user context with role and permissions"""
    id: str
    email: str
    user_type: str  # 'owner' | 'manager'
    owner_id: str | None  # NULL for owner, owner's ID for manager
    allowed_location_ids: list[str]  # All locations for owner, assigned for manager

    @property
    def is_owner(self) -> bool:
        return self.user_type == "owner"

    @property
    def is_manager(self) -> bool:
        return self.user_type == "manager"

    @property
    def effective_owner_id(self) -> str:
        """Returns the owner's user_id (self for owner, owner_id for manager)"""
        return self.owner_id if self.owner_id else self.id


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials
    supabase = get_supabase()

    try:
        response = supabase.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    user = getattr(response, "user", None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    return user


def get_current_user_context(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserContext:
    """
    Get current user with extended context (role, owner_id, allowed locations).
    Use this for endpoints that need role-based access control.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials
    supabase = get_supabase()

    try:
        response = supabase.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    user = getattr(response, "user", None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # Load profile for user_type and owner_id
    profile_response = (
        supabase.table("profiles")
        .select("user_type, owner_id")
        .eq("id", user.id)
        .maybe_single()
        .execute()
    )

    profile = profile_response.data if profile_response.data else {}
    user_type = profile.get("user_type", "owner")
    owner_id = profile.get("owner_id")

    # Load allowed locations
    if user_type == "owner" or not owner_id:
        # Owner sees all their locations
        locations_response = (
            supabase.table("locations")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", True)
            .execute()
        )
        allowed_location_ids = [loc["id"] for loc in (locations_response.data or [])]
    else:
        # Manager sees only assigned locations
        locations_response = (
            supabase.table("team_member_locations")
            .select("location_id, team_members!inner(user_id, is_active)")
            .eq("team_members.user_id", user.id)
            .eq("team_members.is_active", True)
            .execute()
        )
        allowed_location_ids = [loc["location_id"] for loc in (locations_response.data or [])]

    return UserContext(
        id=user.id,
        email=user.email,
        user_type=user_type,
        owner_id=owner_id,
        allowed_location_ids=allowed_location_ids,
    )
