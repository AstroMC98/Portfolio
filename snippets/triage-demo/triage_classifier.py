"""
AI triage classifier — structured output via XML-tagged Claude responses.

WHAT IT DEMONSTRATES:
  How to use Claude's free-form generation to produce reliably parseable
  structured output using XML tags. The model wraps each output field in
  named tags (<interpretation>, <triage>), which are extracted with regex.
  All decisions are logged with reference IDs for audit trails.

WHY IT'S INTERESTING:
  Before JSON-mode / tool use were ubiquitous, XML-tagged output was a
  robust way to extract structured data from LLMs — it's resilient to
  preamble text and works across models. The reference ID derived from
  hashing the input ensures idempotent lookups without a database.

NOVELTY:
  XML-tagged output parsing remains relevant even with modern JSON-mode
  because it degrades more gracefully: if the model produces extra reasoning
  text before the tags (common in zero-shot prompts), the regex extractor
  still finds the payload, whereas JSON-mode fails on any non-JSON prefix.
  The MD5-based reference ID (hashed from case description + timestamp) gives
  idempotent audit trail entries without requiring a sequence counter or
  database auto-increment — critical for a stateless prototype that writes
  only to a flat CSV. The design explicitly separates interpretation (what is
  this case?) from triage (what priority?) into distinct XML tags, matching
  the two-question mental model used by human triage reviewers and making it
  straightforward to evaluate each output dimension independently.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import date
from typing import Optional

import anthropic
import pandas as pd


@dataclass
class TriageResult:
    reference_id: str
    date: str
    raw_input: str
    interpretation: str
    triage_level: str


class TriageClassifier:
    """
    Classifies unstructured case descriptions into priority triage levels.

    Uses Claude with an XML-tagged output schema so the response can be
    parsed reliably even when the model includes explanatory preamble.

    Output tags:
      <interpretation> — structured summary of the case
      <triage>         — priority label (e.g. P1 Critical / P2 High / P3 Normal)
    """

    SYSTEM_PROMPT = """
You are a triage classification assistant. Given a case description, you must:
1. Interpret the case in a clear, structured summary.
2. Assign a triage priority level.

Always respond using these exact XML tags:
<interpretation>
[Concise structured interpretation of the case]
</interpretation>
<triage>
[Priority level: P1 Critical | P2 High | P3 Normal | P4 Low]
</triage>

Base your decision on urgency, impact, and risk factors described in the input.
"""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def classify(self, case_description: str) -> TriageResult:
        """Send the case to Claude and parse the XML-tagged response."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=512,
            system=self.SYSTEM_PROMPT,
            messages=[{"role": "user", "content": case_description}],
        )
        raw_output = response.content[0].text
        interpretation, triage_level = self._parse_xml_output(raw_output)

        return TriageResult(
            reference_id=self._generate_ref_id(case_description),
            date=date.today().isoformat(),
            raw_input=case_description,
            interpretation=interpretation or "[parse error]",
            triage_level=triage_level or "[parse error]",
        )

    # ── Parsing ────────────────────────────────────────────────────────────

    def _parse_xml_output(self, text: str) -> tuple[Optional[str], Optional[str]]:
        """Extract content from <interpretation> and <triage> tags."""
        interp = self._extract_tag(text, "interpretation")
        triage = self._extract_tag(text, "triage")
        return interp, triage

    @staticmethod
    def _extract_tag(text: str, tag: str) -> Optional[str]:
        match = re.search(
            rf"<{tag}>(.*?)</{tag}>", text, re.DOTALL | re.IGNORECASE
        )
        return match.group(1).strip() if match else None

    # ── Audit trail ────────────────────────────────────────────────────────

    @staticmethod
    def _generate_ref_id(text: str) -> str:
        """Deterministic 8-digit reference ID from input hash."""
        return str(int(hashlib.md5(text.encode()).hexdigest(), 16) % 10 ** 8).zfill(8)

    def append_to_log(self, result: TriageResult, log_path: str) -> pd.DataFrame:
        """Persist the triage result to a CSV audit log."""
        row = {
            "Reference ID": result.reference_id,
            "Date": result.date,
            "Interpretation": result.interpretation,
            "Triage Level": result.triage_level,
        }
        try:
            df = pd.read_csv(log_path, dtype=str)
        except FileNotFoundError:
            df = pd.DataFrame(columns=list(row.keys()))

        df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
        df.to_csv(log_path, index=False)
        return df
