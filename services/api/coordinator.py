"""Coordinator + host command endpoints: start run, run/proposal reads, approve/reject, host inbox, respond.
Every command is idempotent and gated by conditional writes; task tokens never leave the server."""
import hashlib
import json
import os
import time

import boto3
from botocore.exceptions import ClientError
from pyau_domain.answer import short_label
from pyau_domain.coverage import compute_coverage
from pyau_domain.geo import hm
from pyau_domain.heat import heat_outlook

from . import asks, ddb, events, hosts as hostsmod, runs, sessions, state

TERMINAL = {"COMPLETED", "INSUFFICIENT_DATA", "NO_GAPS", "REJECTED", "APPROVAL_EXPIRED", "FAILED"}
APPROVAL_TIMEOUT_DEMO_S = 900

_sfn = None


def sfn():
    global _sfn
    _sfn = _sfn or boto3.client("stepfunctions")
    return _sfn


class Api(Exception):
    def __init__(self, status, code, message, retryable=False):
        self.status, self.code, self.message, self.retryable = status, code, message, retryable


def _idem_get(sid, actor, op, key):
    return ddb.get(f"S#{sid}#IDEM#{actor}", f"{op}#{key}") if key else None


def _idem_put(sid, actor, op, key, result):
    if key:
        ddb.put(f"S#{sid}#IDEM#{actor}", f"{op}#{key}", result, ttl=int(time.time()) + sessions.TTL_S)


def _current_coverage(sid, zone_id):
    st = state.load(sid, zone_id)
    o = heat_outlook(st.meta["heatHourly"], st.policy)
    if o.status != "OK":
        return None
    r = compute_coverage(st.demand, st.hosts, [a for a in st.avail if a.date == st.date], o.window, st.policy)
    return {"covered": r.covered, "total": r.total, "percent": r.percent, "uncoveredClusters": r.uncoveredClusters}


def list_runs(sid, zone_id):
    from boto3.dynamodb.conditions import Key
    r = ddb.table().query(IndexName="GSI2", KeyConditionExpression=Key("GSI2PK").eq(runs.zone_runs_key(sid, zone_id)), ScanIndexForward=False)
    return [ddb.from_ddb(i["data"]) for i in r["Items"]]


def start_run(sid, zone_id, body):
    st = state.load(sid, zone_id)
    if not st:
        raise Api(404, "NOT_FOUND", "Zone not found")
    date = body.get("date") or st.date
    key = body.get("idempotencyKey") or ""
    if not key:
        raise Api(400, "BAD_REQUEST", "idempotencyKey is required")
    run_id = hashlib.sha256(f"{sid}|{zone_id}|{date}|{key}".encode()).hexdigest()[:20]  # execution name = runId
    existing = runs.get_run(sid, run_id)
    if existing:
        return existing
    active = [r for r in list_runs(sid, zone_id) if r["status"] not in TERMINAL]
    if active:
        raise Api(409, "ACTIVE_RUN_EXISTS", f"A run is already active for this zone ({active[0]['id']})")
    mode = "live" if sid == "live" else "demo"
    timeout = st.policy.askTimeoutSecondsLive if mode == "live" else st.policy.askTimeoutSecondsDemo
    approval_timeout = 6 * 3600 if mode == "live" else APPROVAL_TIMEOUT_DEMO_S
    run = runs.create_run(sid, zone_id, run_id, date, mode, runs.inputs_hash(st), os.environ.get("BEDROCK_MODEL_ID"))
    payload = {"sessionId": sid, "zoneId": zone_id, "runId": run_id, "mode": mode, "date": date,
               "askTimeoutSeconds": timeout, "approvalTimeoutSeconds": approval_timeout}
    try:
        ex = sfn().start_execution(stateMachineArn=os.environ["STATE_MACHINE_ARN"], name=run_id, input=json.dumps(payload))
        arn = ex["executionArn"]
    except ClientError as e:
        if e.response["Error"]["Code"] != "ExecutionAlreadyExists":
            runs.set_status(sid, run_id, "FAILED", error="Could not start the workflow")
            raise Api(502, "WORKFLOW_START_FAILED", "Could not start the workflow", True)
        arn = None
    ddb.update_data(runs.run_pk(sid, run_id), "META", {"executionArn": arn.split(":")[-1] if arn else None})
    events.append(sid, run_id, "run_queued", "coordinator", "Coverage run requested", {"date": date})
    return {**run, "executionName": run_id}


def _proposal_public(p):
    return p


