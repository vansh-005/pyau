# Frontend and visual direction

The video is judged first and the site second, so every screen must read clearly in a 1920×1080 screen recording and still work on a 390 px phone. Load the `frontend-design` skill (if available) before styling, then follow these decisions.

## Look and feel

Earthen and calm, not a dark AI dashboard. The pyau's clay pot and water are the motifs.

| Token | Hex | Use |
|---|---|---|
| canvas | `#F6F1E7` | warm sand background |
| panel | `#FFFFFF` | cards |
| ink | `#1D2A33` | text |
| muted | `#5B6770` | secondary text |
| border | `#DED6C8` | hairlines |
| water | `#16708F` | primary actions, live water points, covered |
| clay | `#B5562E` | brand, pot icon, wordmark |
| heat | `#C9771C` | heat window, warnings |
| gap | `#B3261E` | uncovered clusters, timeouts, problems |
| ok | `#2E7D4F` | accepted, confirmed today |
| standby | `#7A6FB0` | standby hosts |

Check contrast of final pairs (≥ 4.5:1 for text). Fonts: Inter (UI), Source Serif 4 (headlines), JetBrains Mono (times, IDs), **Noto Sans Devanagari** (all Hindi) — bundle them locally (fontsource), no Google Fonts at runtime. Body 16 px; phone tap targets ≥ 48 px; coordinator headline numbers 40–48 px. 8 px spacing grid, 12 px card radius, soft shadows.

Iconography: a simple clay-pot glyph for water points (filled = confirmed today, outline = not confirmed, dashed = standby), shade umbrella, toilet, plug. Never rely on colour alone — every state also has an icon and a word.

## Routes

| Route | Who | Notes |
|---|---|---|
| `/` | everyone | one-line promise, **Try the live demo** (→ `/demo`), sign in, short "what is a pyau" strip |
| `/demo` | judges, presenter | **Demo room** (below) — the most important screen |
| `/ride` | rider | full-screen map + four big need buttons + mic |
| `/host` | host | register / my points / inbox |
| `/coordinate/:zoneId` | coordinator | heat, coverage map, agent run, approval, outreach board |
| `/runs/:runId` | coordinator | stable run detail; survives refresh |
| `/replay/:id` | public | saved run replay with a permanent "Saved run replay · captured {time}" banner |

## Demo room `/demo` (design this for the camera)

