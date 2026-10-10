// Real-browser checks (Edge): S04 host registration + morning check, and S07 trust loop in the demo room.
// Usage: node scripts/ui_host_trust.mjs <baseUrl> host|trust [outDir]
import { chromium } from "playwright-core";
const [base, which, out = "docs/evidence"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "msedge" });
const errs = [];
const t0 = Date.now();
const step = (s) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);

if (which === "host") {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${base}/host`, { waitUntil: "load" });
  await p.getByLabel("Name of your place").fill("Sharma Chai Stall");
  await p.getByRole("checkbox", { name: "Shade" }).check();
  await p.getByText(/Laxmi Nagar|Delhi/).first().waitFor({ timeout: 30000 });
  step("address from Places: " + (await p.locator("p.bg-canvas").first().innerText()));
  await p.screenshot({ path: `${out}/t10-host-form.png` });
  await p.getByRole("button", { name: /Register/ }).click();
  await p.getByText(/field|consent|Tick the box/i).first().waitFor({ timeout: 10000 });
  step("validation shown (consent missing)");
  await p.getByLabel(/may ask me/).check();
  await p.getByRole("button", { name: /Register/ }).click();
  await p.getByText(/Registered as H7/).waitFor({ timeout: 20000 });
  await p.getByText("Not confirmed today").first().waitFor({ timeout: 15000 });
  step("registered; shows Not confirmed today");
  await p.getByRole("button", { name: /send the morning check/ }).click();
  await p.getByText("Still serving water today?").waitFor({ timeout: 20000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/t10-host-freshness.png` });
  await p.getByRole("button", { name: /Yes/ }).click();
  await p.getByText(/Confirmed for today/).waitFor({ timeout: 20000 });
  await p.getByText(/Live 09:00/).first().waitFor({ timeout: 20000 });
  step("confirmed: live for riders");
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/t10-host-live.png` });
} else {
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${base}/demo`, { waitUntil: "load" });
  await p.getByText("Demo timers: 45 s").waitFor({ timeout: 30000 });
  await p.getByText("50%").first().waitFor({ timeout: 30000 });
  await p.getByRole("button", { name: "Jump to 14:00 tomorrow" }).click();
  await p.getByRole("radio", { name: "Area A" }).click();
  for (let i = 0; i < 2; i++) {
    await p.getByRole("button", { name: /Water/ }).click();
    await p.getByText(/Host confirmed/).first().waitFor({ timeout: 30000 });
    await p.getByRole("button", { name: /Problem/ }).click();
    await p.getByRole("button", { name: /No water/ }).click();
    await p.getByText(/^Thanks/).first().waitFor({ timeout: 20000 });
    step(`problem report ${i + 1}: ` + (await p.getByText(/^Thanks/).first().innerText()));
  }
  await p.getByText("Problem reports").first().waitFor({ timeout: 20000 });
  await p.getByText("27.3%").first().waitFor({ timeout: 20000 });
  step("coordinator: problem queue visible, coverage 27.3%");
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/t11-trust.png` });
  await p.getByRole("button", { name: "Reactivate" }).first().click();
  await p.getByText("50%").first().waitFor({ timeout: 20000 });
  step("reactivated -> coverage back to 50%");
}
console.log(errs.join("\n") || "no page errors");
await b.close();
