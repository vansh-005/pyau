"""Strands coverage planner. Tools are small, deterministic and bound to one run; the model cannot widen scope.
Every tool call leaves a receipt event (tool, input/output summary, duration, call id) - receipts, not reasoning."""
import json
import logging
import os
import time
import uuid

from pyau_domain.candidates import area_label
from pyau_domain.coverage import compute_coverage
from pyau_domain.heat import heat_outlook
from pyau_domain.proposal import ProposalContext, validate_proposal

from services.api import events, runs, state

from .prompt import SYSTEM_PROMPT, USER_PROMPT

log = logging.getLogger()

MAX_TOOL_CALLS = int(os.environ.get("MAX_TOOL_CALLS", "12"))
MAX_AGENT_SECONDS = int(os.environ.get("MAX_AGENT_SECONDS", "120"))
MAX_SUBMIT_ATTEMPTS = 2  # first try + one repair


class Budget(Exception):
    pass


def _clip(x, n=1500):
    s = json.dumps(x, ensure_ascii=False, default=str)
    return s if len(s) <= n else s[:n] + "…"


class Run:
    """Everything a run's tools need; scope (session, zone, date) comes from here, never from model arguments."""

    def __init__(self, session_id, zone_id, run_id):
        self.sid, self.zone_id, self.run_id = session_id, zone_id, run_id
        self.st = state.load(session_id, zone_id)
        self.labels = self.st.meta.get("clusterLabels", {})
        self.started = time.time()
        self.calls = 0
        self.candidate_calls: set[str] = set()
        self.submit_attempts = 0
        self.accepted: dict | None = None
        self.last_errors: list[str] = []
        self.outlook = heat_outlook(self.st.meta["heatHourly"], self.st.policy)
        self.avail = [a for a in self.st.avail if a.date == self.st.date]
        self.report = (compute_coverage(self.st.demand, self.st.hosts, self.avail, self.outlook.window, self.st.policy)
                       if self.outlook.status == "OK" else None)
        self.ctx = (ProposalContext(self.st.policy, self.st.hosts, self.st.demand, self.avail, self.st.date,
                                    self.outlook.window, self.report, labels=self.labels) if self.report else None)

    def area(self, cid):
        return area_label(cid, self.labels)

    def receipt(self, tool, args, out, started, summary):
        events.append(self.sid, self.run_id, "tool_receipt", "agent", summary,
                      {"tool": tool, "input": _clip(args, 600), "output": _clip(out), "durationMs": int((time.time() - started) * 1000)},
                      tool_call_id=uuid.uuid4().hex[:10])

    def guard(self, tool):
        self.calls += 1
        if self.calls > MAX_TOOL_CALLS:
            raise Budget(f"tool-call budget of {MAX_TOOL_CALLS} exhausted")
        if time.time() - self.started > MAX_AGENT_SECONDS:
            raise Budget(f"agent deadline of {MAX_AGENT_SECONDS}s exceeded")


