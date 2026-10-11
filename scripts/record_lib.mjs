// Helpers for the final-day footage recorder (Playwright + Chromium, 1920x1080, recordVideo).
// Recording aids only: a drawn cursor (Playwright videos do not show the pointer), eased mouse and scroll moves, marks in seconds from video start.
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export const BASE = process.env.PYAU_URL ?? "https://main.d1lgs9hxx2cuwt.amplifyapp.com";
export const RAW = resolve(".tmp/footage/raw");
export const OUT = resolve(".tmp/footage/out");
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

export const launch = (wav) =>
  chromium.launch({
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      ...(wav ? [`--use-file-for-fake-audio-capture=${wav}`] : []),
      "--force-color-profile=srgb",
      "--hide-scrollbars",
    ],
  });

const INIT = ({ theme, lang }) => {
  localStorage.setItem("pyau.theme", theme);
  localStorage.setItem("pyau.lang", lang);
  sessionStorage.setItem("pyau.coachDismissed", "1");
  // timestamps of media playback, to sync the real audio in the edit
  const op = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    this.addEventListener("playing", () => ((window.__plays ||= []).push({ t: Date.now(), dur: this.duration })), { once: true });
    return op.apply(this, arguments);
  };
  // drawn cursor + click ripple
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;display:none;transform:translate(-4px,-3px)";
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    const st = document.createElement("style");
    st.textContent = "@keyframes rec-rip{from{transform:translate(-50%,-50%) scale(.3);opacity:.7}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}";
    document.head.appendChild(st);
    addEventListener("mousemove", (e) => { c.style.display = "block"; c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      r.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:44px;height:44px;border-radius:50%;border:3px solid #0a6c94;z-index:2147483646;pointer-events:none;animation:rec-rip .6s ease-out forwards`;
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 700);
    }, true);
  });
};

/** New recorded context + page. Marks are seconds from (approximately) the start of the video. */
export async function newRec(browser, name, { theme = "light", lang = "en", zoom } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: `${RAW}/${name}`, size: { width: 1920, height: 1080 } },
    permissions: ["microphone", "clipboard-read", "clipboard-write"],
  });
  await ctx.addInitScript(INIT, { theme, lang });
  if (zoom) await ctx.addInitScript((z) => addEventListener("DOMContentLoaded", () => (document.documentElement.style.zoom = String(z))), zoom);
  const t0 = Date.now();
  const p = await ctx.newPage();
  const marks = {};
  const mark = (k) => { marks[k] = +((Date.now() - t0) / 1000).toFixed(2); console.log(`  [${name} ${marks[k]}s] ${k}`); return marks[k]; };
  const rec = { ctx, p, t0, marks, mark, cur: { x: 960, y: 540 }, errs: [] };
  p.on("pageerror", (e) => rec.errs.push(e.message.slice(0, 200)));
  return rec;
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export async function glide(rec, x, y, ms = 900) {
  const { p, cur } = rec;
  const n = Math.max(14, Math.round(ms / 16));
  const from = { ...cur };
  for (let i = 1; i <= n; i++) {
    const e = ease(i / n);
    await p.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await p.waitForTimeout(ms / n);
  }
  rec.cur = { x, y };
}

const centre = async (loc) => {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
};

/** Move the visible cursor onto an element slowly (no click). */
export async function pointAt(rec, loc, { ms = 1000, pause = 800 } = {}) {
  const c = await centre(loc);
  await glide(rec, c.x, c.y, ms);
  await rec.p.waitForTimeout(pause);
}

/** Glide, settle, click, then hold still. */
export async function clickOn(rec, loc, { ms = 1000, before = 500, after = 2200 } = {}) {
  const c = await centre(loc);
  await glide(rec, c.x, c.y, ms);
  await rec.p.waitForTimeout(before);
  await loc.click({ position: undefined, trial: false, force: false }).catch(async () => { await rec.p.mouse.click(c.x, c.y); });
  await rec.p.waitForTimeout(after);
}

/** Type like a person. */
export async function typeInto(rec, loc, text, { ms = 900 } = {}) {
  await clickOn(rec, loc, { ms, after: 400 });
  await rec.p.keyboard.type(text, { delay: 85 });
  await rec.p.waitForTimeout(900);
}

/** Smoothly scroll the page (or an element's scroll container) so `loc` is centred. */
export async function smoothTo(rec, loc, { ms = 1400, block = "center" } = {}) {
  await loc.evaluate((el, b) => el.scrollIntoView({ behavior: "smooth", block: b }), block);
  await rec.p.waitForTimeout(ms);
}

export const scrollPage = (rec, y, ms = 2200) =>
  rec.p.evaluate(([yy, d]) => new Promise((res) => {
    const s = scrollY, dist = yy - s, t0 = performance.now();
    const f = (now) => { const t = Math.min(1, (now - t0) / d); const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; scrollTo(0, s + dist * e); t < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), [y, ms]);

export const topOf = (loc, offset = 90) => loc.evaluate((el, o) => el.getBoundingClientRect().top + scrollY - o, offset);

/** Close the context so the video is written; returns the raw webm path. */
export async function finish(rec, name) {
  const v = rec.p.video();
  await rec.ctx.close();
  const path = await v.path();
  writeFileSync(`${RAW}/${name}.marks.json`, JSON.stringify({ marks: rec.marks, errors: rec.errs, raw: path }, null, 1));
  return path;
}

/** Cut [from, to] seconds of a raw video to H.264 mp4 (1080p, 30 fps, no audio). */
export function cut(raw, name, from, to) {
  const out = `${OUT}/${name}`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(Math.max(0, from)), "-to", String(to), "-i", raw, "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", out]);
  return out;
}

export const rawFiles = (name) => readdirSync(`${RAW}/${name}`).filter((f) => f.endsWith(".webm")).map((f) => `${RAW}/${name}/${f}`);

/** Cut several [from, to] ranges and join them (drops loading gaps). */
export function cutSegments(raw, name, ranges, pre = "") {
  const out = `${OUT}/${name}`;
  const f = ranges.map(([a, b], i) => `[0:v]${pre}trim=start=${a}:end=${b},setpts=PTS-STARTPTS[v${i}]`).join(";");
  const j = ranges.map((_, i) => `[v${i}]`).join("") + `concat=n=${ranges.length}:v=1:a=0[v]`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-filter_complex", `${f};${j}`, "-map", "[v]", "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  return out;
}
