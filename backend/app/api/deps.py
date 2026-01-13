from dataclasses import dataclass
import logging
from typing import Any, cast

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.supabase import get_supabase


logger = logging.getLogger(__name__)

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

    profile_data = getattr(profile_response, "data", None)
    profile = (
        cast(dict[str, Any], profile_data) if isinstance(profile_data, dict) else {}
    )
    user_type = cast(str, profile.get("user_type", "owner"))
    owner_id = cast(str | None, profile.get("owner_id"))

    # Load allowed locations
    if user_type == "owner":
        # Validate that owner_id is None for true owners
        if owner_id is not None:
            # Data corruption: owner has owner_id set
            # Treat as potential security issue
            logger.warning(
                f"Security issue: User {user.id} has user_type='owner' but owner_id={owner_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user configuration. Please contact support.",
            )

        # Owner sees all their locations
        locations_response = (
            supabase.table("locations")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", True)
            .execute()
        )
        locations_data = getattr(locations_response, "data", None)
        locations = cast(list[dict[str, Any]], locations_data) if locations_data else []
        allowed_location_ids = [loc["id"] for loc in locations]

    elif user_type == "manager":
        # Managers MUST have an owner_id
        if not owner_id:
            logger.warning(
                f"Security issue: User {user.id} has user_type='manager' but no owner_id"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user configuration. Please contact support.",
            )

        # Manager sees only locations assigned to their active team_member
        team_member_response = (
            supabase.table("team_members")
            .select("id, owner_id, is_active")
            .eq("user_id", user.id)
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )

        team_member_data = getattr(team_member_response, "data", None)
        team_member = (
            cast(dict[str, Any], team_member_data)
            if isinstance(team_member_data, dict)
            else {}
        )
        if not team_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No locations assigned. Please contact your account owner.",
            )

        # Defense-in-depth: profile owner_id must match team_member owner_id
        team_member_owner_id = cast(str | None, team_member.get("owner_id"))
        if team_member_owner_id != owner_id:
            logger.warning(
                f"Security issue: User {user.id} owner_id mismatch (profile owner_id={owner_id}, team_member.owner_id={team_member_owner_id})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user configuration. Please contact support.",
            )

        team_member_id = cast(str | None, team_member.get("id"))
        if not team_member_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No locations assigned. Please contact your account owner.",
            )

        assignments_response = (
            supabase.table("team_member_locations")
            .select("location_id")
            .eq("team_member_id", team_member_id)
            .execute()
        )

        assignments_data = getattr(assignments_response, "data", None)
        assignments = (
            cast(list[dict[str, Any]], assignments_data) if assignments_data else []
        )
        assigned_location_ids = [row["location_id"] for row in assignments]
        if not assigned_location_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No locations assigned. Please contact your account owner.",
            )

        # Verify assigned locations belong to owner and are active
        locations_response = (
            supabase.table("locations")
            .select("id")
            .eq("user_id", owner_id)
            .eq("is_active", True)
            .in_("id", assigned_location_ids)
            .execute()
        )
        locations_data = getattr(locations_response, "data", None)
        locations = cast(list[dict[str, Any]], locations_data) if locations_data else []
        allowed_location_ids = [loc["id"] for loc in locations]

        # Additional security: Verify manager has assigned locations
        if not allowed_location_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No locations assigned. Please contact your account owner.",
            )
    else:
        logger.error(
            f"Security issue: Unknown user_type '{user_type}' for user {user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid user configuration. Please contact support.",
        )

    return UserContext(
        id=user.id,
        email=user.email,
        user_type=user_type,
        owner_id=owner_id,
        allowed_location_ids=allowed_location_ids,
    )
