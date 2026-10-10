from pyau_domain.trust import counted_problems, should_pause

NOW = 1_000_000.0
H = 3600


def r(kind, ago_h):
    return {"kind": kind, "createdAt": NOW - ago_h * H}


def test_two_problems_in_window_pause():
    assert should_pause([r("no_water", 0.1), r("closed", 1)], NOW, 2, 3)


def test_one_problem_or_got_it_does_not_pause():
    assert not should_pause([r("no_water", 0.1)], NOW, 2, 3)
    assert not should_pause([r("no_water", 0.1), r("got_it", 0.2), r("got_it", 0.3)], NOW, 2, 3)


def test_reports_outside_window_do_not_count():
    assert not should_pause([r("no_water", 0.1), r("no_water", 3.5)], NOW, 2, 3)


def test_reactivation_resolves_older_reports():
    reps = [r("no_water", 0.5), r("no_water", 0.6)]
    assert should_pause(reps, NOW, 2, 3)
    assert not should_pause(reps, NOW, 2, 3, since=NOW - 0.4 * H)
    assert len(counted_problems(reps + [r("dirty", 0.1)], NOW, 3, since=NOW - 0.4 * H)) == 1
