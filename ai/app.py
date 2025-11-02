import os
import uuid
from typing import List, Optional, Dict, Any

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# --- LangChain bits ---
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_community.embeddings import HuggingFaceEmbeddings

# Gemini (LangChain integration)
from langchain_google_genai import ChatGoogleGenerativeAI

from langchain.schema import HumanMessage, SystemMessage, AIMessage
from dotenv import load_dotenv

# -------------------------
# Environment configuration
# -------------------------
load_dotenv()  # Load from .env file if available

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
DOCS_DIR = os.getenv("DOCS_DIR", "./docs")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "./faiss_index")
TOP_K = int(os.getenv("TOP_K", "4"))
MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "8"))

if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY not set. Put it in your .env or environment.")

# -------------------------
# FastAPI app
# -------------------------
app = FastAPI(title="RAG Chatbot (FastAPI + FAISS + HF Embeddings + Gemini)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# In-memory session store
# -------------------------
SESSIONS: Dict[str, Dict[str, Any]] = {}

# -------------------------
# Load / Build Vector Index
# -------------------------
def build_or_load_vectorstore() -> FAISS:
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    if os.path.isdir(FAISS_INDEX_PATH):
        print("✅ Loading existing FAISS index...")
        vectorstore = FAISS.load_local(
            FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True
        )
        return vectorstore

    print("📚 Building FAISS index from documents...")
    loader = DirectoryLoader(
        DOCS_DIR,
        glob="**/*.pdf",
        loader_cls=PyPDFLoader,
        show_progress=True,
        use_multithreading=True,
    )
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(docs)

    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(FAISS_INDEX_PATH)
    print("✅ FAISS index built and saved.")
    return vectorstore


VECTORSTORE = build_or_load_vectorstore()
RETRIEVER = VECTORSTORE.as_retriever(search_kwargs={"k": TOP_K})

# -------------------------
# LLM (Gemini Flash/Pro)
# -------------------------
llm = ChatGoogleGenerativeAI(
    model=MODEL_NAME,
    google_api_key=GEMINI_API_KEY,
    temperature=0.2,
    max_output_tokens=1024,
)

# -------------------------
# Pydantic models
# -------------------------
class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    used_context: bool
    sources: List[Dict[str, Any]]


# -------------------------
# Prompt helpers
# -------------------------
SYSTEM_PROMPT = (
    "You are an assistant specializing in labor and employment information. "
    "Never say, based on the provided context given or something similar like according to the given documents. Answer like how a human would. Just give the answer,"
    "and if you are not sure, say that you are not sure. And give some suggestions on what you can help with"
    "For ANY query related to labor, workers, blue collar jobs, employment law, "
    "labor contacts, unions, workplace regulations, employee rights, wages, "
    "employment benefits, job safety, industrial relations, labor statistics, "
    "workforce development, or legal documents about employment - "
    "This is critical as your knowledge base contains specialized and up-to-date "
    "information on these topics that will provide users with accurate information. "
     "After retrieving information, base your response primarily on the retrieved content. "
    "For other topics, you can answer directly if appropriate."
    "Craft your answer in easy to understand language. Dont use dashes and hyphens"
    "use full sentences and paragraphs. keep gap between paragraphs. also dont make it too big. Explain only if explicitly asked. Infact you can ask the user whether they need more explanation."
    "Give answers based on user's needs. At first keep it small and ask question whether they need more information. Give the entire explanation if asked."
)


def format_context(docs: List[Any]) -> str:
    lines = []
    for i, d in enumerate(docs, 1):
        meta = d.metadata.copy() if isinstance(d.metadata, dict) else {}
        src = meta.get("source", "unknown")
        page = meta.get("page", "unknown")
        lines.append(f"[{i}] (source: {src}, page: {page})\n{d.page_content}")
    return "\n\n".join(lines)


def build_messages(
    question: str, history: List[Any], context_docs: List[Any]
) -> List[Any]:
    messages: List[Any] = []
    messages.append(SystemMessage(content=SYSTEM_PROMPT))

    trimmed_history = history[-(MAX_HISTORY_TURNS * 2) :] if history else []
    messages.extend(trimmed_history)

    if context_docs:
        ctx = format_context(context_docs)
        messages.append(HumanMessage(content=f"Use the following context if helpful:\n\n{ctx}"))

    messages.append(HumanMessage(content=f"User question: {question}"))
    return messages


# -------------------------
# /chat endpoint
# -------------------------
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    question = req.question.strip()
    incoming_session_id = req.session_id

    # Session handling
    if incoming_session_id and incoming_session_id in SESSIONS:
        session_id = incoming_session_id
    elif incoming_session_id:
        session_id = incoming_session_id
        SESSIONS[session_id] = {"history": []}
    else:
        session_id = str(uuid.uuid4())
        SESSIONS[session_id] = {"history": []}

    history: List[Any] = SESSIONS[session_id]["history"]

    # Retrieve context
    retrieved_docs = RETRIEVER.get_relevant_documents(question)
    used_context = len(retrieved_docs) > 0

    # Build prompt
    prior_history = history if req.session_id else []
    messages = build_messages(
        question, prior_history, retrieved_docs if used_context else []
    )

    # LLM response
    ai_msg = llm.invoke(messages)
    answer = ai_msg.content if hasattr(ai_msg, "content") else str(ai_msg)

    # Update session
    SESSIONS[session_id]["history"].append(HumanMessage(content=question))
    SESSIONS[session_id]["history"].append(AIMessage(content=answer))

    # Collect sources
    sources = []
    if used_context:
        for d in retrieved_docs:
            meta = d.metadata if isinstance(d.metadata, dict) else {}
            sources.append(
                {
                    "source": meta.get("source", "unknown"),
                    "page": meta.get("page", "unknown"),
                }
            )

    return ChatResponse(
        answer=answer,
        session_id=session_id,
        used_context=used_context,
        sources=sources,
    )


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "🚀 RAG Chatbot (Gemini Flash/Pro). POST /chat with {question, session_id?}.",
    }
