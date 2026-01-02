from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.supabase import get_supabase
from app.schemas.bundles import BundleCreate, BundleOut, BundleSessionOut

router = APIRouter()


def _get_bundle_or_404(supabase, bundle_id: str, user_id: str) -> dict:
    resp = (
        supabase.table("inventory_bundles")
        .select("*")
        .eq("id", bundle_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bundle not found")
    return resp.data[0]


@router.get("/inventory/bundles", response_model=list[BundleOut])
def list_bundles(current_user=Depends(get_current_user)):
    supabase = get_supabase()
    resp = (
        supabase.table("inventory_bundles")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


@router.post("/inventory/bundles", response_model=BundleOut, status_code=status.HTTP_201_CREATED)
def create_bundle(payload: BundleCreate, current_user=Depends(get_current_user)):
    if not payload.session_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No sessions selected",
        )
    if not payload.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bundle name is required",
        )

    supabase = get_supabase()
    session_ids = list(dict.fromkeys(payload.session_ids))

    sessions_resp = (
        supabase.table("inventory_sessions")
        .select("id, total_items, total_value")
        .eq("user_id", current_user.id)
        .eq("status", "completed")
        .in_("id", session_ids)
        .execute()
    )

    sessions = sessions_resp.data or []
    if len(sessions) != len(session_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more sessions not found",
        )

    total_items = sum(session.get("total_items") or 0 for session in sessions)
    total_value = sum(float(session.get("total_value") or 0) for session in sessions)

    bundle_resp = (
        supabase.table("inventory_bundles")
        .insert(
            {
                "user_id": current_user.id,
                "name": payload.name,
                "total_sessions": len(session_ids),
                "total_items": total_items,
                "total_value": total_value,
            }
        )
        .execute()
    )
    bundle = bundle_resp.data[0] if bundle_resp.data else None
    if not bundle:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bundle creation failed",
        )

    links = [{"bundle_id": bundle["id"], "session_id": session_id} for session_id in session_ids]
    supabase.table("inventory_bundle_sessions").insert(links).execute()

    return bundle


@router.get("/inventory/bundles/{bundle_id}", response_model=BundleOut)
def get_bundle(bundle_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    return _get_bundle_or_404(supabase, bundle_id, current_user.id)


@router.get("/inventory/bundles/{bundle_id}/sessions", response_model=list[BundleSessionOut])
def list_bundle_sessions(bundle_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    _get_bundle_or_404(supabase, bundle_id, current_user.id)

    links_resp = (
        supabase.table("inventory_bundle_sessions")
        .select("session_id")
        .eq("bundle_id", bundle_id)
        .execute()
    )
    session_ids = [link["session_id"] for link in links_resp.data or []]
    if not session_ids:
        return []

    sessions_resp = (
        supabase.table("inventory_sessions")
        .select("id, location_id, completed_at, total_items, total_value")
        .eq("user_id", current_user.id)
        .in_("id", session_ids)
        .execute()
    )
    sessions = sessions_resp.data or []
    location_ids = list({session.get("location_id") for session in sessions if session.get("location_id")})
    location_map = {}
    if location_ids:
        locations_resp = (
            supabase.table("locations")
            .select("id, name")
            .in_("id", location_ids)
            .execute()
        )
        location_map = {location["id"]: location["name"] for location in locations_resp.data or []}

    sessions_out = []
    for session in sessions:
        sessions_out.append(
            {
                "session_id": session["id"],
                "location_name": location_map.get(session.get("location_id"), "-"),
                "completed_at": session.get("completed_at"),
                "total_items": session.get("total_items") or 0,
                "total_value": float(session.get("total_value") or 0),
            }
        )

    sessions_out.sort(key=lambda item: item["location_name"])
    return sessions_out


@router.delete("/inventory/bundles/{bundle_id}")
def delete_bundle(bundle_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase()
    resp = (
        supabase.table("inventory_bundles")
        .delete()
        .eq("id", bundle_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bundle not found")
    return {"message": "Bundle deleted"}
