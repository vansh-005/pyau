# Video-first demo plan

The 3-minute YouTube video is what judges score; there is no live demo. Rules that shape everything: at most 3 minutes, must *show* the project using AWS (writeup-only features don't count), public or unlisted link that opens signed out. Internal target: all captures done by **11 Oct, 11:00 IST**, final video uploaded by 11 Oct afternoon. Check the exact form deadline on the event page/form today.

## Story (≈170 s) — problem → how Pyau fixes it → how it runs on AWS

| Shot | Time | What the viewer sees | Source |
|---|---|---|---|
| S01 | 0:00–0:18 | 2:10 pm, Delhi. A rider dot crosses a sun-bleached map; feels-like 45 °C. Two sourced facts: 7.7 M gig workers (→ 23.5 M by 2029–30); over half reported heat-exhaustion symptoms and 40%+ lacked cold clean water. Faint dots appear — shops, temples, water ATMs — "The help exists. Riders just can't see it." | Motion graphic |
| S02 | 0:18–0:24 | A clay pot: "India always had pyaus." The pot becomes a map pin → wordmark **Pyau**. | Motion graphic |
| S03 | 0:24–0:44 | Rider asks by voice in Hindi; the transcript appears; the phone answers **out loud in Hindi** (Polly); route draws. | **App capture (audio on for this clip)** |
| S04 | 0:44–0:56 | A host registers in three taps; next morning confirms "still serving water today". | App capture |
| S05 | 0:56–1:36 | **Turning point.** Evening before. Heat curve for tomorrow, coverage 50%. **Run coverage plan** → real tool receipts → cluster B: 18 requests, no open water 13:00–16:00 → plan: ask Kirana store, then RWA office, Hindi message → cluster D flagged for a human → coordinator approves. | App capture + light callouts |
| S06 | 1:36–1:56 | Kirana store doesn't answer → countdown → *timed out* → RWA office taps **हाँ** → point goes live on the rider map → coverage **50% → 91%**; D stays red. | App capture |
| S07 | 1:56–2:06 | Trust loop: two "no water" reports pause a point; it lands in the coordinator queue. | App capture |
| S08 | 2:06–2:32 | Architecture builds as a pulse travels: Amplify → API Gateway → Lambda → Step Functions → Strands agent ↔ Bedrock → DynamoDB; Location, Polly, Transcribe, EventBridge Scheduler. | Motion graphic |
| S09 | 2:32–2:42 | **Step Functions console**: the real execution graph with the timeout branch and the accept branch highlighted, same run ID as S05; CloudWatch log line. | AWS console capture |
| S10 | 2:42–2:50 | "Pyau. Paani, chhaon, aaraam — jahan kaam hai, wahan." + URL | Motion graphic |

## Recording recipe (one take covers S03–S07)

1. Deployed URL, Chrome, 1920×1080 window, zoom so phone-frame text ≥ 15 px. Clean profile, no bookmarks bar, notifications off.
2. `/demo` → **New session**. Clock 18:30 (evening before).
3. **Run coverage plan** → wait for receipts and the proposal (real Bedrock run). Approve.
4. Host panel on H4 — let the 45 s countdown expire on camera (the edit can shorten it with a "Time shortened" label). Switch to H5 → **हाँ**.
5. Watch coverage update to 91%. **Jump to 14:00 tomorrow**.
6. Rider panel: voice question (or tap **पानी**) → spoken Hindi answer → route.
7. Separate short takes, each in a **fresh session** so they don't disturb the hero numbers: host registration + freshness confirmation (S04); trust loop (S07) — as a rider near cluster A, report H1 **Problem → No water** twice → H1 pauses → it appears in the coordinator's problem queue.
8. Step Functions console: open the execution named with the same run ID; capture the graph and the event history. CloudWatch: filter by the run ID. Hide account IDs (crop or browser zoom on the panel).

Record system audio **only** for the rider voice clip (S03) so the Polly Hindi answer is heard; record everything else silent. Leave 2–3 s still handles before and after each action. Keep the cursor slow.

## Honest labels (visible in the app, not narrated)

- "Sample scenario · 21 May 2026" badge on all demo panels.
- "Demo timers: 45 s" chip; edits that shorten waits show "Time shortened".
- Replay mode shows its banner. No mocked tool receipts, no fake host taps — every tap in the video is a real request to the deployed API.

## Cut order if time runs short

Cut first: photo upload, Hindi/English toggle polish, email, Cedar, live forecast cameo, freshness pings, trust loop (S07 → fold into S06 voice-over), voice *question* (keep the tap + spoken answer). Never cut: agent run with real receipts, approval, timeout → next host → accept, coverage recompute, rider answer with Hindi audio, Step Functions proof.
