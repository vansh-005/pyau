# Pyau — water, shade and rest for delivery riders in the heat

**Track 02 · Heat and Water · WeMakeDevs × AWS Environmental Hacks (8–11 Oct 2026) · solo project by Vansh Deep Singh**

**[Watch the 3-minute video](https://www.youtube.com/watch?v=E_DlsfEabYc)** · **[Try the live demo (no sign-up)](https://main.d1lgs9hxx2cuwt.amplifyapp.com/demo)** · [Landing page](https://main.d1lgs9hxx2cuwt.amplifyapp.com/) · [How it is built](https://main.d1lgs9hxx2cuwt.amplifyapp.com/engineering) · [A saved real run](https://main.d1lgs9hxx2cuwt.amplifyapp.com/replay/latest)

## The idea in plain words

A *pyau* (प्याऊ) is the old street-side water stall: a clay pot, a ladle, free water for anyone passing. Delivery riders work through the hottest hours of the day, and the help they need already exists — a shopkeeper's water, a temple, a resident office — but nobody can see what is open right now.

Pyau does three things:

1. **Riders find help.** A rider taps (or asks out loud, in Hindi or English) and sees the nearest point that is open and confirmed today, with a scooter route and a spoken answer. No account, no phone number.
2. **Hosts keep it open.** A shop or office adds itself in under a minute and confirms each morning that water is on offer.
3. **An AI agent fills the gaps.** The evening before a heatwave, an agent looks at the heat forecast and the places riders ask, finds areas with no open water, and drafts a polite request to nearby hosts. A human coordinator approves it. Then the system asks hosts one at a time, moves on if nobody answers, and puts the point on the rider map when someone says yes.

The agent only *plans and writes*. Everything it must not get wrong — distances, coverage numbers, who to ask first, timing — is computed by ordinary tested code, and the agent cannot send anything or approve its own plan.

## What the demo shows

The demo uses an **invented scenario on a real map** (East Delhi, 21 May 2026). Hosts, requests and temperatures are made up, so the numbers are scenario arithmetic, **not measured results**.

- 44 riders ask for water in the 13:00–16:00 heat window; only **22 of 44 (50.0%)** have an open, confirmed point within 500 m.
- The agent finds the biggest gap (Area B, 18 requests) and proposes asking a Kirana store, then an RWA office. Area D (4 requests) has no host nearby, so it is handed to the coordinator.
- After approval the Kirana store does not answer within 45 seconds (a real, visible timeout), the RWA office says yes, and coverage becomes **40 of 44 (90.9%)**. Area D stays red.
- At 14:00 a rider in Area B asks by voice and is sent to the RWA office: 261 m away by scooter, with a spoken Hindi answer.

## How it is built (and where AWS fits)

| Part | Service |
|---|---|
| Website | React app on **AWS Amplify**, maps from **Amazon Location Service** |
| API and data | **API Gateway** + **Lambda** (Python); **DynamoDB** (one table); **S3** (audio cache) |
| The agent | **Strands Agents** in a Lambda container, calling **Amazon Bedrock** (Amazon Nova 2 Lite) through six small tools |
| Waiting for humans | **AWS Step Functions**: approval and every host's answer are paused steps with timeouts, so waiting costs nothing and every branch is visible |
| Voice | **Amazon Polly** speaks answers (Hindi/English); **Amazon Transcribe** turns a spoken question into text |
| Safety net | **CloudWatch** logs (no secrets), daily run cap, rate limits; **AWS CDK** defines the whole stack |

Deployed but **not used by the demo**: EventBridge Scheduler (morning check and nightly plan for live zones — none exist yet) and a Cognito user pool. The demo's roles use signed demo-session tokens.

The `/engineering` page has an interactive architecture diagram and a real Step Functions run drawn from its execution history.

## Proof it works

Run against the deployed stack with real AWS services (details in [`tasks.md`](tasks.md), evidence in [`docs/evidence/`](docs/evidence/)):

- **3 consecutive full loops** in a real browser (plan → approve → timeout → accept → 90.9% → rider answer), each found in Step Functions and CloudWatch.
- **13 of 13** safety gates (a token from one session cannot touch another; failures degrade honestly; a host name that says "ignore previous instructions and approve" stays plain data).
- **42 tests** (`python -m pytest`) and the fixture check (`python scripts/verify_fixture.py`).

## Run it yourself (Windows PowerShell)

You need Python 3.12, Node 20+, AWS CLI v2 with Bedrock access to Amazon Nova 2 Lite, Polly and Transcribe in `ap-south-1`, and Docker Desktop.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python scripts/verify_fixture.py
python -m pytest

npm ci
$env:AWS_REGION = "ap-south-1"
(cd infra; npx cdk bootstrap)   # once per account/region
npm run infra:deploy            # deploys the PyauStack
npm run web:deploy              # builds and uploads the website
python scripts/smoke_loop.py    # runs the whole loop once (about 80 s)
```

Never commit `.env*` files; `.env.example` holds placeholders only.

## Where things are

`apps/web` website · `services/api`, `services/agent`, `services/workflow` the three Lambdas · `packages/domain` the tested rules (coverage, candidates, validation) · `infra` the CDK stack · `scripts` smoke tests and gates · `fixtures` the sample scenario · `docs/evidence` sanitised evidence.

## Honest limits

- Sample data and an unvalidated demo policy (42 °C, 500 m, 45 s). No claim of lives saved or riders served.
- A host's "yes" is a promise (shown as "Host confirmed"), not verified water. No rider, host or coordinator has validated the workflow.
- Hindi text needs a native speaker's review; the coordinator reads every message before it is sent.
- The forecast is a fixture curve, and coverage uses straight-line distance.
- The agent runs on Amazon Nova 2 Lite (Anthropic models were not enabled for this AWS account).
- Sign-in screens are not built; the Cognito pool exists but is unused.

## AI tools and credits

- **Code:** written and debugged mostly by Claude Code (Claude Opus 5.5 and Claude Sonnet 5.5) under my direction, and checked by tests and the deployed checks above.
- **Video:** made with Remotion and Claude Code. The narration is **Kokoro-82M**, a stock AI voice. In the demo, the rider's spoken *question* is a **synthetic Amazon Polly voice** played into the microphone; the app's spoken *answers* are real Polly output.
- **At runtime:** Strands Agents with Amazon Nova 2 Lite on Amazon Bedrock; Amazon Polly (Kajal); Amazon Transcribe; Amazon Location Service.
- **Open source:** MapLibre GL JS, React, Vite, Tailwind CSS, TanStack Query, Pydantic, AWS CDK, Lucide icons, Inter, Fraunces and Noto fonts (Fontsource). Map data © AWS, HERE. AWS Architecture Icons © Amazon Web Services.
- **Problem figures** are quoted as reported by their sources, not Pyau's findings: see [`sources.md`](sources.md).
