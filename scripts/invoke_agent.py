"""Invoke the DEPLOYED agent Lambda (container, Strands, Bedrock) on a fresh demo session and print receipts + proposal.
Usage: python scripts/invoke_agent.py"""
import json, os, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "packages/domain")); sys.path.insert(0, str(ROOT / "scripts"))
OUT = json.loads((ROOT / "infra/outputs.json").read_text())["PyauStack"]
os.environ.update(TABLE_NAME=OUT["TableName"], BUCKET_NAME=OUT["BucketName"], AWS_REGION="ap-south-1", AWS_DEFAULT_REGION="ap-south-1")
import boto3, smoke_cloud as m
from services.api import events, runs
code, s = m.call("POST", "/demo/sessions", {})
rid = uuid.uuid4().hex[:12]
runs.create_run(s["sessionId"], s["zoneId"], rid, s["scenarioDate"], "demo", {}, OUT.get("BedrockModelId"))
print("session", s["sessionId"], "run", rid, "model", OUT.get("BedrockModelId"))
lam = boto3.client("lambda", region_name="ap-south-1", config=boto3.session.Config(read_timeout=200))
r = lam.invoke(FunctionName=OUT["AgentFunctionName"], Payload=json.dumps({"sessionId": s["sessionId"], "zoneId": s["zoneId"], "runId": rid}))
print("lambda status", r["StatusCode"], r.get("FunctionError"), r["Payload"].read().decode()[:300])
for e in events.list_events(s["sessionId"], rid):
    print(f"  #{e['seq']} {e['type']:13} {e['summary']}")
p = runs.get_proposal(s["sessionId"], rid)
print("proposal:", p and {k: p[k] for k in ("status", "coverageBefore", "coverageProjected")})
if p:
    for g in p["gaps"]:
        for h, mm in g["messages"].items():
            print(" ", g["clusterId"], h, mm["window"], "\n   HI:", mm["hi"], "\n   EN:", mm["en"])
    print("  unresolved:", [(u["clusterId"], u["recommendation"]) for u in p["unresolved"]])
print("run:", runs.get_run(s["sessionId"], rid)["status"])
