"""T13 release gate: three CONSECUTIVE full /demo loops on the deployed URL (real browser, real clicks), each cross-checked
against Step Functions (execution named with the run id: SUCCEEDED, timeout + accept branches) and CloudWatch (same run id).
Writes docs/evidence/gate-loops.json. Usage: python scripts/gate_loops.py [N]"""
import json, re, shutil, subprocess, sys, time
from pathlib import Path
import boto3

ROOT = Path(__file__).resolve().parent.parent
OUT = json.loads((ROOT / "infra/outputs.json").read_text())["PyauStack"]
URL = OUT["WebUrl"]
N = int(sys.argv[1]) if len(sys.argv) > 1 else 3
sf = boto3.client("stepfunctions", region_name="ap-south-1")
logs = boto3.client("logs", region_name="ap-south-1")
results = []

for i in range(1, N + 1):
    t0 = time.time()
    p = subprocess.run(["node", "scripts/ui_loop.mjs", URL, "docs/evidence"], cwd=ROOT, capture_output=True, text=True, encoding="utf8", timeout=420)
    out = p.stdout
    ok_ui = p.returncode == 0 and "no page errors" in out and "coverage 90.9% shown" in out and "rider answer visible" in out
    m = re.search(r"copied run id: (\w+)", out)
    run_id = m.group(1) if m else None
    rec = {"loop": i, "uiOk": ok_ui, "runId": run_id, "seconds": round(time.time() - t0)}
    if run_id:
        arn = OUT["StateMachineArn"].replace(":stateMachine:", ":execution:") + ":" + run_id
        d = sf.describe_execution(executionArn=arn)
        hist = sf.get_execution_history(executionArn=arn, maxResults=1000)["events"]
        entered = [h["stateEnteredEventDetails"]["name"] for h in hist if h["type"].endswith("StateEntered")]
        rec.update(executionStatus=d["status"], timeoutBranch="MarkTimedOut" in entered and any(h["type"] == "TaskTimedOut" for h in hist),
                   acceptBranch="PublishPoint" in entered)
        hits = []
        for _ in range(6):  # CloudWatch ingestion delay
            time.sleep(8)
            hits = logs.filter_log_events(logGroupName=OUT["StateMachineLogGroup"], filterPattern=f'"{run_id}"',
                                          startTime=int((t0 - 60) * 1000), limit=5)["events"]
            if hits:
                break
        rec["stateMachineLogEvents"] = len(hits)
    rec["pass"] = bool(ok_ui and run_id and rec.get("executionStatus") == "SUCCEEDED" and rec.get("timeoutBranch") and rec.get("acceptBranch") and bool(rec.get("stateMachineLogEvents")))
    results.append(rec)
    print(json.dumps(rec))
    if not rec["pass"]:
        print(out[-1500:])
        break
    if i == N:  # keep the last loop's screenshots as the clean evidence pair
        shutil.copy(ROOT / "docs/evidence/t08-demo-proposal.png", ROOT / "docs/evidence/screenshot-proposal.png")
        shutil.copy(ROOT / "docs/evidence/t08-demo-after.png", ROOT / "docs/evidence/screenshot-coverage-91.png")

summary = {"url": URL, "consecutivePasses": sum(1 for r in results if r["pass"]), "required": N, "loops": results,
           "at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
(ROOT / "docs/evidence/gate-loops.json").write_text(json.dumps(summary, indent=1))
print("GATE:", "PASS" if summary["consecutivePasses"] == N else "FAIL", summary["consecutivePasses"], "/", N)
sys.exit(0 if summary["consecutivePasses"] == N else 1)