def build_tools(run: Run):
    from strands import tool

    @tool
    def get_zone_context() -> dict:
        """Zone name, timezone, read-only policy (threshold, radius) and host counts by kind."""
        t0 = time.time()
        run.guard("get_zone_context")
        kinds = {}
        for h in run.st.hosts:
            kinds[h.kind] = kinds.get(h.kind, 0) + 1
        out = {"zone": run.st.meta["name"], "timezone": run.st.meta["timezone"], "date": run.st.date,
               "policy": {"id": run.st.policy.id, "heatThresholdC": run.st.policy.heatThresholdC,
                          "coverageRadiusMeters": run.st.policy.coverageRadiusMeters,
                          "validationStatus": run.st.policy.validationStatus},
               "hostsByKind": kinds, "hostCount": len(run.st.hosts)}
        run.receipt("get_zone_context", {}, out, t0, f"Read zone: {out['zone']} · {out['hostCount']} hosts · policy {out['policy']['heatThresholdC']:g} °C / {out['policy']['coverageRadiusMeters']} m")
        return out

    @tool
    def get_heat_outlook() -> dict:
        """Hourly forecast, the heat window [start, end), the peak, or INSUFFICIENT_DATA with missing hours."""
        t0 = time.time()
        run.guard("get_heat_outlook")
        o = run.outlook
        out = {"status": o.status, "heatWindow": list(o.window) if o.window else None, "peakC": o.peakC,
               "missingHours": o.missingHours, "hourly": run.st.meta["heatHourly"], "forecastMode": "synthetic"}
        s = (f"Heat outlook: {o.window[0]}–{o.window[1]}, peak {o.peakC:g} °C" if o.status == "OK" else f"Heat outlook: {o.status}")
        run.receipt("get_heat_outlook", {}, {k: v for k, v in out.items() if k != "hourly"}, t0, s)
        return out

    @tool
    def get_demand() -> dict:
        """Rider water-request areas inside the heat window: id, label (place name), requests, by hour, centroid."""
        t0 = time.time()
        run.guard("get_demand")
        win = run.outlook.window
        by = {}
        for r in run.st.demand:
            if r.need == run.st.policy.need and win and win[0] <= r.hour < win[1]:
                c = by.setdefault(r.clusterId, {"id": r.clusterId, "label": run.area(r.clusterId), "requests": 0, "byHour": {}, "_lat": 0.0, "_lng": 0.0})
                c["requests"] += 1
                c["byHour"][r.hour] = c["byHour"].get(r.hour, 0) + 1
                c["_lat"] += r.lat
                c["_lng"] += r.lng
        clusters = []
        for c in sorted(by.values(), key=lambda x: x["id"]):
            c["centroid"] = {"lat": round(c.pop("_lat") / c["requests"], 5), "lng": round(c.pop("_lng") / c["requests"], 5)}
            clusters.append(c)
        out = {"heatWindow": list(win) if win else None, "totalRequests": sum(c["requests"] for c in clusters), "clusters": clusters}
        run.receipt("get_demand", {}, out, t0, f"Demand: {len(clusters)} areas, {out['totalRequests']} requests")
        return out

    @tool
    def get_coverage() -> dict:
        """Coverage for the date (computed by code): total, covered, percent, per-cluster nearest live host and distance."""
        t0 = time.time()
        run.guard("get_coverage")
        r = run.report
        out = {**r.model_dump(), "areaLabels": {c: run.area(c) for c in r.byCluster}} if r else {"status": run.outlook.status}
        s = (f"Coverage {r.covered}/{r.total} ({r.percent}%) · not covered: {', '.join(run.area(c) for c in r.uncoveredClusters) or 'none'}" if r else "Coverage unavailable")
        run.receipt("get_coverage", {}, out, t0, s)
        return out

    @tool
    def find_candidate_hosts(cluster_id: str) -> dict:
        """Ranked candidate hosts (max 3) for ONE uncovered cluster, ordered by code. Call at most once per cluster.

        Args:
            cluster_id: id of an uncovered cluster from get_coverage, e.g. "B".
        """
        t0 = time.time()
        run.guard("find_candidate_hosts")
        if not run.report or cluster_id not in run.report.uncoveredClusters:
            out = {"error": f"{cluster_id!r} is not an uncovered cluster", "uncovered": run.report.uncoveredClusters if run.report else []}
            run.receipt("find_candidate_hosts", {"cluster_id": cluster_id}, out, t0, f"Candidates for {run.area(cluster_id)}: rejected (not uncovered)")
            return out
        if cluster_id in run.candidate_calls:
            out = {"error": "find_candidate_hosts was already called for this cluster"}
            run.receipt("find_candidate_hosts", {"cluster_id": cluster_id}, out, t0, f"Candidates for {run.area(cluster_id)}: repeat call rejected")
            return out
        run.candidate_calls.add(cluster_id)
        cands = run.ctx.ensure_candidates(cluster_id)
        hosts = {h.id: h for h in run.st.hosts}
        rows = [{**c, "offers": hosts[c["hostId"]].offers, "declaredHours": list(hosts[c["hostId"]].hours),
                 "language": hosts[c["hostId"]].language, "askedToday": False, "pastResponseRate": None} for c in cands]
        out = {"clusterId": cluster_id, "candidates": rows} if rows else {"clusterId": cluster_id, "candidates": [], "result": "NO_CANDIDATES", "reason": "NO_HOST_WITHIN_RADIUS"}
        names = ", ".join(f"{c['label'].split('·')[-1].strip().split('(')[0].strip()} ({'Hindi' if hosts[c['hostId']].language == 'hi' else 'English'})" for c in cands) or "none"
        run.receipt("find_candidate_hosts", {"cluster_id": cluster_id}, out, t0, f"Candidates for {run.area(cluster_id)}: {names}")
        return out

    @tool
    def submit_proposal(gaps: list[dict], unresolved: list[dict], explanation: str) -> dict:
        """Submit the single coverage proposal. Validated in code; on errors fix them and resubmit once.

        Args:
            gaps: one item per uncovered cluster with candidates: {clusterId, priority (int, 1 = first), askWindow [start, end] as HH:MM, messages {hostId: {text}} (ONE message per host, in that host's own language from find_candidate_hosts), optional dropped {hostId: reason}}.
            unresolved: one item per cluster you cannot fill: {clusterId, recommendation, note}.
            explanation: plain text for the coordinator, at most 120 words.
        """
        t0 = time.time()
        run.guard("submit_proposal")
        if run.accepted is not None:
            return {"error": "a proposal was already accepted"}
        run.submit_attempts += 1
        if run.submit_attempts > MAX_SUBMIT_ATTEMPTS:
            raise Budget("submit_proposal repair attempt already used")
        errs, norm = validate_proposal(run.ctx, gaps, unresolved, explanation)
        args = {"gaps": len(gaps) if isinstance(gaps, list) else None, "unresolved": len(unresolved) if isinstance(unresolved, list) else None}
        if errs:
            run.last_errors = errs
            out = {"accepted": False, "errors": errs, "attemptsLeft": MAX_SUBMIT_ATTEMPTS - run.submit_attempts}
            run.receipt("submit_proposal", args, out, t0, f"Proposal rejected by validation ({len(errs)} issue{'s' if len(errs) != 1 else ''})")
            return out
        run.accepted = norm
        out = {"accepted": True, "coverageBefore": norm["coverageBefore"], "coverageProjectedIfFirstChoicesAccept": norm["coverageProjected"]}
        run.receipt("submit_proposal", args, out, t0, f"Proposal submitted · projected {norm['coverageProjected']['covered']}/{norm['coverageProjected']['total']} if first choices accept")
        return out

    return [get_zone_context, get_heat_outlook, get_demand, get_coverage, find_candidate_hosts, submit_proposal]


