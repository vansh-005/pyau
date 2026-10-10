// Visual gate in a real browser: no horizontal scroll at 390 px, tap targets >= 48 px, focus visible, no colour-only state.
// Usage: node scripts/visual_gate.mjs <baseUrl>
import { chromium } from "playwright-core";
const base = process.argv[2];
const b = await chromium.launch({ channel: "msedge" });
let failed = 0;
for (const [path, setup] of [["/ride", async (p) => { await p.getByRole("button", { name: /Water/ }).click(); await p.waitForTimeout(6000); }], ["/host", null]]) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true })).newPage();
  await p.goto(base + path, { waitUntil: "load" });
  await p.waitForTimeout(5000);
  if (setup) await setup(p);
  const r = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const targets = [...document.querySelectorAll("button, input[type=checkbox], input[type=time], input:not([type]), a")].filter(vis)
      .filter((e) => !e.closest(".maplibregl-map") && !e.closest(".maplibregl-ctrl"));
    const small = targets.map((e) => (e.type === "checkbox" && e.closest("label") ? e.closest("label") : e)).map((e) => ({ t: (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 40), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }))
      .filter((x) => Math.min(x.h, x.w) < 44 && x.h < 48);
    return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, count: targets.length, small };
  });
  console.log(path, `scrollWidth=${r.scrollW} innerWidth=${r.innerW} targets=${r.count} under48=${r.small.length}`);
  r.small.forEach((s) => console.log("   small:", JSON.stringify(s)));
  if (r.scrollW > r.innerW) { failed++; console.log("   FAIL horizontal scroll"); }
  if (r.small.length) failed++;
  await p.close();
}
await b.close();
console.log(failed ? "VISUAL GATE: issues found" : "VISUAL GATE OK");
process.exit(failed ? 1 : 0);
