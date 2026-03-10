"""
Embedding drift detector — monitor query distribution shifts over time.

WHAT IT DEMONSTRATES:
  How the LLMOps platform detects when the distribution of incoming queries
  drifts away from the baseline used during evaluation. Uses cosine
  similarity between mean embeddings of baseline vs. production windows
  to trigger re-evaluation alerts.

WHY IT'S INTERESTING:
  Models that evaluate well at deployment time may degrade as user queries
  evolve (new use cases, seasonal patterns, product changes). Rather than
  waiting for user complaints, this approach gives early warnings by
  continuously comparing the statistical "centre of mass" of queries —
  a lightweight proxy for distribution shift without requiring labels.
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class DriftReport:
    timestamp: datetime
    baseline_size: int
    production_size: int
    cosine_similarity: float
    drift_score: float          # 1.0 - cosine_similarity; 0 = no drift
    alert: bool
    threshold: float


class EmbeddingDriftDetector:
    """
    Detects query distribution shift by comparing mean embeddings.

    Strategy:
      1. Maintain a rolling window of production query embeddings.
      2. Compare the mean embedding of the window to a frozen baseline.
      3. Raise an alert when cosine similarity drops below `threshold`.

    The mean-embedding approach is fast (O(n) per window update) and
    works well when drift is gradual — sufficient for daily monitoring.
    """

    def __init__(
        self,
        threshold: float = 0.90,
        window_size: int = 500,
    ):
        self.threshold = threshold
        self.window_size = window_size

        self._baseline: Optional[np.ndarray] = None   # mean of baseline embeddings
        self._production_window: list[np.ndarray] = []

    # ── Baseline ───────────────────────────────────────────────────────────

    def set_baseline(self, embeddings: list[list[float]]) -> None:
        """Freeze a baseline from evaluation-time query embeddings."""
        matrix = np.array(embeddings, dtype=np.float32)
        self._baseline = self._unit(matrix.mean(axis=0))

    # ── Production updates ────────────────────────────────────────────────

    def add_production_embedding(self, embedding: list[float]) -> None:
        """Append a new production query embedding to the rolling window."""
        self._production_window.append(np.array(embedding, dtype=np.float32))
        if len(self._production_window) > self.window_size:
            self._production_window.pop(0)   # evict oldest

    # ── Drift evaluation ──────────────────────────────────────────────────

    def evaluate(self) -> Optional[DriftReport]:
        """
        Compute drift between baseline and current production window.

        Returns None if baseline is not set or window is too small.
        """
        if self._baseline is None or len(self._production_window) < 10:
            return None

        production_matrix = np.array(self._production_window, dtype=np.float32)
        production_mean = self._unit(production_matrix.mean(axis=0))

        cosine_sim = float(np.dot(self._baseline, production_mean))
        drift_score = 1.0 - cosine_sim

        return DriftReport(
            timestamp=datetime.utcnow(),
            baseline_size=0,                # set externally if tracking size
            production_size=len(self._production_window),
            cosine_similarity=cosine_sim,
            drift_score=drift_score,
            alert=cosine_sim < self.threshold,
            threshold=self.threshold,
        )

    # ── Helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def _unit(v: np.ndarray) -> np.ndarray:
        """Normalise a vector to unit length for cosine comparison."""
        norm = np.linalg.norm(v)
        return v / norm if norm > 1e-9 else v
