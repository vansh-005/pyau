"""T12 on the deployed stack: replay published from a REAL run is readable signed out (no model call, no writes),
the daily agent-run cap shows the replay option, API throttling returns 429, and no secrets leak into the replay."""
import json, os, subprocess, sys, uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "packages/domain")); sys.path.insert(0, str(ROOT / "scripts"))
import smoke_cloud as m, smoke_loop
os.environ.update(TABLE_NAME=m.OUT["TableName"], BUCKET_NAME=m.OUT["BucketName"], AWS_REGION="ap-south-1", AWS_DEFAULT_REGION="ap-south-1")
from services.api import caps, ddb

res = smoke_loop.run_loop(verbose=False)
rid, sid = res["runId"], res["sessionId"]
print("real run for the replay:", rid)
out = subprocess.check_output([sys.executable, str(ROOT / "scripts/publish_replay.py"), sid, rid, "guardrail-test"], text=True, encoding="utf8")
print(out.strip().splitlines()[0])

# 1. public replay: no token, read-only
code, r = m.call("GET", "/replays/guardrail-test")
assert code == 200 and r["runId"] == rid, (code, r.get("runId"))
blob = json.dumps(r)
for forbidden in ("taskToken", sid, "x-demo-token", "arn:aws"):
    assert forbidden not in blob, f"replay leaks {forbidden}"
assert r["proposal"]["coverageBefore"]["percent"] == 50 and r["run"]["coverageCurrent"]["percent"] == 90.9
assert any(e["type"] == "ask_timed_out" for e in r["events"]) and any(a["status"] == "ACCEPTED" for a in r["asks"])
print(f"replay ok: {len(r['events'])} events, 50% -> 90.9%, timeout + accept present, no tokens/session ids")
assert m.call("GET", "/replays/latest")[0] == 200
code, e = m.call("GET", "/replays/does-not-exist")
assert code == 404
code, e = m.call("POST", "/replays/guardrail-test", {})
assert code in (403, 404), code  # no write route on a replay

# 2. daily cap: lower the cap to today's usage -> the next NEW run is refused with the replay option
used = caps.usage().get("agent_runs", 0)
ddb.put("PUBLIC#CAP#CONFIG", "agent_runs", {"limit": used})
try:
    code, s = m.call("POST", "/demo/sessions", {})
    tok = {"x-demo-token": s["token"]}
    code, e = m.call("POST", f"/zones/{s['zoneId']}/coverage-runs", {"sessionId": s["sessionId"], "date": s["scenarioDate"], "idempotencyKey": uuid.uuid4().hex}, tok)
    assert code == 429 and e["code"] == "DEMO_CAP_REACHED" and e["replayId"], (code, e)
    print("cap reached ->", code, e["code"], "| replayId offered:", e["replayId"])
    code, runs_ = m.call("GET", f"/zones/{s['zoneId']}/runs?sessionId={s['sessionId']}", None, tok)
    assert runs_["runs"] == [], "a refused run must not be created"
finally:
    ddb.table().delete_item(Key={"PK": "PUBLIC#CAP#CONFIG", "SK": "agent_runs"})
print("cap override removed")

# 3. throttling on session creation (route limit 3 rps, burst 10)
with ThreadPoolExecutor(30) as ex:
    codes = list(ex.map(lambda _: m.call("POST", "/demo/sessions", {})[0], range(40)))
print("burst of 40 session requests ->", {c: codes.count(c) for c in sorted(set(codes))})
assert 429 in codes, "expected API Gateway throttling"
print("GUARDRAILS OK")
