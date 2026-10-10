# Pyau — implementation pack

Track 02: Heat and Water · WeMakeDevs × AWS Environmental Hacks (8–11 Oct 2026)

**Pyau finds delivery riders water, shade and rest in the heat — and an AI agent fills the gaps before the afternoon hits.**

A *pyau* (प्याऊ, also spelled *piao*) is the old Indian street-side water stall: a clay pot, a ladle, free water for anyone passing. They have mostly vanished. Riders now depend on scattered goodwill they can't see on any map. Pyau turns that goodwill into a live, trustworthy network.

This is a planning and implementation handoff. Nothing here is built or deployed yet. Checkboxes in `tasks.md` describe work still to do. The included fixture and `scripts/verify_fixture.py` are executable planning aids only.

## The product in one paragraph

A rider taps or asks in Hindi — *"bhaiya, paani kahan milega?"* — and Pyau answers out loud with the nearest **open, confirmed-today** water point and a two-wheeler route. Shopkeepers, temples, RWAs and households register as hosts in under a minute. Every evening a **coverage agent** reads tomorrow's heat forecast, finds where riders will need water during the hottest hours and no open point exists, and drafts Hindi requests to nearby hosts. A community coordinator approves the plan in one click; a durable AWS Step Functions workflow asks hosts one by one, moves on when someone doesn't reply, and lights the point up on the rider map when someone says yes. Gaps it cannot fill stay visible as decisions for a human.

## Start here

1. Read `product.md` (problem, users, hero scenario) and `frontend.md` (screens, demo room).
2. Read `architecture.md`, `contracts.md` and `agent.md` before implementing their areas.
3. Give your coding assistant `AGENTS.md` and `CLAUDE.md`, then execute `tasks.md` in order.
4. `demo.md` and `video-handoff.md` define what the app must expose for the video — **the video is the main judging artefact; the live demo site is second.** Build every screen so it records well.
5. Use `testing.md`, `deployment.md` and `submission.md` for verification and delivery.

Supporting files: `sources.md`, `decisions.md`, `fixtures/east-delhi-demo.json`, `scripts/verify_fixture.py`.

## Hero numbers (sample scenario, recomputed by the checker)

| | Value |
|---|---|
| Heat window (apparent temp ≥ 42 °C, demo policy) | 13:00–16:00 |
| Rider water requests in that window | 44, in four clusters (A 10, B 18, C 12, D 4) |
| Requests with an open, confirmed water point within 500 m — before | 22 of 44 (50.0%) |
| Agent's outreach for cluster B | Ask Kirana store (H4) → no reply, timeout → ask RWA office (H5) → accepts 12:00–17:00 |
| After | 40 of 44 (90.9%) |
| Still uncovered | Cluster D, 4 requests, no host within 500 m — flagged for the coordinator |

`python scripts/verify_fixture.py` must print `All fixture checks passed.`

## Non-negotiable build choices

- React + TypeScript + Vite + Tailwind PWA on **AWS Amplify Hosting**; MapLibre GL with **Amazon Location Service** maps, places and routes.
- Python 3.12 backend on **Lambda** behind **API Gateway HTTP API**; **DynamoDB** single table; **S3** for snapshots and host photos.
- One **Strands** coverage agent on **Amazon Bedrock**, deployed as a Lambda container image (ECR).
- **Step Functions** Standard workflow for approval and host outreach (`waitForTaskToken` + timeouts). **EventBridge Scheduler** for the evening plan, morning "still open?" pings and recovery.
- **Amazon Polly** speaks the rider's answer in Hindi. **Amazon Transcribe** (Hindi) turns a short spoken question into text — P0b, with tap buttons always available.
- **Cognito** for coordinators and hosts; riders are anonymous. A no-sign-up `/demo` room gives judges an isolated seeded session.
- TypeScript **CDK**, **CloudWatch** logs/alarms. Cedar policy checks for outreach limits are P1.
- Deterministic code owns distances, coverage, ranking, timeouts and every number. The model plans, prioritises, writes the Hindi messages and explains.

## Kickoff prompt

> Read AGENTS.md, CLAUDE.md and the specifications. Implement tasks.md in order, starting with T00 and the deployed vertical slice. Keep the fixture numbers exact and computed in code. The demo video is the main judging artefact: build the /demo room so one screen recording shows rider, host and coordinator together. Verify current SDK interfaces before pinning versions. Report task IDs, verification evidence and blockers honestly in tasks.md. Use deployment.md for account-specific setup; never invent account IDs, model access, URLs or credentials.