def run_detail(sid, run_id):
    run = runs.get_run(sid, run_id)
    if not run:
        raise Api(404, "NOT_FOUND", "Run not found")
    prop = runs.get_proposal(sid, run_id)
    all_asks = asks.for_run(sid, run_id)
    cov_now = _current_coverage(sid, run["zoneId"])
    return {
        "run": run, "proposal": prop, "asks": all_asks,
        "coverage": {
            "before": prop["coverageBefore"] if prop else None,
            "projectedIfFirstChoicesAccept": prop["coverageProjected"] if prop else None,
            "current": cov_now,
        },
        "serverTime": time.time(),
    }


def _proposal_item(sid, run_id, rev):
    r = ddb.table().get_item(Key={"PK": runs.run_pk(sid, run_id), "SK": f"PROPOSAL#{rev}"}, ConsistentRead=True).get("Item")
    return r


def approve(sid, proposal_id, body):
    run_id, _, rev = proposal_id.partition(":")
    rev = int(rev or 1)
    key = body.get("idempotencyKey")
    done = _idem_get(sid, "coordinator", "approve", key)
    if done:
        return {**done, "idempotentReplay": True}
    raw = _proposal_item(sid, run_id, rev)
    if not raw:
        raise Api(404, "NOT_FOUND", "Proposal not found")
    prop = ddb.from_ddb(raw["data"])
    if prop["status"] == "APPROVED" and body.get("contentHash") == prop["contentHash"]:
        return {"ok": True, "status": "APPROVED", "alreadyApproved": True}
    if prop["status"] != "PROPOSED":
        raise Api(409, "NOT_APPROVABLE", f"Proposal is {prop['status']}, not awaiting approval")
    if body.get("revision") != prop["revision"] or body.get("contentHash") != prop["contentHash"]:
        raise Api(409, "STALE_PROPOSAL", "The plan changed since you reviewed it. Reload and review again.")
    if body.get("acknowledgesGaps") is not True:
        raise Api(422, "NOT_APPROVABLE", "Confirm that you reviewed the messages and the unfilled gaps")
    run = runs.get_run(sid, run_id)
    st = state.load(sid, run["zoneId"])
    if runs.inputs_hash(st) != prop["inputVersions"]:
        raise Api(409, "STALE_INPUT", "Hosts, forecast or policy changed since this plan was made. Run a new plan.")
    token = raw.get("taskToken")
    if not token:
        raise Api(409, "NOT_APPROVABLE", "The workflow is not waiting for approval yet; try again in a moment", True)
    removed = set(body.get("removedHostIds") or [])
    gaps, unresolved = [], list(prop["unresolved"])
    for g in prop["gaps"]:
        order = [h for h in g["candidateOrder"] if h not in removed]
        if not order:
            unresolved.append({"clusterId": g["clusterId"], "requests": g["requests"], "recommendation": "recruit_host_nearby",
                               "note": "All candidate hosts were removed by the coordinator.", "reason": "COORDINATOR_REMOVED"})
            continue
        gaps.append({"clusterId": g["clusterId"], "requests": g["requests"], "priority": g["priority"], "askWindow": g["askWindow"],
                     "candidateOrder": order, "messages": {h: g["messages"][h] for h in order}})
    approved = {"gaps": gaps, "unresolved": unresolved, "removedHostIds": sorted(removed), "contentHash": prop["contentHash"],
                "approvedAt": time.time()}
    try:  # conditional PROPOSED -> APPROVED: only one approval wins
        ddb.update_data(runs.run_pk(sid, run_id), f"PROPOSAL#{rev}", {"status": "APPROVED"}, condition="#d.#f0 = :from",
                        cond_values={":from": "PROPOSED"})
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"ok": True, "status": "APPROVED", "alreadyApproved": True}
        raise
    try:
        sfn().send_task_success(taskToken=token, output=json.dumps(approved))
    except ClientError as e:
        ddb.update_data(runs.run_pk(sid, run_id), f"PROPOSAL#{rev}", {"status": "EXPIRED"})
        raise Api(409, "APPROVAL_EXPIRED", "The approval window has expired. Run a new plan.")
    runs.set_status(sid, run_id, "OUTREACH")
    events.append(sid, run_id, "plan_approved", "coordinator",
                  f"Coordinator approved the plan · {len(gaps)} gap(s) to work" + (f" · removed {', '.join(sorted(removed))}" if removed else ""),
                  {"proposalId": proposal_id, "removedHostIds": sorted(removed)})
    result = {"ok": True, "status": "APPROVED", "runId": run_id}
    _idem_put(sid, "coordinator", "approve", key, result)
    return result


