# Verification and release gates

Risk-based, not exhaustive. Stop adding tests once these risks are covered.

## Domain (pytest, local)

| Case | Expected |
|---|---|
| Fixture heat window | 13:00–16:00 |
| Requests in window | 44; clusters A 10, B 18, C 12, D 4 |
| Coverage before | 22/44, 50.0%, uncovered B, D |
| Paused host (H6) near A | not counted |
| Unconfirmed listed host (H4) | not counted until confirmed or accepted |
| Standby host (H5) | not counted until it accepts |
| Host closing at 12:00 (H3) | not open for 13:00 requests |
| Candidates | B → [H4, H5]; D → [] with NO_HOST_WITHIN_RADIUS |
| After H5 accepts 12:00–17:00 | 40/44, 90.9%, uncovered D |
| Rider at cluster B, 14:00 | H5, ≈176 m |
| Request at window end boundary 16:00 | outside window (half-open) |
| Missing forecast hour | INSUFFICIENT_DATA |
| Zero requests | coverage percent null, "No rider requests in the heat window" |

## Integration and authority (deployed)

1. Real Bedrock run: tool receipts recorded; model ID and duration logged; no hidden reasoning displayed.
2. `submit_proposal` rejects an invented host, a reordered list, a message promising money, a message missing the window.
3. Duplicate `StartExecution` for a run ID → one execution. Double-click approve → one approval. Double host "Yes" → one availability.
4. H4 answers after timeout → 409 "already moved on"; no availability written.
5. Pause H5 after the proposal and before approval → approval fails `STALE_INPUT`.
6. Wrong role: rider/host cannot approve; host cannot answer another host's ask; demo token cannot touch another session or live data.
7. Demo clock/timer endpoints reject live sessions.
8. Bedrock throttle/denial and Location/Polly failure show honest errors; rider still gets text with "approximate" label if Routes fails.
9. Prompt injection in a host label does not change tools, hosts or approvals.
10. Public replay opens signed out, makes no model calls, cannot write.

## The full loop (run three times in a row on the deployed URL)

New session → coverage 50% → Run coverage plan → proposal (B: H4, H5; D unresolved) → approve → H4 timeout → H5 accepts → coverage 90.9% → jump to 14:00 → rider asks (voice or tap) → H5 with Hindi audio and route → Step Functions execution shows both branches → CloudWatch shows the same run ID.

## Visual gate

1920×1080 demo room: badge, clock, demo timers, coverage number, cluster counts, receipts, Hindi message, countdown, answer card all legible. 390 px phone: no horizontal scroll, ≥ 48 px targets. Keyboard focus in drawers. No colour-only meaning.

## Evidence log template

check ID · time · commit · session/run ID · expected · actual · pass/fail · evidence path · limitation. Never prefill passes.

---

## As built — where each case is verified (deployed, real services)

| Case | Script |
|---|---|
| Domain table above | `tests/test_domain_fixture.py`, `test_proposal.py`, `test_trust.py`, `test_intent.py`, `test_answer.py` |
| Integration 1, 3, 4 (receipts, idempotency, late answer) | `scripts/smoke_loop.py` |
| Integration 2 (submit_proposal rejections) | `tests/test_proposal.py`, `scripts/check_agent_boundaries.py` |
| Integration 5 (STALE_INPUT) | `scripts/smoke_trust.py` |
| Integration 6, 7, 8, 9 | `scripts/gate_authority.py` |
| Integration 10 (replay) | `scripts/smoke_guardrails.py` |
| Full loop ×3 + Step Functions + CloudWatch | `scripts/gate_loops.py` → `docs/evidence/gate-loops.json` |
| Visual gate | `scripts/visual_gate.mjs` + 1920×1080 screenshots in `docs/evidence/` |

Evidence log (time · commit · run/session · result): see the progress log at the bottom of `tasks.md`; every entry names the script, the run ids and the outcome.
