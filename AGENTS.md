# Instructions for the coding assistant

## Mission

Build and deploy Pyau on AWS before the hackathon deadline (11 Oct 2026). Priority order: (1) the end-to-end loop works on the deployed URL, (2) it records well in the `/demo` room, (3) the numbers are exact and honest, (4) polish, (5) extra features. One feature that runs beats five that almost do.

This is a project instruction file. `agent.md` describes the product's runtime AI agent; do not confuse the two.

## Read order and authority

README.md → product.md → frontend.md → architecture.md → contracts.md → agent.md → demo.md → video-handoff.md → tasks.md. Explicit instructions from Vansh override these files; record resulting changes in decisions.md and update every affected spec together.

## Repository layout

- `apps/web/` — React + Vite + TS + Tailwind PWA, MapLibre, i18n (`hi.json`, `en.json`), demo room.
- `services/api/` — API Lambda handlers, auth mapping (Cognito groups, demo tokens), validation.
- `services/agent/` — Strands agent, typed tools, prompt, budget hooks; Dockerfile for the Lambda container image.
- `services/workflow/` — Step Functions task Lambdas (PickNextHost, AskHost, MarkTimedOut, PublishPoint, MarkUnresolved, Summarize), freshness job.
- `packages/domain/` — Pydantic models, coverage, clustering, candidate ranking, heat window, policy, clock abstraction. **Pure Python, no AWS imports.**
- `infra/` — TypeScript CDK (one stack, `PyauStack`), state machine definition, outputs.
- `fixtures/` — the supplied fixture (do not edit numbers casually; rerun the checker if you do).
- `tests/` — domain tests (port the fixture checker), contract tests, a deployed smoke test.
- `scripts/` — `verify_fixture.py` (supplied), seed, smoke, cleanup, evidence export.
- `docs/evidence/` — sanitized facts.json, evidence.json, screenshots, run IDs, limitations.

## Build discipline

- Start with T00 (identity, region, Bedrock tool-use smoke test, Polly/Transcribe Hindi check). Never build on an untested model assumption.
- Ship the smallest deployed vertical slice early (T03): a URL that shows the map and seeded points from DynamoDB. Then grow it.
- Pin dependencies; commit lockfiles; `.env.example` with placeholders only.
- Pure domain functions first, adapters second. The coverage number used by the API, the agent tools and the tests is one function.
- **No metric calculated by an LLM.** No mocked tool receipts, host taps, approvals or Step Functions events reported as real. Fixture-backed UI is allowed while wiring screens but must be labelled and removed from live paths.
- No secrets, account IDs, tokens or task tokens in commits, logs, browser bundles, screenshots or evidence.
- The user works on **Windows / PowerShell**: give PowerShell commands; avoid bash-only env syntax in user instructions; Docker Desktop (or Finch) is needed for the agent container image.

## Hackathon rules that bind the code

- Project work must happen inside the event window. Create a **new repository today** with real, frequent commits; history must match the event dates. Do not copy code from earlier projects (Recollect, AlgoSpeak, etc.). Ideas and personal know-how are fine.
- Credit every library, API and asset; list the actual AI tools used in the writeup.
- The video must show AWS in use; features that only appear in the writeup don't count — so only claim what the deployed app does.

## Scope control

No Kubernetes, OpenSearch, vector store, RAG, WebSockets, SQS, multi-agent swarm, chat-first UI, SMS/WhatsApp, or new service without a blocked acceptance criterion. One agent, small deterministic tools, one state machine. Don't make visual assets beyond the app's own UI — the video workspace owns motion design.

## Completion and evidence

Tick a task only after its acceptance check passes. For each milestone append to the progress log in tasks.md: time, task IDs, commands/checks, run IDs/execution names, screenshots, failures, next step. Don't claim deployment from `cdk synth`. Before declaring ready, pass the release gates in testing.md (three consecutive full `/demo` loops on the deployed URL).

Do not publish, submit, email or post anything on Vansh's behalf unless he says so. Do prepare everything (repo README, writeup draft, evidence) so he can.
