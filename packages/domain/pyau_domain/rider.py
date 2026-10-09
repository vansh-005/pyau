from typing import Optional

from .coverage import host_live_at
from .geo import haversine
from .models import Availability, Host, Need


def find_nearest(need: Need, lat: float, lng: float, minute_of_day: int, hosts: list[Host],
                 avail: list[Availability], radius_m: int) -> Optional[dict]:
    """Nearest open, confirmed-today, unpaused host offering `need` (straight-line; caller adds routing)."""
    here = {"lat": lat, "lng": lng}
    best = None
    for h in hosts:
        if need not in h.offers or h.paused:
            continue
        a = host_live_at(h.id, minute_of_day, avail)
        if not a:
            continue
        d = haversine(here, h)
        if best is None or d < best["distanceM"]:
            best = {"host": h, "distanceM": d, "closesAt": a.window[1], "source": a.source}
    if best is None:
        return None
    best["withinRadius"] = best["distanceM"] <= radius_m
    best["distanceM"] = round(best["distanceM"])
    return best
