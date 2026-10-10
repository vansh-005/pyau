# RECORDING.md — click-by-click capture guide (UI v2)

Deployed app: **https://main.d1lgs9hxx2cuwt.amplifyapp.com** · every flow below was run end to end by script in a real browser (Edge, 1920×1080); timings are real.
Filenames and audio rules come from `video-handoff.md`. The UI is frozen (see `WAKE-UP.md`). **Do not speed up or cut footage yourself** — the video workspace marks shortened waits on screen.

The app is **English by default** with an **English / हिंदी** toggle (header, top right). The choice is remembered in the browser, so a fresh incognito window starts in English. One language at a time: the toggle changes the whole room. The **host phone follows each host's own language**: H4 Kirana store is a Hindi host, H5 RWA office is an English host.

## Setup (once, 5 min)

1. Chrome, a clean profile window, **content area exactly 1920×1080** (the three-panel room needs ≥ 1500 px wide; smaller windows show tabs), bookmarks bar off, notifications off.
2. Browser zoom **100%** for `/demo`; **80%** for `/host` (the page grows after registering).
3. Recorder: 1920×1080, 30 fps, H.264. **System audio ON only for S03**; off for everything else.
4. Dismiss the light-blue coach strip in `/demo` (button "Dismiss", far right) if you do not want it in shot.
5. **Microphone permission (S03):** open `/demo`, hold **Hold to ask** once, click **Allow**, release. Speakers on, volume up. Test once with your real voice.
6. Hide account details in the AWS console (account ID top-right and inside ARNs): crop or zoom.

## S05 + S06 — one continuous take (about 90 s) → `05-plan-approve.mp4` and `06-outreach.mp4`

Start recording with a **2–3 s still**. UI language: **English**.

1. Open `/demo`. A fresh isolated session starts. Wait for **Water access 50%** (22 of 44 rider requests), the **dot strip** (A solid, B hollow, C solid, D hollow), the **"Sample scenario · 21 May 2026"** badge, the black **"Demo timers: 45 s"** chip and **Clock: Wed 20 May 18:30 (evening before)**. Hold 3 s.
2. Under the heat chart, point at the amber heat window and the labelled **Heat threshold 42 °C**; hover the small **i** next to "Water access" if you want the demo-settings note.
3. In the centre column click **Run coverage plan** (blue button). Under it the line "Live zones run automatically every evening at 18:30 (EventBridge Scheduler). This demo zone: run it now." is visible. Real planner steps stream in for 15–25 s: *Read zone → Heat outlook 13:00–16:00, peak 45 °C → Demand: 4 areas, 44 requests → Coverage 22/44 (50.0%) · not covered: Area B · Ganesh Nagar, Shakarpur, Area D · near Nirman Vihar Metro → Candidates for Area B: Kirana store (Hindi), RWA office (English) → Candidates for Area D: none → Proposal submitted · projected 40/44 …*.
4. **Review the plan** appears at the top ("Needs your approval"). Slowly show: Area B · Ganesh Nagar, Shakarpur · 18 rider requests, **"Asking hosts to open 12:00–17:00"**, the two hosts in order, **the Hindi message to the Kirana store** and **the English message to the RWA office** (each labelled "Message in Hindi / English"), then (scroll the column slightly) the red **"Needs your decision"** box for Area D with its suggestion, and "If the first host in each area says yes: 40 of 44 (90.9%). Calculated by the app, not the AI." *(End of S05 content.)*
5. Tick **"I reviewed the messages and the unfilled gaps"**, click **Approve outreach**.
6. The column jumps to the top: **Outreach** shows *Asking Kirana store · 0:45 left*. In the right phone click the **H4 Kirana store हिंदी** tab: the whole host phone is in **Hindi** with a **0:45 → 0:00 countdown**. **Leave it alone and let it run out on camera** (about 47 s). The board turns to *Kirana store: no reply — timed out* and asks the RWA office.
7. In the right phone click the **H5 RWA office English** tab: the phone is now in **English**. Press **Yes, I'll do it**. It says *You're live for riders 12:00–17:00.*
8. Within ~2 s the number changes **50% → 90.9%**, the dots for Area B fill in, the board shows *RWA office accepted 12:00–17:00 (host confirmed)* and *Point is live on the rider map*, a **Run summary** appears (*Water access went from 50% to 90.9% (40 of 44). Still open: Area D · near Nirman Vihar Metro.*), and Area D stays red. Hold 3 s. *(End of S06.)*
9. Do **not** click New session — continue to S03. Click **Copy run ID** (header) and paste it somewhere safe (this is the ID for S09).

