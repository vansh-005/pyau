# Product definition

## Users

| User | Situation | What Pyau gives them |
|---|---|---|
| **Rider** (primary) | Food, grocery or parcel delivery partner on a two-wheeler, 10–12 hours outdoors, phone mounted on the bike, often Hindi-first | The nearest open, confirmed-today water/shade/toilet/charging point, spoken aloud in Hindi, with a scooter route. No account. |
| **Host** | Shopkeeper, chemist, temple, RWA office, household, dhaba — people who already hand out water informally | Register a point in under a minute; get a polite request when riders near them will need water; confirm "still open today" with one tap. |
| **Coordinator** | A gig-workers' association volunteer, RWA, NGO or ward heat-action cell running the network for a zone | Tomorrow's coverage plan written by the agent; one-click approval; a live board of what got filled, what timed out, and what still needs a human decision. |

## The problem (sourced; see sources.md)

- India had 7.7 million gig workers in 2020–21, projected to reach ~23.5 million by 2029–30 (NITI Aayog, as reported).
- A 2024 IFAT survey reported that over half of gig workers had heat-exhaustion or heatstroke symptoms and more than 40% lacked access to cold, clean drinking water (as reported by Mongabay India).
- Riders describe buying water out of thin earnings or going without; some report being offered dish-washing water when they ask at restaurants (Newslaundry, May 2026).
- In Delhi a rider who fainted mid-delivery was revived by a shopkeeper pouring water on him; riders prefer small restaurants where staff offer water (Al Jazeera, 2024). **The help exists — it is informal, scattered and invisible.**
- Public water exists too, but isn't findable: NDMC made all 38 of its water ATMs free on 2 June 2026, yet the announcement gave no map or way to locate them (The Tribune).
- NDMA's 2025 heat advisory for app-based work asks platforms to *tag shaded rest zones in worker apps* and asks municipal bodies to set up refill points (Mongabay India). Pyau is that tagging layer — open to every rider, not tied to one platform.

## Position against what exists

Platforms now run rest points: Zomato/Eternal reports 5,000+ rest points open to riders of any platform; Amazon plans 250 "Ashray" centres by end-2026; Swiggy relaxed login-hour rules in peak heat (Business Standard / Outlook Business, May 2026). Pyau does not compete with these; it **adds** them where locations are public, and fills the space between them with community hosts.

| | Platform rest points | Pyau |
|---|---|---|
| Who can see them | Inside each platform's partner app | Any rider, any platform, no login |
| Density | Fixed sites | Grows with every shop/temple/RWA that joins |
| Open *today*? | Assumed | Confirmed each morning; stale points drop off |
| Gaps | Unknown | Agent predicts tomorrow's gaps from the forecast and recruits hosts before the heat |
| Trust | — | Rider reports pause bad points automatically |

Pitch line: **"Every city once had pyaus. Pyau brings them back — and keeps them open when the heat is worst."**

Close line (video): **"Pyau. Paani, chhaon, aaraam — jahan kaam hai, wahan."** (Water, shade, rest — wherever the work is.)

## P0 user journeys

1. **Rider asks.** Open `/ride` (or the rider panel in `/demo`). Tap **पानी / Water** (or hold the mic and ask). See and hear the nearest open, confirmed water point, distance, closing time, and a scooter route. Tap **Got water ✓** or **Problem ✗** afterwards.
2. **Host joins.** Open `/host`. Name, what you offer (water, shade, toilet, charging), hours, pin on map (Amazon Location reverse-geocodes the address), optional photo. Choose *listed* (show me every day) or *standby* (only when asked). Consent to be asked by the coordinator.
3. **Morning freshness.** Each listed host gets "Still serving water today?" in the app (and email if configured). Unconfirmed points are shown as *not confirmed today* and are excluded from answers during the heat window.
4. **Evening plan (the agent).** Coordinator opens `/coordinate`, sees tomorrow's heat curve and **Run coverage plan**. The agent's tool receipts stream in. It proposes: which clusters will be uncovered, which hosts to ask in what order, the Hindi message for each, and the gaps it can't fill.
5. **Approve.** Coordinator checks the plan, edits nothing or removes a host, ticks "I reviewed the messages and the gaps", clicks **Approve outreach**.
6. **Follow-through.** Step Functions asks the first host. No reply before the timeout → next host. Accept → the point goes live for the accepted window and the coverage number updates from code. Decline → next host. Nobody → the gap stays red on the coordinator board.
7. **Trust loop.** Two rider problem reports on the same point within 3 hours pause it and put it in the coordinator's queue. The host can reactivate it.

