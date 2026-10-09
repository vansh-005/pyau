from collections import defaultdict
from typing import Iterable, Optional

from .geo import haversine, hm
from .models import Availability, ClusterCoverage, CoverageReport, DemandRecord, Host, Policy


def in_window(r: DemandRecord, window: tuple[str, str], need: str) -> bool:
    return r.need == need and hm(window[0]) <= hm(r.hour) < hm(window[1])  # half-open


def host_open_for_hour(host_id: str, hour: str, avail: Iterable[Availability]) -> bool:
    """Whole request hour [hour, hour+1) inside one availability window."""
    s = hm(hour)
    return any(a.hostId == host_id and hm(a.window[0]) <= s and s + 60 <= hm(a.window[1]) for a in avail)


def host_live_at(host_id: str, minute: int, avail: Iterable[Availability]) -> Optional[Availability]:
    """Availability covering an instant (rider 'open now' check); latest closing wins."""
    cands = [a for a in avail if a.hostId == host_id and hm(a.window[0]) <= minute < hm(a.window[1])]
    return max(cands, key=lambda a: hm(a.window[1]), default=None)


def covering_host(r: DemandRecord, hosts: list[Host], avail: list[Availability], policy: Policy):
    """(host, distance) of the nearest host covering this request, or None."""
    best = None
    for h in hosts:
        if policy.need not in h.offers or h.paused or not host_open_for_hour(h.id, r.hour, avail):
            continue
        d = haversine(r, h)
        if d <= policy.coverageRadiusMeters and (best is None or d < best[1]):
            best = (h, d)
    return best


def compute_coverage(
    demand: list[DemandRecord], hosts: list[Host], avail: list[Availability], window: tuple[str, str], policy: Policy
) -> CoverageReport:
    reqs = [r for r in demand if in_window(r, window, policy.need)]
    by: dict[str, dict] = defaultdict(lambda: {"requests": 0, "covered": 0, "host": None, "dist": None})
    covered = 0
    for r in reqs:
        c = by[r.clusterId]
        c["requests"] += 1
        hit = covering_host(r, hosts, avail, policy)
        if hit:
            covered += 1
            c["covered"] += 1
            if c["dist"] is None or hit[1] < c["dist"]:
                c["host"], c["dist"] = hit[0].id, hit[1]
    by_cluster = {
        k: ClusterCoverage(
            requests=v["requests"], covered=v["covered"], nearestHostId=v["host"],
            distanceM=None if v["dist"] is None else round(v["dist"]),
        )
        for k, v in sorted(by.items())
    }
    total = len(reqs)
    return CoverageReport(
        window=window, total=total, covered=covered,
        percent=round(100 * covered / total, 1) if total else None,
        byCluster=by_cluster,
        uncoveredClusters=[k for k, v in by_cluster.items() if v.covered < v.requests],
    )
