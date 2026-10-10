"""Step Functions task Lambda (one function, dispatch on event["step"]).

Task tokens are stored server-side only (top-level attribute, never inside `data`, never logged, never returned).
Every external effect is idempotent: ask id = runId:clusterId:hostId, conditional status transitions,
deterministic availability record per host/date."""
import logging
import os
import time

from botocore.exceptions import ClientError
from pyau_domain.answer import short_label
from pyau_domain.candidates import area_label
from pyau_domain.coverage import compute_coverage
from pyau_domain.geo import hm
from pyau_domain.heat import heat_outlook

from services.api import asks, coordinator, ddb, events, hosts as hostsmod, runs, state

log = logging.getLogger()
log.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

ASK_SFN_SLACK_S = 3  # state-machine timeout = ask timeout + slack; the API rejects answers after expiresAt itself


def handler(event, context):
    step = event["step"]
    fn = STEPS[step]
    log.info("step=%s run=%s", step, event.get("runId"))  # never log the event: it can carry a task token
    return fn(event)


def store_approval_token(e):
    """AwaitApproval: keep the task token on the proposal. The execution now waits (no compute) for a coordinator."""
    pk = runs.run_pk(e["sessionId"], e["runId"])
    p = ddb.get(pk, "PROPOSAL#1")
    ddb.table().update_item(Key={"PK": pk, "SK": "PROPOSAL#1"}, UpdateExpression="SET taskToken = :t",
                            ExpressionAttributeValues={":t": e["token"]})
    events.append(e["sessionId"], e["runId"], "awaiting_approval", "system", "Waiting for coordinator approval",
                  {"proposalId": p["id"] if p else None})
    runs.set_status(e["sessionId"], e["runId"], "AWAITING_APPROVAL")


def expire_approval(e):
    runs.set_status(e["sessionId"], e["runId"], "APPROVAL_EXPIRED")
    _set_proposal_status(e, "EXPIRED")
    events.append(e["sessionId"], e["runId"], "approval_expired", "system", "Approval window expired — no outreach was sent")
    return {"status": "APPROVAL_EXPIRED"}


def mark_rejected(e):
    runs.set_status(e["sessionId"], e["runId"], "REJECTED")
    _set_proposal_status(e, "REJECTED")
    events.append(e["sessionId"], e["runId"], "plan_rejected", "coordinator", "Coordinator rejected the plan — no outreach was sent")
    return {"status": "REJECTED"}


def _set_proposal_status(e, status):
    try:
        ddb.update_data(runs.run_pk(e["sessionId"], e["runId"]), "PROPOSAL#1", {"status": status})
    except ClientError:
        log.exception("proposal status update failed")


def pick_next_host(e):
    """Next host from the approved order that still passes policy NOW (consent, not paused, <= N asks/host/day,
    no earlier ask in this run for this cluster). None left -> the gap is unresolved."""
    sid, rid, gap = e["sessionId"], e["runId"], e["gap"]
    st = state.load(sid, e["zoneId"])
    hosts = {h.id: h for h in st.hosts}
    for hid in gap["candidateOrder"]:
        ask_id = asks.make_id(rid, gap["clusterId"], hid)
        if asks.get(sid, ask_id):
            continue  # already asked in this run (replay-safe loop)
        h = hosts.get(hid)
        if not h or h.paused or not h.consentToAsks:
            events.append(sid, rid, "host_skipped", "system", f"Skipped {short_label(h.label) if h else hid}: not eligible now",
                          {"hostId": hid, "clusterId": gap["clusterId"]})
            continue
        if asks.count_for_host_on_date(sid, hid, st.date) >= st.policy.maxAsksPerHostPerDay:
            events.append(sid, rid, "host_skipped", "system", f"Skipped {short_label(h.label)}: already asked today",
                          {"hostId": hid, "clusterId": gap["clusterId"]})
            continue
        timeout = int(e["askTimeoutSeconds"])
        msg = gap["messages"][hid]
        return {"hasHost": True, "hostId": hid, "askId": ask_id, "hostLabel": short_label(h.label),
                "message": {"hi": msg.get("hi"), "en": msg.get("en"), "text": msg.get("text") or msg.get("hi") or msg.get("en"),
                    "lang": msg.get("lang") or ("hi" if msg.get("hi") else "en")}, "window": msg["window"],
                "areaLabel": gap.get("label"),
                "timeoutSeconds": timeout, "sfnTimeoutSeconds": timeout + ASK_SFN_SLACK_S}
    return {"hasHost": False}


