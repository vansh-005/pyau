# WAKE-UP — read this first

> **UI FROZEN** at commit `2ba8a04`. Release gate T13 passed 3/3 (twice: before and after the prompt change) on the deployed URL; authority gates 13/13; visual gate OK. The deployed site matches this commit. Since the first freeze (`53c8579`) the only UI change is a **responsive fallback**: below 1500 px wide the demo room shows Rider / Coordinator / Host tabs instead of three columns (so a 1366 px laptop has no sideways scroll); at 1920×1080 the page is **pixel-identical** to before (verified by image diff) and a full real-browser loop passed after the change.

**Summary**
1. **Done:** T00–T14 all built, deployed, verified and committed; extras 1–5 done (warmer Hindi prompt, fresh evidence, `RECORDING.md`, README + writeup, UI polish).
2. **Live:** https://main.d1lgs9hxx2cuwt.amplifyapp.com — `/demo` (the recording surface), `/host`, `/ride`, `/replay/latest`.
3. **Needs you:** (a) record the footage; (b) a few optional decisions below; nothing is blocked.
4. **To record:** follow **`RECORDING.md`** click by click — S05+S06 in one take, then S03 in the same session, then S04 (`/host`), S07 (fresh session), then S09 (AWS console, crop the account ID). System audio only for S03.
5. **Evidence / log:** `docs/evidence/` (facts.json, evidence.json, 2 clean screenshots, gate results), `tasks.md` progress log, `decisions.md`.

## Run IDs for your Step Functions / CloudWatch capture (S09)

- Fresh verified run (all checks passed, timeout + accept branches): **`6d8648e4d5da8b98432c`** (execution name = run ID, region ap-south-1, state machine `pyau-CoverageRun`). Also in `docs/evidence/facts.json`.
- For footage you record yourself, click **Copy run ID** in the demo-room header right after S06 and use *that* ID in the console (the S09 clip must match the S05/S06 clip).
- Step Functions keeps execution history for 90 days; the DynamoDB session data behind a run expires after 48 h (the saved replay `/replay/latest` does not expire).

## Needs you (all optional unless noted)

1. **Record** per `RECORDING.md`. Please test the 🎤 once with your real voice and click **Allow** on the mic prompt before recording S03. I could only test with a synthetic Polly voice through a fake microphone.
2. **Hindi review.** UI strings (`apps/web/src/i18n/hi.json`, flagged `needsNativeReview`) and the model-written requests (samples below) should be read by a fluent speaker if possible. The prompt now includes one good example request, so the messages are warm but near-identical between runs and between hosts (only the host type and offers change).
3. **Anthropic models:** still not enabled for the account (Bedrock says the use-case form is missing). Agent runs on Amazon Nova 2 Lite. If access arrives: rerun `python scripts/t00_smoke.py bedrock <profile-id>` and redeploy with `npx cdk deploy -c bedrockModelId=<profile-id>` from `infra/`. Not needed for the submission.
4. **Public repo hygiene:** commit `8e45c66` (T00 notes) still contains the IAM user name `[iam-user]` and the last 4 digits of the AWS account ID in `decisions.md` history. Low sensitivity, removed from the current tree. If you want it gone, tell me and I will rewrite history before the repo goes public (it has never been pushed). Everything else passed a secret scan (no keys, tokens, emails, full account IDs). `infra/outputs.json`, `.env.local` (test password) and `.venv` are gitignored.
5. **Lambda concurrency:** your account's limit is **10** concurrent invocations (new-account default; the quota API refuses requests below 1000). Normal demo use is far below that, but a burst of >10 parallel calls returns 503s. If you expect several judges at once, open a Service Quotas / Support case to raise "Concurrent executions" for Lambda in ap-south-1.
6. **Daily agent-run cap:** 40 real runs per UTC day by design (cost guard). I set an operator override to **100** (`PUBLIC#CAP#CONFIG`) so your recording cannot be blocked; today's count was 10 when I checked. Lower it again after judging if you prefer (README/`services/api/caps.py` explain how).
7. **Do not publish/submit anything until you decide.** `docs/submission-writeup.md` and `README.md` are drafts with placeholders for the repo and video URLs.

## Sample agent messages (3 fresh deployed runs, all passed validation: B → [H4, H5], D unresolved, projected 40/44)

All three runs: ask window 12:00–17:00; cluster D recommendation `recruit_host_nearby`.

- **H4 Kirana store** — hi: *नमस्ते! प्याऊ कोऑर्डिनेटर की तरफ़ से एक छोटा निवेदन: कल 12:00 से 17:00 तक बहुत गर्मी रहेगी और डिलीवरी राइडरों को पानी की ज़रूरत पड़ेगी। क्या आप अपने किराना स्टोर पर उनके लिए ठंडा पीने का पानी रख सकते हैं? मन हो तभी, आपका बहुत धन्यवाद!*
  en: *Hello! A small request from the Pyau coordinator: it will be very hot tomorrow from 12:00 to 17:00 and delivery riders will need water. Could you keep cold drinking water for them at your kirana store? Only if you are happy to; thank you!*
- **H5 RWA office** — hi: *नमस्ते! प्याऊ कोऑर्डिनेटर की तरफ़ से एक छोटा निवेदन: कल 12:00 से 17:00 तक बहुत गर्मी रहेगी और डिलीवरी राइडरों को पानी की ज़रूरत पड़ेगी। क्या आप अपने RWA कार्यालय पर उनके लिए ठंडा पीने का पानी, छाया और चार्जिंग रख सकते हैं? मन हो तभी, आपका बहुत धन्यवाद!*
  en: *… Could you keep cold drinking water, shade and charging for them at your RWA office? Only if you are happy to; thank you!*

(Before the prompt change the Hindi was valid but stiffer and misspelled "प्याऊ" as "पियाऊ" in the first run; the model also sometimes recommended `accept_gap_low_demand` for cluster D — now it recommends recruiting a host.)

## What I cut or could not do (also in README limitations)

- Host **photo upload** (first cut per `demo.md`); **"Contact host"** button in the problem queue (no contact data by design).
- **Cognito sign-in screens:** the user pool, groups and a JWT-protected `/auth/whoami` exist, but the apps run on signed demo tokens (all roles inside one demo session).
- **EventBridge Scheduler** rules (07:30 freshness, 18:30 nightly, IST) are deployed but only act on *live* zones, and none exist; the demo uses the manual "send the morning check now" button. They are described as "wired", never as "ran".
- **Live Open-Meteo forecast** (P1) not wired; the demo uses the synthetic fixture curve. **Cedar** policy (P1), **SES email** (P1) not built.
- Live-data **clustering** (geohash-6 + merge) is specified but not implemented; the fixture's cluster ids are used.
- The venue for the problem-evidence numbers is `sources.md` — please re-open the sources before quoting any figure in the final video (as required there).

## Useful commands (PowerShell, repo root)

```powershell
.\.venv\Scripts\Activate.ps1
python -m pytest                              # 42 domain/validation tests
python scripts/smoke_loop.py                  # full real loop on the deployed stack (~80 s)
python scripts/gate_authority.py              # 13 authority + failure-injection gates
node scripts/visual_gate.mjs https://main.d1lgs9hxx2cuwt.amplifyapp.com
python scripts/gate_loops.py 3                # three consecutive real-browser loops + Step Functions + CloudWatch checks
```
