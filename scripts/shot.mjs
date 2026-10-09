// Screenshot helper (uses installed Edge). Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs] [clickText]
import { chromium } from "playwright-core";
const [url, out, w = "1920", h = "1080", wait = "6000", click] = process.argv.slice(2);
const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
if (process.env.PYAU_SESSION) await p.addInitScript((s) => sessionStorage.setItem("pyau.demoSession", s), process.env.PYAU_SESSION);
const logs = [];
p.on("console", (m) => ["error", "warning"].includes(m.type()) && logs.push(m.type() + ": " + m.text().slice(0, 200)));
p.on("pageerror", (e) => logs.push("pageerror: " + e.message.slice(0, 200)));
await p.goto(url, { waitUntil: "load" });
for (const c of (click ? click.split("|") : [])) { await p.getByText(c).first().click(); await p.waitForTimeout(2500); }
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
console.log(logs.join("\n") || "no console errors");
await b.close();
