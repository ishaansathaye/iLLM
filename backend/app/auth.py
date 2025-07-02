import os
from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from app.lib.supabase_client import supabase
from postgrest.exceptions import APIError


DEMO_LIMIT = 3
SESSION_HEADER = "X-Session-Id"
bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_role(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session_id: str = Header(None, alias=SESSION_HEADER),
):
    """
    Resolves user role: returns "trusted" if they present a valid Supabase JWT,
    otherwise enforces a demo-mode limit based on a session ID and returns "demo".
    Raises HTTPException 401 or 403 on missing/invalid credentials or exceeded demo limit.
    """
    token = creds.credentials if creds else None

    # 1) Trusted user: validate Supabase JWT
    user = None
    if token:
        try:
            res = supabase.auth.get_user(token)
            user = getattr(res, "user", None)
        except Exception:
            user = None
    if user:
        # Lookup actual role from profiles table
        try:
            profile_resp = (
                supabase
                .table("profiles")
                .select("role")
                .eq("id", user.id)
                .maybe_single()
                .execute()
            )
            profile = getattr(profile_resp, "data", {}) or {}
            role = profile.get("role")
        except Exception:
            role = None
        # Fallback to trusted if no profile entry or error
        return role or "trusted"

    # 2) Demo user: must provide session ID
    if not session_id:
        raise HTTPException(status_code=401, detail="Missing X-Session-Id header")

    # 3) Fetch or initialize demo_sessions counter
    try:
        resp = (
            supabase
            .table("demo_sessions")
            .select("hit_count")
            .eq("session_id", session_id)
            .maybe_single()
            .execute()
        )
        row = getattr(resp, "data", None)
    except APIError:
        # No rows or multiple rows returned; treat as no existing session
        row = None

    if row:
        count = row.get("hit_count", 0) + 1
        # update existing
        supabase.table("demo_sessions") \
            .update({"hit_count": count, "last_hit": datetime.utcnow().isoformat()}) \
            .eq("session_id", session_id).execute()
    else:
        count = 1
        # insert new
        supabase.table("demo_sessions") \
            .insert({"session_id": session_id, "hit_count": 1, "last_hit": datetime.utcnow().isoformat()}) \
            .execute()

    if count > DEMO_LIMIT:
        raise HTTPException(status_code=403, detail="Demo limit reached")

    return "demo"
