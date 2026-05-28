import json
import logging
from pathlib import Path

from app.core.config import settings
from app.rag.documents import GroundingDocument

logger = logging.getLogger(__name__)


def _root() -> Path:
    return Path(__file__).resolve().parents[3]


def load_documents() -> list[GroundingDocument]:
    docs: list[GroundingDocument] = []
    bible_path = _root() / "data" / "bible" / "sample_web.json"
    for row in json.loads(bible_path.read_text(encoding="utf-8")):
        ref = f"{row['book']} {row['chapter']}:{row['verse']}"
        docs.append(
            GroundingDocument(
                page_content=f"{ref} ({row.get('translation', 'WEB')}): {row['text']}",
                metadata={
                    "type": "scripture",
                    "reference": ref,
                    "book": row["book"],
                    "chapter": row["chapter"],
                    "verse": row["verse"],
                    "translation": row.get("translation", "WEB"),
                },
            )
        )

    for path in (_root() / "data" / "theology_docs").glob("*.json"):
        for row in json.loads(path.read_text(encoding="utf-8")):
            docs.append(GroundingDocument(page_content=row["text"], metadata=row["metadata"]))
    return docs


def get_vectorstore():
    from langchain_community.vectorstores import Chroma
    from langchain_openai import OpenAIEmbeddings

    embeddings = OpenAIEmbeddings(model=settings.openai_embedding_model, api_key=settings.openai_api_key)
    return Chroma(collection_name="faithassist", embedding_function=embeddings, persist_directory=settings.chroma_path)


def ensure_vector_index() -> None:
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY is missing; vector index will use keyword fallback at runtime")
        return
    try:
        store = get_vectorstore()
    except ImportError:
        logger.warning("ChromaDB is not installed; vector index will use keyword fallback at runtime")
        return
    if store._collection.count() > 0:
        return
    docs = load_documents()
    store.add_documents(docs)
    logger.info("Indexed %s FaithAssist documents", len(docs))
