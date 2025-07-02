import os
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
import uuid
from langchain.schema import Document

from app.auth import get_current_role


CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "app/data/chroma_db")
ingest_jobs: dict = {}


def _process_ingestion(job_id: str, temp_path: Optional[str], text: Optional[str], source: str):
    from langchain.document_loaders import PyPDFLoader, TextLoader, UnstructuredMarkdownLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma
    from pathlib import Path

    try:
        docs = []
        if temp_path:
            suffix = Path(temp_path).suffix.lower()
            if suffix == ".pdf":
                loader = PyPDFLoader(temp_path)
            elif suffix in {".md", ".markdown"}:
                loader = UnstructuredMarkdownLoader(temp_path)
            else:
                loader = TextLoader(temp_path)
            docs.extend(loader.load())

        if text:
            docs.append(Document(page_content=text, metadata={}))

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(docs)
        for chunk in chunks:
            chunk.metadata["source"] = source

        embeddings = OpenAIEmbeddings()
        db = Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embeddings)
        db.add_documents(chunks)
        db.persist()

        ingest_jobs[job_id] = {"status": "completed", "num_chunks": len(chunks)}
    except Exception as e:
        ingest_jobs[job_id] = {"status": "failed", "error": str(e)}


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)


@router.post("/ingest")
async def ingest(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(None),
    source: str = Form(...),
    text: Optional[str] = Form(None),
    role: str = Depends(get_current_role),
):
    """
    Ingest a file (PDF, Markdown, text) or raw text into ChromaDB with the given source label.
    """
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    docs = []

    temp_path = None
    if file:
        suffix = Path(file.filename).suffix.lower()
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_path = tmp.name

    job_id = str(uuid.uuid4())
    ingest_jobs[job_id] = {"status": "queued"}

    background_tasks.add_task(_process_ingestion, job_id, temp_path, text, source)

    return {"status": "queued", "job_id": job_id}


@router.get("/ingest/status/{job_id}")
async def ingest_status(job_id: str):
    if job_id not in ingest_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return ingest_jobs[job_id]