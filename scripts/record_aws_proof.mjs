// S09: Step Functions execution graph + CloudWatch Logs Insights for the run id of S05/S06, recorded in the AWS console
// through a temporary read-only federated sign-in (scripts/aws_console_signin.py -> .tmp/.signin, never printed or committed).
// Account ids are masked ON SCREEN by rewriting 12-digit / 4-4-4 numbers to asterisks (a privacy mask, nothing else is altered).
// Usage: node scripts/record_aws_proof.mjs <runId>
import { chromium } from "playwright-core";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { cutSegments, pointAt, clickOn, RAW } from "./record_lib.mjs";

const runId = process.argv[2] ?? readFileSync(".tmp/footage/raw/main.runid.txt", "utf8").trim();
const outs = JSON.parse(readFileSync("infra/outputs.json", "utf8")).PyauStack;
const arn = outs.StateMachineArn.replace(":stateMachine:", ":execution:") + ":" + runId;
const logGroup = outs.StateMachineLogGroup;
const STATE = ".tmp/.console-state.json";
const R = "ap-south-1";
// the 1536x864 page sits in the corner of the 1920x1080 frame: crop it and scale it up (125% zoom)
export const AWS_PRE = "crop=1536:864:0:0,scale=1920:1080:flags=lanczos,";
const soft = async (label, fn) => { try { await fn(); } catch (e) { console.log(`  (skipped: ${label}: ${String(e.message).split("\n")[0]})`); } };

const MASK = () => {
  const re = /\b\d{4}-\d{4}-\d{4}\b|\b\d{12}\b/g;
  const scrub = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const todo = [];
    while (w.nextNode()) if (re.test(w.currentNode.nodeValue)) todo.push(w.currentNode);
    re.lastIndex = 0;
    for (const n of todo) n.nodeValue = n.nodeValue.replace(re, "************");
  };
  const start = () => {
    scrub(document.documentElement);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") { if (re.test(m.target.nodeValue)) { m.target.nodeValue = m.target.nodeValue.replace(re, "************"); } re.lastIndex = 0; }
        else m.addedNodes.forEach((n) => scrub(n.nodeType === 3 ? n.parentNode : n));
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  };
  if (document.documentElement) start(); else addEventListener("DOMContentLoaded", start);
};

const enc = (s) => s.replace(/[^A-Za-z0-9]/g, (c) => "*" + c.charCodeAt(0).toString(16).padStart(2, "0"));
const query = `fields @timestamp, type, details.name\n| filter execution_arn like /${runId}/\n| filter type in ["ExecutionStarted", "TaskTimedOut", "TaskSucceeded", "ExecutionSucceeded"]\n| sort @timestamp asc`;
const insights = `https://${R}.console.aws.amazon.com/cloudwatch/home?region=${R}#logsV2:logs-insights$3FqueryDetail$3D~(end~0~start~-10800~timeType~'RELATIVE~tz~'LOCAL~unit~'seconds~editorString~'${enc(query)}~source~(~'${enc(logGroup)})~lang~'CWLI)`;

const b = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const dismiss = async (p) => {
  for (let i = 0; i < 8; i++) {
    const btn = p.getByRole("button", { name: /^(Next|Done|OK|Skip|Got it|Dismiss|Close|Finish|No thanks|Not now)$/i }).first();
    if (!(await btn.isVisible().catch(() => false))) break;
    await btn.click().catch(() => {});
    await p.waitForTimeout(600);
  }
};

