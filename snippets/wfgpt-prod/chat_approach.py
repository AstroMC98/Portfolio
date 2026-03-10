"""
ChatReadRetrieveRead — Multi-step RAG with query rewriting.

WHAT IT DEMONSTRATES:
  The core retrieval approach for an enterprise RAG chat system on Azure.
  The pipeline rewrites the user's question into an optimal search query,
  retrieves documents from Azure AI Search, then generates a grounded answer —
  all using structured tool calls to the OpenAI API.

WHY IT'S INTERESTING:
  Query rewriting is critical for conversational RAG: the user's raw message
  often contains pronouns or implicit references that degrade search quality.
  By first asking the LLM to produce a search query, then feeding search
  results back as context, the system achieves much higher answer accuracy
  than naive "embed question → retrieve → answer" pipelines.
"""

import logging
from typing import Any, Optional
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

logger = logging.getLogger(__name__)


class ChatReadRetrieveReadApproach:
    """
    Three-step RAG: rewrite → retrieve → answer.

    Step 1 — Query rewriting:
        GPT-4o rewrites the conversation into a search query using a
        tool call. The tool definition constrains the output format.

    Step 2 — Document retrieval:
        Azure AI Search returns the top-k documents via semantic / vector
        / hybrid retrieval depending on configuration.

    Step 3 — Answer generation:
        The original question + retrieved chunks are sent to GPT-4o to
        produce a grounded, cited answer.
    """

    def __init__(
        self,
        openai_client: AsyncOpenAI,
        search_client,
        chatgpt_model: str,
        prompt_manager,
        auth_helper,
        content_field: str = "content",
        sourcepage_field: str = "sourcepage",
    ):
        self.openai_client = openai_client
        self.search_client = search_client
        self.chatgpt_model = chatgpt_model
        self.prompt_manager = prompt_manager
        self.auth_helper = auth_helper
        self.content_field = content_field
        self.sourcepage_field = sourcepage_field

        # Prompts loaded from .prompty files — swappable without code changes
        self.query_rewrite_prompt = prompt_manager.load_prompt("chat_query_rewrite.prompty")
        self.query_rewrite_tools = prompt_manager.load_tools("chat_query_rewrite_tools.json")
        self.answer_prompt = prompt_manager.load_prompt("chat_answer_question.prompty")

    async def run(
        self,
        messages: list[ChatCompletionMessageParam],
        auth_claims: dict[str, Any],
        overrides: dict[str, Any],
    ) -> dict:
        # ── Step 1: Rewrite conversation into a search query ────────────────
        rewrite_messages = self.query_rewrite_prompt.format(messages=messages)
        rewrite_response = await self.openai_client.chat.completions.create(
            model=self.chatgpt_model,
            messages=rewrite_messages,
            tools=self.query_rewrite_tools,
            tool_choice="auto",
            temperature=0.0,
        )
        search_query = self._extract_tool_arg(rewrite_response, "search_query")
        logger.info("Rewritten query: %s", search_query)

        # ── Step 2: Retrieve relevant documents ─────────────────────────────
        search_results = await self._search(
            query=search_query,
            auth_claims=auth_claims,
            retrieval_mode=overrides.get("retrieval_mode", "hybrid"),
            top=overrides.get("top", 5),
        )
        context = self._format_context(search_results)

        # ── Step 3: Generate a grounded answer ──────────────────────────────
        answer_messages = self.answer_prompt.format(
            messages=messages, context=context
        )
        answer_response = await self.openai_client.chat.completions.create(
            model=self.chatgpt_model,
            messages=answer_messages,
            temperature=overrides.get("temperature", 0.1),
            max_tokens=overrides.get("max_tokens", 1024),
        )
        return {
            "message": answer_response.choices[0].message,
            "search_query": search_query,
            "sources": [r[self.sourcepage_field] for r in search_results],
        }

    def _extract_tool_arg(self, response, arg_name: str) -> str:
        """Pull a named argument from the first tool call in the response."""
        import json
        tool_call = response.choices[0].message.tool_calls[0]
        args = json.loads(tool_call.function.arguments)
        return args.get(arg_name, "")

    async def _search(self, query: str, auth_claims, retrieval_mode: str, top: int):
        """Delegate to Azure AI Search — semantic, vector, or hybrid."""
        filter_expr = self.auth_helper.build_security_filter(auth_claims)
        async with self.search_client:
            results = await self.search_client.search(
                search_text=query if retrieval_mode != "vector" else None,
                filter=filter_expr,
                top=top,
                query_type="semantic" if retrieval_mode == "semantic" else "simple",
            )
            return [r async for r in results]

    def _format_context(self, search_results: list) -> str:
        return "\n\n".join(
            f"[{r[self.sourcepage_field]}]\n{r[self.content_field]}"
            for r in search_results
        )
