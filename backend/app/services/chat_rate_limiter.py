import asyncio
import time
from dataclasses import dataclass

from fastapi import HTTPException


@dataclass
class _Bucket:
    tokens: float
    updated_at: float


class ChatRateLimiter:
    """Per-user dual token bucket for a single API process."""

    def __init__(self) -> None:
        self._second: dict[str, _Bucket] = {}
        self._minute: dict[str, _Bucket] = {}
        self._lock = asyncio.Lock()

    async def check(self, user_id: str) -> None:
        now = time.monotonic()
        async with self._lock:
            second = self._refill(self._second, user_id, now, capacity=5, refill_per_second=5)
            minute = self._refill(self._minute, user_id, now, capacity=60, refill_per_second=1)
            if second.tokens < 1 or minute.tokens < 1:
                raise HTTPException(
                    status_code=429,
                    detail="메시지를 너무 빠르게 보내고 있습니다. 잠시 후 다시 시도해주세요.",
                    headers={"Retry-After": "1"},
                )
            second.tokens -= 1
            minute.tokens -= 1

    @staticmethod
    def _refill(
        store: dict[str, _Bucket],
        user_id: str,
        now: float,
        *,
        capacity: int,
        refill_per_second: float,
    ) -> _Bucket:
        bucket = store.get(user_id)
        if bucket is None:
            bucket = _Bucket(tokens=float(capacity), updated_at=now)
            store[user_id] = bucket
            return bucket
        elapsed = max(now - bucket.updated_at, 0)
        bucket.tokens = min(float(capacity), bucket.tokens + elapsed * refill_per_second)
        bucket.updated_at = now
        return bucket


chat_rate_limiter = ChatRateLimiter()
