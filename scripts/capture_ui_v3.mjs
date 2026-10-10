// UI v3 evidence: landing (1920 + 390, light + dark), engineering page and architecture diagram (both flows, both themes).
// Usage: node scripts/capture_ui_v3.mjs <baseUrl> [outDir]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const base = process.argv[2];
const out = process.argv[3] ?? "docs/evidence/ui-v3";
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "msedge" });

const open = async (path, w, h, theme, lang = "en") => {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(([t, l]) => { localStorage.setItem("pyau.theme", t); localStorage.setItem("pyau.lang", l); }, [theme, lang]);
  await p.goto(base + path, { waitUntil: "load" });
  await p.waitForTimeout(3000);
  return { ctx, p, errs };
};
// scroll through the page so reveal and dot animations run, then come back to the top
const settle = async (p) => {
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 450) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(220); }
  await p.waitForTimeout(3500);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(600);
};

for (const theme of ["light", "dark"]) {
  for (const [w, h, tag] of [[1920, 1080, "1920"], [390, 780, "390"]]) {
    const { ctx, p, errs } = await open("/", w, h, theme);
    await settle(p);
    await p.screenshot({ path: `${out}/landing-${tag}-${theme}.png`, fullPage: true });
    console.log("landing", tag, theme, errs.join(";") || "no page errors");
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await open("/", 1920, 1080, theme, "hi");
    await settle(p);
    await p.screenshot({ path: `${out}/landing-hi-1920-${theme}.png`, fullPage: true });
    console.log("landing hi", theme, errs.join(";") || "no page errors");
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await open("/engineering", 1920, 1080, theme);
    const sec = p.locator("#architecture");
    await sec.scrollIntoViewIfNeeded();
    await p.waitForTimeout(800);
    await sec.screenshot({ path: `${out}/engineering-diagram-rider-${theme}.png` });
    await p.getByRole("button", { name: "The evening coverage run" }).click();
    await p.waitForTimeout(800);
    await sec.screenshot({ path: `${out}/engineering-diagram-run-${theme}.png` });
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/engineering-1920-${theme}.png`, fullPage: true });
    console.log("engineering", theme, errs.join(";") || "no page errors");
    await ctx.close();
  }
}
await b.close();
