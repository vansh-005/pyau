# Pyau — Claude Code project instructions

## Mission and priority

Build Pyau: community water/shade points for delivery riders in the heat, kept open by an AI coverage agent and an AWS Step Functions outreach workflow. Deliver the working app on AWS, the `/demo` room, tests, evidence and docs. Read `AGENTS.md` first — it is the shared policy; this file adds working context. `agent.md` is the product's runtime agent, not you.

At pack creation nothing is implemented. Inspect the repo and the progress log in tasks.md before reporting status.

## Time reality

The event ends 11 Oct 2026. Work in this order and keep a deployable state at all times:
1. T00–T03 : verified Bedrock/Polly access, domain + fixture tests, a deployed map showing seeded points.
2. T04–T08 : rider find + Polly answer, coverage report, agent run with receipts, approval, Step Functions outreach with timeout and accept, demo room.
3. T09–T12 : voice question, host registration/freshness, trust loop, evidence, release gates.
4. Then stop adding features. Help Vansh capture footage (demo.md) and export evidence (video-handoff.md).

If something blocks for more than ~45 minutes, write the blocker in tasks.md, take the documented fallback, and move on.

## First-session workflow

1. Read AGENTS.md, README.md, product.md, tasks.md, then the specs for the area you're implementing.
2. `git status`; preserve user changes.
3. T00: `aws sts get-caller-identity`, region, one Bedrock tool-use round trip with the candidate model (Strands minimal agent with one tool), one Polly `hi-IN` synthesis, and (P0b) one Transcribe streaming `hi-IN` call. Record the working model ID/profile, SDK versions and voice in decisions.md.
4. `python scripts/verify_fixture.py` — must pass. Port its logic into `packages/domain` with tests that assert the same numbers.
5. Implement the next unfinished task in order; verify; update tasks.md.

If cloud access is blocked, say exactly what is blocked and continue local domain/UI work. Never silently swap in a non-AWS model provider.

## The loop that must work (fixture numbers)

Evening before the scenario day, coverage in the heat window 13:00–16:00 is 22/44 (50.0%). The agent finds clusters B (18) and D (4) uncovered; candidates B → [H4 Kirana store, H5 RWA office], D → none. Coordinator approves. Step Functions asks H4 → 45 s demo timeout → asks H5 → H5 accepts 12:00–17:00 → H5 published → coverage 40/44 (90.9%). D stays unresolved with a recommendation. At 14:00, a rider in cluster B asks for water → H5, ≈176 m, Hindi audio answer, scooter route.

## Technical choices

- Frontend: React + TS + Vite + Tailwind + MapLibre GL; Amplify Hosting; Amazon Location style URL + restricted API key.
- Backend: Python 3.12 Lambdas; Pydantic domain shared by API, agent and workflow Lambdas.
- Agent: Strands Agents + Bedrock, Lambda container image via CDK `DockerImageFunction` (Strands + deps are too large for a comfortable zip; plan for the container from day one).
- Orchestration: one Step Functions Standard state machine `CoverageRun` (architecture.md), defined in CDK; task tokens for approval and each host ask.
- Data: one DynamoDB table + GSI1 (host inbox) + GSI2 (zone runs); S3 bucket for forecast snapshots, Polly audio cache, host photos.
- Auth: Cognito user pool (groups `coordinator`, `host`); HMAC-signed demo-session tokens; riders anonymous.
- Voice: Polly `hi-IN` answer from a fixed template (P0). Transcribe streaming `hi-IN` from a 16 kHz PCM clip (P0b).
- IaC: TypeScript CDK, single stack `PyauStack`, region `ap-south-1` unless T00 says otherwise for Bedrock.

## Boundaries to enforce in code

- The agent cannot send, approve, add hosts, reorder candidates (P0), alter policy or compute coverage. `submit_proposal` validates everything (agent.md).
- Approval checks hash, revision and that hosts/forecast/policy haven't changed; otherwise `STALE_INPUT`.
- Every external effect is idempotent: execution name = runId, ask ID = `runId:clusterId:hostId`, conditional status transitions, deterministic availability IDs.
- Task tokens never leave the server.
- Demo clock and demo timers exist only inside demo sessions; live sessions reject them.
- A host acceptance is a host promise — label it "Host confirmed", never "verified".
- Missing forecast → `INSUFFICIENT_DATA`. Below threshold ≠ safe.
- Rider location → geohash-7 only in storage. No rider accounts or phone numbers.
- Tool receipts, not chain-of-thought. Never display hidden reasoning.

## UI behaviour

Follow frontend.md. The `/demo` room is the main recording surface: rider phone, coordinator centre, host phone, one 1920×1080 screen, all text legible. Real states only — no timer-driven fake progress except the real ask countdown (derived from the ask's `createdAt` + timeout). Coverage number changes only when the API returns a recomputed value.

## Commands and environment

Only `python scripts/verify_fixture.py` exists at pack creation. Commands in deployment.md are targets to implement. Inspect manifests before running scripts; add missing scripts and document them. Use the configured AWS profile locally; Lambdas use IAM roles. Give Vansh PowerShell commands.

## Git

New repo `pyau` (public before submission). Commit early and often with descriptive messages — the history is evidence that work happened during the event. Follow Vansh's instructions on commit attribution.

## Verification and handoff

Use testing.md. Keep the progress log current. Before a context reset or session end, leave enough state in tasks.md and decisions.md to resume without guessing. When a demo shot becomes recordable, tell Vansh the shot ID and the exact capture steps (demo.md, video-handoff.md).
