"""Rider feedback -> automatic pause after N problem reports in W hours -> coordinator problem queue -> reactivate."""
import time
import uuid

from botocore.exceptions import ClientError
from pyau_domain.geohash import encode
from pyau_domain.trust import ALL_KINDS, counted_problems, should_pause

from . import ddb, sessions, state


class TrustError(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message


def fb_pk(sid, host_id):
    return f"S#{sid}#HOST#{host_id}"


def reports_for(sid, host_id):
    return ddb.query(fb_pk(sid, host_id), "FB#")


def add_feedback(sid: str, zone_id: str, host_id: str, body: dict) -> dict:
    kind = body.get("kind")
    if kind not in ALL_KINDS:
        raise TrustError(400, "BAD_REQUEST", f"kind must be one of {sorted(ALL_KINDS)}")
    lat, lng = body.get("lat"), body.get("lng")
    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in (lat, lng)):
        raise TrustError(400, "BAD_REQUEST", "lat and lng are required")
    st = state.load(sid, zone_id)
    if not st:
        raise TrustError(404, "NOT_FOUND", "Unknown session")
    host_item = ddb.get(sessions.zone_pk(sid, zone_id), f"HOST#{host_id}")
    if not host_item:
        raise TrustError(404, "NOT_FOUND", "Unknown point")
    now = time.time()
    fid = uuid.uuid4().hex[:10]
    # Rider location is stored only as a geohash-7 cell (~150 m); no accounts, no coordinates.
    ddb.put(fb_pk(sid, host_id), f"FB#{now:.3f}#{fid}", {"id": fid, "hostId": host_id, "kind": kind, "geohash7": encode(lat, lng),
                                                             "createdAt": now, "date": st.date}, ttl=int(now) + sessions.TTL_S)
    pol = st.policy
    reports = reports_for(sid, host_id)
    since = host_item.get("reactivatedAt")
    problems = counted_problems(reports, now, pol.pauseWindowHours, since)
    paused_now = False
    if kind != "got_it" and not host_item.get("paused") and should_pause(reports, now, pol.pauseAfterProblemReports, pol.pauseWindowHours, since):
        try:  # conditional: only one writer flips paused false -> true
            ddb.update_data(sessions.zone_pk(sid, zone_id), f"HOST#{host_id}",
                            {"paused": True, "pausedReason": f"{pol.pauseAfterProblemReports} rider problem reports within {pol.pauseWindowHours} hours",
                             "pausedAt": now}, condition="#d.paused = :f", cond_values={":f": False})
            paused_now = True
        except ClientError as e:
            if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise
    paused = bool(host_item.get("paused")) or paused_now
    return {"recorded": True, "kind": kind, "hostId": host_id, "problemCount": len(problems), "threshold": pol.pauseAfterProblemReports,
            "windowHours": pol.pauseWindowHours, "paused": paused, "pausedNow": paused_now}


def problem_queue(sid: str, zone_id: str) -> dict:
    st = state.load(sid, zone_id)
    if not st:
        raise TrustError(404, "NOT_FOUND", "Unknown session")
    items = []
    for h in st.hosts:
        if not h.paused:
            continue
        item = ddb.get(sessions.zone_pk(sid, zone_id), f"HOST#{h.id}") or {}
        reps = [r for r in reports_for(sid, h.id) if r["kind"] != "got_it"]
        items.append({"hostId": h.id, "label": h.label.split("·")[-1].strip(), "reason": h.pausedReason or item.get("pausedReason"),
                      "pausedAt": item.get("pausedAt"), "seeded": item.get("pausedAt") is None,
                      "reports": [{"kind": r["kind"], "at": r["createdAt"]} for r in reps][-5:]})
    return {"problems": items, "serverTime": time.time()}


def reactivate(sid: str, zone_id: str, host_id: str) -> dict:
    now = time.time()
    try:
        ddb.update_data(sessions.zone_pk(sid, zone_id), f"HOST#{host_id}",
                        {"paused": False, "pausedReason": None, "reactivatedAt": now}, condition="#d.paused = :t", cond_values={":t": True})
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"ok": True, "hostId": host_id, "alreadyActive": True}
        raise
    return {"ok": True, "hostId": host_id, "paused": False}
