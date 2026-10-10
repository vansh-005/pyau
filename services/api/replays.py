"""Published saved-run replays: sanitized snapshot of a REAL finished run. Read-only, public, no model calls, no writes.
Contains no session ids, task tokens or account identifiers."""
import time

from . import asks, ddb, events, runs

LATEST = ("PUBLIC#REPLAY", "LATEST")


def publish(session_id: str, run_id: str, replay_id: str, note: str = "") -> dict:
    run = runs.get_run(session_id, run_id)
    if not run or run["status"] != "COMPLETED":
        raise ValueError("only a COMPLETED real run can be published as a replay")
    prop = runs.get_proposal(session_id, run_id) or {}
    evs = events.list_events(session_id, run_id, 0, 500)
    run_asks = asks.for_run(session_id, run_id)
    replay = {
        "id": replay_id, "capturedAt": time.time(), "note": note, "runId": run_id,
        "modelId": run.get("modelId"), "scenario": "Sample scenario · East Delhi · 21 May 2026",
        "run": {"status": run["status"], "date": run["date"], "startedAt": run["startedAt"], "finishedAt": run["finishedAt"],
                "coverageCurrent": run.get("coverageCurrent"), "summary": run.get("summary")},
        "proposal": {k: prop.get(k) for k in ("gaps", "unresolved", "explanation", "coverageBefore", "coverageProjected", "revision", "contentHash")},
        "asks": [{k: a.get(k) for k in ("id", "clusterId", "hostId", "hostLabel", "status", "message", "window", "createdAt", "answeredAt", "timeoutSeconds")} for a in run_asks],
        "events": [{k: e[k] for k in ("seq", "at", "type", "actor", "summary")} | {"data": _slim(e)} for e in evs],
    }
    ddb.put("PUBLIC#REPLAY", replay_id, replay)
    ddb.put(*LATEST, {"id": replay_id, "capturedAt": replay["capturedAt"]})
    return {"id": replay_id, "events": len(evs)}


def _slim(e):
    d = e.get("data") or {}
    if e["type"] == "tool_receipt":
        return {"tool": d.get("tool"), "input": d.get("input"), "output": d.get("output"), "durationMs": d.get("durationMs")}
    keep = {k: v for k, v in d.items() if k in ("hostId", "clusterId", "window", "coverage", "timeoutSeconds", "decision", "removedHostIds")}
    return keep


def get(replay_id: str):
    if replay_id == "latest":
        latest = ddb.get(*LATEST)
        if not latest:
            return None
        replay_id = latest["id"]
    return ddb.get("PUBLIC#REPLAY", replay_id)


def latest_id():
    latest = ddb.get(*LATEST)
    return latest["id"] if latest else None
