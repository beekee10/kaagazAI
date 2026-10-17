# 📄 KaagazAI — AI-Powered Document Assistant

> **Chat with your PDF documents using RAG, LangChain, LangGraph, Google Gemini, FastAPI, and React.**  
> Built for production speed, interview prep, and multi-turn conversational intelligence.

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0%2B-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4%2B-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6600?style=for-the-badge)](https://www.trychroma.com/)
[![LangChain](https://img.shields.io/badge/LangChain-v0.3-1C3C3C?style=for-the-badge)](https://www.langchain.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Flash_Latest-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)

---

## 📌 Table of Contents
1. [Overview](#1-overview)
2. [Why Retrieval-Augmented Generation (RAG)?](#2-why-retrieval-augmented-generation-rag)
3. [Key Features](#3-key-features)
4. [System Architecture](#4-system-architecture)
5. [The LangGraph 4-Stage Reasoning Pipeline](#5-the-langgraph-4-stage-reasoning-pipeline)
6. [Technology Stack](#6-technology-stack)
7. [MERN vs. Python/FastAPI Cheatsheet](#7-mern-vs-pythonfastapi-cheatsheet)
8. [Installation & Local Setup](#8-installation--local-setup)
9. [Configuration & Environment (.env)](#9-configuration--environment-env)
10. [Future-Proof AI Configuration](#10-future-proof-ai-configuration)
11. [API Endpoints Reference](#11-api-endpoints-reference)
12. [Automated Testing](#12-automated-testing)
13. [Deployment Guide (Render / Railway / Vercel)](#13-deployment-guide)
14. [Interview Preparation & Architectural Q&A](#14-interview-preparation--architectural-qa)

---

## 1. Overview

**KaagazAI** is a full-stack, enterprise-grade AI Document Assistant. Users can upload PDF documents (resumes, manuals, books, research papers, legal contracts) and converse with them naturally.

Unlike naive implementations that dump raw PDFs into an LLM, KaagazAI implements a production-grade **Retrieval-Augmented Generation (RAG)** pipeline. It parses PDFs with **PyMuPDF**, chunks them with semantic overlaps using **LangChain**, indexes high-dimensional embeddings in **ChromaDB**, and evaluates every question through a deterministic 4-node **LangGraph** workflow with source-grounded citations.

---

## 2. Why Retrieval-Augmented Generation (RAG)?

When asking Large Language Models (LLMs) questions about private or domain-specific documents, standard LLMs suffer from three critical flaws:
1. **Knowledge Cutoff:** The model has never seen your private PDF or newly published documentation.
2. **Context Window Limits & Cost:** Feeding an entire 100-page PDF into an LLM on every single query is slow, expensive, and degrades attention (the *"lost-in-the-middle"* problem).
3. **Hallucination:** When unsure, LLMs invent convincing but false statements.

### How KaagazAI Solves This:
Instead of sending everything, RAG retrieves only the **top $k$ most relevant text excerpts (chunks)** matching the query and injects them into the prompt as strict factual context:
> *"Answer the user question using ONLY this provided document context. Cite your sources accurately. If the context does not contain the answer, say so."*

---

## 3. Key Features

- 📑 **High-Performance PDF Parsing:** Extracts clean text per page in milliseconds using C-based `PyMuPDF`.
- ✂️ **Intelligent Recursive Chunking:** Configurable chunk size (800 chars) and overlap (150 chars) prevents loss of semantic meaning across paragraph boundaries.
- ⚡ **Local & Cloud Vector Storage:** Persistent vector indexing via ChromaDB with automatic duplicate chunk cleanup and vector dimension migration.
- 🔄 **LangGraph 4-Stage Workflow:** Deterministic state machine with conditional routing (`Retrieve` → `Check Context` → `Generate` or `Fallback`).
- 🛡️ **Self-Healing AI Model Fallback:** Pre-configured with dynamic alias `gemini-flash-latest` and an automated fallback chain (`gemini-flash-latest` → `gemini-3.5-flash` → `gemini-2.5-flash` → `gemini-pro-latest`) to eliminate model deprecation issues during deployment.
- 🔍 **Verifiable Source Citations:** Every answer cites document filename, page number, and relevant excerpt snippets.
- 🔐 **Built-in Authentication:** JWT / SHA-256 password hashing with demo accounts for instant recruiter walkthroughs.
- 🎨 **Modern Glassmorphic UI:** Built with React (Vite) and Tailwind CSS with smooth gradients, responsive sidebar, drag-and-drop upload zone, and source cards.

---

## 4. System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                   React Frontend (Vite)                     │
│  - Landing Page     - Auth / Demo Login   - Drag & Drop PDF │
│  - Chat Interface   - Document Drawer     - Source Cards    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON (Axios / Fetch)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (main.py)                 │
│  - POST /api/upload          - POST /api/chat               │
│  - GET  /api/documents       - DELETE /api/documents/{name} │
│  - GET  /api/health          - POST /api/auth/login         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 RAG Engine (backend/rag.py)                 │
│                                                             │
│  [Ingestion Flow]                                           │
│  PDF ──► PyMuPDF Extraction ──► Recursive Splitter ──► Chroma│
│                                                             │
│  [LangGraph Multi-Step Workflow]                            │
│  User Query ──► [Retrieve Top-K Chunks]                     │
│                        │                                    │
│                        ▼                                    │
│              [Check Context Relevance]                      │
│                   │                │                        │
│         (Relevant)│                │(Irrelevant / Empty)    │
│                   ▼                ▼                        │
│            [Generate LLM]     [Fallback Message]            │
│                   │                │                        │
│                   └────────┬───────┘                        │
│                            ▼                                │
│                   Grounded Answer + Citations               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. The LangGraph 4-Stage Reasoning Pipeline

Unlike linear LangChain chains (`chain = prompt | llm`), KaagazAI uses **LangGraph** to model the document question-answering process as a stateful graph:

```
                  ┌──────────────┐
                  │ 1. RETRIEVE  │  Fetch top-k vector chunks from ChromaDB
                  └──────┬───────┘
                         │
                         ▼
               ┌───────────────────┐
               │ 2. CHECK CONTEXT  │  Validate length and sufficiency
               └─────────┬─────────┘
                         │
             ┌───────────┴───────────┐
  (Sufficient Context)      (Empty / Insufficient)
             ▼                       ▼
    ┌─────────────────┐     ┌───────────────────┐
    │  3. GENERATE    │     │   4. FALLBACK     │
    │ Grounded Gemini │     │ Polite out-of-   │
    │ Answer + Source │     │ scope message     │
    └────────┬────────┘     └────────┬──────────┘
             │                       │
             └───────────┬───────────┘
                         ▼
                      [ END ]
```

1. **`retrieve_node`**: Embeds the user question and queries ChromaDB for the top $k$ (default 4) nearest semantic text chunks.
2. **`check_context_node`**: Validates whether retrieved documents contain sufficient content.
3. **`route_after_context_check`**: Conditional edge routing to `generate` if context is present, or `fallback` if no relevant data exists.
4. **`generate_node`**: Formats past conversation turns, injects retrieved excerpts, and calls Google Gemini with strict prompt constraints.
5. **`fallback_node`**: Returns an honest message stating the information is outside the uploaded documents, preventing hallucinations.

---

## 6. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18 + Vite | Lightning-fast HMR, modular JSX, reactive state. |
| **Styling** | Tailwind CSS | Utility-first, responsive, dark glassmorphism styling. |
| **Backend** | Python 3.10+ & FastAPI | Async performance, auto OpenAPI `/docs`, native Pydantic validation. |
| **PDF Extraction** | PyMuPDF (`fitz`) | C-based speed, low memory footprint, page-level mapping. |
| **RAG & Graph** | LangChain & LangGraph | Industry-standard chunking, embeddings, and state graph orchestration. |
| **Vector DB** | ChromaDB | Embeddable, persistent, local vector database with zero extra server setup. |
| **AI LLM** | Google Gemini (`gemini-flash-latest`) | Sub-second latency, generous free tier, state-of-the-art context window. |
| **Embeddings** | `models/gemini-embedding-001` | High-dimensional semantic representation (fallback to MiniLM). |

---

## 7. MERN vs. Python/FastAPI Cheatsheet

If you are a JavaScript/TypeScript developer coming from Node.js, Express, and MongoDB:

| Node.js / Express (MERN) | FastAPI / Python (KaagazAI) | Description |
|---|---|---|
| `const app = express()` | `app = FastAPI()` | Application instance |
| `app.post('/api/chat', (req, res) => ...)` | `@app.post("/api/chat") def chat(...):` | Route decorator |
| `req.body` with Joi / Zod | `class ChatRequest(BaseModel):` | Data validation with Pydantic |
| `multer` middleware | `UploadFile = File(...)` | Multipart file uploads |
| `app.use(cors())` | `app.add_middleware(CORSMiddleware)` | Cross-Origin Resource Sharing |
| `require('dotenv').config()` | `load_dotenv()` | Environment variable loading |
| `npm test` (Jest / Mocha) | `pytest` | Automated test runner |

---

## 8. Installation & Local Setup

### Prerequisites
- **Python 3.10+** ([python.org](https://www.python.org/downloads/))
- **Node.js 18+** & npm ([nodejs.org](https://nodejs.org/))
- **Google Gemini API Key** (Free from [Google AI Studio](https://aistudio.google.com/app/apikey))

### 1. Clone the Repository
```bash
git clone https://github.com/beekee10/kaagazAI.git
cd kaagazAI
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv test_venv

# Activate virtual environment
# Windows (PowerShell):
.\test_venv\Scripts\Activate.ps1
# macOS/Linux:
source test_venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment variables
cp backend/.env.example backend/.env
```
Open `backend/.env` and paste your free Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

### 4. Running the Application Locally
Run both servers in separate terminal tabs:

**Terminal 1 — Backend:**
```bash
.\test_venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API runs at: `http://127.0.0.1:8000`  
Swagger Interactive Docs: `http://127.0.0.1:8000/docs`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 9. Configuration & Environment (.env)

KaagazAI is completely customizable via environment variables in `backend/.env`:

```env
# Google Gemini API Key (Get at: https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# AI Models (Future-proof configuration)
GEMINI_MODEL=gemini-flash-latest
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001

# Storage Directories
UPLOAD_DIR=./uploads
CHROMA_DB_DIR=./chroma_db

# Document Chunking Settings
CHUNK_SIZE=800
CHUNK_OVERLAP=150

# Top-K Document Chunks Retrieved per Query
TOP_K=4
```

---

## 10. Future-Proof AI Configuration

To ensure your application never breaks when deploying or when Google updates model names:

1. **`gemini-flash-latest`**: Automatically tracks Google's latest stable high-speed Flash model.
2. **Cascading Model Fallbacks**: If the primary model fails or is deprecated, KaagazAI immediately tries:
   $$\text{Configured Model} \longrightarrow \text{gemini-flash-latest} \longrightarrow \text{gemini-3.5-flash} \longrightarrow \text{gemini-pro-latest}$$
3. **No Code Edits Required**: Update models anytime simply by changing `GEMINI_MODEL` in your deployment environment variables.

---

## 11. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API welcome banner and docs link |
| `GET` | `/api/health` | Service health, document count, and active Gemini model |
| `POST` | `/api/auth/register` | Register user account |
| `POST` | `/api/auth/login` | Authenticate user & return token |
| `GET` | `/api/auth/demo` | Fetch instant demo account credentials |
| `POST` | `/api/upload` | Upload PDF, extract text, chunk, and index in ChromaDB |
| `GET` | `/api/documents` | List all indexed documents with page and chunk metrics |
| `DELETE`| `/api/documents/{filename}`| Delete document and purge vector embeddings |
| `POST` | `/api/chat` | Send question and receive grounded answer with source citations |

---

## 12. Automated Testing

KaagazAI includes 11 comprehensive automated tests covering the entire pipeline:

```bash
# Run all tests
pytest backend/test_rag.py -v
```

### What the test suite verifies:
- `test_pdf_text_extraction`: Clean per-page text extraction with PyMuPDF.
- `test_empty_pdf_validation`: Proper error handling for invalid files.
- `test_text_chunking`: Chunk sizing and metadata preservation.
- `test_vector_storage_and_listing`: Idempotent ChromaDB storage and deduplication.
- `test_langgraph_workflow_relevant_query`: End-to-end RAG answer generation.
- `test_langgraph_workflow_fallback_query`: Fallback handling for out-of-scope questions.
- `test_api_health_endpoint`: Health check and model inspection.
- `test_api_documents_endpoint`: Document list serialization.
- `test_api_chat_endpoint`: JSON chat payload validation.
- `test_api_invalid_file_upload`: Rejection of non-PDF uploads.
- `test_document_deletion`: Vector database cleanup on document removal.

---

## 13. Deployment Guide

### Deploying the Backend (Render / Railway)
1. Set the build command:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Set the start command:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
3. Add Environment Variables:
   - `GEMINI_API_KEY`: Your Google AI Studio key
   - `GEMINI_MODEL`: `gemini-flash-latest`
   - `GEMINI_EMBEDDING_MODEL`: `models/gemini-embedding-001`
   - `UPLOAD_DIR`: `./uploads`
   - `CHROMA_DB_DIR`: `./chroma_db`

### Deploying the Frontend (Vercel / Netlify)
1. Set the root directory to `frontend`.
2. Build command:
   ```bash
   npm run build
   ```
3. Output directory:
   ```bash
   dist
   ```
4. Set `VITE_API_BASE_URL` to your deployed backend URL.

---

## 14. Interview Preparation & Architectural Q&A

### Q1: Why use PyMuPDF instead of pypdf or pdfminer?
> **Answer:** `PyMuPDF` is built on top of MuPDF, a high-performance C rendering library. It is up to 10–20x faster than pure-Python parsers like `pypdf`, consumes significantly less memory on large documents, and accurately preserves page metadata for source citations.

### Q2: Why chunk documents with overlap?
> **Answer:** If a critical sentence or entity definition spans across the boundary between chunk $N$ and chunk $N+1$, splitting without overlap truncates the sentence and destroys the semantic embedding. A chunk overlap of 150 characters guarantees that boundary contexts are retained in both chunks.

### Q3: Why LangGraph instead of simple LangChain chains?
> **Answer:** Standard LangChain chains execute linearly ($A \rightarrow B \rightarrow C$). Real-world RAG systems require branching and cycle conditions:
> - Did retrieval return relevant content? If not, branch to a fallback node instead of spending LLM tokens.
> - LangGraph introduces explicit graph state, conditional edges, and step-by-step testability.

### Q4: How does KaagazAI prevent LLM hallucinations?
> **Answer:** 
> 1. Strict system prompting instructing the model to synthesize answers **only** from the supplied context.
> 2. LangGraph relevance checking node that routes queries with low similarity or empty context to the polite fallback node before invoking the LLM.
> 3. Enforcing source citations containing exact document names and page numbers.

---

## 👥 Author & License

- **Author:** [beekee10](https://github.com/beekee10)
- **Project:** KaagazAI
- **License:** MIT License — Open source and free for educational and commercial use.
