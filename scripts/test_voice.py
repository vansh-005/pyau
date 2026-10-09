"""T09 check against the deployed API: Hindi question (Polly PCM clip) -> Transcribe hi-IN -> intent -> H5 answer."""
import base64, json, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import boto3, smoke_cloud as m

def clip(text):
    return boto3.client("polly", region_name="ap-south-1").synthesize_speech(
        Text=text, VoiceId="Kajal", Engine="neural", LanguageCode="hi-IN", OutputFormat="pcm", SampleRate="16000")["AudioStream"].read()

s = json.loads(subprocess.check_output([sys.executable, "scripts/seed_t04_session.py", "--accepted"], text=True, encoding="utf8"))
for phrase, expect in [("भैया पानी कहाँ मिलेगा", "water"), ("शौचालय कहाँ है", "toilet"), ("नमस्ते आप कैसे हैं", None)]:
    pcm = clip(phrase)
    code, r = m.call("POST", "/help/ask-voice", {"audioBase64": base64.b64encode(pcm).decode(), "lat": m.RIDER_B["lat"], "lng": m.RIDER_B["lng"], "sessionId": s["sessionId"], "zoneId": s["zoneId"]})
    print(code, repr(r.get("transcript")), "need:", r.get("need"), "via:", r.get("intentVia"), "found:", r.get("found"), "host:", (r.get("host") or {}).get("id"), "unknown:", r.get("needUnknown"))
    assert code == 200
    if expect == "water":
        assert r["found"] and r["host"]["id"] == "H5" and r["audio"], r
    if expect is None:
        assert r["needUnknown"] or r.get("need") != "water", r
code, r = m.call("POST", "/help/ask-voice", {"audioBase64": base64.b64encode(b"\0" * 400000).decode(), "sessionId": s["sessionId"], "zoneId": s["zoneId"], "lat": 28.6, "lng": 77.2})
print("too long ->", code, r.get("code"))
assert code == 413
print("VOICE OK")
