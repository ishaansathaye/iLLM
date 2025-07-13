import os
from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from datetime import timezone

# Helper to safely parse ISO timestamps with variable fractional seconds and offset
def _parse_expires(ts: str) -> datetime:
    """
    Safely parse an ISO timestamp with variable fractional seconds and offset.
    """
    try:
        return datetime.fromisoformat(ts)
    except ValueError:
        # Handle non-standard fractional lengths
        if '+' in ts:
            main, off = ts.split('+', 1)
            if '.' in main:
                datepart, frac = main.split('.', 1)
                # pad or trim to 6 digits
                frac = (frac + "000000")[:6]
                clean = f"{datepart}.{frac}+{off}"
                return datetime.fromisoformat(clean)
        # fallback re-raise
        raise
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
        final_role = role or "trusted"

        # --- New disabled check ---
        # Fetch admin user record to see if account is disabled
        admin_res = supabase.auth.admin.get_user_by_id(user.id)
        admin_user = getattr(admin_res, "data", None)
        if admin_user and admin_user.get("disabled", False):
            # Revoke any lingering sessions
            supabase.auth.admin.delete_user_sessions(user.id).execute()
            raise HTTPException(status_code=401, detail="Account revoked")

        return final_role

    # 2) Demo user: must provide session ID
    if not session_id:
        raise HTTPException(status_code=401, detail="Missing X-Session-Id header")

    # Fetch existing demo session (hit_count, created_at, expires_at)
    try:
        resp = (
            supabase
            .table("demo_sessions")
            .select("hit_count, created_at, expires_at")
            .eq("session_id", session_id)
            .maybe_single()
            .execute()
        )
        row = getattr(resp, "data", None)
    except APIError:
        row = None

    # If found and expired, delete to reset
    if row:
        expires_at = _parse_expires(row["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            supabase.table("demo_sessions") \
                .delete() \
                .eq("session_id", session_id) \
                .execute()
            row = None

    # If no active session, create new with count=1 and 24h TTL
    if not row:
        now = datetime.now(timezone.utc)
        expiry = (now + timedelta(hours=24)).isoformat()
        supabase.table("demo_sessions") \
            .insert({
                "session_id": session_id,
                "hit_count": 1,
                "created_at": now.isoformat(),
                "expires_at": expiry
            }) \
            .execute()
    else:
        # Enforce quota
        count = row.get("hit_count", 0)
        if count >= DEMO_LIMIT:
            raise HTTPException(status_code=403, detail="Demo limit reached")
        # Increment count
        supabase.table("demo_sessions") \
            .update({
                "hit_count": count + 1,
                "last_hit": datetime.now(timezone.utc).isoformat()
            }) \
            .eq("session_id", session_id) \
            .execute()

    return "demo"