// ---- prep (not recorded): sign in once, dismiss tours, keep the session cookies for the recorded context
if (existsSync(".tmp/.signin")) {
  const ctx = await b.newContext({ viewport: { width: 1536, height: 864 } });
  const p = await ctx.newPage();
  await p.goto(readFileSync(".tmp/.signin", "utf8"), { waitUntil: "domcontentloaded", timeout: 60000 });
  unlinkSync(".tmp/.signin");
  await p.waitForTimeout(6000);
  await dismiss(p);
  await ctx.storageState({ path: STATE });
  await ctx.close();
}
if (!existsSync(STATE)) throw new Error("no console session: run scripts/aws_console_signin.py first");
{
  const ctx = await b.newContext({ viewport: { width: 1536, height: 864 }, storageState: STATE });
  const p = await ctx.newPage();
  await p.goto(`https://${R}.console.aws.amazon.com/states/home?region=${R}#/v2/executions/details/${arn}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(9000);
  await dismiss(p);
  await p.goto(insights, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(9000);
  await dismiss(p);
  await ctx.storageState({ path: STATE });
  await ctx.close();
}

// ---- recorded: 1536x864 CSS viewport scaled into the 1920x1080 video = 125% zoom
const rec = await (async () => {
  const ctx = await b.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25, storageState: STATE, recordVideo: { dir: `${RAW}/aws`, size: { width: 1920, height: 1080 } } });
  await ctx.addInitScript(MASK);
  const t0 = Date.now();
  const p = await ctx.newPage();
  const marks = {};
  return { ctx, p, t0, marks, cur: { x: 768, y: 432 }, errs: [], mark(k) { marks[k] = +((Date.now() - t0) / 1000).toFixed(2); console.log(`  [aws ${marks[k]}s] ${k}`); } };
})();
const { p } = rec;
try {
  await p.goto(`https://${R}.console.aws.amazon.com/states/home?region=${R}#/v2/executions/details/${arn}`, { waitUntil: "domcontentloaded" });
  await p.getByText("Succeeded").first().waitFor({ timeout: 60000 });
  await p.mouse.move(768, 432);
  await dismiss(p);
  await p.waitForTimeout(4000);
  rec.mark("execution-header");
  await soft("graph", async () => {
    await p.getByText("Graph view").first().scrollIntoViewIfNeeded();
    await p.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
    await p.waitForTimeout(3500);
  });
  rec.mark("graph");
  await p.waitForTimeout(3000);
  await soft("zoom graph", async () => {
    for (let i = 0; i < 2; i++) { await clickOn(rec, p.getByRole("button", { name: /zoom in/i }).first(), { ms: 800, after: 900 }); }
  });
  for (const name of ["MarkTimedOut", "PublishPoint"]) {
    await soft(`click ${name}`, async () => {
      const node = p.locator("svg, [class*=graph]").getByText(name, { exact: true }).first();
      await pointAt(rec, node, { ms: 1200, pause: 600 });
      await node.click();
      await p.waitForTimeout(3500);
    });
    rec.mark(`step-${name}`);
  }
  await soft("table view", async () => {
    await clickOn(rec, p.getByText("Table view").first(), { after: 3500 });
    await p.evaluate(() => window.scrollBy({ top: 360, behavior: "smooth" }));
    await p.waitForTimeout(4500);
  });
  rec.mark("events");
  // CloudWatch Logs Insights, query pre-filled with the run id
  rec.mark("events-end");
  // load the CloudWatch app first, then switch to Logs Insights inside it (a direct deep link sometimes renders blank)
  for (let attempt = 1; attempt <= 3; attempt++) {
    await p.goto(`https://${R}.console.aws.amazon.com/cloudwatch/home?region=${R}#home:`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(12000);
    await p.goto(insights, { waitUntil: "domcontentloaded" });
    const ok = await p.locator("button", { hasText: /^Run/ }).first().waitFor({ timeout: 45000 }).then(() => true, () => false);
    if (ok) break;
    console.log(`  (Insights did not render, attempt ${attempt})`);
    if (attempt === 3) throw new Error("Logs Insights did not render");
  }
  await p.waitForTimeout(1500);
  await dismiss(p);
  await p.waitForTimeout(1500);
  rec.mark("insights-open");
  await p.waitForTimeout(3000);
  await soft("run query", async () => {
    await clickOn(rec, p.locator("button", { hasText: /^Run/ }).first(), { after: 500 });
    await p.getByText(/ExecutionSucceeded/).first().waitFor({ timeout: 60000 });
    rec.mark("query-done");
  });
  await p.waitForTimeout(3000);
  rec.mark("insights-results");
  await soft("scroll results", async () => {
    await p.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
    await p.waitForTimeout(4500);
  });
  rec.mark("end");
} finally {
  const v = p.video();
  await rec.ctx.close();
  const raw = await v.path();
  writeFileSync(`${RAW}/aws.marks.json`, JSON.stringify({ marks: rec.marks, raw }, null, 1));
  const M = rec.marks;
  if (M.end) cutSegments(raw, "09-aws-proof.mp4", [[4, M["events-end"] + 0.5], [M["insights-open"] - 0.5, M.end + 1]], AWS_PRE);
  await b.close();
}
