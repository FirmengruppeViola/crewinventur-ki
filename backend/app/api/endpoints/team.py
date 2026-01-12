import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_current_user_context, UserContext
from app.core.supabase import get_supabase
from app.schemas.team import (
    TeamMemberCreate,
    TeamMemberUpdate,
    TeamMemberOut,
    InvitationAccept,
    InvitationResult,
)

router = APIRouter()

INVITATION_EXPIRY_HOURS = 48


def generate_invitation_code() -> str:
    """Generate a 6-character alphanumeric code (uppercase, no confusing chars)"""
    # Exclude confusing characters: 0, O, I, 1, L
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _get_location_ids_for_member(supabase, team_member_id: str) -> list[str]:
    """Helper to get location IDs for a team member"""
    response = (
        supabase.table("team_member_locations")
        .select("location_id")
        .eq("team_member_id", team_member_id)
        .execute()
    )
    return [loc["location_id"] for loc in (response.data or [])]


def _team_member_to_out(member: dict, location_ids: list[str]) -> TeamMemberOut:
    """Convert DB record to TeamMemberOut"""
    return TeamMemberOut(
        id=member["id"],
        owner_id=member["owner_id"],
        user_id=member.get("user_id"),
        name=member["name"],
        email=member.get("email"),
        role=member["role"],
        invitation_code=member.get("invitation_code"),
        invitation_expires_at=member.get("invitation_expires_at"),
        invitation_accepted_at=member.get("invitation_accepted_at"),
        is_active=member["is_active"],
        created_at=member["created_at"],
        location_ids=location_ids,
    )


