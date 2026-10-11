// Final-day footage recorder. Usage: node scripts/record_footage.mjs <warm|landing|eng|host|trust|main>
// Follows RECORDING.md shot by shot on the deployed URL. Raw webm in .tmp/footage/raw, cut mp4 in .tmp/footage/out,
// marks (seconds from video start, +-0.3 s) in .tmp/footage/raw/<name>.marks.json.
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { BASE, OUT, RAW, clickOn, cut, finish, glide, launch, newRec, pointAt, scrollPage, smoothTo, topOf, typeInto } from "./record_lib.mjs";

const which = process.argv[2];
const WAV = resolve(".tmp/rider-question-hi.wav");
const soft = async (label, fn) => { try { await fn(); } catch (e) { console.log(`  (skipped: ${label}: ${String(e.message).split("\n")[0]})`); } };

const browser = await launch(which === "main" ? WAV : undefined);
try {
  if (which === "warm") {
    // one throwaway rider request so the API and Lambda are warm
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/ride`, { waitUntil: "load" });
    await p.getByRole("button", { name: /^Water$/ }).click({ timeout: 30000 });
    await p.waitForTimeout(8000);
    await ctx.close();
    console.log("warmed");
  }

  if (which === "landing") {
    const r = await newRec(browser, "landing");
    const { p } = r;
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(500);
    await p.mouse.move(960, 540);
    r.mark("hero");
    await p.waitForTimeout(5000); // hero still: heat shimmer, pulsing dots
    for (const id of ["mission", "problem", "what", "how", "results", "trust", "aws"]) {
      const y = await topOf(p.locator(`#${id}`), 70);
      await scrollPage(r, y, 2600);
      r.mark(id);
      await p.waitForTimeout(id === "results" ? 5500 : 3200); // results: let the 22 -> 40 dots fill
    }
    await scrollPage(r, 0, 3500);
    r.mark("back-to-top");
    await pointAt(r, p.getByRole("link", { name: /Try the live demo/ }).first(), { ms: 1200, pause: 2500 });
    r.mark("end");
    const raw = await finish(r, "landing");
    cut(raw, "10-landing.mp4", 0, r.marks.end + 1);
  }

  if (which === "eng") {
    const r = await newRec(browser, "engineering");
    const { p } = r;
    await p.goto(`${BASE}/engineering`, { waitUntil: "load" });
    await p.waitForTimeout(500);
    await p.mouse.move(960, 540);
    r.mark("top");
    await p.waitForTimeout(3500);
    await scrollPage(r, await topOf(p.locator("#architecture"), 40), 2600);
    r.mark("architecture-rider");
    await p.waitForTimeout(5500); // rider path animated
    await clickOn(r, p.getByRole("button", { name: "The evening coverage run" }), { after: 6000 });
    r.mark("architecture-run");
    await scrollPage(r, await topOf(p.locator("#flows"), 70), 2600);
    r.mark("flows");
    await p.waitForTimeout(4500);
    await scrollPage(r, await topOf(p.locator("#execution"), 70), 2600);
    r.mark("execution");
    await p.waitForTimeout(6000);
    await scrollPage(r, await topOf(p.getByText("Real tool receipts"), 90), 2600);
    r.mark("receipts");
    await p.waitForTimeout(5000);
    r.mark("end");
    const raw = await finish(r, "engineering");
    cut(raw, "08-engineering.mp4", 0, r.marks.end + 1);
  }
  if (which === "host") {
    const r = await newRec(browser, "host", { zoom: 0.8 });
    const { p } = r;
    await p.goto(`${BASE}/host`, { waitUntil: "load" });
    await p.getByLabel("Name of your place").waitFor({ timeout: 30000 });
    await p.mouse.move(960, 540);
    r.mark("form");
    await p.waitForTimeout(3500);
    await typeInto(r, p.getByLabel("Name of your place"), "Sharma Chai Stall");
    r.mark("named");
    await clickOn(r, p.getByRole("checkbox", { name: "Shade" }), { after: 1800 });
    r.mark("offers");
    // drag the pin a little along the street; the address comes from Amazon Location Places
    await soft("drag pin", async () => {
      const pins = p.locator(".maplibregl-marker-draggable");
      let c = null;
      for (let i = 0; i < (await pins.count()); i++) { const bb = await pins.nth(i).boundingBox(); if (bb && bb.width > 0) c = bb; }
      await glide(r, c.x + c.width / 2, c.y + c.height / 2, 1200);
      await p.mouse.down();
      await glide(r, c.x + c.width / 2 + 70, c.y + c.height / 2 + 36, 1400);
      await p.mouse.up();
    });
    await p.getByText(/Laxmi Nagar|Delhi/).first().waitFor({ timeout: 30000 });
    await p.waitForTimeout(2500);
    r.mark("pin-address");
    await soft("language chip", () => clickOn(r, p.getByRole("radio", { name: "हिंदी" }).last(), { after: 1500 }));
    // validation first (consent missing), then the real registration
    await clickOn(r, p.getByRole("button", { name: /Register/ }), { after: 3000 });
    r.mark("validation");
    await clickOn(r, p.getByLabel(/may ask me/), { after: 1800 });
    await clickOn(r, p.getByRole("button", { name: /Register/ }), { after: 500 });
    await p.getByText(/Registered as H7/).waitFor({ timeout: 20000 });
    await p.getByText("Not confirmed today").first().waitFor({ timeout: 15000 });
    await p.waitForTimeout(3000);
    r.mark("registered");
    await clickOn(r, p.getByRole("button", { name: /send the morning check/ }), { after: 500 });
    await p.getByText(/Still serving water today\?|आज पानी रख रहे हैं/).first().waitFor({ timeout: 20000 });
    await p.waitForTimeout(3000);
    r.mark("freshness-card");
    await clickOn(r, p.getByRole("button", { name: /^(Yes|हाँ)/ }), { after: 500 });
    await p.getByText(/(Live|चालू) 09:00/).first().waitFor({ timeout: 20000 });
    await p.waitForTimeout(3500);
    r.mark("live");
    const raw = await finish(r, "host");
    cut(raw, "04-host-join.mp4", 0, r.marks.live + 1);
  }

  if (which === "trust") {
    const r = await newRec(browser, "trust");
    const { p } = r;
    await p.goto(`${BASE}/demo`, { waitUntil: "load" });
    await p.getByText("Demo timers: 45 s").waitFor({ timeout: 30000 });
    await p.getByText("50%").first().waitFor({ timeout: 30000 });
    await p.mouse.move(960, 540);
    await p.waitForTimeout(3000);
    r.mark("fresh-session");
    await clickOn(r, p.getByRole("button", { name: "Jump to 14:00 tomorrow" }), { after: 2500 });
    await clickOn(r, p.getByRole("radio", { name: "Area A" }), { after: 2000 });
    for (let i = 0; i < 2; i++) {
      await clickOn(r, p.getByRole("button", { name: /Water/ }), { after: 500 });
      await p.getByText(/Host confirmed/).first().waitFor({ timeout: 30000 });
      await p.waitForTimeout(2200);
      if (i === 0) r.mark("answer-H1");
      await clickOn(r, p.getByRole("button", { name: /Problem/ }), { after: 1500 });
      await clickOn(r, p.getByRole("button", { name: /No water/ }), { after: 500 });
      await p.getByText(/^Thanks/).first().waitFor({ timeout: 20000 });
      await p.waitForTimeout(2800);
      r.mark(`report-${i + 1}`);
    }
    await p.getByText("Problem reports").first().waitFor({ timeout: 20000 });
    await p.getByText("27.3%").first().waitFor({ timeout: 20000 });
    await pointAt(r, p.getByText("Problem reports").first(), { ms: 1300, pause: 4200 });
    r.mark("queue-27");
    await clickOn(r, p.getByRole("button", { name: "Reactivate" }).first(), { after: 500 });
    await p.getByText("50%").first().waitFor({ timeout: 20000 });
    await p.waitForTimeout(3000);
    r.mark("reactivated");
    const raw = await finish(r, "trust");
    cut(raw, "07-trust.mp4", 0, r.marks.reactivated + 1);
  }

  if (which === "main") {
    // S05 + S06 + S03 in one fresh demo session, one continuous recording; cut afterwards
    const r = await newRec(browser, "main");
    const { p } = r;
    const api = {};
    p.on("response", async (res) => {
      if (res.url().includes("/help/ask-voice")) { try { api.voice = await res.json(); api.voiceAt = (Date.now() - r.t0) / 1000; } catch { /* ignore */ } }
    });
    await p.goto(`${BASE}/demo`, { waitUntil: "load" });
    await p.getByText("Demo timers: 45 s").waitFor({ timeout: 30000 });
    await p.getByText("50%").first().waitFor({ timeout: 30000 });
    await p.mouse.move(960, 540);
    await p.waitForTimeout(3500);
    r.mark("s05-start");
    await soft("heat chart", () => pointAt(r, p.getByText(/Heat threshold/).first(), { ms: 1400, pause: 2500 }));
    await clickOn(r, p.getByRole("button", { name: "Run coverage plan" }), { after: 500 });
    r.mark("run-clicked");
    await p.getByText("Review the plan").waitFor({ timeout: 240000 });
    await p.waitForTimeout(3000);
    r.mark("proposal");
    for (const [label, loc] of [
      ["window", p.getByText(/Asking hosts to open/).first()],
      ["msg-hi", p.getByText(/Message in Hindi/).first()],
      ["msg-en", p.getByText(/Message in English/).first()],
      ["area-d", p.getByText(/Needs (your|a human) decision/i).first()],
      ["projection", p.getByText(/Calculated by the app/).first()],
    ]) {
      await soft(label, async () => { await smoothTo(r, loc, { ms: 1500 }); await pointAt(r, loc, { ms: 900, pause: 2600 }); });
      r.mark(label);
    }
    r.mark("s05-end");
    const ack = p.getByLabel("I reviewed the messages and the unfilled gaps");
    await clickOn(r, ack, { after: 1500 });
    r.mark("s06-start");
    await clickOn(r, p.getByRole("button", { name: "Approve outreach" }), { after: 500 });
    r.mark("approved");
    await p.getByText(/Asking .* left/).first().waitFor({ timeout: 60000 });
    await p.waitForTimeout(3000);
    r.mark("h4-asked");
    await clickOn(r, p.getByRole("tab", { name: /H4/ }), { after: 500 });
    await p.getByText(/(left|बाकी)$/).first().waitFor({ timeout: 20000 });
    await p.waitForTimeout(1500);
    r.mark("h4-countdown");
    await glide(r, 1500, 940, 1200); // park the cursor; the 45 s countdown runs out for real
    await p.getByText("no reply — timed out").first().waitFor({ timeout: 90000 });
    await p.waitForTimeout(3500);
    r.mark("h4-timed-out");
    await clickOn(r, p.getByRole("tab", { name: /H5/ }), { after: 2500 });
    r.mark("h5-tab");
    await clickOn(r, p.getByRole("button", { name: /I'll do it/ }), { after: 500 });
    await p.getByText("Run summary").waitFor({ timeout: 90000 });
    await p.getByText("90.9%").first().waitFor({ timeout: 30000 });
    await p.waitForTimeout(4500);
    r.mark("s06-end");
    await clickOn(r, p.getByRole("button", { name: "Copy run ID" }), { after: 800 });
    api.runId = await p.evaluate(() => navigator.clipboard.readText());
    console.log("  run id:", api.runId);
    writeFileSync(`${RAW}/main.runid.txt`, api.runId);

    // S03: same session, 14:00 on the scenario day, Hindi, spoken question through the fake mic
    await p.waitForTimeout(1500);
    r.mark("s03-start");
    await clickOn(r, p.getByRole("button", { name: "Jump to 14:00 tomorrow" }), { after: 2500 });
    r.mark("jumped");
    await clickOn(r, p.getByRole("radio", { name: "हिंदी" }).first(), { after: 2600 });
    r.mark("hindi");
    const mic = p.getByRole("button", { name: /Hold to ask by voice|बोलकर पूछने/ });
    await mic.waitFor({ timeout: 30000 });
    const mb = await mic.boundingBox();
    await glide(r, mb.x + mb.width / 2, mb.y + mb.height / 2, 1300);
    await p.waitForTimeout(900);
    await p.mouse.down();
    r.mark("mic-down");
    await p.waitForTimeout(3300);
    await p.mouse.up();
    r.mark("mic-up");
    await p.getByText(/सुना/).waitFor({ timeout: 30000 });
    r.mark("transcript");
    await p.getByText(/पक्का/).first().waitFor({ timeout: 30000 });
    r.mark("answer-card");
    // wait for the spoken answer to start and finish
    await p.waitForFunction(() => (window.__plays ?? []).length > 0, null, { timeout: 30000 }).catch(() => {});
    const plays = await p.evaluate(() => window.__plays ?? []);
    if (plays[0]) { r.marks["audio-start"] = +((plays[0].t - r.t0) / 1000).toFixed(2); r.marks["audio-seconds"] = plays[0].dur; console.log("  audio starts at", r.marks["audio-start"], "s, duration", plays[0].dur); }
    await p.waitForTimeout(Math.max(9000, ((plays[0]?.dur ?? 6) + 3) * 1000));
    r.mark("s03-end");
    const raw = await finish(r, "main");
    // keep the API answer (audio URL is a signed link: download it, never store it)
    const v = api.voice ?? {};
    const audioUrl = v.audio?.url ?? v.audio;
    mkdirSync(`${OUT}/audio`, { recursive: true });
    if (typeof audioUrl === "string") {
      const buf = Buffer.from(await (await fetch(audioUrl)).arrayBuffer());
      writeFileSync(`${OUT}/03-rider-voice-answer.mp3`, buf);
      console.log("  saved the API's Polly answer:", buf.length, "bytes");
    }
    const { audio, ...voiceNoUrl } = v;
    writeFileSync(`${RAW}/main.voice.json`, JSON.stringify({ ...voiceNoUrl, audioMarks: { start: r.marks["audio-start"], seconds: r.marks["audio-seconds"] } }, null, 1));
    const M = r.marks;
    cut(raw, "05-plan-approve.mp4", 0, M["s05-end"] + 2.5);
    cut(raw, "06-outreach.mp4", M["s06-start"] - 2, M["s06-end"] + 1);
    cut(raw, "03-rider-voice.mp4", M["s03-start"], M["s03-end"] + 1);
  }
} finally {
  await browser.close();
}
