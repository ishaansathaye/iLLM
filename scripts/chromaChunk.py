# Requires: pip install -U langchain-openai
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import CharacterTextSplitter
import os
from pathlib import Path

BASE = Path(__file__).parent.parent.resolve()  # project root
RESUME_PATH = BASE / "backend" / "app" / "data" / "resume.txt"
PERSIST_DIR = BASE / "backend" / "app" / "data" / "chroma_db"

print("Project root:", BASE)
print("Resume path:", RESUME_PATH)
print("Persist directory:", PERSIST_DIR)

from langchain.schema import Document


# Initialize embeddings (OpenAI Embeddings for example)
embeddings = OpenAIEmbeddings()

# Load resume text
with open(RESUME_PATH, "r") as f:
    resume_text = f.read()

# Split the text into chunks (for better indexing)
text_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = text_splitter.split_text(resume_text)

# Wrap chunks in Document objects for Chroma.from_documents
documents = [Document(page_content=chunk) for chunk in chunks]
db = Chroma.from_documents(
    documents,
    embeddings,
    persist_directory=str(PERSIST_DIR)
)

