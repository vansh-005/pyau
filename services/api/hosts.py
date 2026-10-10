"""Host registration, freshness checks ("still serving water today?") and confirm-today."""
import time

import boto3
from botocore.exceptions import ClientError
from pyau_domain.hosts import validate_registration

from . import asks, ddb, sessions, state

MAX_HOSTS_PER_SESSION = 20
_places = None


class HostError(Exception):
    def __init__(self, status, code, message, fields=None):
        self.status, self.code, self.message, self.fields = status, code, message, fields


def reverse_geocode(lat, lng) -> dict:
    """Server-side Amazon Location Places lookup (IAM, never the browser key)."""
    global _places
    try:
        _places = _places or boto3.client("geo-places")
        r = _places.reverse_geocode(QueryPosition=[float(lng), float(lat)], MaxResults=1, Language="en")
        item = r["ResultItems"][0]
        return {"address": item["Address"].get("Label") or item.get("Title"), "approximate": False}
    except Exception:
        return {"address": None, "approximate": True}  # the form still works; address shown as unavailable


def register(sid: str, zone_id: str, body: dict) -> dict:
    st = state.load(sid, zone_id)
    if not st:
        raise HostError(404, "NOT_FOUND", "Zone not found")
    errs, clean = validate_registration(body, st.meta["center"])
    if errs:
        raise HostError(422, "VALIDATION", "Please fix the highlighted fields", errs)
    if len(st.hosts) >= MAX_HOSTS_PER_SESSION:
        raise HostError(429, "LIMIT", "This demo session already has the maximum number of hosts")
    n = 1 + max(int(h.id[1:]) for h in st.hosts if h.id[1:].isdigit())
    hid = f"H{n}"
    geo = reverse_geocode(clean["lat"], clean["lng"])
    host = {**clean, "id": hid, "sessionId": sid, "zoneId": zone_id, "address": geo["address"], "paused": False,
            "pausedReason": None, "ownerSub": f"demo:{sid}", "registeredAt": time.time(), "version": 1}
    # Conditional create: a double-submit with the same label cannot produce two ids in one instant
    ddb.table().put_item(Item=ddb.to_ddb({"PK": sessions.zone_pk(sid, zone_id), "SK": f"HOST#{hid}", "data": host,
                                          "ttl": int(time.time()) + sessions.TTL_S}),
                         ConditionExpression="attribute_not_exists(PK)")
    return host


def confirm_today(sid: str, zone_id: str, host_id: str, window=None) -> dict:
    """Listed host confirms it is serving today: a `listed_confirmed` availability (deterministic key, idempotent)."""
    st = state.load(sid, zone_id)
    host = next((h for h in st.hosts if h.id == host_id), None)
    if not host:
        raise HostError(404, "NOT_FOUND", "Host not found")
    if host.kind != "listed":
        raise HostError(409, "NOT_LISTED", "Standby hosts are only asked when needed")
    if host.paused:
        raise HostError(409, "PAUSED", "This point is paused; the coordinator must reactivate it first")
    window = list(window or host.hours)
    if not (host.hours[0] <= window[0] < window[1] <= host.hours[1]):
        raise HostError(400, "BAD_WINDOW", "The window must be inside your opening hours")
    item = {"PK": sessions.zone_pk(sid, zone_id), "SK": f"AVAIL#{st.date}#{host_id}#listed_confirmed",
            "data": ddb.to_ddb({"hostId": host_id, "date": st.date, "window": window, "source": "listed_confirmed",
                                "confirmedAt": time.time()}), "ttl": int(time.time()) + sessions.TTL_S}
    created = True
    try:
        ddb.table().put_item(Item=item, ConditionExpression="attribute_not_exists(PK)")
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        created = False
    return {"ok": True, "hostId": host_id, "date": st.date, "window": window, "alreadyConfirmed": not created}


def freshness_id(date, host_id):
    return f"fresh:{date}:{host_id}"


def run_freshness(sid: str, zone_id: str) -> dict:
    """Morning job (manual trigger in demos): one freshness ask per listed, unpaused, unconfirmed host. Idempotent."""
    st = state.load(sid, zone_id)
    if not st:
        raise HostError(404, "NOT_FOUND", "Zone not found")
    confirmed = {a.hostId for a in st.avail if a.date == st.date and a.source == "listed_confirmed"}
    created = []
    for h in st.hosts:
        if h.kind != "listed" or h.paused or h.id in confirmed:
            continue
        aid = freshness_id(st.date, h.id)
        now = time.time()
        ask = {"id": aid, "runId": None, "clusterId": None, "hostId": h.id, "hostLabel": h.label.split("·")[-1].strip(),
               "kind": "freshness", "date": st.date, "zoneId": zone_id,
               "message": {"hi": "आज पानी रख रहे हैं?", "en": "Still serving water today?",
                           "text": "आज पानी रख रहे हैं?" if h.language == "hi" else "Still serving water today?", "lang": h.language},
               "window": list(h.hours), "status": "OPEN", "createdAt": now, "expiresAt": now + 12 * 3600,
               "timeoutSeconds": 12 * 3600, "answeredAt": None, "version": 1}
        if asks.create(sid, ask, None):
            created.append(h.id)
    return {"date": st.date, "created": created, "skippedConfirmed": sorted(confirmed)}
