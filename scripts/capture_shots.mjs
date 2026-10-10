// Captures REAL screenshots of the deployed app for the landing page (rider phone, plan review, host inbox), light and dark.
// Output: apps/web/public/shots/{rider,plan,host}-{light,dark}.png. Usage: node scripts/capture_shots.mjs <baseUrl> <session-json>
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const [base, sessionJson] = process.argv.slice(2);
const out = "apps/web/public/shots";
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "msedge" });
const init = (theme, session) => ({ theme, session });
const prep = async (p, theme, session) => {
  await p.addInitScript(([t, s]) => {
    localStorage.setItem("pyau.lang", "en");
    if (t) localStorage.setItem("pyau.theme", t);
    if (s) sessionStorage.setItem("pyau.demoSession", s);
    sessionStorage.setItem("pyau.coachDismissed", "1");
  }, [theme, session]);
};

// 1. Rider phone with the answer card visible (seeded session at 14:00 with the real H5 acceptance record)
for (const th of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 330, height: 790 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  await prep(p, th, sessionJson);
  await p.goto(`${base}/ride`, { waitUntil: "load" });
  await p.getByRole("button", { name: /^Water$/ }).waitFor({ timeout: 30000 });
  await p.waitForTimeout(3000);
  await p.getByRole("button", { name: /^Water$/ }).click();
  await p.getByText(/Host confirmed/).first().waitFor({ timeout: 30000 });
  await p.waitForTimeout(4500);
  // the phone mockup shows the rider app itself: hide the demo-location bar and the page header, shoot the panel only
  await p.evaluate(() => { const bar = [...document.querySelectorAll("span")].find((e) => e.textContent === "Demo location"); bar?.parentElement && (bar.parentElement.style.display = "none"); });
  await p.waitForTimeout(600);
  await p.locator("div.min-h-0.flex-1").first().screenshot({ path: `${out}/rider-${th}.png` });
  console.log("rider", th);
  await ctx.close();
}

// 2. Coordinator plan review and the host inbox, from one real run (plan card first, then the open ask on the H4 phone)
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await prep(p, "light", null);
await p.goto(`${base}/demo`, { waitUntil: "load" });
await p.getByText("50%").first().waitFor({ timeout: 30000 });
await p.getByRole("button", { name: "Run coverage plan" }).click();
await p.getByText("Review the plan").waitFor({ timeout: 240000 });
await p.waitForTimeout(2500);
const plan = () => p.locator("section", { hasText: "Review the plan" }).filter({ has: p.getByText("We'll ask in this order:") }).first();
const toggle = () => p.getByRole("button", { name: /Switch to (dark|light) theme/ }).click();
const frames = () => p.locator('div[style*="width: 390px"]');
await plan().screenshot({ path: `${out}/plan-light.png` });
await toggle();
await p.waitForTimeout(2500);
await plan().screenshot({ path: `${out}/plan-dark.png` });
await toggle();
await p.waitForTimeout(1500);
await p.getByLabel("I reviewed the messages and the unfilled gaps").check();
await p.getByRole("button", { name: "Approve outreach" }).click();
await p.getByText(/Asking .* left/).first().waitFor({ timeout: 60000 });
await p.getByRole("tab", { name: /H4/ }).click();
await p.getByText(/(left|बाकी)$/).first().waitFor({ timeout: 20000 });
await p.waitForTimeout(1200);
await frames().nth(1).screenshot({ path: `${out}/host-light.png` });
await toggle();
await p.waitForTimeout(2000);
await frames().nth(1).screenshot({ path: `${out}/host-dark.png` });
console.log("plan + host done");
await b.close();
