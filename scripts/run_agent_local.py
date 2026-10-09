"""Run the planner locally (my IAM creds) against a fresh deployed demo session. Real Bedrock call.
Usage: python scripts/run_agent_local.py"""
import json, os, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "packages/domain")); sys.path.insert(0, str(ROOT / "scripts"))
OUT = json.loads((ROOT / "infra/outputs.json").read_text())["PyauStack"]
os.environ.update(TABLE_NAME=OUT["TableName"], BUCKET_NAME=OUT["BucketName"], AWS_REGION="ap-south-1", AWS_DEFAULT_REGION="ap-south-1",
                  BEDROCK_REGION="ap-south-1", BEDROCK_MODEL_ID=os.environ.get("BEDROCK_MODEL_ID", "global.amazon.nova-2-lite-v1:0"))
import smoke_cloud as m
from services.agent.planner import plan
from services.api import events, runs
code, s = m.call("POST", "/demo/sessions", {})
rid = uuid.uuid4().hex[:12]
print("session", s["sessionId"], "run", rid, "model", os.environ["BEDROCK_MODEL_ID"])
res = plan(s["sessionId"], s["zoneId"], rid)
print("RESULT", res)
for e in events.list_events(s["sessionId"], rid):
    print(f"  #{e['seq']} {e['type']:13} {e['summary']}")
p = runs.get_proposal(s["sessionId"], rid)
if p:
    print(json.dumps({k: p[k] for k in ("coverageBefore", "coverageProjected", "unresolved", "explanation", "status")}, ensure_ascii=False, indent=1))
    for g in p["gaps"]:
        print("GAP", g["clusterId"], g["candidateOrder"], g["askWindow"])
        for h, mm in g["messages"].items():
            print(" ", h, mm["window"], "\n   HI:", mm["hi"], "\n   EN:", mm["en"])
print("run status:", runs.get_run(s["sessionId"], rid)["status"], runs.get_run(s["sessionId"], rid).get("error"))
