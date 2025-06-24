# backend/app/main.py
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.models import qa_chain
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

 # Pull frontend URL from environment, default to localhost for development
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Allow requests from frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_TOKEN = os.getenv("BACKEND_TOKEN")
bearer_scheme = HTTPBearer()

def require_token(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if creds.scheme.lower() != "bearer" or creds.credentials != API_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid or missing token")

class Query(BaseModel):
    question: str

@app.post("/chat")
def chat(query: Query, token: HTTPAuthorizationCredentials = Depends(require_token)):
    answer = qa_chain.run(query.question)
    return {"answer": answer}