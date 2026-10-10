"""T10 check on the deployed API: register a host (Places address), map shows it greyed, morning freshness check,
host answers Yes -> live (confirmed today); idempotency, validation, standby, Not today, paused host."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import smoke_cloud as m

code, s = m.call("POST", "/demo/sessions", {})
sid, zone, tok = s["sessionId"], s["zoneId"], {"x-demo-token": s["token"]}
q = f"sessionId={sid}"
body = {"sessionId": sid, "zoneId": zone, "label": "Sharma <b>Chai</b> Stall", "hostType": "shop", "offers": ["water", "shade"], "kind": "listed",
        "hours": ["09:00", "20:00"], "lat": 28.6325, "lng": 77.2745, "consentToAsks": True}

# validation: missing consent / bad hours / pin outside zone -> field errors, nothing stored
code, e = m.call("POST", "/hosts", {**body, "consentToAsks": False, "hours": ["20:00", "09:00"], "lat": 30.0}, tok)
assert code == 422 and set(e["fieldErrors"]) >= {"consentToAsks", "hours", "location"}, (code, e)
print("validation ->", code, sorted(e["fieldErrors"]))
code, e = m.call("POST", "/hosts", body, {"x-demo-token": "bad"})
assert code == 403

code, g = m.call("GET", f"/hosts/reverse-geocode?lat=28.6325&lng=77.2745&{q}", None, tok)
print("reverse geocode ->", code, g)
assert code == 200 and g["address"]

code, h = m.call("POST", "/hosts", body, tok)
assert code == 201 and h["id"] == "H7" and "<" not in h["label"] and h["address"], (code, h)
print("registered", h["id"], repr(h["label"]), "|", h["address"])

code, mp = m.call("GET", f"/zones/{zone}/map?{q}")
st = {x["id"]: x["state"] for x in mp["hosts"]}
assert st["H7"] == "not_confirmed", st
print("map state before confirmation:", st["H7"])
code, c = m.call("GET", f"/zones/{zone}/coverage?{q}", None, tok)
assert (c["coverage"]["covered"], c["coverage"]["total"]) == (22, 44), "an unconfirmed host must not change coverage"

# morning check (manual trigger of the scheduled job), idempotent
code, r1 = m.call("POST", "/schedules/freshness/run", {"sessionId": sid, "zoneId": zone}, tok)
code, r2 = m.call("POST", "/schedules/freshness/run", {"sessionId": sid, "zoneId": zone}, tok)
assert "H7" in r1["created"] and r2["created"] == [], (r1, r2)
print("morning check created for:", r1["created"], "| second trigger:", r2["created"])
code, inbox = m.call("GET", f"/hosts/H7/asks?{q}", None, tok)
ask = inbox["asks"][0]
assert ask["kind"] == "freshness" and ask["status"] == "OPEN", ask
code, wrong = m.call("POST", f"/asks/{ask['id'].replace(':', '%3A')}/respond", {"sessionId": sid, "actingHostId": "H1", "decision": "accepted"}, tok)
assert code == 403
ans = {"sessionId": sid, "actingHostId": "H7", "decision": "accepted", "idempotencyKey": "t1"}
code, a1 = m.call("POST", f"/asks/{ask['id'].replace(':', '%3A')}/respond", ans, tok)
code2, a2 = m.call("POST", f"/asks/{ask['id'].replace(':', '%3A')}/respond", ans, tok)
assert code == 200 and code2 == 200 and a1["status"] == "ACCEPTED", (a1, a2)
code, mp = m.call("GET", f"/zones/{zone}/map?{q}")
h7 = next(x for x in mp["hosts"] if x["id"] == "H7")
assert h7["state"] == "live" and h7["source"] == "listed_confirmed" and h7["window"] == ["09:00", "20:00"], h7
print("after Yes: H7 live", h7["window"], h7["source"])

# H4 (listed, unconfirmed in the fixture) also gets a check; 'Not today' keeps it not confirmed
code, inbox4 = m.call("GET", f"/hosts/H4/asks?{q}", None, tok)
a4 = inbox4["asks"][0]
code, d = m.call("POST", f"/asks/{a4['id'].replace(':', '%3A')}/respond", {"sessionId": sid, "actingHostId": "H4", "decision": "declined"}, tok)
assert d["status"] == "DECLINED"
code, mp = m.call("GET", f"/zones/{zone}/map?{q}")
assert next(x for x in mp["hosts"] if x["id"] == "H4")["state"] == "not_confirmed"
# standby host H5 never gets a morning check
assert m.call("GET", f"/hosts/H5/asks?{q}", None, tok)[1]["asks"] == []

# confirm-today directly (host-initiated) is idempotent too
code, c1 = m.call("POST", "/hosts/H4/confirm-today", {"sessionId": sid, "zoneId": zone}, tok)
code, c2 = m.call("POST", "/hosts/H4/confirm-today", {"sessionId": sid, "zoneId": zone}, tok)
assert c1["ok"] and c2["alreadyConfirmed"] is True, (c1, c2)
code, c = m.call("GET", f"/zones/{zone}/coverage?{q}", None, tok)
print("coverage after H7 + H4 confirmed:", c["coverage"]["covered"], "/", c["coverage"]["total"], c["coverage"]["percent"])
assert c["coverage"]["covered"] > 22  # H4 now covers cluster B by code
# paused host cannot confirm
code, e = m.call("POST", "/hosts/H6/confirm-today", {"sessionId": sid, "zoneId": zone}, tok)
assert code == 409 and e["code"] == "PAUSED", (code, e)
print("HOST OK")