Expected: 22/44 → 40/44 (90.9%), Area D still open, Kirana store timed out, RWA office accepted 12:00–17:00.

## S03 — rider voice question, same session right after S06 → `03-rider-voice.mp4` (**system audio ON**)

Record it **in Hindi** for impact (or English — both work):

1. Start a clip with system audio on. Click **Jump to 14:00 tomorrow** (clock reads Thu 21 May 14:00 (scenario day)).
2. Click **हिंदी** in the header: the whole room switches to Hindi.
3. In the rider phone ("डेमो लोकेशन: क्षेत्र B" selected): **press and hold the mic button** (*बोलकर पूछें*), say *"bhaiya paani kahan milega?"*, **release**.
4. After 2–4 s you see **सुना: "भैया पानी कहाँ मिलेगा?"**, the card **RWA office · H5**, the Hindi answer, **the point's offers with icons (पानी, छाँव, चार्जिंग)**, **261 m · स्कूटर से करीब 2 मिनट**, the route on the small map, and the **Hindi voice answer plays by itself**. Let the audio finish.
5. English variant: click **English**, hold **Hold to ask**, say *"Where can I get water nearby?"* — English text and an English (Indian) voice answer.
6. Fallback if the mic fails: tap **पानी / Water** instead (same answer and audio).

## S04 — host joins, then confirms "still serving water today" → `04-host-join.mp4` (audio off)

Use a **separate** tab so the hero numbers are untouched. Language: English.

