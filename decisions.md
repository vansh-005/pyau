# Decision record

Status: planning finalized on 10 Oct 2026 (IST, ~00:30); application not built. HeatOps (started 9 Oct) is set aside; its planning style is reused, none of its code.

| Decision | Reason | Revisit only if |
|---|---|---|
| Pyau, delivery riders, Track 02 Heat and Water | A specific person in a painful moment; help exists but is invisible; sourced numbers; strong Indian identity | Vansh changes the problem |
| Rider is anonymous; coordinator approves; hosts volunteer | No friction for the person in the heat; human oversight where the agent acts | Real users say otherwise |
| The agent plans and writes; code computes and ranks | Numbers judges can trust; agent value is prioritisation, messages, recommendations | — |
| Step Functions (task tokens + timeouts) instead of SQS + leases | Durable waits for humans at no compute cost; the graph is a visible AWS proof shot | A blocking limitation appears |
| Candidate order fixed by code in P0 | Reproducible demo; agent may drop with reason | After the demo works, allow reordering with validation |
| Fixed-template Polly answer for riders, not model text | Fast, predictable, reviewable Hindi | — |
| Transcribe voice question is P0b | High demo value, higher integration risk | Cut first if T09 overruns |
| `/demo` room with isolated sessions, no sign-up | Judges need value in 2 minutes; one screen recording covers the loop | — |
| Synthetic sample scenario on a real map | October is off-season; repeatable demo; honest badge | A verified archived hot-day forecast is added (P1) |
| Coverage radius 500 m, threshold 42 °C apparent | Illustrative demo policy, labelled unvalidated | Real coordinators set policy |
| No SMS/WhatsApp | DLT registration / third-party dependence | — |

## Confirm during T00

- AWS account/region, credits, Bedrock model/profile with tool use: **unverified**.
- Polly `Kajal` neural `hi-IN` in the chosen region: **unverified** (fallback `Aditi` standard).
- Transcribe streaming `hi-IN` in `ap-south-1`: **unverified**.
- Amazon Location `Scooter` routes quality in Delhi: **unverified** (fallback `Car` or straight-line with "approximate" label).
- Exact submission deadline in the event form: **unverified**.

## Known limits

All hosts, requests and temperatures in the hero scenario are invented; coordinates are real places so the map is real. No rider, host or coordinator has validated the workflow, the timeout length, or the 500 m radius. A host's "yes" is a promise, not verified water. Coverage is straight-line distance. Zones are small (≤ 500 hosts). Hindi strings need native review.

## T00 verification results (10 Oct 2026)

| Item | Result |
|---|---|
| Identity / region | IAM user credentials (default CLI profile), `ap-south-1`. Not named `pyau`; `.env.example` AWS_PROFILE=pyau is optional. |
| Bedrock tool use (Strands 1.59.0) | **Verified: `global.amazon.nova-2-lite-v1:0`** called the tool and returned 22/44 via `BedrockModel` in `ap-south-1`. |
| Bedrock Anthropic models | **Blocked**: `claude-sonnet-4-6 / 4-5 / haiku-4-5` -> "Model use case details have not been submitted" (Anthropic use-case form); `claude-*-5*` -> "not available for this account"; `sonnet-4` legacy. Fallback: Nova 2 Lite (AWS first-party). Revisit if Vansh submits the form in the Bedrock console. |
| Polly hi-IN | **Verified** in `ap-south-1`: `Kajal` neural and `Aditi` standard both synthesise. Use Kajal/neural. |
| Transcribe streaming hi-IN | **Verified** in `ap-south-1` with `amazon-transcribe` 0.6.4: Polly 16 kHz PCM clip -> "भैया पानी कहाँ मिलेगा?". |
| Location API key | Not created yet; `location:ListKeys` works (0 keys). Created by CDK in T02. |
| AWS Budget | `DescribeBudgets` returns none. Needs Vansh's go-ahead (see tasks.md). |
| Versions | strands-agents 1.59.0, boto3/botocore 1.43.111, amazon-transcribe 0.6.4, pydantic 2.14.0, Python 3.12.6, Node 24.19, CDK 2.1141 |

