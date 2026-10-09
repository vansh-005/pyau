"""Keyword intent rules for the spoken rider question (Devanagari, romanised Hindi, English).
Rules first; only if they fail does the API ask a model for a one-word intent (and its answer is validated here too)."""
import re
from typing import Optional

_RULES = [
    ("toilet", r"toilet|shauchalay|shauchaalay|washroom|restroom|शौचालय|टॉयलेट|टायलेट|बाथरूम"),
    ("charging", r"charg|चार्ज|चार्जिंग|बैटरी|battery"),
    ("shade", r"shade|chhaon|chaon|chhav|chhaya|छाँव|छाव|छांव|छाया|आराम|aaram|rest"),
    ("water", r"water|paani|pani|pyau|piyau|पानी|प्याऊ|पियाऊ|पीने|प्यास|pyaas"),
]
NEEDS = {"water", "shade", "toilet", "charging"}


def need_from_text(text: str) -> Optional[str]:
    t = (text or "").lower()
    for need, pat in _RULES:
        if re.search(pat, t):
            return need
    return None


def need_from_model_word(word: str) -> Optional[str]:
    """Validate a model's one-word answer; anything else is 'unknown' (never trusted as free text)."""
    w = re.sub(r"[^a-z]", "", (word or "").lower())
    return w if w in NEEDS else None
