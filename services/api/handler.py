import json
import logging
import os

from pyau_domain.geo import hm
from pyau_domain.models import Availability, Host
from pyau_domain.status import host_state

from urllib.parse import unquote

from . import asks, auth, caps, coordinator, replays, hosts as hostsmod, trust, coverage as coveragemod, ddb, events, help as helpmod, sessions

log = logging.getLogger()
log.setLevel(os.environ.get("LOG_LEVEL", "INFO"))


def resp(code, body):
    return {"statusCode": code, "headers": {"content-type": "application/json"}, "body": json.dumps(body, ensure_ascii=False)}


def err(code, error, message, retryable=False):
    return resp(code, {"code": error, "message": message, "retryable": retryable})


def zone_map(session_id, zone_id, params):
    pk = sessions.zone_pk(session_id, zone_id)
    meta = ddb.get(pk, "META")
    if not meta:
        return err(404, "NOT_FOUND", "Zone not found")
    hosts = [Host(**{k: v for k, v in h.items() if k in Host.model_fields}) for h in ddb.query(pk, "HOST#")]
    avail = [Availability(**a) for a in ddb.query(pk, "AVAIL#")]
    clock = (sessions.get_session(session_id) or {}).get("clock", {})
    on_plan_day = clock.get("date") == meta["date"]
    minute = hm(clock["time"]) if on_plan_day and clock.get("time") else None
    out = []
    for h in hosts:
        st = host_state(h, avail, minute)
        out.append({"id": h.id, "label": h.label, "kind": h.kind, "lat": h.lat, "lng": h.lng, "offers": h.offers,
                    "hours": list(h.hours), "language": h.language, **st})
    return resp(200, {"zone": {"id": meta["id"], "name": meta["name"], "center": meta["center"], "timezone": meta["timezone"]},
                      "sessionId": session_id, "planDate": meta["date"], "clock": clock, "hosts": out,
                      "badge": "Sample scenario · 21 May 2026"})


def demo_session_id(headers, expected=None):
    """Session ID from a valid demo token, or None. If `expected` is given the token must be for that session."""
    sid = auth.verify(headers.get("x-demo-token", ""))
    return sid if sid and (expected is None or sid == expected) else None


def set_clock(sid, body):
    sess = sessions.get_session(sid)
    if not sess:
        return err(404, "NOT_FOUND", "Unknown session")
    t = body.get("setLocalTime")
    if t not in (sessions.EVENING, sessions.SCENARIO_DAY):
        return err(400, "BAD_REQUEST", "setLocalTime must be 18:30 or 14:00")
    date = "2026-05-20" if t == sessions.EVENING else sessions.FIXTURE["scenarioDate"]
    sess["clock"] = {"date": date, "time": t, "label": "evening before" if t == sessions.EVENING else "scenario day"}
    ddb.put(f"DEMO#{sid}", "META", sess, ttl=int(sess["createdAt"]) + sessions.TTL_S)
    return resp(200, {"clock": sess["clock"]})


