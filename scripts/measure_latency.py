"""Measure the rider /help/find latency on the deployed API (text answer + Polly audio URL), cold cache excluded. Usage: python scripts/measure_latency.py"""
import json, statistics, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import smoke_cloud as m
s = json.loads(subprocess.check_output([sys.executable, "scripts/seed_t04_session.py", "--accepted"], text=True, encoding="utf8"))
body = {"need": "water", **m.RIDER_B, "sessionId": s["sessionId"], "zoneId": s["zoneId"], "lang": "en"}
m.call("POST", "/help/find", body)  # warm: Lambda + Polly cache
ts = []
for _ in range(12):
    t0 = time.time(); code, r = m.call("POST", "/help/find", body); ts.append(time.time() - t0)
    assert code == 200 and r["found"]
ts.sort()
print(f"n={len(ts)} median={statistics.median(ts):.2f}s p90={ts[int(len(ts)*0.9)-1]:.2f}s max={ts[-1]:.2f}s (client-side, from this machine, warm)")
