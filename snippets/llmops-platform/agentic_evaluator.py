"""
Agentic evaluator — multi-step reasoning before scoring.

WHAT IT DEMONSTRATES:
  An LLM evaluator that performs a structured reasoning chain before
  producing a score. Rather than asking the model to score directly,
  it first analyses the response against each criterion, identifies
  failure modes, then synthesises a calibrated score with justification.

WHY IT'S INTERESTING:
  Single-prompt scoring is brittle — models often anchor on surface cues
  (length, tone) rather than actual quality. The multi-step chain forces
  the model to explicitly reason about each criterion before committing
  to a score, producing more reliable and auditable evaluations.
  This is the evaluator pattern used in the LLMOps platform's ensemble.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any
from openai import OpenAI


@dataclass
class EvaluationCriterion:
    name: str
    description: str
    weight: float = 1.0


@dataclass
class CriterionResult:
    criterion: str
    reasoning: str
    score: float          # 0.0 – 1.0
    failure_modes: list[str] = field(default_factory=list)


@dataclass
class EvaluationResult:
    overall_score: float
    criteria_results: list[CriterionResult]
    synthesis: str
    model: str
    raw_tokens: int = 0


class AgenticEvaluator:
    """
    Multi-step evaluator: analyse → critique → synthesise → score.

    The evaluation unfolds in three LLM calls:
      1. Criterion analysis  — evaluate each criterion independently
      2. Failure identification — surface specific deficiencies
      3. Score synthesis      — weight criteria and produce final score
    """

    ANALYSIS_PROMPT = """
You are an expert evaluator assessing an AI-generated response.

Task definition:
{task}

Criteria to evaluate (evaluate each independently):
{criteria_json}

Response to evaluate:
{response}

For EACH criterion, provide:
- reasoning: what you observed
- score: a float between 0.0 (completely fails) and 1.0 (perfect)
- failure_modes: list of specific deficiencies (empty list if none)

Return valid JSON: {{"results": [{{"criterion": "...", "reasoning": "...", "score": 0.0, "failure_modes": []}}]}}
"""

    SYNTHESIS_PROMPT = """
Given these per-criterion evaluation results, produce a final weighted score.

Criteria results:
{results_json}

Weights per criterion:
{weights_json}

Compute: weighted_average(score * weight for each criterion).
Return JSON: {{"overall_score": 0.0, "synthesis": "one-sentence justification"}}
"""

    def __init__(self, client: OpenAI, model: str = "gpt-4o"):
        self.client = client
        self.model = model

    def evaluate(
        self,
        task: str,
        response: str,
        criteria: list[EvaluationCriterion],
    ) -> EvaluationResult:
        """Run the full agentic evaluation chain."""
        # Step 1 — analyse each criterion independently
        criteria_json = json.dumps(
            [{"name": c.name, "description": c.description} for c in criteria],
            indent=2,
        )
        analysis_raw = self._call(
            self.ANALYSIS_PROMPT.format(
                task=task,
                criteria_json=criteria_json,
                response=response,
            )
        )
        criterion_results = [
            CriterionResult(**r) for r in analysis_raw.get("results", [])
        ]

        # Step 2 — weighted synthesis into final score
        weights_json = json.dumps({c.name: c.weight for c in criteria})
        synthesis_raw = self._call(
            self.SYNTHESIS_PROMPT.format(
                results_json=json.dumps([vars(r) for r in criterion_results], indent=2),
                weights_json=weights_json,
            )
        )

        return EvaluationResult(
            overall_score=synthesis_raw.get("overall_score", 0.0),
            criteria_results=criterion_results,
            synthesis=synthesis_raw.get("synthesis", ""),
            model=self.model,
        )

    def _call(self, prompt: str) -> dict[str, Any]:
        """Single LLM call returning parsed JSON."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.0,
        )
        return json.loads(response.choices[0].message.content)
