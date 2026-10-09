"""Full demo loop against the DEPLOYED stack, real API + real Step Functions + real Bedrock agent. No shortcuts:
new session -> coverage 50% -> run plan -> proposal -> (negative approvals) -> approve -> H4 times out (45 s) ->
late H4 answer 409 -> H5 accepts (double tap idempotent) -> coverage 90.9% -> 14:00 -> rider asks -> H5.
Usage: python scripts/smoke_loop.py [--json out.json]"""
import json, sys, time, uuid
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import boto3
import smoke_cloud as m

REGION = "ap-south-1"
OUT = m.OUT


def wait(fn, ok, what, timeout=240, every=2):
    t0 = time.time()
    while time.time() - t0 < timeout:
        v = fn()
        if ok(v):
            return v
        time.sleep(every)
    raise AssertionError(f"timed out waiting for {what}")


def run_loop(verbose=True):
    log = (lambda *a: print(*a)) if verbose else (lambda *a: None)
    t_start = time.time()
    code, s = m.call("POST", "/demo/sessions", {})
    assert code == 201
    sid, zone, tok = s["sessionId"], s["zoneId"], {"x-demo-token": s["token"]}
    log("session", sid)
    q = f"sessionId={sid}"

    # 1. coverage before (code-computed)
    code, c = m.call("GET", f"/zones/{zone}/coverage?{q}", None, tok)
    assert (c["coverage"]["covered"], c["coverage"]["total"], c["coverage"]["percent"]) == (22, 44, 50.0)
    log("coverage before: 22/44 50.0%", c["coverage"]["uncoveredClusters"])

    # 2. start the run (and check idempotent restart + wrong token)
    key = uuid.uuid4().hex
    code, r = m.call("POST", f"/zones/{zone}/coverage-runs", {"sessionId": sid, "date": s["scenarioDate"], "idempotencyKey": key}, tok)
    assert code == 202, (code, r)
    run_id = r["id"]
    code, r2 = m.call("POST", f"/zones/{zone}/coverage-runs", {"sessionId": sid, "date": s["scenarioDate"], "idempotencyKey": key}, tok)
    assert r2["id"] == run_id, "same idempotency key must return the same run"
    code, other = m.call("POST", f"/zones/{zone}/coverage-runs", {"sessionId": sid, "date": s["scenarioDate"], "idempotencyKey": "other"}, tok)
    assert code == 409 and other["code"] == "ACTIVE_RUN_EXISTS", (code, other)
    code, forbidden = m.call("GET", f"/runs/{run_id}?{q}", None, {"x-demo-token": "nope"})
    assert code == 403
    log("run", run_id, "(execution name = run id)")

    # 3. wait for the real agent proposal
    d = wait(lambda: m.call("GET", f"/runs/{run_id}?{q}", None, tok)[1], lambda d: d["run"]["status"] in ("AWAITING_APPROVAL", "FAILED"), "agent proposal", 300)
    assert d["run"]["status"] == "AWAITING_APPROVAL", d["run"]
    prop = d["proposal"]
    assert [g["clusterId"] for g in prop["gaps"]] == ["B"] and prop["gaps"][0]["candidateOrder"] == ["H4", "H5"]
    assert [u["clusterId"] for u in prop["unresolved"]] == ["D"]
    assert prop["coverageProjected"]["percent"] == 90.9 and prop["coverageBefore"]["percent"] == 50
    assert "taskToken" not in json.dumps(d)
    log("proposal ok: B -> [H4, H5], D unresolved, projected 40/44")
    # wait until the workflow stored its task token (awaiting_approval event)
    wait(lambda: m.call("GET", f"/runs/{run_id}/events?{q}", None, tok)[1]["events"], lambda e: any(x["type"] == "awaiting_approval" for x in e), "awaiting_approval", 60, 1)

    # 4. negative approvals
    body = {"sessionId": sid, "contentHash": prop["contentHash"], "revision": prop["revision"], "acknowledgesGaps": True, "idempotencyKey": "k1"}
    code, e = m.call("POST", f"/proposals/{run_id}:1/approve", {**body, "contentHash": "bad"}, tok)
    assert code == 409 and e["code"] == "STALE_PROPOSAL", (code, e)
    code, e = m.call("POST", f"/proposals/{run_id}:1/approve", {**body, "acknowledgesGaps": False}, tok)
    assert code == 422 and e["code"] == "NOT_APPROVABLE", (code, e)
    log("stale hash -> 409 STALE_PROPOSAL; unacknowledged -> 422")

    # 5. approve (double click = one approval)
    code, a1 = m.call("POST", f"/proposals/{run_id}:1/approve", body, tok)
    code2, a2 = m.call("POST", f"/proposals/{run_id}:1/approve", body, tok)
    assert code == 200 and a1["status"] == "APPROVED" and code2 == 200, (code, a1, code2, a2)
    log("approved; second click ->", a2)

    # 6. H4 gets the ask first, H5 not yet
    def inbox(h):
        return m.call("GET", f"/hosts/{h}/asks?{q}", None, tok)[1]["asks"]
    ask4 = wait(lambda: inbox("H4"), lambda a: len(a) > 0, "H4 ask", 60, 1)[0]
    assert ask4["status"] == "OPEN" and inbox("H5") == []
    t_ask = time.time()
    log("H4 asked:", ask4["id"], f"{ask4['timeoutSeconds']} s")
    code, e = m.call("POST", f"/asks/{ask4['id'].replace(':', '%3A')}/respond", {"sessionId": sid, "actingHostId": "H5", "decision": "accepted"}, tok)
    assert code == 403, (code, e)  # a host cannot answer someone else's ask

    # 7. H4 does not answer -> timeout -> H5 is asked
    ask5 = wait(lambda: inbox("H5"), lambda a: len(a) > 0, "H5 ask after H4 timeout", 120, 1)[0]
    waited = time.time() - t_ask
    assert 40 <= waited <= 70, waited
    assert inbox("H4")[0]["status"] == "TIMED_OUT"
    log(f"H4 timed out after ~{waited:.0f} s; H5 asked:", ask5["id"])
    code, late = m.call("POST", f"/asks/{ask4['id'].replace(':', '%3A')}/respond", {"sessionId": sid, "actingHostId": "H4", "decision": "accepted"}, tok)
    assert code == 409 and late["code"] == "ALREADY_MOVED_ON", (code, late)
    log("late H4 answer ->", code, late["message"])

    # 8. H5 accepts (double tap is idempotent)
    win = ask5["window"]
    ans = {"sessionId": sid, "actingHostId": "H5", "decision": "accepted", "window": win, "idempotencyKey": "tap-1"}
    code, r1 = m.call("POST", f"/asks/{ask5['id'].replace(':', '%3A')}/respond", ans, tok)
    code2, r2 = m.call("POST", f"/asks/{ask5['id'].replace(':', '%3A')}/respond", ans, tok)
    assert code == 200 and code2 == 200 and r1["status"] == "ACCEPTED", (code, r1, code2, r2)
    log("H5 accepted", win, "; double tap ->", code2)

    # 9. run completes, coverage recomputed by code
    d = wait(lambda: m.call("GET", f"/runs/{run_id}?{q}", None, tok)[1], lambda d: d["run"]["status"] in ("COMPLETED", "FAILED"), "completion", 90, 1)
    assert d["run"]["status"] == "COMPLETED", d["run"]
    cur = d["coverage"]["current"]
    assert (cur["covered"], cur["total"], cur["percent"], cur["uncoveredClusters"]) == (40, 44, 90.9, ["D"]), cur
    assert len([a for a in d["asks"] if a["status"] == "ACCEPTED"]) == 1
    log("coverage after: 40/44 90.9%, D unresolved")

    # 10. rider asks at 14:00 from cluster B -> H5, Hindi audio
    code, _ = m.call("POST", f"/demo/sessions/{sid}/clock", {"setLocalTime": "14:00"}, tok)
    code, a = m.call("POST", "/help/find", {"need": "water", **m.RIDER_B, "sessionId": sid})
    assert a["found"] and a["host"]["id"] == "H5" and a["host"]["straightLineM"] == 176 and a["audio"], a
    log("rider -> H5", a["host"]["straightLineM"], "m straight line,", a["distanceM"], "m by scooter route; audio ok")

    # 11. Step Functions proof: both branches in the real execution history
    sf = boto3.client("stepfunctions", region_name=REGION)
    arn = OUT["StateMachineArn"].replace(":stateMachine:", ":execution:") + ":" + run_id
    desc = sf.describe_execution(executionArn=arn)
    hist = sf.get_execution_history(executionArn=arn, maxResults=1000)["events"]
    types = [h["type"] for h in hist]
    assert desc["status"] == "SUCCEEDED", desc["status"]
    assert any(h["type"] == "TaskTimedOut" for h in hist), "no TaskTimedOut event (timeout branch)"
    entered = [h["stateEnteredEventDetails"]["name"] for h in hist if h["type"].endswith("StateEntered")]
    assert "MarkTimedOut" in entered and "PublishPoint" in entered, entered
    log("Step Functions:", desc["status"], "execution", run_id, "| timeout branch + accept branch present")
    result = {"runId": run_id, "sessionId": sid, "executionName": run_id, "executionStatus": desc["status"],
              "seconds": round(time.time() - t_start), "coverageBefore": d["coverage"]["before"], "coverageAfter": cur,
              "modelId": d["run"].get("modelId"), "statesEntered": entered}
    log("LOOP OK in", result["seconds"], "s")
    return result


if __name__ == "__main__":
    res = run_loop()
    if "--json" in sys.argv:
        Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(res, indent=1))