@router.post(
    "/invite", response_model=TeamMemberOut, status_code=status.HTTP_201_CREATED
)
def invite_team_member(
    data: TeamMemberCreate,
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    Invite a new team member (Betriebsleiter).
    Only owners can invite team members.
    """
    if not current_user.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can invite team members",
        )

    supabase = get_supabase()

    # Validate location_ids belong to owner
    if data.location_ids:
        locations_response = (
            supabase.table("locations")
            .select("id")
            .eq("user_id", current_user.id)
            .in_("id", data.location_ids)
            .execute()
        )
        valid_ids = {loc["id"] for loc in (locations_response.data or [])}
        invalid_ids = set(data.location_ids) - valid_ids
        if invalid_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid location IDs: {invalid_ids}",
            )

    # Generate invitation code
    invitation_code = generate_invitation_code()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=INVITATION_EXPIRY_HOURS)

    # Create team member record
    member_data = {
        "owner_id": current_user.id,
        "name": data.name,
        "email": data.email,
        "role": data.role,
        "invitation_code": invitation_code,
        "invitation_expires_at": expires_at.isoformat(),
        "is_active": True,
    }

    response = supabase.table("team_members").insert(member_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create team member",
        )

    member = response.data[0]

    # Assign locations
    if data.location_ids:
        location_assignments = [
            {"team_member_id": member["id"], "location_id": loc_id}
            for loc_id in data.location_ids
        ]
        supabase.table("team_member_locations").insert(location_assignments).execute()

    return _team_member_to_out(member, data.location_ids)


@router.get("/members", response_model=list[TeamMemberOut])
def list_team_members(
    current_user: UserContext = Depends(get_current_user_context),
):
    """
    List all team members for the current owner.
    Only owners can view team members.
    """
    if not current_user.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can view team members",
        )

    supabase = get_supabase()

    response = (
        supabase.table("team_members")
        .select("*, team_member_locations(location_id)")
        .eq("owner_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )

    result = []
    for member in response.data or []:
        location_ids = [
            loc["location_id"] for loc in (member.get("team_member_locations") or [])
        ]
        result.append(_team_member_to_out(member, location_ids))

    return result


@router.get("/members/{member_id}", response_model=TeamMemberOut)
def get_team_member(
    member_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Get a specific team member"""
    if not current_user.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can view team members",
        )

    supabase = get_supabase()

    response = (
        supabase.table("team_members")
        .select("*")
        .eq("id", member_id)
        .eq("owner_id", current_user.id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    location_ids = _get_location_ids_for_member(supabase, member_id)
    return _team_member_to_out(response.data, location_ids)


@router.put("/members/{member_id}", response_model=TeamMemberOut)
def update_team_member(
    member_id: str,
    data: TeamMemberUpdate,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Update a team member's name or location assignments"""
    if not current_user.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can update team members",
        )

    supabase = get_supabase()

    # Verify member belongs to owner
    existing = (
        supabase.table("team_members")
        .select("*")
        .eq("id", member_id)
        .eq("owner_id", current_user.id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    # Update member data
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.is_active is not None:
        update_data["is_active"] = data.is_active

    if update_data:
        supabase.table("team_members").update(update_data).eq("id", member_id).execute()

    # Update location assignments if provided
    if data.location_ids is not None:
        # Validate location_ids
        if data.location_ids:
            locations_response = (
                supabase.table("locations")
                .select("id")
                .eq("user_id", current_user.id)
                .in_("id", data.location_ids)
                .execute()
            )
            valid_ids = {loc["id"] for loc in (locations_response.data or [])}
            invalid_ids = set(data.location_ids) - valid_ids
            if invalid_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid location IDs: {invalid_ids}",
                )

        # Delete existing assignments
        supabase.table("team_member_locations").delete().eq(
            "team_member_id", member_id
        ).execute()

        # Insert new assignments
        if data.location_ids:
            location_assignments = [
                {"team_member_id": member_id, "location_id": loc_id}
                for loc_id in data.location_ids
            ]
            supabase.table("team_member_locations").insert(
                location_assignments
            ).execute()

    # Fetch updated member
    updated = (
        supabase.table("team_members")
        .select("*")
        .eq("id", member_id)
        .single()
        .execute()
    )

    location_ids = (
        data.location_ids
        if data.location_ids is not None
        else _get_location_ids_for_member(supabase, member_id)
    )
    return _team_member_to_out(updated.data, location_ids)


@router.post("/members/{member_id}/deactivate", response_model=TeamMemberOut)
def deactivate_team_member(
    member_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Deactivate a team member (they lose access immediately)"""
    if not current_user.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can deactivate team members",
        )

    supabase = get_supabase()

    # Verify member belongs to owner
    existing = (
        supabase.table("team_members")
        .select("*")
        .eq("id", member_id)
        .eq("owner_id", current_user.id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    # Deactivate
    response = (
        supabase.table("team_members")
        .update({"is_active": False})
        .eq("id", member_id)
        .execute()
    )

    location_ids = _get_location_ids_for_member(supabase, member_id)
    return _team_member_to_out(response.data[0], location_ids)


@router.post("/members/{member_id}/reactivate", response_model=TeamMemberOut)
def reactivate_team_member(
    member_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Reactivate a previously deactivated team member"""
    if not current_user.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can reactivate team members",
        )

    supabase = get_supabase()

    # Verify member belongs to owner
    existing = (
        supabase.table("team_members")
        .select("*")
        .eq("id", member_id)
        .eq("owner_id", current_user.id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    # Reactivate
    response = (
        supabase.table("team_members")
        .update({"is_active": True})
        .eq("id", member_id)
        .execute()
    )

    location_ids = _get_location_ids_for_member(supabase, member_id)
    return _team_member_to_out(response.data[0], location_ids)


@router.post("/members/{member_id}/regenerate-code", response_model=TeamMemberOut)
def regenerate_invitation_code(
    member_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    """Regenerate invitation code for a team member who hasn't accepted yet"""
    if not current_user.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can regenerate codes",
        )

    supabase = get_supabase()

    # Verify member belongs to owner and hasn't accepted
    existing = (
        supabase.table("team_members")
        .select("*")
        .eq("id", member_id)
        .eq("owner_id", current_user.id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    if existing.data.get("invitation_accepted_at"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot regenerate code for accepted invitation",
        )

    # Generate new code
    new_code = generate_invitation_code()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=INVITATION_EXPIRY_HOURS)

    response = (
        supabase.table("team_members")
        .update(
            {
                "invitation_code": new_code,
                "invitation_expires_at": expires_at.isoformat(),
            }
        )
        .eq("id", member_id)
        .execute()
    )

    location_ids = _get_location_ids_for_member(supabase, member_id)
    return _team_member_to_out(response.data[0], location_ids)


# ===== PUBLIC ENDPOINT - No auth required =====


@router.post("/accept-invitation", response_model=InvitationResult)
def accept_invitation(
    data: InvitationAccept,
    current_user=Depends(get_current_user),  # User must be logged in with Supabase
):
    """
    Accept an invitation using the code.
    User must already be logged in with Supabase Auth.
    This links their account to the team member record.
    """
    supabase = get_supabase()

    # Find invitation by code
    response = (
        supabase.table("team_members")
        .select("*, team_member_locations(location_id)")
        .eq("invitation_code", data.invitation_code.upper())
        .is_("user_id", "null")  # Not yet accepted
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or already used invitation code",
        )

    member = response.data

    # Check if expired
    expires_at = member.get("invitation_expires_at")
    if expires_at:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expiry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation code has expired",
            )

    # Check if member is active
    if not member.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has been deactivated",
        )

    # Link user to team member
    supabase.table("team_members").update(
        {
            "user_id": current_user.id,
            "invitation_accepted_at": datetime.now(timezone.utc).isoformat(),
            "invitation_code": None,  # Clear code after use
        }
    ).eq("id", member["id"]).execute()

    # Update user's profile to mark as manager
    supabase.table("profiles").update(
        {
            "user_type": "manager",
            "owner_id": member["owner_id"],
        }
    ).eq("id", current_user.id).execute()

    # Get owner's company name
    owner_profile = (
        supabase.table("profiles")
        .select("company_name")
        .eq("id", member["owner_id"])
        .single()
        .execute()
    )

    # Get location names
    location_ids = [
        loc["location_id"] for loc in (member.get("team_member_locations") or [])
    ]
    location_names = []
    if location_ids:
        locations = (
            supabase.table("locations").select("name").in_("id", location_ids).execute()
        )
        location_names = [loc["name"] for loc in (locations.data or [])]

    return InvitationResult(
        success=True,
        message="Einladung erfolgreich angenommen",
        team_member_id=member["id"],
        owner_company_name=owner_profile.data.get("company_name")
        if owner_profile.data
        else None,
        location_names=location_names,
    )
