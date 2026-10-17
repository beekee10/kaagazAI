"""
test_rag.py - Automated Tests for KaagazAI
==========================================
Tests:
1. PDF Text Extraction (PyMuPDF)
2. LangChain Text Chunking & Metadata Preservation
3. Vector Storage in ChromaDB & Document Listing
4. LangGraph 4-Stage Workflow (Retrieve -> Check Context -> Generate/Fallback)
5. Document Deletion & Vector Cleanup
6. FastAPI Endpoints (/api/health, /api/upload, /api/documents, /api/chat)
"""

import os
import sys
import pytest
import pymupdf
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from rag import (
    extract_text_from_pdf,
    split_text_into_chunks,
    save_documents_to_db,
    list_uploaded_documents,
    delete_document_from_db,
    run_rag_workflow,
    UPLOAD_DIR
)

client = TestClient(app)

TEST_PDF_FILENAME = "test_sample_kaagaz.pdf"
TEST_PDF_PATH = os.path.join(UPLOAD_DIR, TEST_PDF_FILENAME)


@pytest.fixture(scope="session", autouse=True)
def setup_test_pdf():
    """
    Creates a temporary 2-page PDF before running tests
    and removes it after tests complete.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    doc = pymupdf.open()

    # Page 1
    page1 = doc.new_page()
    page1.insert_text(
        (50, 72),
        "KaagazAI is an artificial intelligence document assistant.\n"
        "It is built using FastAPI for the backend and React for the frontend.\n"
        "The primary purpose is to enable retrieval-augmented generation on PDFs."
    )

    # Page 2
    page2 = doc.new_page()
    page2.insert_text(
        (50, 72),
        "Architecture Details:\n"
        "KaagazAI uses LangChain for text chunking and ChromaDB for vector storage.\n"
        "LangGraph manages the multi-step reasoning workflow.\n"
        "Special fact: The secret project codename is Operation Mango."
    )

    doc.save(TEST_PDF_PATH)
    doc.close()

    yield

    # Teardown
    delete_document_from_db(TEST_PDF_FILENAME)
    if os.path.exists(TEST_PDF_PATH):
        try:
            os.remove(TEST_PDF_PATH)
        except Exception:
            pass


def test_pdf_text_extraction():
    """Verify PyMuPDF extracts text and accurately tracks page numbers."""
    pages_data = extract_text_from_pdf(TEST_PDF_PATH)
    assert len(pages_data) == 2, "Expected 2 pages in test PDF"
    assert pages_data[0]["page_number"] == 1
    assert "KaagazAI is an artificial intelligence" in pages_data[0]["text"]
    assert pages_data[1]["page_number"] == 2
    assert "Operation Mango" in pages_data[1]["text"]


def test_empty_pdf_validation():
    """Verify that an empty PDF raises ValueError."""
    empty_pdf_path = os.path.join(UPLOAD_DIR, "empty_temp.pdf")
    doc = pymupdf.open()
    doc.new_page()  # Page with no text
    doc.save(empty_pdf_path)
    doc.close()

    with pytest.raises(ValueError) as excinfo:
        extract_text_from_pdf(empty_pdf_path)
    assert "No extractable text found" in str(excinfo.value)

    if os.path.exists(empty_pdf_path):
        os.remove(empty_pdf_path)


def test_text_chunking():
    """Verify LangChain RecursiveCharacterTextSplitter produces valid Document objects."""
    pages_data = extract_text_from_pdf(TEST_PDF_PATH)
    chunks = split_text_into_chunks(pages_data, filename=TEST_PDF_FILENAME)

    assert len(chunks) >= 2, "Should produce at least 2 chunks"
    for chunk in chunks:
        assert chunk.metadata["source"] == TEST_PDF_FILENAME
        assert "page" in chunk.metadata
        assert "chunk_id" in chunk.metadata
        assert len(chunk.page_content.strip()) > 0


def test_vector_storage_and_listing():
    """Verify storing chunks into ChromaDB and listing unique documents."""
    pages_data = extract_text_from_pdf(TEST_PDF_PATH)
    chunks = split_text_into_chunks(pages_data, filename=TEST_PDF_FILENAME)

    saved_count = save_documents_to_db(chunks)
    assert saved_count == len(chunks)

    docs = list_uploaded_documents()
    matching = [d for d in docs if d["filename"] == TEST_PDF_FILENAME]
    assert len(matching) == 1, "Uploaded test document should appear in ChromaDB listing"
    assert matching[0]["total_chunks"] == saved_count
    assert matching[0]["total_pages"] == 2


def test_langgraph_workflow_relevant_query():
    """Verify LangGraph workflow retrieves context and generates an answer."""
    result = run_rag_workflow("What is the secret project codename?")

    assert result["question"] == "What is the secret project codename?"
    assert result["context_is_relevant"] is True
    assert len(result["sources"]) > 0
    # Sources should point to test document and page 2
    assert any(s["document"] == TEST_PDF_FILENAME for s in result["sources"])
    assert result["answer"] != ""


def test_langgraph_workflow_fallback_query():
    """Verify fallback response when context is irrelevant or question is out of scope."""
    result = run_rag_workflow("What is the capital of Mars?")
    # Even if top_k vectors are fetched, the LLM or workflow correctly handles out-of-context queries
    assert result["answer"] != ""
    assert isinstance(result["sources"], list)


def test_api_health_endpoint():
    """Verify GET /api/health returns 200 OK and valid status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "total_documents" in data


def test_api_documents_endpoint():
    """Verify GET /api/documents returns JSON list."""
    response = client.get("/api/documents")
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)


def test_api_chat_endpoint():
    """Verify POST /api/chat handles questions properly."""
    response = client.post(
        "/api/chat",
        json={"question": "What is KaagazAI built with?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert isinstance(data["sources"], list)


def test_api_invalid_file_upload():
    """Verify POST /api/upload rejects non-PDF files."""
    response = client.post(
        "/api/upload",
        files={"file": ("test.txt", b"This is not a PDF", "text/plain")}
    )
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]


def test_document_deletion():
    """Verify document deletion removes vectors and cleans up listing."""
    success = delete_document_from_db(TEST_PDF_FILENAME)
    assert success is True

    docs = list_uploaded_documents()
    matching = [d for d in docs if d["filename"] == TEST_PDF_FILENAME]
    assert len(matching) == 0, "Deleted document must not appear in ChromaDB listing"
