"""Run the DEPLOYED agent Lambda N times (plan only, direct invoke) and collect messages + recommendations.
Each run must end PROPOSED with B -> [H4, H5], D unresolved, projected 40/44, both languages valid.
Usage: python scripts/sample_messages.py [N] [--json out.json]"""
import json, os, re, sys, time, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "packages/domain")); sys.path.insert(0, str(ROOT / "scripts"))
OUT = json.loads((ROOT / "infra/outputs.json").read_text())["PyauStack"]
os.environ.update(TABLE_NAME=OUT["TableName"], BUCKET_NAME=OUT["BucketName"], AWS_REGION="ap-south-1", AWS_DEFAULT_REGION="ap-south-1")
import boto3, smoke_cloud as m
from services.api import runs

N = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 3
lam = boto3.client("lambda", region_name="ap-south-1", config=boto3.session.Config(read_timeout=200))
samples = []
for i in range(N):
    code, s = m.call("POST", "/demo/sessions", {})
    rid = uuid.uuid4().hex[:12]
    runs.create_run(s["sessionId"], s["zoneId"], rid, s["scenarioDate"], "demo", {}, OUT.get("BedrockModelId"))
    t0 = time.time()
    r = lam.invoke(FunctionName=OUT["AgentFunctionName"], Payload=json.dumps({"sessionId": s["sessionId"], "zoneId": s["zoneId"], "runId": rid}))
    res = json.loads(r["Payload"].read())
    p = runs.get_proposal(s["sessionId"], rid)
    ok = bool(p) and res.get("status") == "PROPOSED" and p["coverageProjected"]["percent"] == 90.9 and [g["clusterId"] for g in p["gaps"]] == ["B"] \
        and p["gaps"][0]["candidateOrder"] == ["H4", "H5"] and [u["clusterId"] for u in p["unresolved"]] == ["D"]
    rec = {"run": rid, "seconds": round(time.time() - t0), "status": res.get("status"), "ok": ok,
           "askWindow": p["gaps"][0]["askWindow"] if p else None, "unresolved": p["unresolved"] if p else None,
           "messages": {h: {"hi": mm["hi"], "en": mm["en"], "chars": [len(mm["hi"]), len(mm["en"])]} for h, mm in (p["gaps"][0]["messages"].items() if p else [])},
           "explanation": p["explanation"] if p else None}
    samples.append(rec)
    print(f"run {i + 1}: {rec['status']} ok={ok} window={rec['askWindow']} D={rec['unresolved'] and rec['unresolved'][0]['recommendation']} ({rec['seconds']}s) id={rid}")
    for h, mm in rec["messages"].items():
        print(f"   {h} hi({mm['chars'][0]}): {mm['hi']}\n      en({mm['chars'][1]}): {mm['en']}")
if "--json" in sys.argv:
    Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(samples, ensure_ascii=False, indent=1), encoding="utf8")
print("ALL VALID" if all(s["ok"] for s in samples) else "SOME INVALID")
