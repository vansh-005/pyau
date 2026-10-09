"""T06 boundary checks against a REAL deployed demo session (no model call): the agent's tools enforce scope in code.
Invented host ID, reordered candidates, money promise, missing window, repeat candidate lookups and the tool-call budget."""
import json, os, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "packages/domain")); sys.path.insert(0, str(ROOT / "scripts"))
OUT = json.loads((ROOT / "infra/outputs.json").read_text())["PyauStack"]
os.environ.update(TABLE_NAME=OUT["TableName"], BUCKET_NAME=OUT["BucketName"], AWS_REGION="ap-south-1", AWS_DEFAULT_REGION="ap-south-1",
                  BEDROCK_MODEL_ID="n/a", MAX_TOOL_CALLS="12")
import smoke_cloud as m
from services.agent import planner

code, s = m.call("POST", "/demo/sessions", {})
rid = uuid.uuid4().hex[:12]
run = planner.Run(s["sessionId"], s["zoneId"], rid)
t = {x.tool_name: x for x in planner.build_tools(run)}
for name in ("get_zone_context", "get_heat_outlook", "get_demand", "get_coverage"):
    t[name]()
cands = t["find_candidate_hosts"]("B")
assert [c["hostId"] for c in cands["candidates"]] == ["H4", "H5"]
assert "error" in t["find_candidate_hosts"]("B"), "repeat lookup must be rejected"
assert "error" in t["find_candidate_hosts"]("A"), "covered cluster must be rejected"
assert t["find_candidate_hosts"]("D")["candidates"] == []

HI = "नमस्ते, मैं प्याऊ कोऑर्डिनेटर हूँ। कल 12:00 से 17:00 तक राइडरों के लिए पीने का पानी रख सकेंगे? धन्यवाद।"
EN = "Hello, I am the Pyau coordinator. Could you keep drinking water for riders from 12:00 to 17:00? Thank you."
msg = {"hi": HI, "en": EN}
unres = [{"clusterId": "D", "recommendation": "recruit_host_nearby", "note": "No host nearby."}]
def gap(**kw):
    g = {"clusterId": "B", "priority": 1, "askWindow": ["12:00", "17:00"], "messages": {"H4": msg, "H5": msg}}
    g.update(kw)
    return [g]

def rejected(label, gaps, needle):
    r = t["submit_proposal"](gaps, unres, "Cluster B needs water in the heat window.")
    ok = r["accepted"] is False and any(needle in e for e in r["errors"])
    print(("PASS " if ok else "FAIL ") + label, "->", r["errors"][0][:90] if r.get("errors") else r)
    return ok

ok = True
run.submit_attempts = 0
ok &= rejected("invented host H9", gap(messages={"H4": msg, "H5": msg, "H9": msg}), "H9")
run.submit_attempts = 0
ok &= rejected("reordered candidates", gap(candidateOrder=["H5", "H4"]), "reordering")
run.submit_attempts = 0
ok &= rejected("money promise", gap(messages={"H4": {"hi": HI + " 100 रुपये मिलेंगे।", "en": EN + " You will be paid Rs 100."}, "H5": msg}), "money")
run.submit_attempts = 0
ok &= rejected("message omits window", gap(messages={"H4": {"hi": "नमस्ते, कृपया राइडरों के लिए पीने का पानी रखें, बहुत मेहरबानी होगी।", "en": "Please keep drinking water for riders. Thank you very much."}, "H5": msg}), "time window")
# attempts: a third submit exhausts the one-repair rule
run.calls = 0
run.submit_attempts = 2
try:
    t["submit_proposal"](gap(), unres, "x")
    ok = False
    print("FAIL repair budget not enforced")
except planner.Budget as e:
    print("PASS repair budget:", e)
# tool-call budget
run.calls = 11
try:
    t["get_zone_context"](); t["get_zone_context"]()
    ok = False
    print("FAIL tool budget not enforced")
except planner.Budget as e:
    print("PASS tool-call budget:", e)
print("ALL BOUNDARY CHECKS PASSED" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
