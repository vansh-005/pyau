"""T11 on the deployed stack: two 'no water' reports pause a point, coverage recomputes in code, queue + reactivate,
privacy (geohash only), and STALE_INPUT when a host is paused after the proposal and before approval."""
import sys, time, uuid
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import boto3, smoke_cloud as m

A = {"lat": 28.63283, "lng": 77.27699}  # cluster A centroid
code, s = m.call("POST", "/demo/sessions", {})
sid, zone, tok = s["sessionId"], s["zoneId"], {"x-demo-token": s["token"]}
q = f"sessionId={sid}"
m.call("POST", f"/demo/sessions/{sid}/clock", {"setLocalTime": "14:00"}, tok)


def fb(host, kind):
    return m.call("POST", f"/points/{host}/feedback", {"sessionId": sid, "zoneId": zone, "kind": kind, **A})  # anonymous rider: no token


def cov():
    return m.call("GET", f"/zones/{zone}/coverage?{q}", None, tok)[1]["coverage"]


assert (cov()["covered"], cov()["total"]) == (22, 44)
code, a = m.call("POST", "/help/find", {"need": "water", **A, "sessionId": sid})
assert a["found"] and a["host"]["id"] == "H1", a["host"]
print("rider near cluster A is answered by", a["host"]["id"])

code, r = fb("H1", "got_it")
assert code == 200 and r["problemCount"] == 0 and not r["paused"]
code, r = fb("H1", "no_water")
assert code == 200 and r["problemCount"] == 1 and not r["paused"], r
print("1st problem report ->", r["problemCount"], "of", r["threshold"], "paused:", r["paused"])
assert m.call("GET", f"/zones/{zone}/map?{q}")[1]["hosts"][0]["state"] == "live"
code, r = fb("H1", "no_water")
assert r["paused"] and r["pausedNow"] and r["problemCount"] == 2, r
print("2nd problem report -> paused now:", r["pausedNow"])
mp = m.call("GET", f"/zones/{zone}/map?{q}")[1]
assert next(h for h in mp["hosts"] if h["id"] == "H1")["state"] == "paused"
c = cov()
print("coverage after pause:", c["covered"], "/", c["total"], c["percent"], c["uncoveredClusters"])
assert c["covered"] == 12 and "A" in c["uncoveredClusters"]
code, a2 = m.call("POST", "/help/find", {"need": "water", **A, "sessionId": sid})
assert a2["host"]["id"] != "H1", "a paused point must not be offered"

assert m.call("GET", f"/zones/{zone}/problems?{q}")[0] == 403
code, pq = m.call("GET", f"/zones/{zone}/problems?{q}", None, tok)
ids = {p["hostId"]: p for p in pq["problems"]}
assert set(ids) == {"H1", "H6"} and len(ids["H1"]["reports"]) == 2 and ids["H6"]["seeded"], pq
print("problem queue:", {k: [r["kind"] for r in v["reports"]] for k, v in ids.items()})

# privacy: feedback rows keep a geohash cell, never coordinates
t = boto3.resource("dynamodb", region_name="ap-south-1").Table(m.OUT["TableName"])
items = t.query(KeyConditionExpression="PK = :p AND begins_with(SK, :s)", ExpressionAttributeValues={":p": f"S#{sid}#HOST#H1", ":s": "FB#"})["Items"]
blob = str(items)
assert len(items) == 3 and "geohash7" in blob and "'lat'" not in blob and "'lng'" not in blob
print("feedback rows store geohash7 only:", items[0]["data"]["geohash7"])

# reactivate: reports before reactivation no longer count
code, ra = m.call("POST", "/hosts/H1/reactivate", {"sessionId": sid, "zoneId": zone}, tok)
assert ra["ok"] and cov()["covered"] == 22
code, r = fb("H1", "no_water")
assert not r["paused"] and r["problemCount"] == 1, r
print("reactivated; coverage back to", cov()["covered"], "; one new report does not re-pause")

# STALE_INPUT: pause a host after the proposal, before approval
code, s2 = m.call("POST", "/demo/sessions", {})
sid2, tok2 = s2["sessionId"], {"x-demo-token": s2["token"]}
code, run = m.call("POST", f"/zones/{s2['zoneId']}/coverage-runs", {"sessionId": sid2, "date": s2["scenarioDate"], "idempotencyKey": uuid.uuid4().hex}, tok2)
rid = run["id"]
t0 = time.time()
while time.time() - t0 < 240:
    d = m.call("GET", f"/runs/{rid}?sessionId={sid2}", None, tok2)[1]
    ev = m.call("GET", f"/runs/{rid}/events?sessionId={sid2}", None, tok2)[1]["events"]
    if d["run"]["status"] == "AWAITING_APPROVAL" and any(e["type"] == "awaiting_approval" for e in ev):
        break
    time.sleep(2)
prop = d["proposal"]
for _ in range(2):
    m.call("POST", "/points/H5/feedback", {"sessionId": sid2, "zoneId": s2["zoneId"], "kind": "closed", **A})
body = {"sessionId": sid2, "contentHash": prop["contentHash"], "revision": 1, "acknowledgesGaps": True, "idempotencyKey": "k"}
code, e = m.call("POST", f"/proposals/{rid}:1/approve", body, tok2)
assert code == 409 and e["code"] == "STALE_INPUT", (code, e)
print("pause H5 after the proposal -> approve ->", code, e["code"])
m.call("POST", f"/proposals/{rid}:1/reject", {"sessionId": sid2, "revision": 1, "reason": "test"}, tok2)
d = m.call("GET", f"/runs/{rid}?sessionId={sid2}", None, tok2)[1]
t0 = time.time()
while d["run"]["status"] not in ("REJECTED",) and time.time() - t0 < 30:
    time.sleep(2)
    d = m.call("GET", f"/runs/{rid}?sessionId={sid2}", None, tok2)[1]
assert d["run"]["status"] == "REJECTED", d["run"]["status"]
print("TRUST OK")
