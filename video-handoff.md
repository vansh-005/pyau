# App → video handoff

Two sibling workspaces, two Claude Code sessions: `pyau` (this app) and `pyau-video` (Remotion). The app agent never edits the video project; the video agent never edits the app, AWS resources, numbers or claims. Vansh carries files between them.

## What the app agent owes the video

1. **A stable, recordable `/demo` room** (frontend.md) on the deployed URL, with New session, clock jump, demo timers and readable text at 1920×1080.
2. **A capture guide** after each milestone: the exact clicks for each shot, the expected on-screen values, and how long each step takes in reality.
3. **Evidence exports** in `docs/evidence/` (sanitized, no account IDs, no tokens, no emails):
   - `facts.json` — values read from a real deployed run (template below).
   - `evidence.json` — one entry per capture: shotId, file, runId, sessionId, executionArn suffix (no account ID), capturedAt, source in/out seconds, limitations.
   - Two clean 1920×1080 screenshots of the demo room: after the proposal, and after coverage reaches 91%.
4. **Changed facts**: if a feature is cut or a number changes, update `facts.json` and tell Vansh in one line so the narration changes too.

## Footage (Vansh records; 1920×1080, 30 fps, H.264; 2–3 s handles)

| Video slot | File name | Must show | Audio |
|---|---|---|---|
| S03 | `03-rider-voice.mp4` | rider panel: hold mic, Hindi question, transcript, **spoken Hindi answer**, route line, answer card (P0b fallback: tap **पानी** instead of mic) | **system audio ON** |
| S04 | `04-host-join.mp4` | host registers (type, offers, hours, pin → address, standby/listed, consent) then a freshness card answered "Yes" | off |
| S05 | `05-plan-approve.mp4` | heat curve + 50% coverage → Run coverage plan → real receipts → proposal with Hindi message and red gap D → tick → Approve outreach | off |
| S06 | `06-outreach.mp4` | H4 countdown → timed out → switch to H5 → हाँ → point live on rider map → coverage 50% → 91%, D still red | off |
| S07 | `07-trust.mp4` | fresh session: two "No water" reports → point paused → coordinator problem queue | off |
| S09 | `09-aws-proof.mp4` | Step Functions execution graph (timeout + accept branches) and event history for the **same run ID** as S05/S06; CloudWatch log line with that run ID | off |

Alternative: one continuous raw capture of S05–S06 plus a cue sheet (in/out per slot). Don't speed up or cut anything yourself; the video agent marks shortened waits on screen.

## facts.json template

```json
{
  "verifiedFromRunId": "<run id>",
  "sessionMode": "demo",
  "scenarioDate": "2026-05-21",
  "zone": "East Delhi sample zone",
  "heatWindow": ["13:00", "16:00"],
  "requestsInWindow": 44,
  "clusterB": {"requests": 18},
  "coverageBefore": {"covered": 22, "total": 44, "percent": 50.0},
  "coverageAfter": {"covered": 40, "total": 44, "percent": 90.9},
  "unresolved": [{"clusterId": "D", "requests": 4}],
  "askTimeoutSecondsDemo": 45,
  "bedrockModelId": "<verified>",
  "awsServices": ["Amplify Hosting", "Amazon Location Service", "API Gateway", "AWS Lambda", "AWS Step Functions", "Amazon Bedrock", "Amazon DynamoDB", "Amazon S3", "Amazon Polly", "Amazon Transcribe", "Amazon EventBridge Scheduler", "Amazon Cognito", "Amazon CloudWatch"],
  "openSource": ["Strands Agents SDK"],
  "appUrl": "<verified https url>"
}
```

List only services the deployed app actually uses at capture time. Remove Transcribe if the voice question was cut, Scheduler if not wired, Cedar unless implemented.

## Checkpoints

- **A (now):** shot IDs, palette and story agreed — this file + the video pack.
- **B:** first real `/demo` proposal works → record a rough S05 so the video agent can test crops.
- **C:** outreach with timeout + accept works → record S06 and S09 (locks the key scenes).
- **D:** rider voice answer works → record S03; then S04, S07.
- **E:** freeze claims; export facts/evidence; video agent does the final narration and render.
