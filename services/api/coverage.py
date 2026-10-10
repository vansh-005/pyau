"""Coverage report endpoint: every number comes from the domain functions, never the model."""
import time

from pyau_domain.candidates import cluster_summaries
from pyau_domain.coverage import compute_coverage
from pyau_domain.heat import heat_outlook

from . import state


def report(session_id: str, zone_id: str):
    st = state.load(session_id, zone_id)
    if not st:
        return None
    hourly = st.meta["heatHourly"]
    outlook = heat_outlook(hourly, st.policy)
    out = {
        "zoneId": zone_id, "date": st.date, "clock": st.clock,
        "policy": {
            "id": st.policy.id, "heatThresholdC": st.policy.heatThresholdC, "coverageRadiusMeters": st.policy.coverageRadiusMeters,
            "validationStatus": st.policy.validationStatus, "need": st.policy.need,
        },
        "forecast": {"mode": "synthetic", "hourly": hourly},
        "heat": outlook.model_dump(),
        "coverage": None, "clusters": [], "computedAt": int(time.time()),
    }
    if outlook.status != "OK":
        return out  # INSUFFICIENT_DATA / NO_HEAT: never reported as "safe"
    rep = compute_coverage(st.demand, st.hosts, [a for a in st.avail if a.date == st.date], outlook.window, st.policy)
    out["coverage"] = rep.model_dump()
    out["clusters"] = cluster_summaries(st.demand, outlook.window, st.policy, rep, st.meta.get("clusterLabels"))
    return out
