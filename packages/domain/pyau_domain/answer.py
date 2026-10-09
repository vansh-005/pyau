"""Fixed bilingual answer templates for riders. Not model-generated: fast, predictable, reviewable.
Hindi strings need native review (needsNativeReview)."""
from typing import Optional

NEED_HI = {"water": "पानी", "shade": "छाँव", "toilet": "शौचालय", "charging": "चार्जिंग", "food": "खाना"}
NEED_EN = {"water": "water", "shade": "shade", "toilet": "toilet", "charging": "charging", "food": "food"}

# Hindi display names for the sample hosts (the fixture labels are English).
LABEL_HI = {
    "Chai stall": "चाय की दुकान",
    "Pharmacy": "दवाई की दुकान",
    "Temple pyau": "मंदिर प्याऊ",
    "Kirana store": "किराना दुकान",
    "RWA office": "आरडब्ल्यूए ऑफिस",
    "Dhaba": "ढाबा",
}


def short_label(label: str) -> str:
    """'Sample host · RWA office (standby)' -> 'RWA office'."""
    s = label.split("·")[-1].strip()
    return s.split("(")[0].strip()


def label_hi(label: str) -> str:
    return LABEL_HI.get(short_label(label), short_label(label))


def hindi_time(hhmm: str) -> str:
    h, m = (int(x) for x in hhmm.split(":"))
    if h == 0:
        part, h12 = "रात", 12
    elif h < 12:
        part, h12 = "सुबह", h
    elif h < 16:
        part, h12 = "दोपहर", h - 12 or 12
    elif h < 20:
        part, h12 = "शाम", h - 12
    else:
        part, h12 = "रात", h - 12
    if m == 0:
        return f"{part} {h12} बजे"
    if m == 30:
        return f"{part} साढ़े {h12} बजे"
    return f"{part} {h12} बजकर {m} मिनट"


def build_answer(need: str, host_label: Optional[str], distance_m: Optional[int], closes_at: Optional[str],
                 within_radius: bool, radius_m: int, approximate: bool) -> dict:
    """-> {hi, en}. Distances are metres (route distance when available, else straight-line + approximate)."""
    nh, ne = NEED_HI.get(need, need), NEED_EN.get(need, need)
    if host_label is None:
        return {
            "hi": f"अभी {radius_m} मीटर में कोई पक्का {nh} पॉइंट नहीं है। हमने कोऑर्डिनेटर को बता दिया है।",
            "en": f"No confirmed {ne} point within {radius_m} m right now. We've told the coordinator.",
        }
    name_hi, name_en = label_hi(host_label), short_label(host_label)
    approx_hi, approx_en = ("लगभग ", "about ") if approximate else ("", "")
    if within_radius:
        return {
            "hi": f"सबसे पास {nh}: {name_hi}, {approx_hi}{distance_m} मीटर। {hindi_time(closes_at)} तक खुला। होस्ट ने आज पक्का किया है।",
            "en": f"Nearest {ne}: {name_en}, {approx_en}{distance_m} m. Open till {closes_at}. Host confirmed for today.",
        }
    return {
        "hi": f"{radius_m} मीटर में अभी कोई पक्का {nh} पॉइंट नहीं है। सबसे पास: {name_hi}, {approx_hi}{distance_m} मीटर। हमने कोऑर्डिनेटर को बता दिया है।",
        "en": f"No confirmed {ne} point within {radius_m} m right now. Nearest: {name_en}, {approx_en}{distance_m} m. We've told the coordinator.",
    }