def ask_host(e):
    """AskHost (waitForTaskToken): write the Ask (OPEN) + token; it appears in the host's inbox."""
    sid, rid, gap, pick = e["sessionId"], e["runId"], e["gap"], e["pick"]
    now = time.time()
    ask = {"id": pick["askId"], "runId": rid, "clusterId": gap["clusterId"], "hostId": pick["hostId"], "kind": "outreach", "date": e.get("date"), "hostLabel": pick["hostLabel"],
           "message": pick["message"], "window": pick["window"], "status": "OPEN", "createdAt": now,
           "expiresAt": now + pick["timeoutSeconds"], "timeoutSeconds": pick["timeoutSeconds"], "answeredAt": None, "version": 1}
    created = asks.create(sid, ask, e["token"])
    if created:
        events.append(sid, rid, "ask_sent", "system",
                      f"Asking {pick['hostLabel']} · {pick['timeoutSeconds']} s to answer",
                      {"askId": pick["askId"], "hostId": pick["hostId"], "clusterId": gap["clusterId"],
                       "timeoutSeconds": pick["timeoutSeconds"], "expiresAt": ask["expiresAt"]})
    # else: a Step Functions retry re-delivered the same ask; asks.create refreshed the token


def mark_timed_out(e):
    sid, rid, pick = e["sessionId"], e["runId"], e["pick"]
    if asks.transition(sid, pick["askId"], "OPEN", "TIMED_OUT"):
        events.append(sid, rid, "ask_timed_out", "system", f"No reply from {pick['hostLabel']} — timed out, moving to the next host",
                      {"askId": pick["askId"], "hostId": pick["hostId"], "clusterId": e["gap"]["clusterId"]})
    return {"status": "TIMED_OUT"}


def publish_point(e):
    """Accepted -> availability record for host/date (deterministic key, conditional write), recompute coverage in code."""
    sid, rid, zone, pick, ans = e["sessionId"], e["runId"], e["zoneId"], e["pick"], e["answer"]
    st = state.load(sid, zone)
    window = ans.get("window") or pick["window"]
    created = asks.write_availability(sid, zone, pick["hostId"], st.date, window, rid)
    st = state.load(sid, zone)
    outlook = heat_outlook(st.meta["heatHourly"], st.policy)
    avail = [a for a in st.avail if a.date == st.date]
    rep = compute_coverage(st.demand, st.hosts, avail, outlook.window, st.policy)
    cov = {"covered": rep.covered, "total": rep.total, "percent": rep.percent, "uncoveredClusters": rep.uncoveredClusters}
    runs_fields = {"coverageCurrent": cov}
    ddb.update_data(runs.run_pk(sid, rid), "META", runs_fields)
    events.append(sid, rid, "point_published", "system",
                  f"{pick['hostLabel']} is live for riders {window[0]}–{window[1]} (host confirmed) · coverage {rep.covered}/{rep.total} ({rep.percent}%)",
                  {"hostId": pick["hostId"], "clusterId": e["gap"]["clusterId"], "window": window, "coverage": cov, "firstPublish": created})
    return {"status": "PUBLISHED", "hostId": pick["hostId"], "window": window, "coverage": cov}


