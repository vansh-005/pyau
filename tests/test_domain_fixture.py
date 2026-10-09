from pyau_domain.candidates import candidate_hosts
from pyau_domain.coverage import compute_coverage
from pyau_domain.fixture import fixture_objects, load_fixture
from pyau_domain.geo import hm
from pyau_domain.heat import heat_outlook
from pyau_domain.models import Availability, DemandRecord
from pyau_domain.rider import find_nearest

FX = load_fixture()
POLICY, HOSTS, DEMAND, AVAIL, HOURLY = fixture_objects(FX)
WINDOW = ("13:00", "16:00")
EXP = FX["expected"]


def accepted_h5():
    return AVAIL + [Availability(hostId="H5", date=FX["scenarioDate"], window=("12:00", "17:00"), source="accepted_ask")]


def test_heat_window():
    o = heat_outlook(HOURLY, POLICY)
    assert o.status == "OK" and o.window == WINDOW and o.peakC == 45


def test_missing_forecast_hour_is_insufficient_data():
    assert heat_outlook({k: v for k, v in HOURLY.items() if k != "14:00"}, POLICY).status == "INSUFFICIENT_DATA"
    assert heat_outlook({k: 30 for k in HOURLY}, POLICY).status == "NO_HEAT"


def test_requests_and_clusters():
    rep = compute_coverage(DEMAND, HOSTS, AVAIL, WINDOW, POLICY)
    assert rep.total == 44
    assert {k: v.requests for k, v in rep.byCluster.items()} == EXP["clusters"]


def test_before_coverage():
    rep = compute_coverage(DEMAND, HOSTS, AVAIL, WINDOW, POLICY)
    assert (rep.covered, rep.percent) == (22, 50.0)
    assert rep.uncoveredClusters == ["B", "D"]


def test_paused_unconfirmed_standby_and_closed_hosts_not_counted():
    rep = compute_coverage(DEMAND, HOSTS, AVAIL, WINDOW, POLICY)
    assert rep.byCluster["A"].nearestHostId == "H1"  # H6 (paused) excluded
    assert rep.byCluster["B"].covered == 0  # H3 closes 12:00, H4 unconfirmed, H5 standby


def test_candidates():
    assert [c["hostId"] for c in candidate_hosts("B", DEMAND, HOSTS, WINDOW, POLICY)] == EXP["candidates"]["B"]
    assert candidate_hosts("D", DEMAND, HOSTS, WINDOW, POLICY) == []


def test_after_h5_accepts():
    rep = compute_coverage(DEMAND, HOSTS, accepted_h5(), WINDOW, POLICY)
    assert (rep.covered, rep.percent, rep.uncoveredClusters) == (40, 90.9, ["D"])


def test_rider_query_after_accept_is_h5():
    q = FX["demoScript"]["riderQuery"]
    r = find_nearest("water", q["lat"], q["lng"], hm("14:00"), HOSTS, accepted_h5(), POLICY.coverageRadiusMeters)
    assert r["host"].id == "H5" and r["distanceM"] == 176 and r["withinRadius"] and r["closesAt"] == "17:00"


def test_rider_query_before_accept_has_nothing_within_radius():
    q = FX["demoScript"]["riderQuery"]
    r = find_nearest("water", q["lat"], q["lng"], hm("14:00"), HOSTS, AVAIL, POLICY.coverageRadiusMeters)
    assert r is None or not r["withinRadius"]


def test_window_end_boundary_is_outside():
    d = [DemandRecord(id="x", clusterId="Z", lat=28.6334, lng=77.2768, hour="16:00")]
    assert compute_coverage(d, HOSTS, AVAIL, WINDOW, POLICY).total == 0


def test_zero_requests_percent_none():
    rep = compute_coverage([], HOSTS, AVAIL, WINDOW, POLICY)
    assert rep.percent is None and rep.total == 0