## Vansh decisions (10 Oct 2026)
- CDK bootstrap + routine `PyauStack` deploys to ap-south-1 pre-approved; ask before deleting resources or touching anything outside the stack.
- No AWS Budget; rely on in-app guardrails (1 active run/session, 40 agent runs/day, 7-day logs, 48 h session TTL).
- Agent model: `global.amazon.nova-2-lite-v1:0`, config value `BEDROCK_MODEL_ID`; agent IAM covers the global inference profile and destination regions. In the first T06 run, check Nova's Hindi (Devanagari, passes submit_proposal) and report before working around weakness.
- Demo-token HMAC secret lives in Secrets Manager (CDK cannot create SSM SecureString); small monthly cost.

## T06 notes
- Agent model verified in a real run: `global.amazon.nova-2-lite-v1:0`. Hindi messages: acceptable for short requests (Devanagari, correct प्याऊ after prompt guidance), plain register; all model-written messages are shown to the coordinator before sending and need native review.
- Prompt policy: askWindow = heat window widened by 1 h each side, clipped to host hours (so the fixture's 12:00-17:00 host acceptance is consistent). Code validates that askWindow contains the heat window.
- Rider requests logged from the rider screen are stored separately (`RIDERREQ`), not in the coverage denominator, so the sample scenario's 44 stays exact.

## Overnight decisions (10 Oct 2026)
- Demo roles stay on signed demo tokens (all roles inside one session). Cognito sign-in screens were not built; the pool/groups and a JWT-protected `/auth/whoami` exist.
- EventBridge Scheduler rules exist for 07:30 and 18:30 IST but act only on live zones (`PUBLIC#LIVEZONES`), none of which exist; demos use the manual trigger. Claimed as "wired", never as "ran".
- Route throttling is per route across all clients (API Gateway), so limits are set above single-demo needs but below runaway levels.
- Account Lambda concurrency limit is 10 (new-account default; the quota API refuses requests under the 1000 default). Normal demo use stays well under; a burst of >10 parallel calls returns 503.
- Cap override item `PUBLIC#CAP#CONFIG` lets an operator lower/raise the agent-run and session caps without a redeploy.

## UI v2 decisions (10 Oct 2026)
- Visual system: near-white canvas, water blue as the single accent, amber and red for status only, Inter, Lucide icons. Pill chips are limited to the two required header chips (scenario badge, demo timers).
- Language: one language at a time; English default. Host phone follows the host's own language; the coordinator sees each host message in that host's language (labelled).
- API message shape change (required by the per-host language rule): `messages[hostId]` carries `lang` and `text` and keeps `hi`/`en` for the matching language only. Endpoints, run flow and numbers are unchanged.
- Area names are display-only labels from the fixture (`clusterLabels`), derived from Amazon Location Places; ids A-D are unchanged.
- The "runs automatically every evening" line says live zones, not this demo zone (see tasks.md).
- Content pages state only verified facts; each statistic links to its source; no testimonials, user counts, partner logos or impact claims.

## UI v3 decisions (10 Oct 2026)
- Theme: CSS variables, system default, user toggle persisted in localStorage; dark map uses the Amazon Location Standard Dark style. Every text pair is >= 4.5:1 in both themes (`scripts/check_contrast.py`).
- Palette and type: warm canvas, water blue, clay terracotta and heat amber; Fraunces (display, bundled) with Inter. Clay was darkened to `#A44A27` because the lighter clay failed 4.5:1 on its soft tint.
- Landing visuals are our own: inline-SVG street scene and clay pot, and a stylised map of the sample zone at real coordinates. The phone and the three role cards use real screenshots of the deployed app (sample data), not mock-ups. No photos of people, testimonials, user counts or partner logos.
- The hackathon credit is only in the footer, with the AWS icons credit line.
- AWS icons: the 14 official Architecture Icons (64 px SVGs) are used unmodified (only scaled). AWS's usage page gives minimal rules; we keep native aspect, no recolouring, and add the credit line. Only deployed services are drawn; Cognito and EventBridge are shown dashed because they are deployed but not exercised in the demo.
- The Step Functions graph stays a drawing from the real execution history: the console view needs an AWS sign-in, so a real console screenshot is a recording task (S09), and the page says so.
- Footage is recorded in light theme unless a shot says otherwise (RECORDING.md).
