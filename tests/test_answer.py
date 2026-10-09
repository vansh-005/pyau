from pyau_domain.answer import build_answer, hindi_time, label_hi, short_label
from pyau_domain.geohash import encode


def test_geohash_known_value():
    assert encode(57.64911, 10.40744, 11) == "u4pruydqqvj"
    assert len(encode(28.6281, 77.2829)) == 7


def test_hindi_time():
    assert hindi_time("17:00") == "शाम 5 बजे"
    assert hindi_time("12:00") == "दोपहर 12 बजे"
    assert hindi_time("09:30") == "सुबह साढ़े 9 बजे"


def test_labels():
    assert short_label("Sample host · RWA office (standby)") == "RWA office"
    assert label_hi("Sample host · RWA office (standby)") == "आरडब्ल्यूए ऑफिस"


def test_answer_within_radius_and_honest_none():
    a = build_answer("water", "Sample host · RWA office (standby)", 176, "17:00", True, 500, False)
    assert "176 मीटर" in a["hi"] and "शाम 5 बजे" in a["hi"] and "Host confirmed" in a["en"]
    n = build_answer("water", None, None, None, False, 500, False)
    assert "500" in n["hi"] and "coordinator" in n["en"]
    f = build_answer("water", "Sample host · Pharmacy", 900, "21:00", False, 500, True)
    assert "No confirmed" in f["en"] and "about 900 m" in f["en"]