## Exact hero scenario (fixtures/east-delhi-demo.json)

Sample scenario date 21 May 2026, Asia/Kolkata, an East Delhi sample zone. All hosts, requests and temperatures are invented; coordinates sit in a real area so the map is real.

| Item | Value |
|---|---|
| Heat profile | Synthetic hourly apparent temperature, peak 45 °C at 14:00 |
| Demo policy | Heat window = hours with apparent temperature ≥ 42 °C → 13:00–16:00. Coverage radius 500 m. Explicitly an unvalidated demo policy. |
| Rider requests in window | 44 water requests: cluster A 10, B 18, C 12, D 4 |
| Hosts | H1 Chai stall (listed, confirmed, near A) · H2 Pharmacy (listed, confirmed, near C) · H3 Temple pyau (closes 12:00, no consent to asks, near B) · H4 Kirana store (listed but **not confirmed today**, near B) · H5 RWA office (**standby**, near B) · H6 Dhaba (near A, **paused** after 2 problem reports) |
| Before | 22 / 44 covered = 50.0%. Uncovered: B and D |
| Candidates | B → [H4, H5] (by distance to cluster centre). D → none within 500 m |
| Outreach | H4: no reply → timeout (45 s in demo, 20 min live). H5: accepts 12:00–17:00 |
| After | 40 / 44 = 90.9%. D stays uncovered: "needs a new host or a municipal water point" |
| Rider question afterwards | "bhaiya paani kahan milega?" from inside cluster B at 14:00 → H5, ≈176 m |

Coverage = share of rider requests in the heat window that have at least one host which offers the need, is not paused, is confirmed for that date (or accepted a request), is open for the whole request hour, and is within the radius. Computed in code; never by the model.

These are sample-scenario results, not observed outcomes. Do not claim lives saved, illness prevented or riders served.

## Semantics that must hold

- *Open now* and *confirmed today* are different facts. Answers during the heat window use only confirmed points; others appear greyed "not confirmed today".
- A host accepting a request is a promise, not verified water. Show "Host confirmed at 18:42", never "Water available ✓ verified".
- Missing or stale forecast → `INSUFFICIENT_DATA`, never "no heat".
- Below the demo threshold is not "safe". The threshold is a configurable, labelled, unvalidated demo policy.
- Rider location is used per request and stored only as a ~150 m geohash cell for demand. No tracking, no rider accounts, no phone numbers.
- Hindi model text is reviewed for fixed UI strings; model-written messages are shown to the coordinator before sending.

## Scope

**P0:** rider find + route + feedback, host registration + freshness confirmation, coverage agent with tool receipts, coordinator approval, Step Functions outreach with timeouts, live coverage recomputation, pause-on-reports, `/demo` room with isolated sessions, deployed on AWS, Polly Hindi voice answer.

**P0b (right after P0 works, cut last-but-one):** spoken Hindi question via Transcribe; EventBridge Scheduler wiring for the nightly run and morning pings (manual trigger works in P0).

**P1:** SES email to verified test addresses, Cedar outreach policy, live forecast for real zones, real host onboarding in your own area, platform rest points where locations are public, Hindi/English UI toggle polish, export of the day's report.

**Out of scope:** rider tracking, payments to hosts, SMS/WhatsApp (DLT/third-party), medical advice, predicting heat illness, claims about any platform's internal data, multi-city scale.

## Acceptance targets

- A first-time user in `/demo` can play rider, host and coordinator through the whole loop in under 3 minutes without instructions.
- All demo numbers match the fixture checker and come from API responses.
- One real Bedrock-backed agent run and one real Step Functions execution with a timeout branch and an accept branch, retained as evidence with matching run IDs.
- Three consecutive full `/demo` loops succeed on the deployed URL before declaring ready.

Product assumptions not yet validated with riders, hosts or coordinators: willingness of hosts to be asked, right timeout length, whether coordinators exist per zone. Say so in the writeup; one or two real conversations before the video would be valuable.