def reject(sid, proposal_id, body):
    run_id, _, rev = proposal_id.partition(":")
    rev = int(rev or 1)
    raw = _proposal_item(sid, run_id, rev)
    if not raw:
        raise Api(404, "NOT_FOUND", "Proposal not found")
    prop = ddb.from_ddb(raw["data"])
    if prop["status"] != "PROPOSED":
        raise Api(409, "NOT_APPROVABLE", f"Proposal is {prop['status']}")
    token = raw.get("taskToken")
    if not token:
        raise Api(409, "NOT_APPROVABLE", "The workflow is not waiting yet; try again in a moment", True)
    try:
        ddb.update_data(runs.run_pk(sid, run_id), f"PROPOSAL#{rev}", {"status": "REJECTED"}, condition="#d.#f0 = :from",
                        cond_values={":from": "PROPOSED"})
    except ClientError:
        raise Api(409, "NOT_APPROVABLE", "Already decided")
    sfn().send_task_failure(taskToken=token, error="REJECTED", cause=str(body.get("reason") or "rejected")[:200])
    return {"ok": True, "status": "REJECTED"}


def host_inbox(sid, host_id):
    items = asks.for_host(sid, host_id)
    return {"hostId": host_id, "asks": items, "serverTime": time.time()}


def respond(sid, ask_id, body):
    ask = asks.get(sid, ask_id)
    if not ask:
        raise Api(404, "NOT_FOUND", "Request not found")
    if body.get("actingHostId") != ask["hostId"]:
        raise Api(403, "FORBIDDEN", "This request was not addressed to you")
    decision = body.get("decision")
    if decision not in ("accepted", "declined"):
        raise Api(400, "BAD_REQUEST", "decision must be accepted or declined")
    key = body.get("idempotencyKey")
    done = _idem_get(sid, ask["hostId"], "respond", key)
    if done:
        return {**done, "idempotentReplay": True}
    status_now = {"accepted": "ACCEPTED", "declined": "DECLINED"}[decision]
    if ask["status"] == status_now:
        return {"ok": True, "status": ask["status"], "alreadyRecorded": True}
    moved_on = Api(409, "ALREADY_MOVED_ON", "This request already moved on — thank you.")
    if ask["status"] != "OPEN" or time.time() > ask["expiresAt"]:
        raise moved_on
    if ask.get("kind") == "freshness":
        return respond_freshness(sid, ask, ask_id, decision, status_now, key, moved_on)
    window = body.get("window") or ask["window"]
    if decision == "accepted":
        st = state.load(sid, ask_zone(sid, ask))
        host = next(h for h in st.hosts if h.id == ask["hostId"])
        o = heat_outlook(st.meta["heatHourly"], st.policy)
        ok = (isinstance(window, (list, tuple)) and len(window) == 2 and hm(host.hours[0]) <= hm(window[0]) < hm(window[1]) <= hm(host.hours[1])
              and hm(window[0]) <= hm(o.window[0]) and hm(window[1]) >= hm(o.window[1]))
        if not ok:
            raise Api(400, "BAD_WINDOW", "The window must cover the heat hours and sit inside your declared hours")
    if not asks.transition(sid, ask_id, "OPEN", status_now, {"responseWindow": window if decision == "accepted" else None}):
        raise moved_on
    token = asks.get_token(sid, ask_id)
    try:
        sfn().send_task_success(taskToken=token, output=json.dumps({"decision": decision, "window": window if decision == "accepted" else None}))
    except ClientError:
        # The state machine timed out in the same instant: this answer is too late.
        asks.transition(sid, ask_id, status_now, "TIMED_OUT")
        raise moved_on
    label = ask.get("hostLabel") or ask["hostId"]
    events.append(sid, ask["runId"], "ask_answered", "host",
                  f"{label} said {'Yes' if decision == 'accepted' else 'No'}" + (f" · {window[0]}–{window[1]}" if decision == "accepted" else ""),
                  {"askId": ask_id, "hostId": ask["hostId"], "decision": decision, "window": window if decision == "accepted" else None})
    result = {"ok": True, "status": status_now, "window": window if decision == "accepted" else None}
    _idem_put(sid, ask["hostId"], "respond", key, result)
    return result


def ask_zone(sid, ask):
    run = runs.get_run(sid, ask["runId"])
    return run["zoneId"]


def respond_freshness(sid, ask, ask_id, decision, status_now, key, moved_on):
    """'Still serving water today?' Yes -> listed_confirmed availability (idempotent); Not today -> declined. No workflow."""
    if not asks.transition(sid, ask_id, "OPEN", status_now):
        raise moved_on
    result = {"ok": True, "status": status_now}
    if decision == "accepted":
        try:
            result.update(hostsmod.confirm_today(sid, ask["zoneId"], ask["hostId"]))
        except hostsmod.HostError as e:
            asks.transition(sid, ask_id, status_now, "OPEN")  # roll back so the host can retry after the coordinator acts
            raise Api(e.status, e.code, e.message)
    _idem_put(sid, ask["hostId"], "respond", key, result)
    return result
