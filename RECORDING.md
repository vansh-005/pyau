# RECORDING.md — click-by-click capture guide

Deployed app: **https://main.d1lgs9hxx2cuwt.amplifyapp.com** · everything below was run end to end by script in a real browser (Edge, 1920×1080); timings are real.
Filenames and audio rules come from `video-handoff.md`. The UI is frozen (see `WAKE-UP.md`). **Do not speed up or cut footage yourself** — the video workspace marks shortened waits on screen.

## Setup (once, 5 min)

1. Chrome, a clean profile window (the three-panel room needs a window at least 1500 px wide; smaller windows show tabs), **window/content area exactly 1920×1080** (e.g. DevTools → device toolbar off; or a screen recorder region of 1920×1080), bookmarks bar off, notifications off, no extensions that draw on pages.
2. Browser zoom **100%** for `/demo`; **80%** for `/host` (the page grows after registering).
3. Recorder: 1920×1080, 30 fps, H.264. **System audio ON only for S03**; off for everything else.
4. Open `/demo` once and dismiss the grey coach strip if you do not want it in shot (button "Dismiss" at the far right) — it re-appears only per browser tab.
5. **Microphone permission (needed for S03):** open `/demo`, hold the 🎤 button once, click **Allow** in the browser prompt, release. (A first real-voice test is recommended: say *"bhaiya paani kahan milega"*.) Speakers on, volume up for the Polly answer.
6. Hide account details: the AWS console shows your account ID top-right and inside ARNs — crop or zoom (see S09).

## S05 + S06 — one continuous take (about 90 s) → `05-plan-approve.mp4` and `06-outreach.mp4`

Start recording with a **2–3 s still** on the screen. Then:

1. Open `/demo`. A fresh isolated session starts automatically. Wait until you see **50%**, the **"Demo timers: 45 s"** chip, the badge **"Sample scenario · 21 May 2026"** and the clock **"Wed 20 May 18:30 (evening before)"**. (Hold 3 s.)
2. Click **Run coverage plan** (centre panel, orange button). Real tool receipts stream in for about 15–25 s: *Read zone → Heat outlook 13:00–16:00, peak 45 °C → Demand 4 clusters, 44 requests → Coverage 22/44 (50.0%) uncovered B, D → Candidates for B: Kirana store, RWA office → Candidates for D: none → Proposal submitted · projected 40/44 …*.
3. **"Plan for review"** appears at the top of the centre column. Slowly show: cluster B (18 requests), the two hosts in order with their **Hindi + English messages** and window `12:00–17:00`, then (scroll the column a little) the red **"Needs a human decision"** box for cluster D with its recommendation, and "Projected if first choices accept: 40/44 (90.9%)". *(End of S05 content: this is the "agent + approval" shot.)*
4. Tick **"I reviewed the messages and the unfilled gaps"**, then click **Approve outreach**.
5. The column jumps to the top: **Outreach** board shows *⏳ Asking Kirana store · 0:45 left*. In the right phone click the **H4 Kirana store** tab: the Hindi request, the window and a **0:45 → 0:00 countdown** are shown. **Leave it alone and let the timer run out on camera** (about 47 s). The board turns to *✗ Kirana store: no reply — timed out* and the next line asks the RWA office.
6. In the right phone click the **H5 RWA office** tab and press **हाँ, मैं रखूँगा / Yes**. The phone says *You're live for riders 12:00–17:00 🙏*.
7. Within ~2 s the coverage number changes **50% → 90.9%**, the board shows *✓ RWA office accepted 12:00–17:00 (host confirmed)* and *● Point live on the rider map*, a **Run summary** appears, and cluster **D stays red**. Hold 3 s. *(End of S06.)*
8. **Do not** click New session yet — continue to S03 in the same session.
9. Click **Copy run ID** (header) and paste it somewhere safe (this is the ID for S09).

Expected final values: 22/44 → 40/44 (90.9%), uncovered D, H4 timed out, H5 accepted 12:00–17:00.

## S03 — rider voice question, same session right after S06 → `03-rider-voice.mp4` (**system audio ON**)

1. Start a new recording clip with **system audio on**. Click **Jump to 14:00 tomorrow** (header; the clock reads "Thu 21 May 14:00 (scenario day)").
2. In the **rider phone** (left, "Demo location: Cluster B" is selected): **press and hold 🎤 बोलकर पूछें / Hold to ask**, say *"bhaiya paani kahan milega?"*, **release**.
3. After 2–4 s the phone shows **"सुना / Heard: “भैया पानी कहाँ मिलेगा?”"**, a card **RWA office · H5**, the Hindi text, **~261 m · ~2 min by scooter**, the route line on the small map, and the **Hindi voice answer plays by itself**. Let the audio finish; hold 2 s.
4. Fallback if the mic does not work: tap **पानी Water** instead (same answer and audio; tell the video agent "tap fallback").

If the first try says "समझ नहीं आया" speak a bit louder/closer and try again; each try is a real request.

## S04 — host joins, then confirms "still serving water today" → `04-host-join.mp4` (audio off)

Use a **separate** page so the hero numbers in S05/S06 are untouched.

