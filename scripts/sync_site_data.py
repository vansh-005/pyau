"""Copy the verified run id and the states its Step Functions execution entered into the web app (drawn on /engineering).
Run after scripts/export_evidence.py. Usage: python scripts/sync_site_data.py"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
f = json.loads((ROOT / "docs/evidence/facts.json").read_text(encoding="utf8"))
out = {"runId": f["verifiedFromRunId"], "statesEntered": sorted(set(f["stateMachineStatesEntered"])), "coverageBefore": f["coverageBefore"], "coverageAfter": f["coverageAfter"]}
(ROOT / "apps/web/src/data/execution.json").write_text(json.dumps(out, indent=1), encoding="utf8")
print("site data synced from run", out["runId"], out["statesEntered"])
