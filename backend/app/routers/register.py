from fastapi import APIRouter, HTTPException, Depends
from starlette.status import HTTP_200_OK, HTTP_400_BAD_REQUEST
from pydantic import BaseModel
from datetime import datetime, timedelta
import secrets
from postgrest.exceptions import APIError

from app.lib.supabase_client import supabase
from app.auth import get_current_role
from app.lib.mailer import send_user_password_email

router = APIRouter(tags=["auth"])

class RegisterRequest(BaseModel):
    email: str

PASSWORD_EXPIRATION_HOURS = 24

@router.post("/register")
async def register(req: RegisterRequest):
    # Check if an entry already exists for this email
    check = (
        supabase
        .table("pending_requests")
        .select("is_approved")
        .eq("email", req.email)
        .maybe_single()
        .execute()
    )
    existing = getattr(check, "data", None)
    if existing:
        if not existing.get("is_approved", False):
            # Already requested and still pending
            return {"status": "pending", "message": "Your request is already pending approval."}
        else:
            # Already approved -> prompt to log in
            raise HTTPException(status_code=HTTP_400_BAD_REQUEST,
                                detail="Your account is already active. Please log in.")

    # Insert a new pending request
    try:
        supabase.table("pending_requests").insert({"email": req.email}).execute()
    except APIError as e:
        err = e.args[0] if e.args and isinstance(e.args[0], dict) else {}
        if err.get("code") == "23505":
            # duplicate pending request
            return {"status": "pending", "message": "Your request is already pending approval."}
        # unexpected error
        raise HTTPException(status_code=500, detail="Registration failed.")
    
    return {"status": "ok", "message": "Registration request received"}

@router.post("/admin/approve/{request_id}")
async def approve_request(request_id: str, role: str = Depends(get_current_role)):
    # Only admins may approve
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    # Fetch the pending request
    req_res = (
        supabase
        .table("pending_requests")
        .select("email")
        .eq("id", request_id)
        .maybe_single()
        .execute()
    )
    if not getattr(req_res, "data", None):
        # No matching pending request found
        raise HTTPException(status_code=404, detail="Request not found")
    email = req_res.data["email"]

    # Mark the request approved
    upd_res = (
        supabase
        .table("pending_requests")
        .update({
            "is_approved": True,
            "approved_at": datetime.utcnow().isoformat(),
            "processed_by": "admin"
        })
        .eq("id", request_id)
        .execute()
    )
    # Ensure the update actually affected the row
    if not getattr(upd_res, "data", None):
        raise HTTPException(status_code=500, detail="Failed to mark request approved")

    # Generate a one-time password
    password = secrets.token_urlsafe(8)
    expires_at = (datetime.utcnow() + timedelta(hours=PASSWORD_EXPIRATION_HOURS)).isoformat()

    # Create the user via Supabase Admin API
    user_res = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"role": "trusted", "expires_at": expires_at}
    })
    # Ensure the user was created successfully
    if not getattr(user_res, "user", None):
        raise HTTPException(status_code=500, detail="Failed to create user")

    # Send the password via email
    send_user_password_email(email, password, expires_at)

    # Delete the pending request
    del_resp = (
        supabase
        .table("pending_requests")
        .delete()
        .eq("id", request_id)
        .execute()
    )
    # If no row was deleted, treat as not found
    if getattr(del_resp, "count", 0) == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Manually upsert into your public.profiles table
    supabase.table("profiles").upsert({
        "id": user_res.user.id,
        "role": "trusted",
        "expires_at": expires_at,
    }).execute()

    return {"status": "ok", "user_id": user_res.user.id}


# Deny endpoint: admins only
@router.post("/admin/deny/{request_id}")
async def deny_request(request_id: str, role: str = Depends(get_current_role)):
    # Only admins may deny
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    # Remove the pending request
    resp = (
        supabase
        .table("pending_requests")
        .delete()
        .eq("id", request_id)
        .execute()
    )
    # If no row was deleted, treat as not found
    if getattr(resp, "count", 0) == 0:
        raise HTTPException(status_code=404, detail="Request not found")

    # TODO: optionally notify the user that their request was denied

    return {"status": "denied", "request_id": request_id}

# List Pending Requests
@router.get("/admin/pending")
async def list_pending_requests(role: str = Depends(get_current_role)):
    # Only admins may list
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    resp = supabase.table("pending_requests") \
        .select("id, email, created_at") \
        .eq("is_approved", False) \
        .execute()
    return getattr(resp, "data", [])

# List Active Users
@router.get("/admin/active-users")
async def list_active_users(role: str = Depends(get_current_role)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    # Fetch all active profile rows
    now_iso = datetime.utcnow().isoformat()
    resp = (
        supabase
        .table("profiles")
        .select("id, role, expires_at")
        .in_("role", ["trusted", "admin"])
        .gt("expires_at", now_iso)
        .execute()
    )
    profiles = getattr(resp, "data", []) or []
    result = []
    for p in profiles:
        user_id = p.get("id")
        # Fetch the user's email via Admin API
        try:
            user_res = supabase.auth.admin.get_user(user_id)
            email = getattr(user_res, "user", {}).get("email")
        except Exception:
            email = None
        result.append({
            "id": user_id,
            "email": email,
            "role": p.get("role"),
            "expires_at": p.get("expires_at"),
        })
    return result

# List Expired Users
@router.get("/admin/expired-users")
async def list_expired_users(role: str = Depends(get_current_role)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    # Fetch all expired profile rows
    now_iso = datetime.utcnow().isoformat()
    resp = (
        supabase
        .table("profiles")
        .select("id, role, expires_at")
        .in_("role", ["trusted", "admin"])
        .lte("expires_at", now_iso)
        .execute()
    )
    profiles = getattr(resp, "data", []) or []
    result = []
    for p in profiles:
        user_id = p.get("id")
        try:
            user_res = supabase.auth.admin.get_user(user_id)
            email = getattr(user_res, "user", {}).get("email")
        except Exception:
            email = None
        result.append({
            "id": user_id,
            "email": email,
            "role": p.get("role"),
            "expires_at": p.get("expires_at"),
        })
    return result