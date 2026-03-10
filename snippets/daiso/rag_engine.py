"""
Local RAG engine — privacy-first inference with Ollama + ChromaDB.

WHAT IT DEMONSTRATES:
  How to build a fully offline RAG system where no data leaves the machine.
  Ollama handles local LLM inference (Gemma 2), while ChromaDB provides
  vector retrieval. The ingestion pipeline is DVC-tracked for reproducibility.

WHY IT'S INTERESTING:
  Most RAG tutorials assume cloud APIs. This design swaps every cloud
  dependency for a local equivalent — enabling deployment in air-gapped
  or data-sensitive environments (healthcare, legal, finance) without
  changing the retrieval or generation logic.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import chromadb
import ollama


@dataclass
class RetrievedChunk:
    content: str
    source: str
    distance: float


class LocalRAGEngine:
    """
    Retrieval-Augmented Generation using only local resources.

    Components:
      - ChromaDB     : persistent vector store (HNSW cosine similarity)
      - Ollama       : local LLM inference (Gemma 2 2B / 9B)
      - nomic-embed  : local embedding model (no OpenAI key required)
    """

    def __init__(
        self,
        collection_name: str,
        embed_model: str = "nomic-embed-text",
        llm_model: str = "gemma2:9b",
        top_k: int = 5,
        persist_dir: str = ".chroma_db",
    ):
        self.embed_model = embed_model
        self.llm_model = llm_model
        self.top_k = top_k

        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    # ── Ingestion ──────────────────────────────────────────────────────────

    def ingest(self, documents: list[dict]) -> int:
        """
        Add documents to the local vector store.

        Args:
            documents: List of {"id": str, "content": str, "source": str}

        Returns:
            Number of documents indexed.
        """
        ids = [d["id"] for d in documents]
        contents = [d["content"] for d in documents]
        metadatas = [{"source": d["source"]} for d in documents]

        # Generate embeddings locally — no API call, no egress
        embeddings = [
            ollama.embeddings(model=self.embed_model, prompt=text)["embedding"]
            for text in contents
        ]

        self.collection.upsert(
            ids=ids,
            documents=contents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        return len(documents)

    # ── Retrieval ──────────────────────────────────────────────────────────

    def retrieve(self, query: str) -> list[RetrievedChunk]:
        """Embed the query locally and fetch nearest neighbours."""
        query_embedding = ollama.embeddings(
            model=self.embed_model, prompt=query
        )["embedding"]

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=self.top_k,
            include=["documents", "metadatas", "distances"],
        )

        chunks = []
        for content, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append(RetrievedChunk(
                content=content,
                source=meta.get("source", "unknown"),
                distance=dist,
            ))
        return chunks

    # ── Generation ─────────────────────────────────────────────────────────

    def chat(self, query: str, system_prompt: Optional[str] = None) -> str:
        """Retrieve context then generate a grounded answer via Ollama."""
        chunks = self.retrieve(query)
        context = "\n\n".join(
            f"[Source: {c.source}]\n{c.content}" for c in chunks
        )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {query}",
        })

        response = ollama.chat(model=self.llm_model, messages=messages)
        return response["message"]["content"]
