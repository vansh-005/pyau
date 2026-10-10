"""Trust loop rules (pure): rider problem reports pause a point automatically; a human reactivates it."""
from typing import Iterable, Optional

PROBLEM_KINDS = {"closed", "no_water", "dirty", "unsafe"}
POSITIVE_KINDS = {"got_it"}
ALL_KINDS = PROBLEM_KINDS | POSITIVE_KINDS


def counted_problems(reports: Iterable[dict], now: float, window_hours: float, since: Optional[float] = None) -> list[dict]:
    """Problem reports inside the sliding window and after the last reactivation (older ones are resolved)."""
    lo = now - window_hours * 3600
    if since:
        lo = max(lo, since)
    return [r for r in reports if r["kind"] in PROBLEM_KINDS and r["createdAt"] >= lo]


def should_pause(reports: Iterable[dict], now: float, threshold: int, window_hours: float, since: Optional[float] = None) -> bool:
    return len(counted_problems(reports, now, window_hours, since)) >= threshold
