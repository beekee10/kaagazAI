"""
main.py - KaagazAI FastAPI Backend
==================================
This file provides REST API endpoints for:
- Health check (GET /api/health)
- PDF upload and indexing (POST /api/upload)
- Listing documents (GET /api/documents)
- Deleting documents (DELETE /api/documents/{filename})
- Asking questions via LangGraph RAG (POST /api/chat)

MERN Developer Comparison:
- `FastAPI()` is equivalent to `express()`.
- `@app.get("/path")` and `@app.post("/path")` are like `app.get("/path", (req, res) => ...)` and `app.post()`.
- Pydantic models (`BaseModel`) replace validation libraries like Joi/Zod or manual `req.body` checking.
- `UploadFile` handles multipart/form-data file uploads, replacing `multer` in Express.
- `CORSMiddleware` replaces the `cors()` npm package.
- `HTTPException` replaces `res.status(400).json({ error: ... })`.
"""

import os
import sys
import shutil
from typing import List, Dict, Any, Optional

# Ensure the backend directory is in the Python path regardless of execution directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import our RAG and LangGraph service functions from rag.py
from rag import (
    extract_text_from_pdf,
    split_text_into_chunks,
    save_documents_to_db,
    list_uploaded_documents,
    delete_document_from_db,
    run_rag_workflow,
    UPLOAD_DIR,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_EMBEDDING_MODEL
)
from auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserProfile,
    register_user,
    authenticate_user,
    get_demo_account
)

# Initialize FastAPI application (like `const app = express()` in Express.js)
app = FastAPI(
    title="KaagazAI API",
    description="Backend API for KaagazAI - AI-Powered Document Assistant using LangChain & LangGraph",
    version="1.0.0"
)

# Configure CORS (Cross-Origin Resource Sharing)
# In Express: app.use(cors({ origin: ['http://localhost:5173'], credentials: true }))
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Maximum file size allowed: 25 MB
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024


# ==============================================================================
# REQUEST & RESPONSE SCHEMAS (Pydantic Models)
# In Express/Node, this is similar to TypeScript interfaces or Joi/Zod schemas.
# ==============================================================================

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000, description="User question about uploaded documents")
    history: Optional[List[Dict[str, str]]] = Field(default=[], description="Previous conversation turns for context continuity")


class SourceReference(BaseModel):
    document: str
    page: int
    excerpt: str


class ChatResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceReference]
    context_is_relevant: bool


class DocumentInfo(BaseModel):
    filename: str
    total_chunks: int
    total_pages: int
    pages: List[int]


class UploadResponse(BaseModel):
    success: bool
    message: str
    filename: str
    pages: int
    chunks: int


# ==============================================================================
# API ROUTES
# ==============================================================================

@app.get("/")
def root():
    """Simple root welcome message."""
    return {
        "app": "KaagazAI",
        "status": "online",
        "docs_url": "/docs"  # FastAPI automatically generates Swagger UI at /docs!
    }


@app.get("/api/health")
def health_check():
    """
    Health check endpoint.
    Returns backend status, current document count, and whether Gemini API key is configured.
    """
    docs = list_uploaded_documents()
    has_gemini_key = bool(GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here")

    return {
        "status": "healthy",
        "total_documents": len(docs),
        "gemini_api_configured": has_gemini_key,
        "mode": "gemini-live" if has_gemini_key else "demo-local",
        "gemini_model": GEMINI_MODEL,
        "gemini_embedding_model": GEMINI_EMBEDDING_MODEL
    }


# ==============================================================================
# AUTHENTICATION ROUTES
# ==============================================================================

@app.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def api_register(request: RegisterRequest):
    """
    Registers a new user account with hashed password storage.
    """
    try:
        result = register_user(
            name=request.name,
            email=request.email,
            password=request.password
        )
        return AuthResponse(
            success=True,
            message="Account registered successfully. Welcome to KaagazAI!",
            token=result["token"],
            user=UserProfile(**result["user"])
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(err)}"
        )


@app.post("/api/auth/login", response_model=AuthResponse)
def api_login(request: LoginRequest):
    """
    Authenticates an existing user or demo account.
    """
    try:
        result = authenticate_user(
            email=request.email,
            password=request.password
        )
        return AuthResponse(
            success=True,
            message="Logged in successfully.",
            token=result["token"],
            user=UserProfile(**result["user"])
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(val_err)
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(err)}"
        )


