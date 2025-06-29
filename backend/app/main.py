# backend/app/main.py
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from app.models import qa_chain
from fastapi.middleware.cors import CORSMiddleware
from app.auth import get_current_role

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

class Query(BaseModel):
    question: str

# Register admin ingestion routes
from app.routers.ingest import router as ingest_router
app.include_router(ingest_router)

@app.post("/chat")
def chat(query: Query, role: str = Depends(get_current_role)):
    answer = qa_chain.run(query.question)
    return {"answer": answer}