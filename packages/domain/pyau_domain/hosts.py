"""Host registration validation (pure). Host text is data: length-limited, control characters stripped, never executed."""
import re

from .geo import haversine, hm

HOST_TYPES = {"shop", "chemist", "temple", "rwa", "home", "dhaba", "other"}
OFFERS = {"water", "shade", "toilet", "charging"}
KINDS = {"listed", "standby"}
MAX_ZONE_DISTANCE_M = 6000
_TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def clean_label(s) -> str:
    s = re.sub(r"[\x00-\x1f\x7f<>]", " ", str(s or ""))
    return re.sub(r"\s+", " ", s).strip()[:60]


def validate_registration(body: dict, zone_center: dict):
    """-> (errors by field, clean dict | None)."""
    errs: dict[str, str] = {}
    label = clean_label(body.get("label"))
    if len(label) < 2:
        errs["label"] = "Give your place a name (at least 2 characters)"
    htype = body.get("hostType")
    if htype not in HOST_TYPES:
        errs["hostType"] = "Choose what kind of place this is"
    offers = body.get("offers")
    if not isinstance(offers, list) or not offers or any(o not in OFFERS for o in offers):
        errs["offers"] = "Choose at least one thing you offer"
    kind = body.get("kind")
    if kind not in KINDS:
        errs["kind"] = "Choose listed or standby"
    hours = body.get("hours")
    if not (isinstance(hours, list) and len(hours) == 2 and all(isinstance(x, str) and _TIME.match(x) for x in hours)) or (
        isinstance(hours, list) and len(hours) == 2 and all(isinstance(x, str) and _TIME.match(x) for x in hours) and hm(hours[0]) >= hm(hours[1])
    ):
        errs["hours"] = "Opening time must be before closing time (HH:MM)"
    lat, lng = body.get("lat"), body.get("lng")
    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in (lat, lng)):
        errs["location"] = "Drop the pin on the map"
    elif haversine({"lat": lat, "lng": lng}, zone_center) > MAX_ZONE_DISTANCE_M:
        errs["location"] = "This pin is outside the zone"
    if body.get("consentToAsks") is not True:
        errs["consentToAsks"] = "Tick the box so the coordinator may ask you on hot days"
    if errs:
        return errs, None
    return {}, {
        "label": label, "hostType": htype, "offers": sorted(set(offers)), "kind": kind, "hours": list(hours),
        "lat": round(float(lat), 6), "lng": round(float(lng), 6), "consentToAsks": True,
        "contactHours": body.get("contactHours") if isinstance(body.get("contactHours"), list) else list(hours),
    }
