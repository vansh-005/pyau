import math


def _c(o, k):
    return o[k] if isinstance(o, dict) else getattr(o, k)


def haversine(a, b) -> float:
    """Metres between two objects/dicts with lat and lng."""
    p1, p2 = math.radians(_c(a, "lat")), math.radians(_c(b, "lat"))
    dp, dl = p2 - p1, math.radians(_c(b, "lng") - _c(a, "lng"))
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371000.0 * math.asin(math.sqrt(x))


def hm(s: str) -> int:
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def fmt_hm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"
