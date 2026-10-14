"""
Pluggable approach registry — swappable retrieval strategies at runtime.

WHAT IT DEMONSTRATES:
  The architectural pattern that lets WFGPT support multiple retrieval
  strategies (semantic, vector, hybrid, vision-augmented) as interchangeable
  modules, selected per-request via config without touching application logic.
  Approach classes are registered by name at startup and resolved at request
  time, making the retrieval strategy a runtime decision rather than a
  compile-time one.

WHY IT'S INTERESTING:
  Enterprise RAG systems routinely need to serve different retrieval modes for
  different document collections: semantic search for narrative documents,
  vector search for technical specifications, hybrid for mixed corpora. A
  naive implementation duplicates the request-handling path for each strategy.
  The registry pattern isolates each strategy in its own class while keeping
  the API layer strategy-agnostic — adding a new retrieval approach requires
  zero changes to the router, middleware, or auth layers.

NOVELTY:
  The key design decision is pushing the strategy selection into the approach
  registry rather than into the endpoint or a conditional chain. Each approach
  is fully self-contained: it owns its retrieval logic, context formatting,
  and generation call. The registry resolves the approach from a string key in
  the request overrides, so the entire system behaviour can be changed via a
  frontend config dropdown without any backend code change. The abstract base
  class enforces the `run()` contract at registration time (via isinstance
  check), catching missing method implementations at startup rather than at
  first request — a pattern borrowed from plugin systems in compiler toolchains.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


# ── Base interface ─────────────────────────────────────────────────────────

class BaseApproach(ABC):
    """
    Contract that every retrieval approach must implement.

    All approaches receive the same inputs and return the same output shape,
    making them transparently substitutable from the router's perspective.
    """

    @abstractmethod
    async def run(
        self,
        messages: list[dict],
        auth_claims: dict[str, Any],
        overrides: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Execute the approach and return a response dict.

        Returns:
            {
                "message":      ChatCompletionMessage,
                "search_query": str,
                "sources":      list[str],
            }
        """
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable approach name for logging and audit."""
        ...


# ── Registry ──────────────────────────────────────────────────────────────

class ApproachRegistry:
    """
    Maps string keys to registered approach instances.

    Approaches are registered at application startup (in app.py) and resolved
    at request time from the `overrides.approach` field sent by the frontend.

    Usage:
        registry = ApproachRegistry()
        registry.register("hybrid",   ChatReadRetrieveReadApproach(...))
        registry.register("semantic", SemanticApproach(...))
        registry.register("vision",   VisionAugmentedApproach(...))

        # At request time:
        approach = registry.resolve(overrides.get("approach", "hybrid"))
        result   = await approach.run(messages, auth_claims, overrides)
    """

    def __init__(self, default_key: str = "hybrid"):
        self._registry: dict[str, BaseApproach] = {}
        self._default_key = default_key

    def register(self, key: str, approach: BaseApproach) -> None:
        """
        Register an approach under a string key.

        Raises TypeError if `approach` does not implement BaseApproach.
        Called at startup so misconfiguration is caught before serving traffic.
        """
        if not isinstance(approach, BaseApproach):
            raise TypeError(
                f"Approach '{key}' must subclass BaseApproach, "
                f"got {type(approach).__name__}."
            )
        self._registry[key] = approach
        logger.info("Registered retrieval approach: '%s' (%s)", key, approach.name)

    def resolve(self, key: str) -> BaseApproach:
        """
        Look up an approach by key. Falls back to the default if key is unknown.

        Falling back (rather than raising) prevents a bad frontend config value
        from taking down the service — the fallback is logged as a warning so
        it surfaces in monitoring without causing a 500.
        """
        approach = self._registry.get(key)
        if approach is None:
            logger.warning(
                "Unknown approach key '%s' — falling back to '%s'.",
                key, self._default_key,
            )
            approach = self._registry.get(self._default_key)
        if approach is None:
            raise RuntimeError(
                f"Default approach '{self._default_key}' is not registered. "
                "Call registry.register() before serving requests."
            )
        return approach

    def available_approaches(self) -> list[str]:
        """Return registered approach keys (for health-check endpoints)."""
        return list(self._registry.keys())


# ── Example: vision-augmented approach stub ───────────────────────────────

class VisionAugmentedApproach(BaseApproach):
    """
    Extends the hybrid approach with GPT-4V processing for image-heavy pages.

    Pages identified as image-dominant during ingestion are stored with a
    `has_images` flag. At retrieval time, flagged pages are routed through
    GPT-4V to extract visual content descriptions, which are merged into the
    retrieval context before answer generation.
    """

    def __init__(self, base_approach: BaseApproach, vision_client, image_store):
        self._base = base_approach
        self._vision = vision_client
        self._image_store = image_store

    @property
    def name(self) -> str:
        return "Vision-Augmented Hybrid RAG"

    async def run(
        self,
        messages: list[dict],
        auth_claims: dict[str, Any],
        overrides: dict[str, Any],
    ) -> dict[str, Any]:
        # Run the base hybrid retrieval first
        result = await self._base.run(messages, auth_claims, overrides)

        # Augment sources that contain images with GPT-4V descriptions
        augmented_sources = []
        for source in result.get("sources", []):
            image_refs = await self._image_store.get_images_for_page(source)
            if image_refs:
                descriptions = await self._describe_images(image_refs)
                augmented_sources.append(
                    f"{source} [visual context: {'; '.join(descriptions)}]"
                )
            else:
                augmented_sources.append(source)

        result["sources"] = augmented_sources
        return result

    async def _describe_images(self, image_refs: list[str]) -> list[str]:
        """Ask GPT-4V to describe each image and return text summaries."""
        descriptions = []
        for ref in image_refs:
            response = await self._vision.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text",  "text": "Describe this image concisely for use as retrieval context."},
                        {"type": "image_url", "image_url": {"url": ref}},
                    ],
                }],
                max_tokens=256,
            )
            descriptions.append(response.choices[0].message.content.strip())
        return descriptions
