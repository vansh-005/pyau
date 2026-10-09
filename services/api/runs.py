"""Run and Proposal persistence (contracts.md). Task tokens live as top-level attributes, never inside `data`."""
import hashlib
import json
import time

from . import ddb, events

TTL_S = 48 * 3600


def run_pk(session_id, run_id):
    return events.run_pk(session_id, run_id)


def zone_runs_key(session_id, zone_id):
    return f"S#{session_id}#ZONE#{zone_id}#RUNS"


def inputs_hash(st) -> dict:
    """Immutable-input fingerprint taken at plan time; approval compares it again (STALE_INPUT)."""
    def h(obj):
        return hashlib.sha256(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()[:16]
    hosts = sorted([(x.id, x.kind, x.paused, x.consentToAsks, list(x.hours), sorted(x.offers)) for x in st.hosts])
    return {
        "hostsHash": h(hosts),
        "forecastHash": h(st.meta["heatHourly"]),
        "policyHash": h(st.meta["policy"]),
        "zoneVersion": st.meta.get("version", 1),
    }


def create_run(session_id, zone_id, run_id, date, mode, inputs, model_id=None, execution_arn=None):
    now = int(time.time())
    run = {"id": run_id, "zoneId": zone_id, "sessionId": session_id, "date": date, "mode": mode, "status": "QUEUED",
           "executionArn": execution_arn, "inputVersions": inputs, "modelId": model_id, "startedAt": now,
           "finishedAt": None, "error": None, "version": 1}
    ddb.put(run_pk(session_id, run_id), "META", run, ttl=now + TTL_S,
            GSI2PK=zone_runs_key(session_id, zone_id), GSI2SK=f"{now:012d}#{run_id}")
    return run


def get_run(session_id, run_id):
    return ddb.get(run_pk(session_id, run_id), "META")


def set_status(session_id, run_id, status, **fields):
    f = {"status": status, **fields}
    if status in ("COMPLETED", "INSUFFICIENT_DATA", "NO_GAPS", "REJECTED", "APPROVAL_EXPIRED", "FAILED"):
        f["finishedAt"] = int(time.time())
    ddb.update_data(run_pk(session_id, run_id), "META", f)


def put_proposal(session_id, run_id, revision, proposal: dict, status="PROPOSED", task_token=None):
    item = {"id": f"{run_id}:{revision}", "runId": run_id, "revision": revision, "status": status, **proposal}
    extra = {"taskToken": task_token} if task_token else {}
    ddb.put(run_pk(session_id, run_id), f"PROPOSAL#{revision}", item, ttl=int(time.time()) + TTL_S, **extra)
    return item


def get_proposal(session_id, run_id, revision=1):
    return ddb.get(run_pk(session_id, run_id), f"PROPOSAL#{revision}")
