# backend/app/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from models import qa_chain

app = FastAPI()

class Query(BaseModel):
    question: str

@app.post("/chat")
def chat(query: Query):
    answer = qa_chain.run(query.question)
    return {"answer": answer}