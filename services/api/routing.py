"""Amazon Location Routes (Scooter) with a 1.5 s budget; caller falls back to straight-line + 'approximate'."""
import os

import boto3
from botocore.config import Config

_client = None


def scooter_route(origin: dict, dest: dict):
    """-> {distanceM, durationS, line:[[lng,lat],...]} or None on any failure/timeout."""
    global _client
    try:
        _client = _client or boto3.client("geo-routes", config=Config(connect_timeout=1, read_timeout=1.5, retries={"max_attempts": 1}))
        r = _client.calculate_routes(
            Origin=[origin["lng"], origin["lat"]], Destination=[dest["lng"], dest["lat"]],
            TravelMode=os.environ.get("LOCATION_ROUTE_TRAVEL_MODE", "Scooter"), LegGeometryFormat="Simple",
        )
        rt = r["Routes"][0]
        line = [pt for leg in rt["Legs"] for pt in leg["Geometry"]["LineString"]]
        return {"distanceM": int(rt["Summary"]["Distance"]), "durationS": int(rt["Summary"]["Duration"]), "line": line}
    except Exception:
        return None
