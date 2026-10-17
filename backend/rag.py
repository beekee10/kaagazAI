"""
rag.py - KaagazAI Core RAG & LangGraph Engine
=============================================
This file handles:
1. PDF Text Extraction (PyMuPDF)
2. Text Chunking (LangChain RecursiveCharacterTextSplitter)
3. Embedding Generation & Vector Storage (ChromaDB)
4. LangGraph 4-step Q&A Workflow (Retrieve -> Check Context -> Generate/Fallback)

MERN Developer Note:
- Think of this file like a service layer in Node.js (e.g., `services/ragService.js`).
- Functions here contain pure business logic and are called by API routes in `main.py`.
"""

import os
import pymupdf  # PyMuPDF library for fast PDF text & page extraction
from typing import List, Dict, Any, Optional, TypedDict
from dotenv import load_dotenv

# LangChain imports for document representation and chunking
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

# LangGraph imports for structured stateful workflows
from langgraph.graph import StateGraph, END

# Load environment variables from .env file (supports backend/.env and root .env)
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=backend_env_path)
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001").strip()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))
TOP_K = int(os.getenv("TOP_K", "4"))

# Ensure local directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHROMA_DB_DIR, exist_ok=True)


# ==============================================================================
# 1. EMBEDDING FUNCTION SETUP
# ==============================================================================

class LocalFallbackEmbeddings(Embeddings):
    """
    Fallback embedding generator using Chroma's built-in ONNX miniLM model.
    This ensures KaagazAI works out-of-the-box locally even before the user
    provides a Google Gemini API key!
    """
    def __init__(self):
        from chromadb.utils import embedding_functions
        self._ef = embedding_functions.DefaultEmbeddingFunction()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._ef(texts)

    def embed_query(self, text: str) -> List[float]:
        return self._ef([text])[0]


_cached_embeddings: Optional[Embeddings] = None


def get_embedding_model() -> Embeddings:
    """
    Returns Google Gemini Embeddings if GEMINI_API_KEY is configured.
    Caches the embedding instance to ensure optimal latency.
    """
    global _cached_embeddings
    if _cached_embeddings is not None:
        return _cached_embeddings

    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            _cached_embeddings = GoogleGenerativeAIEmbeddings(
                model=GEMINI_EMBEDDING_MODEL,
                google_api_key=GEMINI_API_KEY
            )
            return _cached_embeddings
        except Exception as err:
            print(f"[Warning] Failed to initialize Gemini embeddings ({err}), using local fallback.")
            _cached_embeddings = LocalFallbackEmbeddings()
            return _cached_embeddings

    _cached_embeddings = LocalFallbackEmbeddings()
    return _cached_embeddings


def get_vector_store() -> Chroma:
    """
    Returns the persistent ChromaDB vector store instance.
    ChromaDB stores high-dimensional vector representations of document chunks.
    Automatically handles dimension discrepancies if embedding models change.
    """
    embeddings = get_embedding_model()
    try:
        return Chroma(
            collection_name="kaagaz_documents",
            embedding_function=embeddings,
            persist_directory=CHROMA_DB_DIR
        )
    except Exception as err:
        if "dimension" in str(err).lower():
            import chromadb
            client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
            try:
                client.delete_collection("kaagaz_documents")
            except Exception:
                pass
            return Chroma(
                collection_name="kaagaz_documents",
                embedding_function=embeddings,
                persist_directory=CHROMA_DB_DIR
            )
        raise err


# ==============================================================================
# 2. PDF TEXT EXTRACTION (PyMuPDF)
# ==============================================================================

