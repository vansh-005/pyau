from typing import Iterable, Optional

from .geo import hm
from .models import Availability, Host


def host_state(host: Host, avail: Iterable[Availability], minute: Optional[int] = None) -> dict:
    """Public map state for a host on the plan date.
    paused | live (confirmed for the date) | standby (only when asked) | not_confirmed (listed, not confirmed today).
    A host acceptance is a host promise: callers label it 'Host confirmed', never 'verified'."""
    mine = [a for a in avail if a.hostId == host.id]
    if host.paused:
        state = "paused"
    elif mine:
        state = "live"
    elif host.kind == "standby":
        state = "standby"
    else:
        state = "not_confirmed"
    out = {"state": state, "window": None, "source": None, "openNow": None}
    if mine:
        a = max(mine, key=lambda x: hm(x.window[1]))
        out["window"], out["source"] = list(a.window), a.source
        if minute is not None:
            out["openNow"] = any(hm(x.window[0]) <= minute < hm(x.window[1]) for x in mine) and not host.paused
    return out
