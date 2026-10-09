# Implementation tasks

Execute in order. Tick only after the acceptance check passes. Time boxes assume a solo build starting the morning of 10 Oct; if a box overruns by 50%, take the fallback and log it.

## P0

- [x] **T00 — Verify access (45 min).** AWS identity/region/profile; budget alert; one Strands + Bedrock tool-use round trip (pick and pin model/profile + SDK); Polly `hi-IN` synthesis (Kajal neural, fallback Aditi standard); Transcribe streaming `hi-IN` test clip; Amazon Location API key creation for maps in `ap-south-1`. *Done:* decisions.md lists verified model ID, region, SDK versions, voice, and any blocked service. *Fallback:* if Bedrock is blocked in ap-south-1, use the nearest working region/profile and record it.
- [x] **T01 — Repo + domain (60 min).** New repo `pyau`, layout from AGENTS.md, lockfiles, `.env.example`. Port `verify_fixture.py` into `packages/domain` (heat window, coverage, clustering stub using fixture clusterIds, candidates, outreach replay) with pytest. *Done:* tests assert 13:00–16:00, 44, 22/44 = 50.0%, B → [H4, H5], D → [], 40/44 = 90.9%, rider → H5.
- [ ] **T02 — Infra skeleton (75 min).** CDK `PyauStack`: DynamoDB table + GSIs, S3 bucket, API Gateway HTTP API + API Lambda, Cognito user pool + groups, Amplify app (or manual build upload), Location API key (maps only), CloudWatch log retention 7 days. *Done:* deployed `/health` and an authenticated test call on the real URL.
- [ ] **T03 — Deployed vertical slice (60 min).** Seed endpoint `POST /demo/sessions` copying the fixture into a session; `GET /zones/{id}/map`; web app shows the Location map with pot icons by state. *Done:* the Amplify URL shows the six sample hosts in East Delhi from DynamoDB.
- [ ] **T04 — Rider find + Hindi voice answer (90 min).** `POST /help/find` with code-side filtering, Location `CalculateRoutes` (Scooter), fixed bilingual template, Polly audio (S3 cache, presigned URL), demand logging; rider UI with 4 need buttons, answer card, route line, audio, Got it / Problem. *Done:* at session clock 14:00 after H5 accepts, the answer is H5 ≈176 m with audible Hindi; before acceptance, cluster B gets the honest "nothing confirmed within 500 m" answer.
- [ ] **T05 — Coverage report + coordinator view (60 min).** `GET /zones/{id}/coverage`; heat curve, coverage number, cluster map. *Done:* shows 22/44, 50% with clusters B and D red.
- [ ] **T06 — Agent (120 min).** Strands agent container Lambda; six tools; budget hooks; `submit_proposal` validation with one repair; tool receipts as events. *Done:* a real Bedrock run in a demo session proposes gap B with [H4, H5] and Hindi/English messages, flags D with a recommendation; an injected invented host ID is rejected. Keep the run ID.
- [ ] **T07 — State machine + approval + outreach (150 min).** `CoverageRun` in CDK: PlanWithAgent → AwaitApproval (task token) → Map over gaps → PickNextHost / AskHost (task token, timeout) / MarkTimedOut / PublishPoint / MarkUnresolved → Summarize. API: approve/reject, host inbox, respond. *Done:* in a demo session, H4 times out after 45 s, H5 accepts, coverage recomputes to 40/44 (90.9%), D unresolved; repeated approve/respond clicks are idempotent; late H4 answer gets 409.
- [ ] **T08 — Demo room (90 min).** `/demo` three-panel layout, New session, clock jump, demo timers chip, host switcher, coach strip, copy run ID; readable at 1920×1080. *Done:* a first-time user completes the loop in under 3 minutes. **Notify Vansh: S05 + S06 recordable.**
- [ ] **T09 — Voice question (P0b, 75 min).** 16 kHz PCM capture in the browser, `POST /help/ask-voice`, Transcribe `hi-IN`, keyword intent + Bedrock fallback, transcript on screen. *Done:* "bhaiya paani kahan milega" → water → H5 answer. *Fallback:* keep tap buttons; remove Transcribe from claims and facts.json. **Notify Vansh: S03 recordable.**
- [ ] **T10 — Host registration + freshness (60 min).** `/host` register with Places reverse geocode, listed/standby, consent; freshness ask + confirm-today; manual trigger endpoint; EventBridge Scheduler rules for 18:30 and 07:30 IST (P0b). *Done:* new host appears on the map greyed until confirmed; confirming turns it live.
- [ ] **T11 — Trust loop (30 min).** Feedback endpoint; pause after 2 problem reports in 3 h; coordinator problem queue; reactivate. *Done:* in a fresh session two reports pause H1 and coverage recomputes.
- [ ] **T12 — Guardrails + replay (45 min).** Demo caps (1 active run/session, 40 agent runs/day), throttling, published saved-run replay at `/replay/:id`. *Done:* the cap shows the replay option; replay works signed out with no model call.
- [ ] **T13 — Release gates (60 min).** testing.md gates; three consecutive full `/demo` loops on the deployed URL; evidence export (facts.json, evidence.json, screenshots, run IDs). *Done:* evidence folder complete; limitations written.
- [ ] **T14 — Repo + writeup (45 min).** README with problem, demo link, architecture diagram, setup (PowerShell), AWS services actually used, limitations, credits, AI tools used; submission.md writeup draft; optional Builder Center blog draft. *Done:* every claim matches verified behaviour.

## P1 (only after T13 passes)

- [ ] SES email for asks to verified test addresses (sandbox).
- [ ] Cedar outreach policy (`cedarpy`) replacing hard-coded checks, with policy file in repo.
- [ ] Live Open-Meteo forecast for a real zone; INSUFFICIENT_DATA path on outage.
- [ ] Two or three real hosts in your own neighbourhood (with their consent) — strong for the video.
- [ ] Agent-written evening brief quoting only computed numbers.
- [ ] Reviewed Hindi strings; English/Hindi toggle polish.

## Progress log

Append date/time, task IDs, verification evidence, run IDs and blockers below.

- 2026-10-10 · T00 (partial, not ticked) · `python scripts/verify_fixture.py` passes; identity/region ok; Strands+Bedrock tool call ok with Nova 2 Lite; Polly Kajal+Aditi hi-IN ok; Transcribe streaming hi-IN ok (`scripts/t00_smoke.py`, `scripts/t00_transcribe.py`). **Blockers:** Anthropic models need the use-case form (Vansh, Bedrock console); no AWS Budget set; Location API key deferred to T02 CDK. Next: T01 domain port.
- 2026-10-10 · T01 · `packages/domain/pyau_domain` (models, geo, heat, coverage, candidates, rider, fixture) + `tests/test_domain_fixture.py`: `python -m pytest` -> 11 passed (13:00-16:00, 44, 22/44=50.0%, B->[H4,H5], D->[], 40/44=90.9%, rider->H5 176 m, boundary, INSUFFICIENT_DATA, zero requests). Clustering from live data (geohash-6 merge) not yet implemented; fixture clusterIds used. Next: T02 CDK skeleton.
- 2026-10-10 · T00 closed by Vansh's decision: Anthropic models pending approval (model = `global.amazon.nova-2-lite-v1:0` via single `BEDROCK_MODEL_ID` value; on approval rerun `scripts/t00_smoke.py` and switch); Location API key comes from T02 CDK. No AWS Budget (Vansh declined; in-app guardrails instead). Routine PyauStack deploys pre-approved; ask before deleting resources or touching anything outside the stack.
