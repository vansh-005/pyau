from typing import Optional

from .geo import haversine, hm
from .models import DemandRecord, Host, Policy


def centroid(points: list) -> dict:
    return {"lat": sum(p.lat for p in points) / len(points), "lng": sum(p.lng for p in points) / len(points)}


def candidate_hosts(
    cluster_id: str, demand: list[DemandRecord], hosts: list[Host], window: tuple[str, str], policy: Policy,
    asked_today: Optional[set[str]] = None,
) -> list[dict]:
    """Consenting, unpaused hosts offering the need, within radius of EVERY request in the cluster, declared hours
    overlapping the heat window, not asked today. Ranked by distance to centroid then id; top N."""
    pts = [
        r for r in demand
        if r.clusterId == cluster_id and r.need == policy.need and hm(window[0]) <= hm(r.hour) < hm(window[1])
    ]
    if not pts:
        return []
    c = centroid(pts)
    out = []
    for h in hosts:
        if not (h.consentToAsks and policy.need in h.offers and not h.paused) or h.id in (asked_today or set()):
            continue
        if not all(haversine(p, h) <= policy.coverageRadiusMeters for p in pts):
            continue
        if not (hm(h.hours[0]) < hm(window[1]) and hm(h.hours[1]) > hm(window[0])):
            continue
        out.append({"hostId": h.id, "label": h.label, "kind": h.kind, "distanceM": round(haversine(c, h))})
    out.sort(key=lambda x: (x["distanceM"], x["hostId"]))
    return out[: policy.maxCandidatesPerCluster]
