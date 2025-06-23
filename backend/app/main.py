# backend/app/main.py
import os
from fastapi import FastAPI
from pydantic import BaseModel
from app.models import qa_chain
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Pull frontend URL from environment (fallback to localhost for dev)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Enable CORS so the frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    question: str

@app.post("/chat")
def chat(query: Query):
    answer = qa_chain.run(query.question)
    return {"answer": answer}