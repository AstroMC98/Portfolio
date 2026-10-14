"""
Agent quality scorecard — rubric-based conversation evaluation.

WHAT IT DEMONSTRATES:
  A structured, weighted rubric evaluator that scores a customer service
  agent's conversation against five domain-specific quality dimensions:
  empathy, accuracy, first-contact resolution, compliance adherence, and
  efficiency. Returns per-dimension scores alongside an overall weighted
  Quality Score for coaching feedback.

WHY IT'S INTERESTING:
  Generic "rate this conversation 1–10" prompts are useless for coaching —
  they give no signal on which skill to improve. Decomposing quality into
  independently weighted dimensions produces actionable feedback: a score
  of 0.9 overall with a 0.4 on compliance flags a specific coaching need
  without requiring a supervisor to listen to the call.

NOVELTY:
  The rubric dimensions and their weights are intentionally kept in a
  dataclass configuration rather than hardcoded in the prompt. This lets
  different teams (billing vs. technical support) apply different rubrics
  and weightings without touching the evaluation code. The evaluator calls
  the LLM once per conversation rather than once per dimension — structured
  JSON output with per-dimension fields keeps latency flat regardless of
  rubric size. The confidence field per dimension flags low-certainty scores
  (e.g., when the conversation is too short to assess first-contact resolution),
  preventing coaching decisions based on insufficient evidence.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

import aiohttp

logger = logging.getLogger(__name__)


@dataclass
class RubricDimension:
    name: str
    description: str
    weight: float = 1.0


@dataclass
class DimensionScore:
    name: str
    score: float              # 0.0 – 1.0
    confidence: float         # 0.0 – 1.0; low = insufficient evidence
    rationale: str
    coaching_notes: list[str] = field(default_factory=list)


@dataclass
class ScorecardResult:
    overall_score: float      # confidence-weighted average across dimensions
    dimensions: list[DimensionScore]
    summary: str
    flagged_for_review: bool  # True when any dimension confidence < 0.5


# Default rubric — overridable per team/use case
DEFAULT_RUBRIC: list[RubricDimension] = [
    RubricDimension("empathy",     "Agent acknowledges the customer's situation and emotional state.", weight=1.5),
    RubricDimension("accuracy",    "Information provided is correct and complete.",                   weight=2.0),
    RubricDimension("fcr",         "Issue resolved on first contact without need for escalation.",    weight=2.0),
    RubricDimension("compliance",  "Agent follows required scripts, disclosures, and procedures.",    weight=2.5),
    RubricDimension("efficiency",  "Resolution achieved without unnecessary holds or repetition.",    weight=1.0),
]

SCORECARD_PROMPT = """
You are an expert contact-centre quality assurance analyst.

Evaluate the following conversation against each rubric dimension below.
For each dimension, return:
  - score: float 0.0–1.0 (0 = completely fails, 1 = exemplary)
  - confidence: float 0.0–1.0 (0 = insufficient evidence, 1 = very clear)
  - rationale: one sentence explaining the score
  - coaching_notes: list of specific, actionable improvement suggestions (empty if score >= 0.85)

Rubric:
{rubric_json}

Conversation:
{conversation}

Return ONLY valid JSON matching this schema:
{{
  "dimensions": [
    {{"name": "...", "score": 0.0, "confidence": 0.0, "rationale": "...", "coaching_notes": []}}
  ],
  "summary": "one-sentence overall assessment"
}}
"""


class ScorecardGenerator:
    """
    Evaluates agent conversations against a configurable quality rubric.

    Endpoints driven by this generator:
      POST /api/generate_scorecard    — full scorecard for a completed call
      POST /api/partial_scorecard     — mid-call snapshot (lower confidence expected)
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        rubric: Optional[list[RubricDimension]] = None,
        max_retries: int = 3,
        timeout: int = 30,
    ):
        self.api_key = api_key
        self.model = model
        self.rubric = rubric or DEFAULT_RUBRIC
        self.max_retries = max_retries
        self.timeout = timeout

    async def generate(self, conversation: str) -> ScorecardResult:
        """Evaluate a conversation and return a weighted scorecard."""
        rubric_json = json.dumps(
            [{"name": d.name, "description": d.description} for d in self.rubric],
            indent=2,
        )
        prompt = SCORECARD_PROMPT.format(
            rubric_json=rubric_json,
            conversation=conversation,
        )
        raw = await self._call_with_retry(prompt)
        return self._parse(raw)

    # ── Parsing ────────────────────────────────────────────────────────────

    def _parse(self, raw: dict[str, Any]) -> ScorecardResult:
        dim_scores = [
            DimensionScore(
                name=d["name"],
                score=float(d["score"]),
                confidence=float(d["confidence"]),
                rationale=d["rationale"],
                coaching_notes=d.get("coaching_notes", []),
            )
            for d in raw.get("dimensions", [])
        ]

        # Weighted average — weight from rubric, scaled by LLM confidence
        weight_map = {d.name: d.weight for d in self.rubric}
        total_weight = 0.0
        weighted_sum = 0.0
        for ds in dim_scores:
            w = weight_map.get(ds.name, 1.0) * ds.confidence
            weighted_sum += ds.score * w
            total_weight += w

        overall = weighted_sum / total_weight if total_weight > 0 else 0.0
        flagged = any(ds.confidence < 0.5 for ds in dim_scores)

        return ScorecardResult(
            overall_score=round(overall, 3),
            dimensions=dim_scores,
            summary=raw.get("summary", ""),
            flagged_for_review=flagged,
        )

    # ── Async LLM call with exponential backoff ────────────────────────────

    async def _call_with_retry(self, prompt: str, attempt: int = 0) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.0,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=self.timeout),
            ) as resp:
                if resp.status in (429, 500, 502, 503, 504):
                    if attempt >= self.max_retries:
                        resp.raise_for_status()
                    wait = 2 ** attempt
                    logger.warning("HTTP %d — retrying in %ds", resp.status, wait)
                    import asyncio
                    await asyncio.sleep(wait)
                    return await self._call_with_retry(prompt, attempt + 1)
                resp.raise_for_status()
                data = await resp.json()
                return json.loads(data["choices"][0]["message"]["content"])