def mark_unresolved(e):
    gap = e["gap"]
    events.append(e["sessionId"], e["runId"], "gap_unresolved", "system",
                  f"{gap.get('label') or 'Area ' + gap['clusterId']} stays unresolved: no host left to ask — needs a human decision",
                  {"clusterId": gap["clusterId"]})
    return {"status": "UNRESOLVED", "clusterId": gap["clusterId"]}


def summarize(e):
    """Deterministic summary: before/after coverage, per-gap results, unresolved gaps with reasons."""
    sid, rid, zone = e["sessionId"], e["runId"], e["zoneId"]
    st = state.load(sid, zone)
    outlook = heat_outlook(st.meta["heatHourly"], st.policy)
    rep = compute_coverage(st.demand, st.hosts, [a for a in st.avail if a.date == st.date], outlook.window, st.policy)
    prop = ddb.get(runs.run_pk(sid, rid), "PROPOSAL#1") or {}
    all_asks = [a for a in asks.for_run(sid, rid)]
    summary = {
        "coverageBefore": prop.get("coverageBefore"),
        "coverageAfter": {"covered": rep.covered, "total": rep.total, "percent": rep.percent},
        "uncoveredClusters": rep.uncoveredClusters,
        "asks": [{"hostId": a["hostId"], "clusterId": a["clusterId"], "status": a["status"]} for a in all_asks],
        "unresolved": [{"clusterId": c, "label": area_label(c, st.meta.get("clusterLabels")), "requests": rep.byCluster[c].requests,
                        "reason": "NO_HOST_ACCEPTED"} for c in rep.uncoveredClusters],
        "approvedUnresolved": [u for u in (e.get("approved") or {}).get("unresolved", [])],
    }
    ddb.update_data(runs.run_pk(sid, rid), "META", {"summary": summary, "coverageCurrent": {
        "covered": rep.covered, "total": rep.total, "percent": rep.percent, "uncoveredClusters": rep.uncoveredClusters}})
    runs.set_status(sid, rid, "COMPLETED")
    events.append(sid, rid, "run_completed", "system",
                  f"Run completed · coverage {summary['coverageBefore']['percent'] if summary['coverageBefore'] else '?'}% → {rep.percent}% "
                  f"({rep.covered}/{rep.total}) · still open: {', '.join(area_label(c, st.meta.get('clusterLabels')) for c in rep.uncoveredClusters) or 'none'}",
                  {"summary": summary})
    return summary


def _live_zones():
    """Live zones registered under PUBLIC#LIVEZONES (none exist until a real zone is onboarded)."""
    return ddb.query("PUBLIC#LIVEZONES")


def scheduled_freshness(e):
    """EventBridge Scheduler 07:30 IST: morning 'still serving water today?' for every live zone."""
    out = []
    for z in _live_zones():
        out.append({"zoneId": z["zoneId"], **hostsmod.run_freshness("live", z["zoneId"])})
    log.info("scheduled_freshness zones=%d", len(out))
    return {"zones": len(out), "results": out}


def scheduled_nightly(e):
    """EventBridge Scheduler 18:30 IST: start tomorrow's coverage run for every live zone (idempotent per date)."""
    import datetime
    started = []
    tomorrow = (datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).date() + datetime.timedelta(days=1)).isoformat()
    for z in _live_zones():
        r = coordinator.start_run("live", z["zoneId"], {"date": tomorrow, "idempotencyKey": f"nightly-{tomorrow}"})
        started.append(r["id"])
    log.info("scheduled_nightly zones=%d", len(started))
    return {"zones": len(started), "runs": started}


STEPS = {
    "scheduled_freshness": scheduled_freshness, "scheduled_nightly": scheduled_nightly,
    "store_approval_token": store_approval_token, "expire_approval": expire_approval, "mark_rejected": mark_rejected,
    "pick_next_host": pick_next_host, "ask_host": ask_host, "mark_timed_out": mark_timed_out,
    "publish_point": publish_point, "mark_unresolved": mark_unresolved, "summarize": summarize,
}
