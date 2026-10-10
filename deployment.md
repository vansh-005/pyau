# Deployment and operating runbook

Target workflow. Package scripts and the CDK stack don't exist yet; build them in T01–T02, then keep this file matching reality.

## Prerequisites (Windows / PowerShell)

- Node 20+ and npm, Python 3.12, AWS CLI v2, AWS CDK v2 (`npm i -g aws-cdk` or use `npx cdk`), Docker Desktop (or Finch) running — the agent Lambda is a container image.
- `aws configure --profile pyau` (or reuse an existing profile), then:

```powershell
$env:AWS_PROFILE = "pyau"
$env:AWS_REGION  = "ap-south-1"
aws sts get-caller-identity   # check the account; never paste the full ID into public logs
npx cdk bootstrap             # once per account/region
```

- Bedrock: confirm the chosen model/profile is enabled for the account and works with a tool call (T00). Cross-region inference profiles need permissions for their destination regions.
- Budget alert (AWS Budgets) before deploying anything that calls Bedrock.

## Target commands

| Command | Responsibility |
|---|---|
| `python scripts/verify_fixture.py` | Exists now: fixture arithmetic |
| `npm ci` | Install locked web + infra deps |
| `python -m pip install -r requirements-dev.txt` | Domain/API/test deps |
| `python -m pytest` | Domain + contract tests |
| `npm run dev --workspace apps/web` | Local UI against the deployed API |
| `npm run infra:synth` / `npm run infra:deploy` | CDK synth / deploy `PyauStack` |
| `npm run build --workspace apps/web` | Build with public config only |
| `python scripts/smoke_cloud.py` | Create a demo session and run the full loop against the deployed API |
| `python scripts/export_evidence.py <runId>` | Write sanitized facts/evidence into `docs/evidence/` |
| `python scripts/cleanup_demo.py` | Delete expired demo sessions (TTL also does this eventually) |

## Configuration

Backend (CDK sets these on Lambdas): `TABLE_NAME`, `BUCKET_NAME`, `STATE_MACHINE_ARN`, `BEDROCK_REGION`, `BEDROCK_MODEL_ID`, `POLLY_VOICE_ID`, `POLLY_ENGINE`, `TRANSCRIBE_LANGUAGE=hi-IN`, `LOCATION_ROUTE_TRAVEL_MODE=Scooter`, `DEMO_TOKEN_SECRET_PARAM` (SSM SecureString name, not the secret), `MAX_AGENT_SECONDS=120`, `MAX_TOOL_CALLS=12`, `DEMO_AGENT_RUNS_PER_DAY=40`, `LOG_LEVEL`.

Frontend public config (Vite): `VITE_API_BASE_URL`, `VITE_AWS_REGION`, `VITE_LOCATION_MAP_STYLE` (e.g. `Standard`), `VITE_LOCATION_API_KEY` (maps-only, referrer-restricted), `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`, `VITE_AUTH_REDIRECT_URI`. Nothing else in the browser.

No long-lived AWS keys anywhere. Lambdas use IAM roles with least privilege:
- API Lambda: table read/write, S3 (audio cache, photo presign), `geo-places:ReverseGeocode`, `geo-routes:CalculateRoutes`, `polly:SynthesizeSpeech`, `transcribe:StartStreamTranscription`, `states:StartExecution|SendTaskSuccess|SendTaskFailure` on the one state machine.
- Agent Lambda: table read + proposal/event writes, S3 forecast read, `bedrock:InvokeModel*` / `bedrock:Converse*` on the chosen model/profile only.
- Workflow Lambdas: table read/write; nothing else.
- Step Functions role: invoke those Lambdas only.

## Amazon Location

Create (via CDK) an API key restricted to map style/tile actions and to the Amplify domain + `http://localhost:5173`. MapLibre style URL: `https://maps.geo.<region>.amazonaws.com/v2/styles/<Style>/descriptor?key=<key>` — verify the exact URL pattern against the current Amazon Location docs for the installed version. Places and Routes are called server-side with IAM, never with the browser key.

## Amplify Hosting

Prefer connecting the GitHub repo (SPA rewrite `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|mp3)$)([^.]+$)/>` → `/index.html`). A manual zip deploy is acceptable if repo connection is slow; don't claim CI/CD unless configured. Record the HTTPS URL only after opening it successfully.

## Smoke run

`python scripts/smoke_cloud.py` → creates a session, runs the plan, approves, waits out H4, accepts H5, checks 90.9%, asks as a rider, checks H5. Then open `/demo` signed out in an incognito window and do it by hand.

## Recovery

- Bedrock denied/throttled: check model access, IAM, region/profile; rerun the T00 smoke call. Never silently change provider.
- Execution stuck in AwaitApproval/AskHost: that's by design until a response or timeout; check the ask/proposal record has the token and that respond/approve calls `SendTask*`.
- Approval `STALE_INPUT`: replan (new run). Never remove version checks to rescue a demo.
- Map blank: API key restrictions/referrer, style URL, region.
- Polly voice error: switch `POLLY_VOICE_ID`/`POLLY_ENGINE` to the T00 fallback and record it.

## Teardown (after judging)

Export evidence first. Disable schedules, `npx cdk destroy`, delete the ECR images and Amplify app if not retained, check leftover log groups and S3 objects. Don't touch unrelated stacks (e.g. Recollect).

---

## As built (10 Oct 2026) — commands that exist

| Command | Responsibility |
|---|---|
| `python scripts/verify_fixture.py` · `python -m pytest` | fixture arithmetic · domain/validation tests (37) |
| `npm ci` | install locked web + infra deps |
| `npm run infra:deploy` | stage the zip bundle (`scripts/stage_backend.py`, Linux wheels), deploy `PyauStack`, write `infra/outputs.json` |
| `npm run web:deploy` (`python scripts/deploy_web.py`) | build the web app with the stack's public config and upload to Amplify (manual deploy; no CI/CD claim) |
| `python scripts/smoke_cloud.py` | health, auth, session, map, coverage, rider answer |
| `python scripts/smoke_loop.py` | full real loop on the deployed stack |
| `python scripts/smoke_host.py` · `smoke_trust.py` · `smoke_guardrails.py` · `test_voice.py` | host + freshness, trust loop, replay/caps/throttling, voice |
| `python scripts/gate_authority.py` · `node scripts/visual_gate.mjs <url>` · `python scripts/gate_loops.py 3` | release gates |
| `python scripts/export_evidence.py <runId>` · `python scripts/publish_replay.py <sessionId> <runId> <id>` | sanitized evidence · public replay |

Config in the Lambdas is set by CDK (`TABLE_NAME`, `BUCKET_NAME`, `STATE_MACHINE_ARN`, `BEDROCK_REGION`, `BEDROCK_MODEL_ID`, `DEMO_TOKEN_SECRET_ARN` (a Secrets Manager secret, not SSM), `POLLY_*`, `MAX_*`). The Location API key is created by the stack and read by a custom resource into `infra/outputs.json` (public, referrer-restricted, maps only); Places and Routes are called server-side with IAM.