1. Open `/host` at **80% zoom**. Left: map with the sample points and a draggable blue pin; right: the form.
2. **Name of your place:** `Sharma Chai Stall`. **Type of place:** leave *Shop*. Under **What can riders get?** keep **Water** ticked and tick **Shade** (checkbox rows with icons).
3. Hours 09:00–20:00. **Drag the pin** a little along a street: the grey box shows the **address from Amazon Location Places**.
4. **How should we list you?** keep **Listed** (segmented control). **Language for requests to you:** click **हिंदी** to show the setting, or leave English.
5. Tick **"The coordinator may ask me on hot days."** Click **Register**.
6. A blue notice says *Registered as H7 … You appear greyed out until you confirm you are serving today.* **My points** shows **H7 · Not confirmed today**; the pin is a grey outline.
7. Click **Demo: send the morning check now** (the real morning job, triggered by hand). The card **"Still serving water today?"** appears (in the host's language).
8. Click **Yes**. The card says *Confirmed for today. You're live for riders 09:00–20:00.*, **My points** shows **Live 09:00–20:00**, the pin turns solid blue.

Validation shot (optional): press **Register** once with the consent box unticked — "Please fix the highlighted fields." and the red message; nothing is saved.

## S07 — trust loop → `07-trust.mp4` (audio off), in a **fresh session**

1. Open `/demo`, click **New session**, then **Jump to 14:00 tomorrow**.
2. In the rider phone click **Area A** (segmented "Demo location"). Tap **Water** → **Chai stall · H1** (74 m).
3. Click **Problem**, then **No water**: *Thanks, reported (1 of 2 before a point is paused).*
4. Tap **Water** again, **Problem → No water**: *Thanks. After 2 problem reports this point is paused and the coordinator has been told.*
5. In the centre panel **Problem reports** appears at the top: **H1 Chai stall · Paused — 2 rider problem reports within 3 hours · No water, No water** (H6 Dhaba is listed too, labelled "sample scenario"). The number drops **50% → 27.3%**, and the **dots for Area A turn hollow red**. Hold 3 s.
6. Optional: **Reactivate** → back to 50%.

## S09 — AWS proof (console) → `09-aws-proof.mp4` (audio off), same run ID as S05/S06

Region **ap-south-1 (Mumbai)**. Use the run ID you copied; the freshly verified run is in `docs/evidence/facts.json` (`verifiedFromRunId`).

1. **Step Functions** → *State machines* → **pyau-CoverageRun** → *Executions* → search the **run ID** (it is the execution name) → open it. **Graph view:** `PlanWithAgent → HasProposal → AwaitApproval → OutreachPerGap → PickNextHost → AskHost → MarkTimedOut → PickNextHost → AskHost → HostDecision → PublishPoint → Summarize → Done`; the timeout branch and the accept branch are both highlighted. Click **MarkTimedOut** and **PublishPoint**. Event history: **TaskTimedOut**, then the second ask's **TaskSucceeded**. **Crop** the top-right account menu and the details panel/ARN (contains the account ID); zoom to 110–125%.
2. **CloudWatch** → *Log groups* → `PyauStack-CoverageRunLogs…` → search the run ID, or Logs Insights: `fields @timestamp, type, details.name | filter execution_arn like /RUN_ID/ | sort @timestamp asc`. Show `ExecutionStarted … TaskTimedOut … ExecutionSucceeded`. Crop the account ID inside `execution_arn`.
3. Optional: *Lambda* → `PyauStack-WorkflowFn…` → logs → `step=ask_host run=<RUN_ID>`.

## Optional shots (public pages)

- **S10 — landing hero (backup for the close) → `10-landing-hero.mp4`:** open `/` at 1920×1080 in English. Hold on the hero: headline "Water, shade and a place to rest for delivery riders in the heat.", the sub line, the three buttons, and the **Sample scenario, not measured impact** dot strip (22 of 44 → 40 of 44). Scroll slowly through "The problem" (three source-linked figures), "How it works", and stop on "Built on AWS". Click **Try the live demo** at the end. Toggle **हिंदी** once if you want a Hindi hero.
- **S08 backup — engineering diagram → `08-engineering.mp4`:** open `/engineering`. Scroll to **Architecture** (hold 5 s), then **Three flows**, then **A real execution** (the Step Functions graph drawn from the verified run, with the timeout loop and the accept branch lit). This is a **drawn** graph from the real execution history, not a console screenshot; use S09 for the actual console.

## If something goes wrong

| Symptom | Do |
|---|---|
| "The daily limit of … live agent runs … has been reached" with a replay link | The cap is raised to 100 (see `WAKE-UP.md`); if it still shows, open the replay link — a saved real run, clearly bannered. |
| Plan shows Failed | Click **New session**, run again (each attempt is a new real run); send me the run ID. |
| A page shows a 503 / "Something went wrong" for a second | The account's Lambda limit is 10 concurrent calls; wait 5 s and retry; close extra demo tabs. |
| The H4 countdown never reaches 0 | It is real time (45 s). Do not click anything on H4. |
| Rider answers "No confirmed point within 500 m right now." at 14:00 | H5 has not accepted yet in this session, or Area A is selected. Finish S06 first / switch to Area B. This is the honest answer by design. |
| No audio | Click **Play audio / आवाज़ सुनें** once (browsers block autoplay until you tap). |
| The room is still in Hindi / English from a previous take | Use the toggle (it is remembered per browser profile). |

## Handles and style

Leave **2–3 s** of stillness before and after each action, move the cursor slowly. One take per clip is fine; re-record rather than edit. Name files exactly as in `video-handoff.md`.
