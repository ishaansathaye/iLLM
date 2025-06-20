# backend/app/models.py
from langchain.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI

# Paths
from pathlib import Path
BASE = Path(__file__).parent.resolve()  # backend/app
PERSIST_DIR = BASE / "data" / "chroma_db"

# Initialize embeddings + vector store
embeddings = OpenAIEmbeddings()
vector_store = Chroma(
    persist_directory=str(PERSIST_DIR),
    embedding_function=embeddings
)

# Build a RetrievalQA chain
qa_chain = RetrievalQA.from_chain_type(
    llm=OpenAI(),
    retriever=vector_store.as_retriever()
)