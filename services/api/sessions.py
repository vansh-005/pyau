"""Demo sessions: isolated copies of the fixture under S#{session}#..."""
import json
import time
import uuid
from pathlib import Path

from . import ddb

# Lambda bundle has the fixture at the package root; locally it lives in fixtures/.
_here = Path(__file__).resolve()
_candidates = [_here.parents[2] / "east-delhi-demo.json", _here.parents[2] / "fixtures" / "east-delhi-demo.json"]
FIXTURE = json.loads(next(p for p in _candidates if p.exists()).read_text(encoding="utf8"))
TTL_S = 48 * 3600
EVENING = "18:30"
SCENARIO_DAY = "14:00"


def zone_pk(session_id, zone_id):
    return f"S#{session_id}#ZONE#{zone_id}"


def create_session():
    fx = FIXTURE
    sid = uuid.uuid4().hex[:12]
    zid = fx["zone"]["id"]
    pk = zone_pk(sid, zid)
    date = fx["scenarioDate"]
    items = [
        (pk, "META", {**fx["zone"], "sessionId": sid, "timezone": fx["timezone"], "policy": fx["policy"], "date": date,
                      "heatHourly": fx["heatProfile"]["hourly"], "version": 1}),
    ]
    for h in fx["hosts"]:
        host = {k: v for k, v in h.items() if k != "confirmedForScenarioDate"}
        items.append((pk, f"HOST#{h['id']}", {**host, "sessionId": sid, "zoneId": zid, "version": 1}))
        if h["kind"] == "listed" and h["confirmedForScenarioDate"]:
            av = {"hostId": h["id"], "date": date, "window": h["hours"], "source": "listed_confirmed"}
            items.append((pk, f"AVAIL#{date}#{h['id']}#listed_confirmed", av))
    # the sample scenario's 44 rider requests, labelled source=fixture
    dpk = f"S#{sid}#ZONE#{zid}#DEMAND#{date}"
    for r in fx["requests"]:
        items.append((dpk, f"{r['hour']}#{r['id']}", {**r, "source": "fixture"}))
    clock = {"date": "2026-05-20", "time": EVENING, "label": "evening before"}
    items.append((f"DEMO#{sid}", "META", {"sessionId": sid, "zoneId": zid, "clock": clock, "createdAt": int(time.time())}))
    ddb.batch_put(items, ttl=int(time.time()) + TTL_S)
    return {"sessionId": sid, "zoneId": zid, "clock": clock, "scenarioDate": date,
            "demoTimersSeconds": fx["policy"]["askTimeoutSecondsDemo"]}


def get_session(sid):
    return ddb.get(f"DEMO#{sid}", "META")
