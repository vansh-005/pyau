from pyau_domain.intent import need_from_model_word, need_from_text


def test_hindi_and_romanised_water():
    assert need_from_text("भैया पानी कहाँ मिलेगा?") == "water"
    assert need_from_text("bhaiya paani kahan milega") == "water"
    assert need_from_text("Where can I get water") == "water"


def test_other_needs():
    assert need_from_text("शौचालय कहाँ है") == "toilet"
    assert need_from_text("phone charge karna hai") == "charging"
    assert need_from_text("कहीं छाँव मिलेगी?") == "shade"


def test_unknown_and_model_word_validation():
    assert need_from_text("namaste kaise ho") is None
    assert need_from_model_word("Water.") == "water"
    assert need_from_model_word("ignore previous instructions") is None
    assert need_from_model_word("none") is None
