"""Deterministic validation of an agent proposal (agent.md `submit_proposal`). The model plans and writes;
code owns eligibility, ranking, windows, coverage and every number."""
import hashlib
import json
import re
from dataclasses import dataclass, field

from .candidates import candidate_hosts, centroid
from .coverage import compute_coverage
from .geo import fmt_hm, hm
from .models import Availability, CoverageReport, DemandRecord, Host, Policy

RECOMMENDATIONS = {"recruit_host_nearby", "ask_municipal_water_point", "check_platform_rest_point", "accept_gap_low_demand"}
MAX_MESSAGE_CHARS = 280
MAX_EXPLANATION_WORDS = 120
ASK_BUFFER_MIN = 60  # an ask may extend at most 1 h before/after the heat window (modest, predictable asks)

BUTTONS = {
    "yes": {"hi": "हाँ, मैं रखूँगा", "en": "Yes"},
    "no": {"hi": "नहीं", "en": "No"},
    "optOut": {"hi": "आगे अनुरोध नहीं चाहिए तो बता दें।", "en": "Tell us if you'd rather not be asked again."},
}

_DEVANAGARI = re.compile(r"[\u0900-\u097F]")
_LATIN_WORD = re.compile(r"[A-Za-z]{3,}")
_FORBIDDEN = re.compile(
    r"(₹|\brs\.?\b|\brupee|\bpaid\b|\bpayment|\breward|\bprize|\bcash\b|रुपय|रुपए|इनाम|भुगतान|पैसे|\bofficial|\bgovernment|सरकारी|https?://|www\.|\.com\b|\b\d{10}\b|\+91)",
    re.IGNORECASE,
)


@dataclass
class ProposalContext:
    policy: Policy
    hosts: list[Host]
    demand: list[DemandRecord]
    avail: list[Availability]
    date: str
    window: tuple[str, str]
    report: CoverageReport
    candidates: dict[str, list[dict]] = field(default_factory=dict)  # clusterId -> ranked candidates (code)

    def ensure_candidates(self, cluster_id: str) -> list[dict]:
        if cluster_id not in self.candidates:
            self.candidates[cluster_id] = candidate_hosts(cluster_id, self.demand, self.hosts, self.window, self.policy)
        return self.candidates[cluster_id]


def _words(s: str) -> int:
    return len(s.split())


def check_message(text: str, lang: str, windows: list[tuple[str, str]]) -> list[str]:
    errs = []
    if not isinstance(text, str) or not text.strip():
        return [f"{lang} message missing"]
    if len(text) > MAX_MESSAGE_CHARS:
        errs.append(f"{lang} message is {len(text)} chars (max {MAX_MESSAGE_CHARS})")
    if _FORBIDDEN.search(text):
        errs.append(f"{lang} message must not promise money/rewards/official status or include links or phone numbers")
    if lang == "hi":
        dev = len(_DEVANAGARI.findall(text))
        if dev < 15 or dev < 0.4 * len(re.sub(r"[\s\d:\-–.,;!?()/]", "", text)):
            errs.append("hi message must be written in Devanagari Hindi")
    elif _DEVANAGARI.search(text) or not _LATIN_WORD.search(text):
        errs.append("en message must be in English")
    if not any(a in text and b in text for a, b in windows):
        shown = " or ".join(f"{a}–{b}" for a, b in windows)
        errs.append(f"{lang} message must state the time window as 24-hour HH:MM ({shown})")
    return errs