def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from a PDF using PyMuPDF.

    Returns a list of dictionaries:
    [
        {"page_number": 1, "text": "Page content..."},
        {"page_number": 2, "text": "Next page..."}
    ]

    Raises ValueError if the PDF is empty or contains no extractable text.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    pages_data = []
    total_characters = 0

    try:
        doc = pymupdf.open(file_path)
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_text = page.get_text("text").strip()
            if page_text:
                pages_data.append({
                    "page_number": page_idx + 1,
                    "text": page_text
                })
                total_characters += len(page_text)
        doc.close()
    except Exception as err:
        raise ValueError(f"Failed to read PDF file: {str(err)}")

    if total_characters == 0 or len(pages_data) == 0:
        raise ValueError(
            "No extractable text found in this PDF. "
            "It may be a scanned image or an empty document."
        )

    return pages_data


# ==============================================================================
# 3. TEXT CHUNKING (LangChain RecursiveCharacterTextSplitter)
# ==============================================================================

def split_text_into_chunks(pages_data: List[Dict[str, Any]], filename: str) -> List[Document]:
    """
    Splits extracted page text into smaller overlapping chunks.

    Why Chunking?
    - LLMs have context limits and perform better with precise, targeted excerpts.
    - Chunk overlap ensures information at the boundary of two chunks is not lost.

    Returns a list of LangChain Document objects with metadata:
    Document(page_content="...", metadata={"source": filename, "page": 1, "chunk_id": "..."})
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""]
    )

    documents: List[Document] = []
    chunk_index = 0

    for item in pages_data:
        page_num = item["page_number"]
        page_text = item["text"]

        # Split the text of this specific page
        raw_chunks = splitter.split_text(page_text)

        for chunk_text in raw_chunks:
            chunk_index += 1
            doc = Document(
                page_content=chunk_text,
                metadata={
                    "source": filename,
                    "page": page_num,
                    "chunk_id": f"{filename}_p{page_num}_c{chunk_index}"
                }
            )
            documents.append(doc)

    return documents


# ==============================================================================
# 4. CHROMA VECTOR STORAGE & DOCUMENT MANAGEMENT
# ==============================================================================

def save_documents_to_db(documents: List[Document]) -> int:
    """
    Stores document chunks and their metadata into ChromaDB.
    Cleans up any prior chunks for the same source to avoid duplicate vectors.
    Returns the number of chunks saved.
    """
    if not documents:
        return 0

    vector_store = get_vector_store()

    # Clean up existing chunks for these sources so re-uploading doesn't duplicate chunks
    sources_to_clean = {d.metadata.get("source") for d in documents if d.metadata.get("source")}
    for s_name in sources_to_clean:
        try:
            vector_store.delete(where={"source": s_name})
        except Exception:
            pass

    try:
        vector_store.add_documents(documents)
    except Exception as err:
        if "dimension" in str(err).lower():
            import chromadb
            client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
            try:
                client.delete_collection("kaagaz_documents")
            except Exception:
                pass
            vector_store = get_vector_store()
            vector_store.add_documents(documents)
        else:
            raise err
    return len(documents)


def list_uploaded_documents() -> List[Dict[str, Any]]:
    """
    Queries ChromaDB to list all unique documents, their chunk counts,
    and page ranges.
    """
    vector_store = get_vector_store()
    all_data = vector_store.get(include=["metadatas"])

    metadatas = all_data.get("metadatas", []) or []
    doc_summary: Dict[str, Dict[str, Any]] = {}

    for meta in metadatas:
        if not meta or "source" not in meta:
            continue
        source = meta["source"]
        page = meta.get("page", 1)

        if source not in doc_summary:
            doc_summary[source] = {
                "filename": source,
                "total_chunks": 0,
                "pages": set()
            }
        doc_summary[source]["total_chunks"] += 1
        doc_summary[source]["pages"].add(page)

    # Convert sets to sorted lists for JSON serialization
    results = []
    for source, info in doc_summary.items():
        results.append({
            "filename": info["filename"],
            "total_chunks": info["total_chunks"],
            "total_pages": len(info["pages"]),
            "pages": sorted(list(info["pages"]))
        })

    return results


def delete_document_from_db(filename: str) -> bool:
    """
    Deletes all vector embeddings associated with `filename` from ChromaDB
    and removes the physical file from the uploads directory.
    """
    vector_store = get_vector_store()

    # ChromaDB delete where source equals filename
    vector_store.delete(where={"source": filename})

    # Also delete the physical uploaded file if it exists
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as err:
            print(f"[Warning] Could not remove file {file_path}: {err}")

    return True


# ==============================================================================
# 5. LANGGRAPH 4-STEP RAG WORKFLOW
# ==============================================================================

class GraphState(TypedDict):
    """
    The State of our LangGraph workflow.
    In MERN terms, think of this like Redux state or React useState for the pipeline.
    Each node receives this state, performs an operation, and returns updated fields.
    """
    question: str
    documents: List[Document]
    context_is_relevant: bool
    answer: str
    sources: List[Dict[str, Any]]
    history: Optional[List[Dict[str, str]]]


def retrieve_node(state: GraphState) -> Dict[str, Any]:
    """
    Stage 1: Retrieve
    Searches ChromaDB for the top K most relevant document chunks.
    """
    question = state["question"]
    vector_store = get_vector_store()
    retriever = vector_store.as_retriever(search_kwargs={"k": TOP_K})
    docs = retriever.invoke(question)
    return {"documents": docs}


def check_context_node(state: GraphState) -> Dict[str, Any]:
    """
    Stage 2: Check Context
    Determines whether the retrieved document chunks contain sufficient content
    to answer the user's question.
    """
    docs = state.get("documents", [])
    if not docs:
        return {"context_is_relevant": False}

    # Verify that total text in retrieved chunks is non-empty
    total_length = sum(len(d.page_content.strip()) for d in docs)
    if total_length < 20:
        return {"context_is_relevant": False}

    # Context is considered sufficient for generation
    return {"context_is_relevant": True}


def route_after_context_check(state: GraphState) -> str:
    """
    Conditional Edge: Decides whether to go to 'generate' or 'fallback'.
    """
    if state.get("context_is_relevant", False):
        return "generate"
    return "fallback"


def generate_node(state: GraphState) -> Dict[str, Any]:
    """
    Stage 3: Generate
    Calls Google Gemini to answer the question using strictly the retrieved context.
    Also formats accurate source citations.
    """
    question = state["question"]
    docs = state.get("documents", [])
    history = state.get("history") or []

    # Format previous chat history for multi-turn contextual continuity
    history_context = ""
    if history:
        history_lines = []
        for turn in history[-4:]:
            role_label = "User" if turn.get("role") == "user" else "KaagazAI"
            content = turn.get("content", "").strip()
            if content:
                history_lines.append(f"{role_label}: {content}")
        if history_lines:
            history_context = "--- PREVIOUS CHAT CONTEXT ---\n" + "\n".join(history_lines) + "\n\n"

    # Format retrieved chunks into context string
    context_snippets = []
    sources = []
    seen_sources = set()

    for d in docs:
        source_name = d.metadata.get("source", "Unknown Document")
        page_num = d.metadata.get("page", 1)
        content_preview = d.page_content.strip()

        context_snippets.append(
            f"[Document: {source_name} | Page: {page_num}]\n{content_preview}"
        )

        source_key = (source_name, page_num)
        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources.append({
                "document": source_name,
                "page": page_num,
                "excerpt": content_preview[:180] + ("..." if len(content_preview) > 180 else "")
            })

    joined_context = "\n\n---\n\n".join(context_snippets)

    # Prompt instructing LLM to stay grounded in the document context
    prompt = (
        "You are KaagazAI, an expert AI document assistant.\n"
        "Answer the user's question accurately and concisely using ONLY the provided document context below.\n"
        "Take into consideration any previous conversation context to resolve references or follow-up questions.\n"
        "If the answer cannot be found in the context, clearly state that the information is not present in the document.\n"
        "Do NOT invent facts, citations, or page numbers.\n\n"
        f"{history_context}"
        f"--- DOCUMENT CONTEXT ---\n{joined_context}\n\n"
        f"--- USER QUESTION ---\n{question}\n\n"
        "--- ANSWER ---"
    )

    # Call Gemini LLM if key is available, else use a clean local grounded response
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        from langchain_google_genai import ChatGoogleGenerativeAI
        candidate_models = [
            GEMINI_MODEL,
            "gemini-flash-latest",
            "gemini-3.5-flash",
            "gemini-2.5-flash",
            "gemini-pro-latest"
        ]
        seen = set()
        unique_candidates = [m for m in candidate_models if m and not (m in seen or seen.add(m))]

        answer_text = None
        last_err = None

        for model_name in unique_candidates:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=GEMINI_API_KEY,
                    temperature=0.2,
                    timeout=20,
                    max_retries=1
                )
                response = llm.invoke(prompt)
                if isinstance(response.content, list):
                    answer_text = "".join(
                        part.get("text", "") if isinstance(part, dict) else str(part)
                        for part in response.content
                    )
                else:
                    answer_text = str(response.content)
                if answer_text:
                    break
            except Exception as err:
                last_err = err
                print(f"[Warning] LLM model '{model_name}' failed ({err}), trying next fallback...")

        if not answer_text:
            answer_text = (
                f"[Note: All Gemini LLM model attempts failed: {str(last_err)}]\n\n"
                f"Retrieved relevant content from your documents:\n\n{docs[0].page_content}"
            )
    else:
        # Graceful demonstration response when API key is not yet set
        answer_text = (
            f"**[Demo Mode: No GEMINI_API_KEY provided in .env]**\n\n"
            f"Here is the most relevant information retrieved from **{docs[0].metadata.get('source')}** (Page {docs[0].metadata.get('page')}):\n\n"
            f"> \"{docs[0].page_content[:350]}...\"\n\n"
            f"*(To enable full AI answer generation, add your free Gemini API key to `backend/.env`)*"
        )

    return {"answer": answer_text, "sources": sources}


def fallback_node(state: GraphState) -> Dict[str, Any]:
    """
    Stage 4: Fallback
    Executed when retrieved context is insufficient or empty.
    """
    fallback_message = (
        "I could not find relevant information in the uploaded documents to answer your question. "
        "Please check if the topic is covered in your uploaded PDFs, or try rephrasing your question."
    )
    return {"answer": fallback_message, "sources": []}


def build_rag_graph():
    """
    Assembles and compiles the 4-step LangGraph workflow:
    [retrieve] -> [check_context] -> (conditional edge) -> [generate] OR [fallback] -> END
    """
    workflow = StateGraph(GraphState)

    # 1. Add nodes
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("check_context", check_context_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("fallback", fallback_node)

    # 2. Add edges
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "check_context")

    # 3. Add conditional edge from check_context
    workflow.add_conditional_edges(
        "check_context",
        route_after_context_check,
        {
            "generate": "generate",
            "fallback": "fallback"
        }
    )

    # 4. Connect terminal nodes to END
    workflow.add_edge("generate", END)
    workflow.add_edge("fallback", END)

    return workflow.compile()


# Compile the graph once at startup for high performance
rag_app = build_rag_graph()


def run_rag_workflow(question: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    Executes the LangGraph Q&A pipeline for a user question with optional conversation history.

    Returns:
    {
        "question": "What is ...?",
        "answer": "...",
        "sources": [{"document": "file.pdf", "page": 1, "excerpt": "..."}],
        "context_is_relevant": True/False
    }
    """
    initial_state: GraphState = {
        "question": question,
        "history": history or [],
        "documents": [],
        "context_is_relevant": False,
        "answer": "",
        "sources": []
    }

    final_state = rag_app.invoke(initial_state)

    return {
        "question": question,
        "answer": final_state.get("answer", ""),
        "sources": final_state.get("sources", []),
        "context_is_relevant": final_state.get("context_is_relevant", False)
    }
