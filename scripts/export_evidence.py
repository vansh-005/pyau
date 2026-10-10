"""Export sanitized evidence for a REAL deployed run: docs/evidence/facts.json and evidence.json.
Reads the Step Functions execution (named with the run id), DynamoDB run/proposal/events and the gate results.
No account IDs, tokens, session ids, task tokens or emails are written. Usage: python scripts/export_evidence.py <runId>"""
import json, os, re, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "packages/domain"))
OUT = json.loads((ROOT / "infra/outputs.json").read_text())["PyauStack"]
os.environ.update(TABLE_NAME=OUT["TableName"], BUCKET_NAME=OUT["BucketName"], AWS_REGION="ap-south-1", AWS_DEFAULT_REGION="ap-south-1")
import boto3
from services.api import asks, events, runs

run_id = sys.argv[1]
sf = boto3.client("stepfunctions", region_name="ap-south-1")
arn = OUT["StateMachineArn"].replace(":stateMachine:", ":execution:") + ":" + run_id
ex = sf.describe_execution(executionArn=arn)
inp = json.loads(ex["input"])
sid = inp["sessionId"]
run = runs.get_run(sid, run_id)
prop = runs.get_proposal(sid, run_id)
evs = events.list_events(sid, run_id, 0, 500)
ask_list = asks.for_run(sid, run_id)
assert ex["status"] == "SUCCEEDED" and run["status"] == "COMPLETED", (ex["status"], run["status"])
hist = sf.get_execution_history(executionArn=arn, maxResults=1000)["events"]
entered = [h["stateEnteredEventDetails"]["name"] for h in hist if h["type"].endswith("StateEntered")]
cov_after = run["coverageCurrent"]
b = next(g for g in prop["gaps"] if g["clusterId"] == "B")
d_unres = next(u for u in prop["unresolved"] if u["clusterId"] == "D")
accepted = next(a for a in ask_list if a["status"] == "ACCEPTED")
timed_out = next(a for a in ask_list if a["status"] == "TIMED_OUT")
suffix = lambda s: re.sub(r"arn:aws:[^:]*:[^:]*:\d{12}:", "", s)  # drop partition/region/account

facts = {
    "verifiedFromRunId": run_id,
    "executionName": run_id,
    "sessionMode": "demo",
    "scenarioDate": "2026-05-21",
    "zone": "East Delhi sample zone",
    "heatWindow": prop["gaps"][0]["hours"],
    "requestsInWindow": prop["coverageBefore"]["total"],
    "clusterB": {"requests": b["requests"], "candidateOrder": b["candidateOrder"]},
    "coverageBefore": prop["coverageBefore"],
    "coverageProjectedIfFirstChoiceAccepts": prop["coverageProjected"],
    "coverageAfter": {"covered": cov_after["covered"], "total": cov_after["total"], "percent": cov_after["percent"]},
    "unresolved": [{"clusterId": "D", "requests": d_unres["requests"], "recommendation": d_unres["recommendation"]}],
    "outreach": {"timedOutHost": timed_out["hostId"], "acceptedHost": accepted["hostId"], "acceptedWindow": accepted["window"]},
    "askTimeoutSecondsDemo": accepted["timeoutSeconds"],
    "bedrockModelId": run["modelId"],
    "stateMachineStatesEntered": entered,
    "awsServices": ["AWS Amplify Hosting", "Amazon Location Service", "Amazon API Gateway", "AWS Lambda", "AWS Step Functions",
                    "Amazon Bedrock", "Amazon DynamoDB", "Amazon S3", "Amazon Polly", "Amazon Transcribe", "Amazon CloudWatch",
                    "Amazon ECR (agent container image)", "AWS Secrets Manager"],
    "awsServicesProvisionedNotShownInDemo": ["Amazon EventBridge Scheduler (07:30 and 18:30 IST rules; no live zone configured, so they have never acted)",
                                             "Amazon Cognito (user pool + groups + JWT-protected whoami; demo roles use signed demo tokens)"],
    "openSource": ["Strands Agents SDK", "MapLibre GL JS", "React", "Vite", "Tailwind CSS", "TanStack Query", "Pydantic", "AWS CDK"],
    "appUrl": OUT["WebUrl"],
    "dataNote": "Sample scenario: hosts, requests and temperatures are invented; nothing here is an observed outcome.",
    "exportedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}
ev_ev = [{"seq": e["seq"], "type": e["type"], "summary": e["summary"]} for e in evs]
gate = {}
for name in ("gate-loops.json",):
    f = ROOT / "docs/evidence" / name
    if f.exists():
        g = json.loads(f.read_text())
        gate = {"consecutiveDeployedLoopsPassed": g["consecutivePasses"], "required": g["required"],
                "runIds": [l["runId"] for l in g["loops"]]}
evidence = {
    "verifiedRun": {"runId": run_id, "executionArnSuffix": suffix(arn), "executionStatus": ex["status"],
                    "startedAt": ex["startDate"].isoformat(), "stoppedAt": ex["stopDate"].isoformat(), "events": ev_ev},
    "releaseGate": gate,
    "screenshots": [
        {"file": "docs/evidence/screenshot-proposal.png", "shows": "demo room after the real agent proposal (1920x1080)", "source": "scripts/ui_loop.mjs real-browser run"},
        {"file": "docs/evidence/screenshot-coverage-91.png", "shows": "demo room after coverage reaches 90.9% (1920x1080)", "source": "scripts/ui_loop.mjs real-browser run"},
    ],
    "captures": [],
    "capturesNote": "Footage captures (S03-S09) are recorded by Vansh; add one entry per capture: shotId, file, runId, executionArnSuffix, capturedAt, in/out seconds, limitations.",
    "limitations": [
        "Sample scenario: all hosts, rider requests and temperatures are invented; coverage figures are scenario arithmetic, not observed outcomes.",
        "Coverage uses straight-line distance within 500 m; the demo policy (42 C apparent temperature, 500 m, 45 s ask timeout) is unvalidated.",
        "A host's yes is a promise (labelled 'Host confirmed'), not verified water.",
        "No rider, host or coordinator has validated the workflow, the timeout length or the radius.",
        "Hindi strings and model-written Hindi messages need native-speaker review; messages are shown to the coordinator before sending.",
        "The agent runs on Amazon Nova 2 Lite (Anthropic models were not enabled for this AWS account).",
        "Voice question tested with a synthetic (Polly) voice through a fake microphone and Transcribe hi-IN, not with real riders.",
        "Demo roles use signed demo-session tokens; Cognito sign-in screens are not built (pool and groups are provisioned).",
        "Scheduled morning/nightly jobs are wired but no live zone exists, so they have never run for real.",
        "Rider problem reports are not deduplicated per device (abuse risk); photo upload and 'contact host' are not built.",
        "Account Lambda concurrency limit is 10, so heavy simultaneous use returns 503s.",
    ],
}
d = ROOT / "docs/evidence"
d.mkdir(parents=True, exist_ok=True)
(d / "facts.json").write_text(json.dumps(facts, indent=1, ensure_ascii=False))
(d / "evidence.json").write_text(json.dumps(evidence, indent=1, ensure_ascii=False))
blob = (d / "facts.json").read_text() + (d / "evidence.json").read_text()
assert sid not in blob and not re.search(r"\b\d{12}\b", blob), "sanitization check failed"
print("exported facts.json + evidence.json for run", run_id)
