// Drives /demo in a real browser (Edge) at 1920x1080 through the full loop with real clicks. Saves screenshots.
// Usage: node scripts/ui_loop.mjs <baseUrl> [outDir]
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "https://main.d1lgs9hxx2cuwt.amplifyapp.com";
const out = process.argv[3] ?? "docs/evidence";
const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["clipboard-read", "clipboard-write"] });
const p = await ctx.newPage();
const logs = [];
p.on("pageerror", (e) => logs.push("pageerror: " + e.message.slice(0, 200)));
p.on("console", (m) => m.type() === "error" && !/404|favicon/.test(m.text()) && logs.push("console: " + m.text().slice(0, 200)));
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
const t0 = Date.now();
const step = (s) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);

await p.goto(`${base}/demo`, { waitUntil: "load" });
await p.getByText("Demo timers: 45 s").waitFor({ timeout: 30000 });
await p.getByText("50%").first().waitFor({ timeout: 30000 });
step("demo room loaded, coverage 50%");
await p.waitForTimeout(4000);
await shot("t08-demo-before");

await p.getByRole("button", { name: "Run coverage plan" }).click();
await p.getByText("Review the plan").waitFor({ timeout: 240000 });
step("proposal visible");
await p.waitForTimeout(1500);
await shot("t08-demo-proposal");

await p.getByLabel("I reviewed the messages and the unfilled gaps").check();
await p.getByRole("button", { name: "Approve outreach" }).click();
await p.getByText(/Asking .* left/).first().waitFor({ timeout: 60000 });
step("H4 countdown visible");
await p.getByRole("tab", { name: /H4/ }).click();
await p.getByText(/(left|बाकी)$/).first().waitFor({ timeout: 20000 });
await p.waitForTimeout(1500);
await shot("t08-demo-countdown");

await p.getByText("no reply — timed out").first().waitFor({ timeout: 90000 });
step("H4 timed out (real countdown)");
await p.getByRole("tab", { name: /H5/ }).click();
await p.getByRole("button", { name: /I'll do it/ }).click();
step("H5 tapped Yes");
await p.getByText("Run summary").waitFor({ timeout: 90000 });
await p.getByText("90.9%").first().waitFor({ timeout: 30000 });
step("coverage 90.9% shown");
await p.waitForTimeout(2500);
await shot("t08-demo-after");

await p.getByRole("button", { name: "Jump to 14:00 tomorrow" }).click();
await p.waitForTimeout(2500);
await p.getByRole("button", { name: /Water/ }).click();
await p.getByText(/Host confirmed/).first().waitFor({ timeout: 30000 });
step("rider answer visible");
await p.waitForTimeout(3500);
await shot("t08-demo-rider");
await p.getByRole("button", { name: "Copy run ID" }).click();
const copied = await p.evaluate(() => navigator.clipboard.readText());
step("copied run id: " + copied);
console.log(logs.join("\n") || "no page errors");
await b.close();
