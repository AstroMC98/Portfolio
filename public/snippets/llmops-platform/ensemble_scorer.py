"""
Ensemble scorer — Trust Score from multiple agentic judge personas.

WHAT IT DEMONSTRATES:
  How the LLMOps platform combines scores from multiple independent evaluator
  personas into a single Trust Score. Each judge runs its own agentic
  reasoning chain (see agentic_evaluator.py); the ensemble layer applies
  confidence-weighted aggregation, detects inter-judge disagreement, and
  adjusts per-judge weights based on accumulated HITL correction history.

WHY IT'S INTERESTING:
  Single-judge evaluation is subject to persona bias — a "strict accuracy"
  judge will systematically undervalue creative but correct responses. By
  routing every response through multiple judges with different perspectives
  and weighting them by their historical calibration against human labels,
  the ensemble produces a more stable, less biased quality signal than any
  individual evaluator.

NOVELTY:
  The calibration weight update is the non-obvious part: when a human
  annotator overrides a judge's score, the system computes the absolute
  error and applies an exponential moving average to that judge's reliability
  weight. Judges that consistently agree with human reviewers gain influence;
  judges that diverge lose it — automatically, over time, without manual
  tuning. The disagreement flag is computed using pairwise standard deviation
  across judge scores rather than a simple max-min range, because range is
  sensitive to a single outlier judge, whereas std dev captures systematic
  divergence across the full panel.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


# ── Data structures ────────────────────────────────────────────────────────

@dataclass
class JudgeScore:
    judge_id: str
    score: float          # 0.0 – 1.0 from AgenticEvaluator
    confidence: float     # 0.0 – 1.0 from AgenticEvaluator
    reasoning: str


@dataclass
class TrustScoreResult:
    trust_score: float                  # final ensemble output
    judge_scores: list[JudgeScore]
    judge_weights: dict[str, float]     # calibration-adjusted weights used
    disagreement: bool                  # True when judges diverge significantly
    disagreement_std: float             # pairwise std dev across judges
    low_confidence: bool                # True when weighted confidence < threshold


# ── Ensemble Scorer ────────────────────────────────────────────────────────

class EnsembleScorer:
    """
    Aggregates scores from multiple agentic judge personas into a Trust Score.

    Flow:
      judge scores → calibration weight adjustment → confidence-weighted mean
                   → disagreement detection → TrustScoreResult
    """

    DISAGREEMENT_THRESHOLD = 0.15   # std dev above which judges are considered divergent
    LOW_CONFIDENCE_THRESHOLD = 0.50 # mean weighted confidence below which result is flagged
    CALIBRATION_ALPHA = 0.2         # EMA smoothing factor for weight updates

    def __init__(self, judge_ids: list[str]):
        # Start all judges at equal weight; updated via HITL corrections
        self._calibration_weights: dict[str, float] = {j: 1.0 for j in judge_ids}

    # ── Scoring ────────────────────────────────────────────────────────────

    def score(self, judge_scores: list[JudgeScore]) -> TrustScoreResult:
        """Aggregate judge scores into a single Trust Score."""
        if not judge_scores:
            raise ValueError("At least one judge score is required.")

        weights = {
            js.judge_id: self._calibration_weights.get(js.judge_id, 1.0) * js.confidence
            for js in judge_scores
        }
        total_weight = sum(weights.values())

        if total_weight < 1e-9:
            # All judges have zero confidence — fall back to unweighted mean
            trust_score = sum(js.score for js in judge_scores) / len(judge_scores)
            total_weight = 1.0
        else:
            trust_score = sum(
                js.score * weights[js.judge_id] for js in judge_scores
            ) / total_weight

        mean_confidence = sum(js.confidence for js in judge_scores) / len(judge_scores)
        disagreement_std = self._pairwise_std([js.score for js in judge_scores])

        return TrustScoreResult(
            trust_score=round(trust_score, 4),
            judge_scores=judge_scores,
            judge_weights={js.judge_id: round(weights[js.judge_id], 4) for js in judge_scores},
            disagreement=disagreement_std > self.DISAGREEMENT_THRESHOLD,
            disagreement_std=round(disagreement_std, 4),
            low_confidence=mean_confidence < self.LOW_CONFIDENCE_THRESHOLD,
        )

    # ── HITL calibration ───────────────────────────────────────────────────

    def apply_human_correction(
        self,
        judge_id: str,
        judge_score: float,
        human_score: float,
    ) -> None:
        """
        Update a judge's calibration weight based on human annotator feedback.

        Uses exponential moving average: judges that agree with humans gain
        weight; judges that diverge lose it. Called by the HITL annotation
        workflow when a reviewer overrides an ensemble decision.

        Args:
            judge_id:    The judge persona being calibrated.
            judge_score: The score the judge produced.
            human_score: The score the human reviewer assigned instead.
        """
        absolute_error = abs(judge_score - human_score)  # 0 = perfect, 1 = max error
        reliability = 1.0 - absolute_error               # invert: high error → low reliability

        current = self._calibration_weights.get(judge_id, 1.0)
        # EMA update: blend current weight toward new reliability signal
        self._calibration_weights[judge_id] = (
            (1 - self.CALIBRATION_ALPHA) * current
            + self.CALIBRATION_ALPHA * reliability
        )

    def get_calibration_weights(self) -> dict[str, float]:
        """Return current per-judge calibration weights (for logging/audit)."""
        return dict(self._calibration_weights)

    # ── Helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def _pairwise_std(scores: list[float]) -> float:
        """
        Standard deviation across judge scores.

        Chosen over max-min range because std dev is robust to a single
        outlier judge — it captures systematic panel divergence, not just
        the extremes.
        """
        if len(scores) < 2:
            return 0.0
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        return math.sqrt(variance)