@app.get("/api/auth/demo", response_model=AuthResponse)
def api_demo_login():
    """
    Instant demo account access without registration.
    """
    result = get_demo_account()
    return AuthResponse(
        success=True,
        message="Logged in as Demo Explorer. Welcome!",
        token=result["token"],
        user=UserProfile(**result["user"])
    )


@app.post("/api/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload and index a PDF file:
    1. Validate file extension and MIME type.
    2. Save file temporarily to uploads directory.
    3. Extract text page-by-page using PyMuPDF.
    4. Chunk text using LangChain RecursiveCharacterTextSplitter.
    5. Save embeddings and metadata into ChromaDB.
    """
    # 1. Validate file extension
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF (.pdf) files are supported."
        )

    # 2. Sanitize filename and prepare destination path
    safe_filename = os.path.basename(file.filename)
    dest_path = os.path.join(UPLOAD_DIR, safe_filename)

    # 3. Read and check file size
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes)."
            )
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 25 MB limit."
            )

        # Write to disk
        with open(dest_path, "wb") as f:
            f.write(content)
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(err)}"
        )

    # 4. Extract text from PDF
    try:
        pages_data = extract_text_from_pdf(dest_path)
    except ValueError as val_err:
        # Remove empty or invalid file from disk
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as err:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting text from PDF: {str(err)}"
        )

    # 5. Chunk text
    chunks = split_text_into_chunks(pages_data, filename=safe_filename)

    # 6. Save chunks to ChromaDB
    try:
        # First remove any existing vectors for this filename to prevent duplicate entries
        delete_document_from_db(safe_filename)
        # Re-save physical file (since delete_document removes it)
        with open(dest_path, "wb") as f:
            f.write(content)

        saved_count = save_documents_to_db(chunks)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error indexing document vectors in ChromaDB: {str(err)}"
        )

    return UploadResponse(
        success=True,
        message=f"Document '{safe_filename}' uploaded and indexed successfully.",
        filename=safe_filename,
        pages=len(pages_data),
        chunks=saved_count
    )


@app.get("/api/documents", response_model=List[DocumentInfo])
def get_documents():
    """
    Returns list of all currently indexed documents in ChromaDB with page & chunk stats.
    """
    try:
        docs = list_uploaded_documents()
        return docs
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch documents: {str(err)}"
        )


@app.delete("/api/documents/{filename}")
def delete_document(filename: str):
    """
    Deletes a document:
    1. Removes all its vector embeddings from ChromaDB.
    2. Deletes the physical file from the server.
    Ensures the document will never appear in subsequent search/chat results.
    """
    safe_filename = os.path.basename(filename)
    try:
        delete_document_from_db(safe_filename)
        return {
            "success": True,
            "message": f"Document '{safe_filename}' and its embeddings were deleted successfully."
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(err)}"
        )


@app.post("/api/chat", response_model=ChatResponse)
def chat_with_documents(request: ChatRequest):
    """
    Ask a question against indexed documents using our 4-stage LangGraph workflow:
    1. Retrieve relevant chunks from ChromaDB.
    2. Check context sufficiency.
    3. Generate answer grounded in context (or Fallback if no relevant docs).
    4. Return answer along with verified source references.
    """
    cleaned_question = request.question.strip()
    if not cleaned_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    # Check if any documents exist in ChromaDB
    existing_docs = list_uploaded_documents()
    if not existing_docs:
        return ChatResponse(
            question=cleaned_question,
            answer="No documents have been uploaded yet. Please upload a PDF document first so I can assist you!",
            sources=[],
            context_is_relevant=False
        )

    try:
        result = run_rag_workflow(cleaned_question, history=request.history)
        return ChatResponse(
            question=result["question"],
            answer=result["answer"],
            sources=[
                SourceReference(
                    document=s["document"],
                    page=s["page"],
                    excerpt=s["excerpt"]
                )
                for s in result.get("sources", [])
            ],
            context_is_relevant=result.get("context_is_relevant", False)
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing LangGraph workflow: {str(err)}"
        )
