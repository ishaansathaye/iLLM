import fitz  # PyMuPDF

def extract_resume_text(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page_num in range(doc.page_count):
        page = doc.load_page(page_num)
        text += page.get_text("text")  # Extract text
    return text

# Example usage
resume_text = extract_resume_text("../backend/app/data/resume.pdf")
with open("../backend/app/data/resume.txt", "w") as f:
    f.write(resume_text)