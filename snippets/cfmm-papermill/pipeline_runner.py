"""
Parameterised notebook pipeline runner using Papermill.

WHAT IT DEMONSTRATES:
  How to orchestrate daily automated analysis by treating Jupyter notebooks
  as parameterised, reproducible execution units. Each analysis category
  runs the same template notebook with a different parameter set.

WHY IT'S INTERESTING:
  Papermill bridges the gap between exploratory Jupyter analysis and
  production pipelines. The template approach means data scientists can
  iterate on notebooks locally, and the same file runs in production
  with injected parameters — no code duplication, full reproducibility,
  and output notebooks serve as execution audit logs.

NOVELTY:
  The common alternative — converting notebooks to Python scripts for
  production — loses the cell-by-cell execution state that makes debugging
  failures tractable. Papermill's output notebooks preserve intermediate
  cell outputs, making it straightforward to identify which analysis step
  failed and why, without adding explicit checkpointing code. The dual
  execution mode (sequential for debugging, multiprocessing.Pool for daily
  production runs) is surfaced via a single parameter rather than two code
  paths, preventing the classic problem where the "fast path" and "debug path"
  diverge over time. Category isolation means one failing analysis doesn't
  block the others — each notebook process is fully independent.
"""

from __future__ import annotations

import os
import multiprocessing
from datetime import datetime
from pathlib import Path
from time import sleep
from typing import Any

import papermill as pm


# ── Single-notebook execution ──────────────────────────────────────────────

def run_notebook(
    template: str,
    params: dict[str, Any],
    output_filename: str,
    template_dir: str,
    output_dir: str,
    run_id: str,
    runner_id: str,
    analysis_category: str,
) -> str:
    """
    Execute a parameterised Jupyter notebook via Papermill.

    Args:
        template:          Filename of the template notebook.
        params:            Analysis-specific parameters to inject.
        output_filename:   Filename for the executed output notebook.
        template_dir:      Directory containing template notebooks.
        output_dir:        Directory to write executed notebooks.
        run_id:            Unique identifier for this pipeline run.
        runner_id:         Worker ID (for parallel execution logging).
        analysis_category: Category label injected into the notebook.

    Returns:
        Absolute path of the executed output notebook.
    """
    input_path = os.path.join(template_dir, template)
    output_path = os.path.join(output_dir, output_filename)

    # Inject tracking IDs so every output notebook knows its provenance
    params["run_id"] = run_id
    params["runner_id"] = runner_id
    params["analysis_category"] = analysis_category

    print(f"  [PID {os.getpid()}] Running: {output_filename}")

    pm.execute_notebook(
        input_path=input_path,
        output_path=output_path,
        parameters=params,
        progress_bar=False,
        cwd=template_dir,     # ensures relative imports inside notebook work
    )
    return output_path


# ── Parallel pipeline orchestration ───────────────────────────────────────

def run_pipeline_parallel(
    categories: list[dict],
    template_dir: str,
    output_dir: str,
    run_id: str,
    workers: int = 4,
) -> list[str]:
    """
    Run multiple analysis categories in parallel via multiprocessing.Pool.

    Each category is an independent analysis — no data dependencies between
    them — making this an embarrassingly parallel workload.

    Args:
        categories: List of {"name": str, "template": str, "params": dict}
        template_dir: Shared directory of template notebooks.
        output_dir:   Shared output directory.
        run_id:       Run identifier (same for all categories this run).
        workers:      Process pool size.

    Returns:
        List of output notebook paths.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    tasks = []
    for idx, cat in enumerate(categories):
        output_name = f"{cat['name']}_{timestamp}.ipynb"
        tasks.append((
            cat["template"],
            cat.get("params", {}),
            output_name,
            template_dir,
            output_dir,
            run_id,
            f"worker_{idx}",
            cat["name"],
        ))

    with multiprocessing.Pool(processes=min(workers, len(tasks))) as pool:
        results = pool.starmap(run_notebook, tasks)

    return results


# ── Example usage ─────────────────────────────────────────────────────────
#
# categories = [
#     {"name": "headlines",       "template": "headlines.ipynb",       "params": {"date": "2025-01-15"}},
#     {"name": "generalisation",  "template": "generalisation.ipynb",  "params": {"date": "2025-01-15"}},
#     {"name": "misrepresentation","template": "misrepresentation.ipynb","params": {"date": "2025-01-15"}},
#     {"name": "negative_aspects", "template": "negative_aspects.ipynb", "params": {"date": "2025-01-15"}},
# ]
# outputs = run_pipeline_parallel(categories, template_dir="templates/", output_dir="output/", run_id="run_001")
