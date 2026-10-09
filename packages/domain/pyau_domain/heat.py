from .geo import fmt_hm, hm
from .models import HeatOutlook, Policy


def heat_outlook(hourly: dict[str, float], policy: Policy, first: str = "06:00", last: str = "19:00") -> HeatOutlook:
    """Heat window = first contiguous run of hours with value >= threshold (each value covers [h, h+1)).
    Missing hours between first and last -> INSUFFICIENT_DATA (never 'no heat')."""
    expected = [fmt_hm(m) for m in range(hm(first), hm(last) + 1, 60)]
    missing = [h for h in expected if h not in hourly]
    if missing:
        return HeatOutlook(status="INSUFFICIENT_DATA", missingHours=missing)
    hot = [h for h in expected if hourly[h] >= policy.heatThresholdC]
    peak = max(hourly[h] for h in expected)
    if not hot:
        return HeatOutlook(status="NO_HEAT", peakC=peak)
    start = end = hm(hot[0])
    for h in hot:
        if hm(h) != end:
            break
        end += 60
    return HeatOutlook(status="OK", window=(fmt_hm(start), fmt_hm(end)), peakC=peak)
