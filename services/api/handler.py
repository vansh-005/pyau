import json
import logging
import os

from pyau_domain.geo import hm
from pyau_domain.models import Availability, Host
from pyau_domain.status import host_state

from . import auth, ddb, sessions

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
                    "hours": list(h.hours), **st})
    return resp(200, {"zone": {"id": meta["id"], "name": meta["name"], "center": meta["center"], "timezone": meta["timezone"]},
                      "sessionId": session_id, "planDate": meta["date"], "clock": clock, "hosts": out,
                      "badge": "Sample scenario · 21 May 2026"})


def handler(event, context):
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
        if method == "POST" and parts == ["demo", "sessions"]:
            s = sessions.create_session()
            s["token"] = auth.sign(s["sessionId"])
            return resp(201, s)
        if method == "GET" and len(parts) == 3 and parts[0] == "zones" and parts[2] == "map":
            return zone_map(params.get("sessionId", ""), parts[1], params)
        return err(404, "NOT_FOUND", "No such route")
    except Exception:
        log.exception("unhandled")
        return err(500, "INTERNAL", "Something went wrong", True)
