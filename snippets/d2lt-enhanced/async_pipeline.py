"""
Async pipeline core — three-level parallelism for document processing.

WHAT IT DEMONSTRATES:
  How the Document Intelligence Pipeline achieves 10-30x speedup by running
  concurrent asyncio tasks at every level: batches → pages → regions.
  Each level is independently bounded to avoid resource exhaustion.

WHY IT'S INTERESTING:
  The pattern uses asyncio.Queue + worker coroutines for the batch level
  (fan-out to N workers), then asyncio.gather() for page/region parallelism
  within each worker. return_exceptions=True at each gather ensures one
  failed region never crashes the entire document.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PageResult:
    page_number: int
    html: str
    token_usage: Any


@dataclass
class DocumentResult:
    source_path: str
    pages: list[PageResult] = field(default_factory=list)
    total_tokens: Any = None


class AsyncDocumentPipeline:
    """
    Orchestrates concurrent document processing.

    Levels of parallelism:
      1. Batch level  — asyncio.Queue + N worker coroutines
      2. Page level   — asyncio.gather() of page tasks per document
      3. Region level — asyncio.gather() of region tasks per page
    """

    def __init__(self, ai_client, rate_limiter, max_workers: int = 3, max_pages: int = 5):
        self.ai_client = ai_client
        self.rate_limiter = rate_limiter
        self.max_workers = max_workers
        self._page_semaphore = asyncio.Semaphore(max_pages)

    # ── Batch level ────────────────────────────────────────────────────────

    async def convert_batch_async(self, pdf_paths: list[str]) -> list[DocumentResult]:
        """Process a list of PDFs concurrently using a worker pool."""
        queue: asyncio.Queue[str] = asyncio.Queue()
        results: list[DocumentResult] = []

        for path in pdf_paths:
            await queue.put(path)

        workers = [
            asyncio.create_task(self._worker(queue, results))
            for _ in range(self.max_workers)
        ]

        await queue.join()          # block until all items are processed
        for w in workers:
            w.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        return results

    async def _worker(self, queue: asyncio.Queue, results: list):
        """Continuously pull PDFs from the queue until cancelled."""
        while True:
            path = await queue.get()
            try:
                result = await self.convert_async(path)
                results.append(result)
            except Exception as exc:
                results.append(DocumentResult(source_path=path))  # empty on failure
            finally:
                queue.task_done()

    # ── Page level ─────────────────────────────────────────────────────────

    async def convert_async(self, pdf_path: str) -> DocumentResult:
        """Process all pages of a single PDF concurrently."""
        pages = self._load_pdf_pages(pdf_path)   # returns list of page images

        # Semaphore caps concurrent pages; gather collects results in order
        tasks = [self._process_page_async(page_img, i) for i, page_img in enumerate(pages)]
        page_results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_pages = [r for r in page_results if isinstance(r, PageResult)]
        return DocumentResult(source_path=pdf_path, pages=valid_pages)

    # ── Region level ───────────────────────────────────────────────────────

    async def _process_page_async(self, page_image, page_number: int) -> PageResult:
        """Detect layout regions then extract each region concurrently."""
        async with self._page_semaphore:
            # Phase 1: layout analysis (rate-limited AI call)
            async with self.rate_limiter:
                regions = await self.ai_client.analyze_layout_async(page_image)

            # Phase 2: extract each region in parallel
            extract_tasks = [
                self._extract_region_async(page_image, region)
                for region in regions
            ]
            region_html_parts = await asyncio.gather(*extract_tasks, return_exceptions=True)

            html = "\n".join(
                r for r in region_html_parts if isinstance(r, str)
            )
            return PageResult(page_number=page_number, html=html, token_usage=None)

    async def _extract_region_async(self, page_image, region) -> str:
        """Rate-limited extraction call for a single document region."""
        async with self.rate_limiter:
            return await self.ai_client.extract_content_async(page_image, region)

    def _load_pdf_pages(self, pdf_path: str) -> list:
        """Load PDF pages as PIL images (sync — called before gather)."""
        raise NotImplementedError  # implemented in full pipeline
