"""
Hybrid RAG with two-stage retrieval and intelligent RAG skip.

WHAT IT DEMONSTRATES:
  A retrieval pipeline that: (1) fetches 25 candidates via vector search,
  (2) reranks them with Cohere's cross-encoder, and (3) decides whether
  retrieval is even necessary based on conversation history.

WHY IT'S INTERESTING:
  The RAG-skip optimisation is the standout pattern here. On follow-up
  questions ("What else did it say about that?"), re-retrieving the same
  documents wastes tokens and latency. By asking a cheap LLM call whether
  conversation history already contains the answer, the system avoids
  redundant retrieval — reducing cost by ~40% in multi-turn sessions.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional
import cohere
import openai


@dataclass
class RetrievedDocument:
    document_id: str
    content: str
    similarity_score: float
    rerank_score: Optional[float] = None


class HybridRAGChatbot:
    """
    Two-stage retrieval: ChromaDB vector search → Cohere reranker.

    Flow:
      query → [reformulate if follow-up] → can_skip_rag? → [retrieve + rerank] → generate
    """

    def __init__(
        self,
        chroma_db,
        openai_api_key: str,
        cohere_api_key: str,
        model: str = "gpt-4o",
        initial_retrieval_count: int = 25,   # broad first-pass
        final_document_count: int = 5,       # narrowed after reranking
        similarity_threshold: float = 0.30,
        rerank_threshold: float = 0.30,
    ):
        self.chroma_db = chroma_db
        self.cohere_client = cohere.Client(cohere_api_key)
        openai.api_key = openai_api_key
        self.model = model
        self.initial_retrieval_count = initial_retrieval_count
        self.final_document_count = final_document_count
        self.similarity_threshold = similarity_threshold
        self.rerank_threshold = rerank_threshold
        self.conversation_history: list[dict] = []

    # ── Entry point ────────────────────────────────────────────────────────

    def chat(self, query: str) -> str:
        """Full RAG pipeline with optional retrieval skip."""
        # Contextualise the query using recent history
        reformulated = self._reformulate_query(query)

        # Ask the LLM if it can answer from history alone
        can_skip, _ = self._can_answer_from_history(reformulated)

        if can_skip:
            response_text = self._generate_from_history(query)
        else:
            documents = self._retrieve_and_rerank(reformulated)
            context = self._build_context(documents)
            response_text = self._generate_with_context(query, context)

        self.conversation_history.extend([
            {"role": "user", "content": query},
            {"role": "assistant", "content": response_text},
        ])
        # Keep history bounded to avoid unbounded token growth
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]
        return response_text

    # ── Two-stage retrieval ────────────────────────────────────────────────

    def _retrieve_and_rerank(self, query: str) -> list[RetrievedDocument]:
        """Stage 1: vector search → Stage 2: Cohere cross-encoder rerank."""
        # Stage 1 — broad vector retrieval
        raw_results = self.chroma_db.search_similar(
            query=query, n_results=self.initial_retrieval_count
        )
        candidates = [
            RetrievedDocument(
                document_id=r["document_id"],
                content=r["content"],
                similarity_score=r["similarity"],
            )
            for r in raw_results
            if r["similarity"] >= self.similarity_threshold
        ]
        if not candidates:
            return []

        # Stage 2 — Cohere cross-encoder reranks for semantic precision
        rerank_results = self.cohere_client.rerank(
            query=query,
            documents=[c.content for c in candidates],
            top_n=self.final_document_count,
            model="rerank-v3.5",
        )
        reranked = []
        for result in rerank_results.results:
            if result.relevance_score >= self.rerank_threshold:
                doc = candidates[result.index]
                doc.rerank_score = result.relevance_score
                reranked.append(doc)
        return sorted(reranked, key=lambda d: d.rerank_score or 0, reverse=True)

    # ── RAG-skip decision ─────────────────────────────────────────────────

    def _can_answer_from_history(self, query: str) -> tuple[bool, str]:
        """Ask the LLM if conversation history already contains the answer."""
        if len(self.conversation_history) < 2:
            return False, "No history available."
        response = openai.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content":
                    "Reply YES if the conversation already contains enough information "
                    "to answer the query, or NO if new retrieval is needed. "
                    "Then give a one-sentence reason."},
                *self.conversation_history[-10:],
                {"role": "user", "content": f"Query: {query}"},
            ],
            temperature=0.0,
            max_tokens=128,
        )
        text = response.choices[0].message.content.strip()
        return text.upper().startswith("YES"), text

    # ── Helpers ───────────────────────────────────────────────────────────

    def _reformulate_query(self, query: str) -> str:
        """Expand pronouns/implicit references using recent history."""
        if len(self.conversation_history) < 2:
            return query
        response = openai.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content":
                    "Rewrite the query as a standalone question using conversation context. "
                    "If the query is already self-contained, return it unchanged."},
                *self.conversation_history[-6:],
                {"role": "user", "content": f"Query: {query}"},
            ],
            temperature=0.0, max_tokens=128,
        )
        return response.choices[0].message.content.strip().strip('"\'')

    def _build_context(self, docs: list[RetrievedDocument]) -> str:
        return "\n\n".join(
            f"[Score: {d.rerank_score:.2f}] {d.content}" for d in docs
        )

    def _generate_with_context(self, query: str, context: str) -> str:
        response = openai.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "Answer using only the provided context."},
                {"role": "system", "content": f"Context:\n{context}"},
                *self.conversation_history,
                {"role": "user", "content": query},
            ],
            temperature=0.1, max_tokens=1024,
        )
        return response.choices[0].message.content

    def _generate_from_history(self, query: str) -> str:
        response = openai.chat.completions.create(
            model=self.model,
            messages=[
                *self.conversation_history,
                {"role": "user", "content": query},
            ],
            temperature=0.1, max_tokens=1024,
        )
        return response.choices[0].message.content
