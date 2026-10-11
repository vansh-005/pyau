"""Package the recorded clips for the video workspace: copies mp4s + the real Polly answer into ../pyau-video/public/footage/,
writes facts.json, evidence.json and cues.md into ../pyau-video/evidence/ (the only two places this script writes there).
Usage: python scripts/package_footage.py   (after scripts/record_footage.mjs <all sections> and scripts/record_aws_proof.mjs)"""
import hashlib, json, shutil, subprocess, sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAWD = ROOT / ".tmp/footage/raw"
OUTD = ROOT / ".tmp/footage/out"
VID = ROOT.parent / "pyau-video"
FOOT = VID / "public/footage"
EVID = VID / "evidence"
OFFSET = 0.58  # video clock runs ~0.58 s behind the page clock used for marks (measured from the frame where the answer card appears)
APP = "https://main.d1lgs9hxx2cuwt.amplifyapp.com"

def marks(name):
    return json.loads((RAWD / f"{name}.marks.json").read_text(encoding="utf8"))["marks"]

def dur(p):
    return round(float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], text=True)), 1)

def iso(name):
    return datetime.fromtimestamp((RAWD / f"{name}.marks.json").stat().st_mtime).astimezone().isoformat(timespec="seconds")

M = {n: marks(n) for n in ("main", "host", "trust", "landing", "engineering", "aws")}
run_id = (RAWD / "main.runid.txt").read_text().strip()
sid_ref = None
try:
    import boto3
    out = json.loads((ROOT / "infra/outputs.json").read_text())["PyauStack"]
    arn = out["StateMachineArn"].replace(":stateMachine:", ":execution:") + ":" + run_id
    sid = json.loads(boto3.client("stepfunctions", region_name="ap-south-1").describe_execution(executionArn=arn)["input"])["sessionId"]
    sid_ref = "sess-" + hashlib.sha256(sid.encode()).hexdigest()[:8]
except Exception as e:  # noqa: BLE001
    print("session ref unavailable:", e)

# clip start (video seconds) for every clip, as used by the cutter
m = M["main"]
voice = json.loads((RAWD / "main.voice.json").read_text(encoding="utf8"))
START = {"05": 0.0, "06": m["s06-start"] - 2, "03": m["s03-start"], "04": 0.0, "07": 0.0, "10": 0.0, "08": 0.0, "09": 0.0}
FILES = {"05": "05-plan-approve.mp4", "06": "06-outreach.mp4", "03": "03-rider-voice.mp4", "04": "04-host-join.mp4",
         "07": "07-trust.mp4", "10": "10-landing.mp4", "08": "08-engineering.mp4", "09": "09-aws-proof.mp4"}

def ct(shot, src, key):
    """seconds into the cut clip for a mark (page clock -> video clock -> clip)"""
    t = src[key] - OFFSET
    if shot == "09":
        a = src["events-end"] + 0.5
        b = src["insights-open"] - 0.5
        return max(0.0, round((t - 4) if t <= a else (a - 4) + (t - b), 1))  # first 4 s (blank loading) trimmed
    return max(0.0, round(t - START[shot], 1))

