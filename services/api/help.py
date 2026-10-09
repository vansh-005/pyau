"""Rider help: code-side filtering, route, fixed bilingual template, Polly audio, demand logging (geohash-7 only)."""
import time
import uuid

from pyau_domain.answer import build_answer, short_label
from pyau_domain.geo import hm
from pyau_domain.geohash import encode
from pyau_domain.rider import find_nearest

from . import ddb, routing, state, voice

NEEDS = {"water", "shade", "toilet", "charging"}


def find(body: dict) -> dict:
    need = body.get("need")
    lat, lng = body.get("lat"), body.get("lng")
    sid = body.get("sessionId") or ""
    if need not in NEEDS or not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return {"_status": 400, "code": "BAD_REQUEST", "message": "need, lat and lng are required", "retryable": False}
    zone_id = body.get("zoneId") or "zone-east-delhi-sample"
    st = state.load(sid, zone_id)
    if not st:
        return {"_status": 404, "code": "NOT_FOUND", "message": "Unknown session", "retryable": False}

    clock = st.clock
    # Open-now needs a clock on the plan date; the evening-before clock has no live windows for "now".
    avail_now = [a for a in st.avail if a.date == clock.get("date")]
    minute = hm(clock.get("time", "12:00"))
    hit = find_nearest(need, lat, lng, minute, st.hosts, avail_now, st.policy.coverageRadiusMeters)

    route = None
    distance = hit["distanceM"] if hit else None
    approximate = False
    if hit:
        route = routing.scooter_route({"lat": lat, "lng": lng}, hit["host"].model_dump())
        if route:
            distance = route["distanceM"]
        else:
            approximate = True
    answer = build_answer(
        need, hit["host"].label if hit else None, distance, hit["closesAt"] if hit else None,
        bool(hit and hit["withinRadius"]), st.policy.coverageRadiusMeters, approximate,
    )
    audio = None
    try:
        audio = voice.synthesize_url(answer["hi"])
    except Exception:
        audio = None  # text answer still works; UI shows "audio unavailable"

    # Demand record: geohash-7 cell + local hour only (no lat/lng, no accounts).
    rid = uuid.uuid4().hex[:10]
    hour = f"{minute // 60:02d}:00"
    ddb.put(f"S#{sid}#ZONE#{zone_id}#RIDERREQ#{clock.get('date')}", f"{hour}#{rid}",
            {"id": rid, "need": need, "geohash7": encode(lat, lng), "hour": hour,
             "answered": bool(hit and hit["withinRadius"]), "answeredHostId": hit["host"].id if hit and hit["withinRadius"] else None,
             "source": "rider", "at": int(time.time())})

    host = hit["host"] if hit else None
    return {
        "need": need,
        "found": bool(hit and hit["withinRadius"]),
        "clock": clock,
        "host": None if not host else {
            "id": host.id, "label": short_label(host.label), "lat": host.lat, "lng": host.lng,
            "closesAt": hit["closesAt"], "confirmedSource": hit["source"],
            "straightLineM": hit["distanceM"],
        },
        "route": route and {"distanceM": route["distanceM"], "durationS": route["durationS"], "line": route["line"]},
        "distanceM": distance,
        "approximate": approximate,
        "answer": answer,
        "audio": audio,
        "radiusM": st.policy.coverageRadiusMeters,
    }