def handler(event, context):
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    method = event["requestContext"]["http"]["method"]
    path = event["rawPath"]
    parts = [p for p in path.split("/") if p]
    params = event.get("queryStringParameters") or {}
    try:
        if path == "/health":
            return resp(200, {"ok": True, "service": "pyau-api"})
        if path == "/auth/whoami":
            claims = event["requestContext"].get("authorizer", {}).get("jwt", {}).get("claims", {})
            return resp(200, {"sub": claims.get("sub"), "groups": claims.get("cognito:groups")})
        if method == "GET" and len(parts) == 2 and parts[0] == "replays":
            r = replays.get(parts[1])
            return resp(200, r) if r else err(404, "NOT_FOUND", "No such replay")
        if method == "POST" and parts == ["demo", "sessions"]:
            try:
                caps.take_session()
            except caps.CapReached:
                return err(429, "DEMO_CAP_REACHED", "The demo is very busy today. Please try again tomorrow.", False)
            s = sessions.create_session()
            s["token"] = auth.sign(s["sessionId"])
            return resp(201, s)
        if method == "POST" and len(parts) == 4 and parts[:2] == ["demo", "sessions"] and parts[3] == "clock":
            if not demo_session_id(headers, parts[2]):
                return err(403, "FORBIDDEN", "Valid demo token for this session required")
            return set_clock(parts[2], json.loads(event.get("body") or "{}"))
        if method == "POST" and parts == ["help", "ask-voice"]:
            out = helpmod.ask_voice(json.loads(event.get("body") or "{}"))
            return resp(out.pop("_status", 200), out)
        if method == "POST" and parts == ["help", "find"]:
            out = helpmod.find(json.loads(event.get("body") or "{}"))
            return resp(out.pop("_status", 200), out)
        body = json.loads(event.get("body") or "{}") if method in ("POST", "PATCH") else {}
        sid = params.get("sessionId") or body.get("sessionId") or ""
        needs_demo = (parts[:1] in (["runs"], ["proposals"], ["asks"]) or parts[:1] in (["hosts"], ["schedules"])
                      or (parts[:1] == ["zones"] and len(parts) >= 3 and parts[2] in ("coverage-runs", "runs", "problems")))
        if needs_demo and not demo_session_id(headers, sid):
            return err(403, "FORBIDDEN", "Valid demo token for this session required")
        try:
            if method == "POST" and len(parts) == 3 and parts[0] == "zones" and parts[2] == "coverage-runs":
                return resp(202, coordinator.start_run(sid, parts[1], body))
            if method == "GET" and len(parts) == 3 and parts[0] == "zones" and parts[2] == "runs":
                return resp(200, {"runs": coordinator.list_runs(sid, parts[1])})
            if method == "GET" and len(parts) == 2 and parts[0] == "runs":
                return resp(200, coordinator.run_detail(sid, parts[1]))
            if method == "GET" and len(parts) == 3 and parts[0] == "runs" and parts[2] == "events":
                evs = events.list_events(sid, parts[1], int(params.get("after") or 0), min(int(params.get("limit") or 100), 100))
                return resp(200, {"events": evs, "serverTime": __import__("time").time()})
            if method == "POST" and len(parts) == 3 and parts[0] == "proposals" and parts[2] in ("approve", "reject"):
                fn = coordinator.approve if parts[2] == "approve" else coordinator.reject
                return resp(200, fn(sid, unquote(parts[1]), body))
            if method == "POST" and len(parts) == 3 and parts[0] == "points" and parts[2] == "feedback":
                return resp(200, trust.add_feedback(sid, body.get("zoneId") or "zone-east-delhi-sample", parts[1], body))
            if method == "GET" and len(parts) == 3 and parts[0] == "zones" and parts[2] == "problems":
                return resp(200, trust.problem_queue(sid, parts[1]))
            if method == "POST" and len(parts) == 3 and parts[0] == "hosts" and parts[2] == "reactivate":
                return resp(200, trust.reactivate(sid, body.get("zoneId") or "zone-east-delhi-sample", parts[1]))
            if method == "GET" and parts == ["hosts", "reverse-geocode"]:
                return resp(200, hostsmod.reverse_geocode(float(params["lat"]), float(params["lng"])))
            if method == "POST" and parts == ["hosts"]:
                return resp(201, hostsmod.register(sid, body.get("zoneId") or "zone-east-delhi-sample", body))
            if method == "POST" and len(parts) == 3 and parts[0] == "hosts" and parts[2] == "confirm-today":
                return resp(200, hostsmod.confirm_today(sid, body.get("zoneId") or "zone-east-delhi-sample", parts[1], body.get("window")))
            if method == "POST" and parts == ["schedules", "freshness", "run"]:
                return resp(200, hostsmod.run_freshness(sid, body.get("zoneId") or "zone-east-delhi-sample"))
            if method == "GET" and len(parts) == 3 and parts[0] == "hosts" and parts[2] == "asks":
                return resp(200, coordinator.host_inbox(sid, parts[1]))
            if method == "POST" and len(parts) == 3 and parts[0] == "asks" and parts[2] == "respond":
                return resp(200, coordinator.respond(sid, unquote(parts[1]), body))
        except coordinator.Api as a:
            out = {"code": a.code, "message": a.message, "retryable": a.retryable, **a.extra}
            return resp(a.status, out)
        except trust.TrustError as t:
            return err(t.status, t.code, t.message)
        except hostsmod.HostError as h:
            out = {"code": h.code, "message": h.message, "retryable": False}
            if h.fields:
                out["fieldErrors"] = h.fields
            return resp(h.status, out)
        if method == "GET" and len(parts) == 3 and parts[0] == "zones" and parts[2] == "coverage":
            sid = params.get("sessionId", "")
            if not demo_session_id(headers, sid):  # coordinator role: demo token (live: Cognito, later)
                return err(403, "FORBIDDEN", "Coordinator access required")
            r = coveragemod.report(sid, parts[1])
            return resp(200, r) if r else err(404, "NOT_FOUND", "Zone not found")
        if method == "GET" and len(parts) == 3 and parts[0] == "zones" and parts[2] == "map":
            return zone_map(params.get("sessionId", ""), parts[1], params)
        return err(404, "NOT_FOUND", "No such route")
    except Exception:
        log.exception("unhandled")
        return err(500, "INTERNAL", "Something went wrong", True)
