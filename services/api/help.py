"""Rider help: code-side filtering, route, fixed bilingual template, Polly audio, demand logging (geohash-7 only)."""
import base64
import time
import uuid

from pyau_domain.answer import build_answer, short_label
from pyau_domain.geo import hm
from pyau_domain.geohash import encode
from pyau_domain.intent import need_from_model_word, need_from_text
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


MAX_PCM_BYTES = 8 * 16000 * 2 + 3200  # 8 s of 16 kHz mono s16le (+ 0.1 s slack)


def ask_voice(body: dict) -> dict:
    """Spoken question -> Transcribe hi-IN -> keyword intent (model fallback) -> same answer as /help/find."""
    from . import transcribe

    try:
        pcm = base64.b64decode(body.get("audioBase64") or "", validate=True)
    except Exception:
        return {"_status": 400, "code": "BAD_REQUEST", "message": "audioBase64 must be base64 16 kHz mono PCM", "retryable": False}
    if len(pcm) < 3200:
        return {"_status": 400, "code": "BAD_REQUEST", "message": "Audio too short", "retryable": False}
    if len(pcm) > MAX_PCM_BYTES:
        return {"_status": 413, "code": "TOO_LONG", "message": "Hold the button for at most 8 seconds", "retryable": False}
    try:
        text = transcribe.transcribe_pcm(pcm)
    except Exception:
        return {"_status": 502, "code": "TRANSCRIBE_FAILED", "message": "Couldn't understand the audio right now — please tap a button", "retryable": True}
    need, via = need_from_text(text), "rules"
    if not need and text:
        try:
            need, via = need_from_model_word(transcribe.model_intent(text)), "model"
        except Exception:
            need = None
    if not need:
        return {"transcript": text, "need": None, "found": False, "needUnknown": True,
                "answer": {"hi": "समझ नहीं आया — कृपया बटन दबाएँ।", "en": "Didn't catch that — please tap a button."}}
    out = find({**body, "need": need})
    if "_status" in out:
        return out
    return {**out, "transcript": text, "intentVia": via, "needUnknown": False}
