"""Planning-fixture checker for Pyau. Recomputes the demo numbers from fixtures/east-delhi-demo.json.

This proves the scenario arithmetic only. It is not evidence that the application runs.
Run from the project root: python scripts/verify_fixture.py
"""
import json
import math
import sys
from pathlib import Path

FX = json.loads((Path(__file__).resolve().parent.parent / "fixtures/east-delhi-demo.json").read_text(encoding="utf8"))
P = FX["policy"]
fails = []


def check(name, actual, expected):
    ok = actual == expected
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {actual}" + ("" if ok else f" (expected {expected})"))
    if not ok:
        fails.append(name)


def hm(s):
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def haversine(a, b):
    r = 6371000.0
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lng"] - a["lng"])
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(x))


# Heat window: contiguous hours whose apparent temperature meets the threshold.
hot = [h for h, v in FX["heatProfile"]["hourly"].items() if v >= P["heatThresholdC"]]
window = [hot[0], f"{hm(hot[-1]) // 60 + 1:02d}:00"]
check("heat window", window, FX["expected"]["heatWindow"])
w0, w1 = hm(window[0]), hm(window[1])

reqs = [r for r in FX["requests"] if w0 <= hm(r["hour"]) < w1 and r["need"] == P["need"]]
check("requests in heat window", len(reqs), FX["expected"]["requestsInWindow"])
counts = {}
for r in reqs:
    counts[r["clusterId"]] = counts.get(r["clusterId"], 0) + 1
check("cluster sizes", counts, FX["expected"]["clusters"])


def open_for_hour(host, hour, extra_windows):
    start = hm(hour)
    windows = [host["hours"]] if host["kind"] == "listed" else []
    windows += extra_windows.get(host["id"], [])
    return any(hm(a) <= start and start + 60 <= hm(b) for a, b in windows)


def live(host, confirmed):
    return P["need"] in host["offers"] and not host["paused"] and (host["confirmedForScenarioDate"] or host["id"] in confirmed)


def coverage(confirmed, extra_windows):
    covered, uncovered = 0, set()
    for r in reqs:
        ok = any(
            live(h, confirmed) and open_for_hour(h, r["hour"], extra_windows) and haversine(r, h) <= P["coverageRadiusMeters"]
            for h in FX["hosts"]
        )
        covered += ok
        if not ok:
            uncovered.add(r["clusterId"])
    return covered, round(100 * covered / len(reqs), 1), sorted(uncovered)


cov, pct, unc = coverage(set(), {})
check("before: covered", cov, FX["expected"]["before"]["covered"])
check("before: coverage %", pct, FX["expected"]["before"]["coveragePercent"])
check("before: uncovered clusters", unc, FX["expected"]["before"]["uncoveredClusters"])


def centroid(cid):
    pts = [r for r in reqs if r["clusterId"] == cid]
    return {"lat": sum(p["lat"] for p in pts) / len(pts), "lng": sum(p["lng"] for p in pts) / len(pts)}


def candidates(cid):
    """Hosts that could cover the whole cluster: consenting, offers need, not paused, within radius of every request,
    declared hours overlapping the heat window. Ranked by distance to the cluster centroid, then host id."""
    pts = [r for r in reqs if r["clusterId"] == cid]
    c = centroid(cid)
    out = []
    for h in FX["hosts"]:
        if not (h["consentToAsks"] and P["need"] in h["offers"] and not h["paused"]):
            continue
        if not all(haversine(p, h) <= P["coverageRadiusMeters"] for p in pts):
            continue
        if not (hm(h["hours"][0]) < w1 and hm(h["hours"][1]) > w0):
            continue
        out.append((round(haversine(c, h)), h["id"]))
    return [hid for _, hid in sorted(out)][: P["maxCandidatesPerCluster"]]


cands = {cid: candidates(cid) for cid in unc}
check("candidates per gap", cands, FX["expected"]["candidates"])

# Replay the scripted outreach: first acceptance wins; acceptance opens the accepted window and confirms the host.
confirmed, extra = set(), {}
for o in FX["demoScript"]["outreach"]:
    for hid in o["askOrder"]:
        if o["responses"].get(hid) == "accepted":
            confirmed.add(hid)
            extra.setdefault(hid, []).append(o["acceptedWindow"])
            break
cov2, pct2, unc2 = coverage(confirmed, extra)
check("after: covered", cov2, FX["expected"]["after"]["covered"])
check("after: coverage %", pct2, FX["expected"]["after"]["coveragePercent"])
check("after: uncovered clusters", unc2, FX["expected"]["after"]["uncoveredClusters"])

# Rider query after outreach: nearest live, open host offering water.
q = FX["demoScript"]["riderQuery"]
best = min(
    (h for h in FX["hosts"] if live(h, confirmed) and open_for_hour(h, q["atHour"], extra)),
    key=lambda h: haversine(q, h),
)
check("rider query nearest host", best["id"], FX["expected"]["riderQueryNearest"])
print(f"      distance to {best['id']}: {haversine(q, best):.0f} m")

print("\nAll fixture checks passed." if not fails else f"\n{len(fails)} check(s) failed: {fails}")
sys.exit(1 if fails else 0)