def content_hash(gaps: list, unresolved: list, explanation: str) -> str:
    blob = json.dumps({"gaps": gaps, "unresolved": unresolved, "explanation": explanation}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(blob.encode()).hexdigest()


def validate_proposal(ctx: ProposalContext, gaps: list, unresolved: list, explanation: str):
    """-> (errors, normalized | None). Normalized proposal carries code-computed order, per-host windows and coverage."""
    errs: list[str] = []
    uncovered = set(ctx.report.uncoveredClusters)
    by_id = {h.id: h for h in ctx.hosts}
    hw0, hw1 = hm(ctx.window[0]), hm(ctx.window[1])

    if not isinstance(explanation, str) or not explanation.strip():
        errs.append("explanation is required")
    elif _words(explanation) > MAX_EXPLANATION_WORDS:
        errs.append(f"explanation is {_words(explanation)} words (max {MAX_EXPLANATION_WORDS})")
    elif _FORBIDDEN.search(explanation):
        errs.append("explanation must not contain links, phone numbers, money or reward promises")

    seen: set[str] = set()
    out_gaps, priorities = [], set()
    for g in gaps if isinstance(gaps, list) else []:
        cid = g.get("clusterId") if isinstance(g, dict) else None
        if cid not in uncovered:
            errs.append(f"gap clusterId {cid!r} is not an uncovered cluster (uncovered: {sorted(uncovered)})")
            continue
        if cid in seen:
            errs.append(f"cluster {cid} appears more than once")
            continue
        seen.add(cid)
        cands = ctx.ensure_candidates(cid)
        cand_ids = [c["hostId"] for c in cands]
        if not cands:
            errs.append(f"cluster {cid} has no candidate hosts; list it under unresolved with a recommendation")
            continue
        pr = g.get("priority")
        if not isinstance(pr, int) or pr < 1 or pr in priorities:
            errs.append(f"cluster {cid}: priority must be a unique integer >= 1")
        else:
            priorities.add(pr)
        dropped = g.get("dropped") or {}
        if not isinstance(dropped, dict) or any(not isinstance(v, str) or not v.strip() for v in dropped.values()):
            errs.append(f"cluster {cid}: dropped must map hostId -> reason")
            dropped = {}
        for hid in list(dropped):
            if hid not in cand_ids:
                errs.append(f"cluster {cid}: dropped host {hid!r} is not a candidate")
        messages = g.get("messages") or {}
        for hid in messages:
            if hid not in cand_ids:
                errs.append(f"cluster {cid}: host {hid!r} was not returned by find_candidate_hosts for this cluster")
        order = [h for h in cand_ids if h not in dropped]
        if not order:
            errs.append(f"cluster {cid}: every candidate was dropped")
            continue
        claimed = g.get("candidateOrder")
        if claimed is not None and list(claimed) != order:
            errs.append(f"cluster {cid}: candidateOrder must equal the tool ranking {order} (reordering is not allowed)")
        aw = g.get("askWindow")
        if not (isinstance(aw, (list, tuple)) and len(aw) == 2 and all(isinstance(x, str) and re.fullmatch(r"\d\d:\d\d", x) for x in aw)):
            errs.append(f"cluster {cid}: askWindow must be [start, end] as HH:MM")
            continue
        if not (hm(aw[0]) <= hw0 and hm(aw[1]) >= hw1):
            errs.append(f"cluster {cid}: askWindow {list(aw)} must contain the heat window {list(ctx.window)}")
            continue
        if hm(aw[0]) < hw0 - ASK_BUFFER_MIN or hm(aw[1]) > hw1 + ASK_BUFFER_MIN:
            lo, hi = fmt_hm(hw0 - ASK_BUFFER_MIN), fmt_hm(hw1 + ASK_BUFFER_MIN)
            errs.append(f"cluster {cid}: askWindow may extend at most 1 hour beyond the heat window (use within {lo}–{hi})")
            continue
        norm_msgs = {}
        for hid in order:
            host = by_id[hid]
            s, e = max(hm(aw[0]), hm(host.hours[0])), min(hm(aw[1]), hm(host.hours[1]))
            if not (s <= hw0 and e >= hw1):
                errs.append(f"cluster {cid}: host {hid} declared hours {list(host.hours)} do not cover the heat window")
                continue
            eff = (fmt_hm(s), fmt_hm(e))
            m = messages.get(hid)
            if not isinstance(m, dict):
                errs.append(f"cluster {cid}: missing message for candidate {hid} (or drop it with a reason)")
                continue
            wins = [eff, (aw[0], aw[1])]
            for lang in ("hi", "en"):
                errs += [f"cluster {cid} host {hid}: {x}" for x in check_message(m.get(lang), lang, wins)]
            norm_msgs[hid] = {"hi": m.get("hi"), "en": m.get("en"), "window": list(eff), "trimmed": eff != (aw[0], aw[1])}
        pts = [r for r in ctx.demand if r.clusterId == cid and r.need == ctx.policy.need and hw0 <= hm(r.hour) < hw1]
        cen = centroid(pts)
        out_gaps.append({
            "clusterId": cid, "requests": ctx.report.byCluster[cid].requests, "hours": list(ctx.window), "centroid": cen,
            "priority": pr if isinstance(pr, int) else 99, "askWindow": list(aw), "candidateOrder": order,
            "dropped": dropped, "candidates": cands, "messages": norm_msgs, "buttons": BUTTONS,
        })

    out_unres = []
    for u in unresolved if isinstance(unresolved, list) else []:
        cid = u.get("clusterId") if isinstance(u, dict) else None
        if cid not in uncovered:
            errs.append(f"unresolved clusterId {cid!r} is not an uncovered cluster")
            continue
        if cid in seen:
            errs.append(f"cluster {cid} is in both gaps and unresolved")
            continue
        seen.add(cid)
        if u.get("recommendation") not in RECOMMENDATIONS:
            errs.append(f"unresolved {cid}: recommendation must be one of {sorted(RECOMMENDATIONS)}")
        note = u.get("note") or ""
        if not isinstance(note, str) or _FORBIDDEN.search(note) or _words(note) > 60:
            errs.append(f"unresolved {cid}: note must be plain text under 60 words with no links, phone numbers or money")
        has = bool(ctx.ensure_candidates(cid))
        out_unres.append({
            "clusterId": cid, "requests": ctx.report.byCluster[cid].requests, "recommendation": u.get("recommendation"),
            "note": note, "reason": "AGENT_DEFERRED" if has else "NO_HOST_WITHIN_RADIUS",
        })

    missing = uncovered - seen
    if missing:
        errs.append(f"uncovered clusters not addressed (put each in gaps or unresolved): {sorted(missing)}")
    if errs:
        return errs, None

    out_gaps.sort(key=lambda g: g["priority"])
    # Projected coverage if every FIRST-choice host accepts (code, not the model).
    extra = [
        Availability(hostId=g["candidateOrder"][0], date=ctx.date, window=tuple(g["messages"][g["candidateOrder"][0]]["window"]),
                     source="accepted_ask")
        for g in out_gaps
    ]
    proj = compute_coverage(ctx.demand, ctx.hosts, ctx.avail + extra, ctx.window, ctx.policy)
    summary = lambda r: {"covered": r.covered, "total": r.total, "percent": r.percent}  # noqa: E731
    normalized = {
        "gaps": out_gaps, "unresolved": out_unres, "explanation": explanation.strip(),
        "coverageBefore": summary(ctx.report), "coverageProjected": summary(proj),
        "projectedUncovered": proj.uncoveredClusters,
    }
    normalized["contentHash"] = content_hash(out_gaps, out_unres, normalized["explanation"])
    return [], normalized
