import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Get API token from environment variables
API_TOKEN = os.getenv("BACKEND_TOKEN")
bearer_scheme = HTTPBearer()

def require_token(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """
    Dependency function for FastAPI that verifies the provided API token.
    Raises an HTTPException if the token is invalid or missing.
    """
    if creds.scheme.lower() != "bearer" or creds.credentials != API_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid or missing token")
    return creds
