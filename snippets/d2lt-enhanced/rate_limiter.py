"""
AsyncRateLimiter — Token-bucket rate limiter with sliding window.

WHAT IT DEMONSTRATES:
  Async-safe rate limiting across concurrent worker pools processing PDFs.
  Multiple asyncio workers share one limiter instance; the sliding window
  algorithm prevents bursts from accumulating hidden debt across workers.

WHY IT'S INTERESTING:
  Rather than a fixed token bucket that refills on a timer, this uses a
  deque to track actual request timestamps. The window is always exactly
  60 seconds wide, so the effective rate converges to the RPM limit even
  under bursty load. The asyncio.Lock ensures the critical section is
  atomic — no two coroutines can both observe "under limit" simultaneously.
"""

import asyncio
import time
from collections import deque
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class AsyncRateLimiter:
    """Token-bucket rate limiter with sliding window for async contexts.

    Limits requests-per-minute (RPM) with optional burst support.
    Thread-safe for asyncio via asyncio.Lock.

    Args:
        rpm:        Maximum requests per minute.
        burst_size: Max concurrent in-flight requests (default: rpm // 2).
    """

    def __init__(self, rpm: int, burst_size: Optional[int] = None):
        if rpm <= 0:
            raise ValueError(f"RPM must be positive, got {rpm}")

        self.rpm = rpm
        self.burst_size = burst_size if burst_size is not None else max(1, rpm // 2)
        self.semaphore = asyncio.Semaphore(self.burst_size)
        self.request_times: deque[float] = deque()
        self.lock = asyncio.Lock()

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.semaphore.release()
        return False

    async def acquire(self):
        """Block until a rate-limit slot is available, then claim it.

        Algorithm:
          1. Purge timestamps older than 60 s (sliding window eviction).
          2. If at RPM capacity, sleep until the oldest request ages out.
          3. Append current timestamp and release the lock.
        """
        async with self.lock:
            now = time.time()

            # Evict stale entries from the front of the sliding window
            while self.request_times and self.request_times[0] < now - 60:
                self.request_times.popleft()

            if len(self.request_times) >= self.rpm:
                # Sleep exactly long enough for the oldest entry to expire
                sleep_time = 60 - (now - self.request_times[0]) + 0.1  # 100 ms buffer
                if sleep_time > 0:
                    logger.debug(
                        "Rate limit reached (%d/%d RPM), sleeping %.2fs",
                        len(self.request_times), self.rpm, sleep_time,
                    )
                    await asyncio.sleep(sleep_time)
                    now = time.time()
                    while self.request_times and self.request_times[0] < now - 60:
                        self.request_times.popleft()

            self.request_times.append(now)

    def get_capacity(self) -> int:
        """Remaining requests available in the current 60-second window."""
        now = time.time()
        while self.request_times and self.request_times[0] < now - 60:
            self.request_times.popleft()
        return max(0, self.rpm - len(self.request_times))


# Usage — every AI call in the pipeline is wrapped like this:
#
#   async with self.rate_limiter:
#       result = await ai_client.extract_region_async(image, prompt)
