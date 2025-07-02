

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import HTTP_200_OK, HTTP_400_BAD_REQUEST
from pydantic import BaseModel
from datetime import datetime, timedelta
import secrets
from postgrest.exceptions import APIError

from app.lib.supabase_client import supabase
from app.auth import get_current_role

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
    # TODO: send notification to admin (email/SMS)
    return {"status": "ok", "message": "Registration request received"}

@router.post("/admin/approve/{request_id}")
async def approve_request(request_id: str, role: str = Depends(get_current_role)):
    # Only trusted/admin users may approve
    if role not in ("trusted", "admin"):
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
    if req_res.error or not getattr(req_res, "data", None):
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
    if upd_res.error:
        raise HTTPException(status_code=500, detail=upd_res.error.message)

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
    if user_res.error:
        raise HTTPException(status_code=500, detail=user_res.error.message)

    # TODO: send the password to the user via email/SMS
    return {"status": "ok", "user_id": user_res.user.id}