One 1920×1080 screen that shows the whole loop, so a single screen recording covers most of the video.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Pyau ◍  Demo room · East Delhi sample zone · Sample scenario 21 May 2026     │
│ Clock: Wed 20 May 18:30 (evening before) [Jump to 14:00 tomorrow] Demo timers 45 s │
├───────────────┬──────────────────────────────────────────┬───────────────────┤
│ RIDER (phone) │ COORDINATOR                              │ HOST (phone)      │
│ 390×780 frame │ heat curve · coverage map · agent        │ 390×780 frame     │
│               │ receipts · plan · outreach board         │ switch: H4 / H5   │
└───────────────┴──────────────────────────────────────────┴───────────────────┘
```

- Left and right panels are real app routes rendered inside phone-sized frames (same components as `/ride` and `/host`), not mock images. Host panel has a host switcher (H4 Kirana store / H5 RWA office) because the demo needs two hosts.
- Header shows the scenario badge, the session clock, **Jump to 14:00 tomorrow**, **New session**, **Copy run ID**, and the permanent **Demo timers: 45 s** chip. Clock and timers never appear outside demo sessions.
- A first-visit coach strip (dismissible) says: *1. Run the plan → 2. Approve → 3. Answer as a host → 4. Ask as a rider.*
- At 1920×1080 every number and label in all three panels must be readable without zoom. Minimum 15 px in the phone frames, 16 px elsewhere.

## Rider screen

- Map centred on the rider (permission prompt with a clear reason; demo uses the scripted location in cluster B).
- Four large buttons in a 2×2 grid: **पानी Water**, **छाँव Shade**, **शौचालय Toilet**, **चार्ज Charge**. Below: a large **🎤 बोलकर पूछें / Ask by voice** hold-to-talk button (P0b).
- Answer card slides up: host label, pot icon, route distance and time (e.g. *"190 m · ~1 min by scooter"* — from Routes; the coverage check itself uses straight-line distance), *"Open till 17:00 · Host confirmed for today (20 May, 18:42)"*, **Route** (draws the Location route line), and an audio play state. Audio auto-plays after a tap (browser autoplay rules allow audio after user gesture).
- Afterwards: **मिल गया ✓ Got it** / **दिक्कत ✗ Problem** (closed / no water / dirty / unsafe).
- Nothing nearby: honest message *"500 m में अभी कोई पक्का पॉइंट नहीं"* + the nearest farther point + "We've told the coordinator."

## Host screen

- Register: name, type (chips: shop, chemist, temple, RWA/office, home, dhaba, other), offers (chips), hours, pin drag on map (address appears from Places), listed vs standby toggle with one-line explanation, consent checkbox *"Coordinator may ask me on hot days"*, optional photo. Submit in < 60 s.
- Inbox card for an outreach ask: the coordinator's Hindi message large, English below, window in bold mono, a countdown chip (demo: 45 s), **हाँ, मैं रखूँगा / Yes** and **नहीं / No**. After Yes: "You're live for riders 12:00–17:00 🙏".
- Freshness card: *"आज पानी रख रहे हैं? Still serving water today?"* **हाँ / Yes** · **आज नहीं / Not today**.
- Late tap after timeout: *"This request already moved on — thank you."*

## Coordinator screen (centre panel and full page)

Top row: tomorrow's heat curve (hourly apparent temperature; heat band shaded `heat`, threshold line labelled "Demo policy 42 °C"), and the big coverage number: **50%** of 44 rider requests near an open water point during 13:00–16:00. Numbers come from the API.

Coverage map: clusters as circles sized by requests, coloured covered/uncovered, with counts ("B · 18"). Hosts as pot icons by state. Radius rings on hover.

Agent panel: **Run coverage plan** → a vertical list of real tool receipts as they arrive (*Read zone · Heat outlook: 13:00–16:00, peak 45 °C · Demand: 4 clusters · Coverage 22/44 · Candidates for B: Kirana store, RWA office · Candidates for D: none · Proposal submitted*), each with timestamp and expandable input/output. Elapsed time, no fake progress bars.

Plan review: per gap — cluster, requests, ask order, the Hindi + English message preview, ask window; unresolved gaps in a red "Needs a human decision" box with the agent's recommendation; projected coverage *if first choices accept* (from code). Checkbox *"I reviewed the messages and the unfilled gaps"* → **Approve outreach**. Reject available.

Outreach board (mirrors the state machine): a row per gap with a step track — *Asking Kirana store · 0:31 left* → *No reply — timed out* → *Asking RWA office* → *Accepted 12:00–17:00 ✓* → *Point live*. The coverage number animates 50% → 91% only when the API returns the recomputed value. Gap D stays red.

Problem queue: paused points with the reports that caused it and **Reactivate** / **Contact host**.

## Required states

Idle · Queued · Planning (receipts streaming) · Insufficient data · No gaps · Proposed · Approval expired · Outreach (per-ask countdown) · Accepted / Declined / Timed out · Unresolved gap · Completed (summary) · Failed (readable, retry starts a new run) · Replay (banner) · Offline (rider: last known points shown as "may be outdated").

## Hindi strings

Fixed UI strings live in `apps/web/src/i18n/hi.json` and `en.json`. Proposed strings above are drafts; mark the file `needsNativeReview: true` until a fluent speaker checks them, and note it in limitations. Model-written messages are always shown to the coordinator before sending.

## Implementation notes

React Router, TanStack Query with bounded polling (2 s active run, 5 s inbox, stop on terminal/hidden tab), MapLibre GL with the Amazon Location style URL and API key from public config, `prefers-reduced-motion` respected, focus management in drawers, text alternatives for map state (a list view toggle). Render model text as plain text only.

## Screen acceptance

At 1920×1080 the demo room shows scenario badge, clock, coverage number, cluster counts, receipts, the Hindi message, host countdown and rider answer card legibly. At 390 px no horizontal scroll; all actions reachable with one thumb.
