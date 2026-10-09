"""Load the supplied fixture into domain objects."""
import json
from pathlib import Path

from .models import Availability, DemandRecord, Host, Policy

FIXTURE_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "east-delhi-demo.json"


def load_fixture(path: Path = FIXTURE_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf8"))


def fixture_objects(fx: dict):
    """-> policy, hosts, demand, availability (listed hosts confirmed for the scenario date), hourly forecast."""
    policy = Policy(**fx["policy"])
    hosts = [Host(**{k: v for k, v in h.items() if k != "confirmedForScenarioDate"}) for h in fx["hosts"]]
    demand = [DemandRecord(**r) for r in fx["requests"]]
    date = fx["scenarioDate"]
    avail = [
        Availability(hostId=h["id"], date=date, window=tuple(h["hours"]), source="listed_confirmed")
        for h in fx["hosts"] if h["kind"] == "listed" and h["confirmedForScenarioDate"]
    ]
    return policy, hosts, demand, avail, fx["heatProfile"]["hourly"]