1. Open `/host` at **80% zoom** (a fresh demo session is created for this tab). Left: map with the sample hosts and a draggable terracotta pin; right: the form.
2. Type **Name of your place**: `Sharma Chai Stall`. Click chips **Shop**, and under "What can riders get?" keep **Water** and add **Shade**.
3. Leave hours 09:00–20:00. **Drag the pin** a little along a street; the grey box shows the **address from Amazon Location Places** (e.g. "…, Laxmi Nagar, Delhi 110092, India").
4. Keep **Listed**. Tick **"Coordinator may ask me on hot days"**. Click **Register / जोड़ें**.
5. A green notice says *Registered as H7 … greyed out until you confirm*; **My points** shows **"H7 … Not confirmed today"** and the pot on the map is a grey outline.
6. Click **"Demo: send the morning check now"** (this is the real morning job, triggered by hand). The card **"आज पानी रख रहे हैं? Still serving water today?"** appears at the top.
7. Click **हाँ / Yes**. The card says *Host confirmed for today ✓ — live for riders 09:00–20:00*, **My points** shows **Live 09:00–20:00**, and the pin on the map turns solid blue.

(If you want to show validation, press Register once with the consent box unticked: the red messages appear, nothing is saved.)

## S07 — trust loop → `07-trust.mp4` (audio off), in a **fresh session**

1. Open `/demo` in a new tab (or click **New session**). Click **Jump to 14:00 tomorrow**.
2. In the rider phone click **Cluster A** (the "Demo location" chip). Tap **पानी Water** → the card shows **Chai stall · H1** (74 m).
3. In the card click **दिक्कत ✗ Problem**, then **पानी नहीं No water**. The phone says *Thanks — reported (1 of 2 before a point is paused)*.
4. Tap **पानी Water** again (the card resets), **Problem → No water** again. The phone says *Thanks — 2 problem reports: this point is now paused and the coordinator has been told.*
5. In the centre panel the **Problem queue** card appears at the top: **H1 Chai stall ⏸ Paused — "2 rider problem reports within 3 hours · reports: No water, No water"** (H6 Dhaba is listed too, labelled "sample scenario"). The coverage number drops **50% → 27.3%** and cluster A turns red. Hold 3 s.
6. Optional: click **Reactivate** on H1 → the number returns to 50%.

## S09 — AWS proof (console) → `09-aws-proof.mp4` (audio off), same run ID as S05/S06

Use the run ID you copied (also in `docs/evidence/facts.json` for the fresh verified run). Region **ap-south-1 (Mumbai)**.

1. **Step Functions** → *State machines* → **pyau-CoverageRun** → *Executions* tab → search/paste the **run ID** (the execution name is the run ID) → open it.
   - **Graph view:** shows `PlanWithAgent → HasProposal → AwaitApproval → OutreachPerGap → PickNextHost → AskHost → MarkTimedOut → PickNextHost → AskHost → HostDecision → PublishPoint → Summarize → Done`; the **timeout branch (MarkTimedOut)** and the **accept branch (PublishPoint)** are both highlighted green/blue. Click **MarkTimedOut** and **PublishPoint** to show them in the right panel.
   - **Execution event history** table: scroll to **TaskTimedOut**, then **TaskSucceeded** for the second ask.
   - **Crop:** the top-right account menu, and the *Execution details* panel / ARN (contains the account ID). Record just the graph + event table (zoom the browser to 110–125%).
2. **CloudWatch** → *Log groups* → the state-machine log group (name starts with `PyauStack-CoverageRunLogs…`) → *Search log group* / Logs Insights, filter by the run ID, e.g. `fields @timestamp, type, details.name | filter execution_arn like /RUN_ID/ | sort @timestamp asc`. Show the rows `ExecutionStarted … TaskTimedOut … ExecutionSucceeded` with the same run ID. **Crop** out the account ID inside `execution_arn` (zoom into the `type` and `name` columns, or drag-select only those).
3. Optional: *Lambda* → `PyauStack-WorkflowFn…` → *Monitor* → *View CloudWatch logs* → a line `step=ask_host run=<RUN_ID>`.

## If something goes wrong

| Symptom | Do |
|---|---|
| "The daily limit of … live agent runs … has been reached" with a replay link | I raised the cap to 100 for tonight (see `WAKE-UP.md`); if it still shows, open the replay link — it is a saved real run, clearly bannered. |
| Plan shows FAILED | Click **New session**, run again (every attempt is a new real run). Tell me the run ID so I can look at the events. |
| Page shows a 503 / "Something went wrong" for a second | The account Lambda limit is 10 concurrent calls; wait 5 s, retry. Close extra open demo tabs. |
| H4 countdown never reaches 0 | It is real time (45 s). Do not click anything on H4. |
| Rider answers "No confirmed water point within 500 m" at 14:00 | H5 has not accepted yet in this session, or you are at Cluster A — finish S06 first / switch to Cluster B. This is the honest answer by design. |
| No audio | Click **🔊 आवाज़ सुनें / Play audio** once (browsers block autoplay until you tap). |

## Handles and style

Leave **2–3 s** of stillness before and after each action, move the cursor slowly, never type fast. One take per clip is fine; re-record rather than edit. Name files exactly as in `video-handoff.md`.