def make_model():
    from strands.models import BedrockModel
    return BedrockModel(model_id=os.environ["BEDROCK_MODEL_ID"], region_name=os.environ.get("BEDROCK_REGION", "ap-south-1"),
                        temperature=0.2, max_tokens=4096)


def plan(session_id: str, zone_id: str, run_id: str, model=None) -> dict:
    """Run the planner for one run. Returns {status, proposal?, error?}. Deterministic pre-checks never call the model."""
    from strands import Agent

    run = Run(session_id, zone_id, run_id)
    if not runs.get_run(session_id, run_id):
        runs.create_run(session_id, zone_id, run_id, run.st.date, "demo", runs.inputs_hash(run.st), os.environ.get("BEDROCK_MODEL_ID"))
    runs.set_status(session_id, run_id, "PLANNING", modelId=os.environ.get("BEDROCK_MODEL_ID"), inputVersions=runs.inputs_hash(run.st))
    events.append(session_id, run_id, "run_started", "system", f"Coverage run started for {run.st.date}",
                  {"modelId": os.environ.get("BEDROCK_MODEL_ID")})

    if run.outlook.status != "OK":
        status = "INSUFFICIENT_DATA" if run.outlook.status == "INSUFFICIENT_DATA" else "NO_GAPS"
        events.append(session_id, run_id, "run_finished", "system", f"Run ended: {status}", {"heat": run.outlook.model_dump()})
        runs.set_status(session_id, run_id, status)
        return {"status": status}
    if not run.report.uncoveredClusters:
        events.append(session_id, run_id, "run_finished", "system", "Tomorrow's heat window is covered", {})
        runs.set_status(session_id, run_id, "NO_GAPS")
        return {"status": "NO_GAPS"}

    try:
        agent = Agent(model=model or make_model(), tools=build_tools(run), system_prompt=SYSTEM_PROMPT, callback_handler=None)
        agent(USER_PROMPT)
    except Budget as e:
        run.last_errors = run.last_errors or [str(e)]
    except Exception as e:  # Bedrock access denied / throttled / model unavailable: honest failure, no fake plan
        log.exception("agent failed")
        msg = f"{type(e).__name__}: {str(e)[:300]}"
        events.append(session_id, run_id, "run_failed", "system", "Agent run failed", {"error": msg})
        runs.set_status(session_id, run_id, "FAILED", error=msg)
        return {"status": "FAILED", "error": msg}

    if not run.accepted:
        msg = "The agent did not produce a valid proposal: " + "; ".join(run.last_errors or ["no proposal submitted"])[:500]
        events.append(session_id, run_id, "run_failed", "system", "No valid proposal", {"errors": run.last_errors})
        runs.set_status(session_id, run_id, "FAILED", error=msg)
        return {"status": "FAILED", "error": msg}

    prop = runs.put_proposal(session_id, run_id, 1, {**run.accepted, "coverageBefore": run.accepted["coverageBefore"],
                                                     "inputVersions": runs.inputs_hash(run.st)})
    events.append(session_id, run_id, "proposal_ready", "agent", "Proposal ready for coordinator review",
                  {"proposalId": prop["id"], "contentHash": prop["contentHash"]})
    runs.set_status(session_id, run_id, "AWAITING_APPROVAL")
    return {"status": "PROPOSED", "proposalId": prop["id"], "contentHash": prop["contentHash"]}