CUES = {
    "05": (m, [
        ("s05-start", "Evening before, Wed 20 May 18:30: Water access 50% (22 of 44), dot strip, 'Sample scenario' badge and 'Demo timers: 45 s' chip. Still."),
        ("run-clicked", "Run coverage plan clicked; real planner steps and tool receipts stream in (about 15 s)."),
        ("proposal", "Review the plan appears (Needs your approval)."),
        ("window", "Area B, 18 requests, 'Asking hosts to open 12:00-17:00', hosts in code-ranked order."),
        ("msg-hi", "Hindi message to H4 Kirana store (use for the side magnifier)."),
        ("msg-en", "English message to H5 RWA office."),
        ("area-d", "Area D in the red 'Needs your decision' box with the municipality suggestion."),
        ("projection", "'If the first host in each area says yes: 40 of 44 (90.9%). Calculated by the app, not the AI.' End of S05 (clip holds 2.5 s more)."),
    ]),
    "06": (m, [
        ("s06-start", "Acknowledgement checkbox ticked."),
        ("approved", "Approve outreach clicked."),
        ("h4-asked", "Outreach board: Asking Kirana store, 0:45 left."),
        ("h4-countdown", "H4 Kirana store phone (Hindi) with the 45 s countdown; cursor parked, nothing touched."),
        ("h4-timed-out", "Countdown reached 0: 'Kirana store: no reply - timed out'; RWA office is asked. REAL 45 s wait, not sped up (about 44 s of the clip)."),
        ("h5-tab", "H5 RWA office phone (English) opened."),
        ("s06-end", "'Yes, I'll do it' pressed; 'You're live for riders 12:00-17:00'; coverage 50% -> 90.9%; Run summary; Area D still open."),
    ]),
    "03": (m, [
        ("s03-start", "Same session as S05/S06. Still."),
        ("jumped", "Jump to 14:00 tomorrow: clock Thu 21 May 14:00 (scenario day)."),
        ("hindi", "UI switched to Hindi (whole room)."),
        ("mic-down", "Hold the mic (Hindi UI) - the synthetic rider question starts (Chromium fake microphone, Polly Kajal hi-IN)."),
        ("mic-up", "Mic released."),
        ("transcript", "Real Amazon Transcribe result on screen: Suna: " + str(voice.get("transcript")) + " (Hindi)."),
        ("answer-card", "Answer card: RWA office H5, 261 m, about 2 min by scooter, route on the map."),
        ("audio-start", "SYNC POINT: the app's spoken Hindi answer starts here (see 03-rider-voice-answer.mp3, 8.5 s)."),
        ("s03-end", "End of clip."),
    ]),
    "04": (M["host"], [
        ("form", "/host at 80% zoom: sample map, empty form. Still."),
        ("named", "Name typed: Sharma Chai Stall."),
        ("offers", "Shade ticked next to Water."),
        ("pin-address", "Pin dragged along the street; address appears from Amazon Location Places."),
        ("validation", "Language chip set to Hindi; Register pressed without consent: red validation, nothing saved."),
        ("registered", "Consent ticked, Register: 'Registered as H7', greyed 'Not confirmed today'."),
        ("freshness-card", "Demo: send the morning check now: the Hindi 'still serving water today?' card appears."),
        ("live", "Yes (हाँ) pressed: Live 09:00-20:00; point goes live for riders."),
    ]),
    "07": (M["trust"], [
        ("fresh-session", "Fresh demo session, evening state, 50%. Still."),
        ("answer-H1", "Clock jumped to 14:00, Area A, Water -> Chai stall H1, 74 m."),
        ("report-1", "Problem -> No water: 'Thanks, reported (1 of 2 ...)'."),
        ("report-2", "Second No water: 'After 2 problem reports this point is paused and the coordinator has been told.'"),
        ("queue-27", "Coordinator Problem reports lists H1 Paused; Water access 50% -> 27.3%; Area A dots hollow."),
        ("reactivated", "Reactivate pressed: back to 50%."),
    ]),
    "10": (M["landing"], [
        ("hero", "Landing hero (light): headline, three CTAs, real rider screen over the stylised East Delhi zone. Still 5 s."),
        ("mission", "Why Pyau illustration."), ("problem", "The problem: three source-linked figures."),
        ("what", "What is a pyau? (clay pot)."), ("how", "How it works: three real screenshots."),
        ("results", "Sample scenario: dots fill 22 -> 40 (animation plays on scroll into view)."),
        ("trust", "Trust and privacy."), ("aws", "Built on AWS."),
        ("back-to-top", "Scroll back to the hero."), ("end", "Cursor rests on 'Try the live demo' (not clicked)."),
    ]),
    "08": (M["engineering"], [
        ("top", "Engineering page top."),
        ("architecture-rider", "Architecture diagram, 'A rider asks' path animated (official AWS icons)."),
        ("architecture-run", "'The evening coverage run' clicked: second path animated."),
        ("flows", "Three flows."), ("execution", "A real execution (graph drawn from the real run history)."),
        ("receipts", "Real tool receipts."), ("end", "End."),
    ]),
    "09": (M["aws"], [
        ("execution-header", "Step Functions execution for the S05/S06 run id: Succeeded, 17 transitions. Account id masked."),
        ("graph", "Graph view: OutreachPerGap map state, MarkTimedOut and PublishPoint visited."),
        ("step-MarkTimedOut", "MarkTimedOut step selected (timeout branch)."),
        ("step-PublishPoint", "PublishPoint step selected (accept branch)."),
        ("events", "Event view table (TaskTimedOut, TaskSucceeded, ...)."),
        ("insights-open", "CloudWatch Logs Insights with the query pre-filled and filtered by the run id."),
        ("query-done", "Result rows: ExecutionStarted, TaskSucceeded, TaskTimedOut, TaskSucceeded, ExecutionSucceeded."),
        ("end", "End."),
    ]),
}

FOOT.mkdir(parents=True, exist_ok=True)
EVID.mkdir(parents=True, exist_ok=True)
for f in FILES.values():
    shutil.copy2(OUTD / f, FOOT / f)
audio_start = ct("03", m, "audio-start")
shutil.copy2(OUTD / "03-rider-voice-answer.mp3", FOOT / "03-rider-voice-answer.mp3")
(FOOT / "03-rider-voice-answer.json").write_text(json.dumps({
    "file": "03-rider-voice-answer.mp3", "durationSeconds": dur(OUTD / "03-rider-voice-answer.mp3"),
    "startsAtSecondsInClip": audio_start, "clip": "03-rider-voice.mp4", "timingToleranceSeconds": 0.2,
    "language": "hi", "answerText": voice.get("answer"), "transcriptShownOnScreen": voice.get("transcript"),
    "host": {"id": voice["host"]["id"], "label": voice["host"]["label"], "straightLineM": voice["host"]["straightLineM"]},
    "routeDistanceM": voice["route"]["distanceM"], "routeDurationS": voice["route"]["durationS"],
    "note": "The exact Amazon Polly mp3 the API returned for this answer. Playwright video has no audio; start this file at startsAtSecondsInClip.",
}, ensure_ascii=False, indent=1), encoding="utf8")

