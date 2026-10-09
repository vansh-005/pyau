"""Load a session's zone state into domain objects."""
from dataclasses import dataclass

from pyau_domain.models import Availability, DemandRecord, Host, Policy

from . import ddb, sessions


@dataclass
class ZoneState:
    session_id: str
    zone_id: str
    meta: dict
    policy: Policy
    hosts: list
    avail: list
    demand: list
    clock: dict

    @property
    def date(self):
        return self.meta["date"]


def load(session_id: str, zone_id: str):
    pk = sessions.zone_pk(session_id, zone_id)
    meta = ddb.get(pk, "META")
    if not meta:
        return None
    hosts = [Host(**{k: v for k, v in h.items() if k in Host.model_fields}) for h in ddb.query(pk, "HOST#")]
    avail = [Availability(**a) for a in ddb.query(pk, "AVAIL#")]
    demand = [DemandRecord(**{k: v for k, v in d.items() if k in DemandRecord.model_fields})
              for d in ddb.query(f"S#{session_id}#ZONE#{zone_id}#DEMAND#{meta['date']}")]
    sess = sessions.get_session(session_id) or {}
    return ZoneState(session_id, zone_id, meta, Policy(**meta["policy"]), hosts, avail, demand, sess.get("clock", {}))