facts = json.loads((ROOT / "docs/evidence/facts.json").read_text(encoding="utf8"))
assert facts["verifiedFromRunId"] == run_id, "facts.json is not from the video run: run scripts/export_evidence.py first"
(EVID / "facts.json").write_text(json.dumps(facts, ensure_ascii=False, indent=1), encoding="utf8")

STAMP = {"05": "main", "06": "main", "03": "main", "04": "host", "07": "trust", "10": "landing", "08": "engineering", "09": "aws"}
LIM = {
    "05": "Real run. Video clock vs cue marks +-0.3 s. Wait for the planner is real (not shortened).",
    "06": "Real 45 s timeout runs in full inside the clip; nothing sped up or cut.",
    "03": "SYNTHETIC rider voice (Amazon Polly Kajal hi-IN played through Chromium's fake microphone); transcript is real Amazon Transcribe, answer and Hindi audio are the app's real output. Playwright video has no audio: use 03-rider-voice-answer.mp3 from startsAtSecondsInClip.",
    "04": "Separate fresh demo session. Browser zoom emulated at 80%. Session id is the short id shown on screen. Host language set to Hindi, so the freshness card is Hindi.",
    "07": "Separate fresh demo session (id not captured; no New session click was needed).",
    "10": "Landing page, light theme, English. Not a demo-room shot.",
    "08": "Engineering page, light theme. The Step Functions graph on this page is drawn from the real execution history, not a console screenshot (S09 is the real console).",
    "09": "Real AWS console through a temporary read-only federated session (Step Functions + CloudWatch Logs, 1 h, expired). The account id is masked ON SCREEN by rewriting 12-digit numbers to asterisks; the page is a 1536x864 capture scaled to 1920x1080 (125%). A loading gap between Step Functions and Logs Insights was cut out.",
}
caps = []
for shot, name in FILES.items():
    sid_val = sid_ref if shot in ("05", "06", "03", "09") else ("c1626e (on-screen short id)" if shot == "04" else "n/a")
    caps.append({
        "shotId": "S" + shot, "file": "footage/" + name, "runId": run_id if shot in ("05", "06", "03", "09") else None,
        "sessionId": sid_val, "executionName": run_id if shot in ("05", "06", "09") else None,
        "capturedAt": iso(STAMP[shot]), "sourceIn": 0, "sourceOut": dur(FOOT / name), "limitations": LIM[shot],
    })
(EVID / "evidence.json").write_text(json.dumps({"captures": caps}, ensure_ascii=False, indent=1), encoding="utf8")

lines = ["# Cue sheet: what happens at which second", "",
         f"Deployed app: {APP} - clips recorded by Playwright (Chromium, 1920x1080, light mode) on {iso('main')[:10]}.",
         f"Run id of S05/S06/S03/S09: `{run_id}` (execution name = run id, state machine pyau-CoverageRun, ap-south-1).",
         "Times are seconds into each cut clip; accuracy +-0.3 s (video clock corrected by 0.58 s against the page clock). No audio in any clip: only the synthetic S03 voice and its answer exist as audio, in `03-rider-voice-answer.mp3`.", ""]
for shot, name in FILES.items():
    src, items = CUES[shot]
    lines += [f"## S{shot} `{name}` ({dur(FOOT / name)} s)", ""]
    for key, text in items:
        lines.append(f"- **{ct(shot, src, key):>5.1f} s** {text}")
    if shot == "03":
        lines += ["", f"Audio sync: start `03-rider-voice-answer.mp3` at **{audio_start} s** (+-0.2). On-screen Hindi answer: {voice['answer']['hi']}"]
        lines += ["", "Subtitle for the edit (exact app text): `en` = " + voice["answer"]["en"]]
    lines.append("")
lines += ["## Screenshots", "", "`screenshot-proposal.png` and `screenshot-coverage-91.png` (1920x1080, no cursor) come from the last release-gate loop on the deployed URL (a different run from the S05/S06 footage, same scenario and numbers: 50% -> 90.9%); they are for callout alignment only.", ""]
lines += ["## Synthetic voice", "", "S03 is the only clip with a synthetic rider voice (Polly Kajal through a fake microphone). Everything else on screen is the app's real output on the deployed stack with sample-scenario data.", ""]
(EVID / "cues.md").write_text("\n".join(lines), encoding="utf8")
print("packaged", len(FILES), "clips; audio start", audio_start)
