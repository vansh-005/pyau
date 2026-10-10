import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { I } from "./ui";

/* ---------- small step diagram (HTML, wraps on narrow screens) ---------- */
export function StepFlow({ steps, label }: { steps: { icon: LucideIcon; title: string; text?: string }[]; label: string }) {
  return (
    <ol aria-label={label} className="m-0 flex list-none flex-wrap items-stretch gap-y-2 p-0">
      {steps.map((s, i) => (
        <li key={i} className="flex items-stretch">
          <div className="flex min-w-[8.5rem] max-w-[11.5rem] flex-col gap-1 rounded-lg border border-border bg-white p-3">
            <span className="text-water"><I icon={s.icon} size={20} /></span>
            <span className="text-[15px] font-semibold leading-tight">{s.title}</span>
            {s.text && <span className="text-[14px] leading-snug text-muted">{s.text}</span>}
          </div>
          {i < steps.length - 1 && <span aria-hidden className="flex items-center px-1 text-muted"><ChevronRight size={18} strokeWidth={1.75} /></span>}
        </li>
      ))}
    </ol>
  );
}

/* ---------- SVG primitives ---------- */
type Box = { id: string; x: number; y: number; w: number; h: number; label: string; sub?: string; tone?: "aws" | "user" | "key" };

function Defs() {
  return (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill="#566573" />
      </marker>
      <marker id="arrowKey" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill="#0a6c94" />
      </marker>
    </defs>
  );
}

function Node({ b }: { b: Box }) {
  const key = b.tone === "key", user = b.tone === "user";
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={user ? "#f8fafb" : "#fff"} stroke={key ? "#0a6c94" : "#566573"} strokeWidth={key ? 2 : 1.25} strokeDasharray={user ? "4 3" : undefined} />
      <text x={b.x + b.w / 2} y={b.y + (b.sub ? b.h / 2 - 3 : b.h / 2 + 5)} textAnchor="middle" fontSize="14" fontWeight="600" fill="#0e1a22">{b.label}</text>
      {b.sub && <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 14} textAnchor="middle" fontSize="13" fill="#566573">{b.sub}</text>}
    </g>
  );
}

const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
function edgePoint(b: Box, toward: { x: number; y: number }) {
  const c = center(b);
  const dx = toward.x - c.x, dy = toward.y - c.y;
  const sx = dx === 0 ? Infinity : (b.w / 2) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (b.h / 2) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

function Edge({ a, b, label, key_, dashed, dx = 0, dy = 0 }: { a: Box; b: Box; label?: string; key_?: boolean; dashed?: boolean; dx?: number; dy?: number }) {
  const p1 = edgePoint(a, center(b)), p2 = edgePoint(b, center(a));
  const mx = (p1.x + p2.x) / 2 + dx, my = (p1.y + p2.y) / 2 + dy;
  return (
    <g>
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={key_ ? "#0a6c94" : "#566573"} strokeWidth={key_ ? 1.75 : 1.25} strokeDasharray={dashed ? "4 3" : undefined} markerEnd={`url(#${key_ ? "arrowKey" : "arrow"})`} />
      {label && <text x={mx} y={my - 5} textAnchor="middle" fontSize="13" fill="#566573" stroke="#fff" strokeWidth="4" paintOrder="stroke">{label}</text>}
    </g>
  );
}

/* ---------- architecture (only services that are deployed) ---------- */
export function ArchitectureDiagram({ labels }: { labels: Record<string, string> }) {
  const B: Record<string, Box> = {
    browser: { id: "browser", x: 10, y: 250, w: 150, h: 60, label: labels.browser, sub: labels.browserSub, tone: "user" },
    amplify: { id: "amplify", x: 230, y: 40, w: 170, h: 50, label: "AWS Amplify", sub: labels.amplify },
    maps: { id: "maps", x: 230, y: 130, w: 170, h: 50, label: "Amazon Location", sub: labels.maps },
    apigw: { id: "apigw", x: 230, y: 255, w: 170, h: 50, label: "API Gateway", sub: "HTTP API" },
    api: { id: "api", x: 470, y: 255, w: 170, h: 50, label: "API Lambda", sub: "Python 3.12" },
    loc: { id: "loc", x: 740, y: 20, w: 190, h: 46, label: "Location Places + Routes", sub: labels.loc },
    polly: { id: "polly", x: 740, y: 80, w: 190, h: 46, label: "Amazon Polly", sub: labels.polly },
    trans: { id: "trans", x: 740, y: 140, w: 190, h: 46, label: "Amazon Transcribe", sub: labels.trans },
    s3: { id: "s3", x: 740, y: 200, w: 190, h: 46, label: "Amazon S3", sub: labels.s3 },
    ddb: { id: "ddb", x: 740, y: 300, w: 190, h: 46, label: "Amazon DynamoDB", sub: labels.ddb },
    sched: { id: "sched", x: 10, y: 420, w: 190, h: 50, label: "EventBridge Scheduler", sub: labels.sched },
    wf: { id: "wf", x: 250, y: 420, w: 170, h: 50, label: "Workflow Lambda", sub: labels.wf },
    sfn: { id: "sfn", x: 470, y: 420, w: 170, h: 56, label: "AWS Step Functions", sub: labels.sfn, tone: "key" },
    agent: { id: "agent", x: 470, y: 520, w: 170, h: 56, label: "Agent Lambda", sub: labels.agent, tone: "key" },
    bedrock: { id: "bedrock", x: 740, y: 520, w: 190, h: 56, label: "Amazon Bedrock", sub: "Nova 2 Lite", tone: "key" },
    cw: { id: "cw", x: 740, y: 420, w: 190, h: 50, label: "Amazon CloudWatch", sub: labels.cw },
  };
  return (
    <svg viewBox="0 0 960 600" role="img" aria-label={labels.aria} className="w-full">
      <Defs />
      {/* edges first so boxes sit on top */}
      <Edge a={B.browser} b={B.amplify} label={labels.eLoad} dx={-44} dy={-4} />
      <Edge a={B.browser} b={B.maps} label={labels.eTiles} dx={-44} dy={16} />
      <Edge a={B.browser} b={B.apigw} />
      <Edge a={B.apigw} b={B.api} />
      <Edge a={B.api} b={B.ddb} />
      <Edge a={B.api} b={B.s3} />
      <Edge a={B.api} b={B.loc} />
      <Edge a={B.api} b={B.polly} />
      <Edge a={B.api} b={B.trans} />
      <Edge a={B.api} b={B.sfn} label={labels.eStart} key_ dx={-62} />
      <Edge a={B.sched} b={B.wf} />
      <Edge a={B.sfn} b={B.wf} label={labels.eTasks} key_ dy={-6} />
      <Edge a={B.sfn} b={B.agent} key_ />
      <Edge a={B.agent} b={B.bedrock} label={labels.eTools} key_ />
      <Edge a={B.sfn} b={B.cw} label={labels.eLogs} dashed />
      <Edge a={B.wf} b={B.ddb} dashed dy={-8} />
      {Object.values(B).map((b) => <Node key={b.id} b={b} />)}
    </svg>
  );
}

/* ---------- Step Functions execution graph, drawn from a real execution's history ---------- */
type G = { id: string; x: number; y: number; w: number; label: string; kind?: "choice" | "end" };
const GH = 34;
const GN: G[] = [
  { id: "PlanWithAgent", x: 10, y: 40, w: 150, label: "PlanWithAgent" },
  { id: "HasProposal", x: 230, y: 40, w: 140, label: "HasProposal", kind: "choice" },
  { id: "AwaitApproval", x: 440, y: 40, w: 160, label: "AwaitApproval" },
  { id: "PickNextHost", x: 665, y: 40, w: 150, label: "PickNextHost" },
  { id: "HasHost", x: 665, y: 110, w: 150, label: "HasHost", kind: "choice" },
  { id: "AskHost", x: 665, y: 180, w: 150, label: "AskHost" },
  { id: "HostDecision", x: 665, y: 250, w: 150, label: "HostDecision", kind: "choice" },
  { id: "MarkUnresolved", x: 905, y: 110, w: 120, label: "MarkUnresolved" },
  { id: "MarkTimedOut", x: 905, y: 180, w: 120, label: "MarkTimedOut" },
  { id: "PublishPoint", x: 905, y: 250, w: 120, label: "PublishPoint" },
  { id: "Summarize", x: 440, y: 330, w: 160, label: "Summarize" },
  { id: "Done", x: 230, y: 330, w: 140, label: "Done", kind: "end" },
];
const gn = (id: string) => GN.find((n) => n.id === id)!;
const right = (id: string) => ({ x: gn(id).x + gn(id).w, y: gn(id).y + GH / 2 });
const left = (id: string) => ({ x: gn(id).x, y: gn(id).y + GH / 2 });
const bottom = (id: string) => ({ x: gn(id).x + gn(id).w / 2, y: gn(id).y + GH });
const top = (id: string) => ({ x: gn(id).x + gn(id).w / 2, y: gn(id).y });

type GE = { a: string; b: string; d: string; label?: string; lx?: number; ly?: number };
const GEDGES: GE[] = [
  { a: "PlanWithAgent", b: "HasProposal", d: `M${right("PlanWithAgent").x} 57 H${left("HasProposal").x - 2}` },
  { a: "HasProposal", b: "AwaitApproval", d: `M${right("HasProposal").x} 57 H${left("AwaitApproval").x - 2}`, label: "proposal", lx: 405, ly: 50 },
  { a: "AwaitApproval", b: "PickNextHost", d: `M${right("AwaitApproval").x} 57 H${left("PickNextHost").x - 2}` },
  { a: "PickNextHost", b: "HasHost", d: `M${bottom("PickNextHost").x} ${bottom("PickNextHost").y} V${top("HasHost").y - 2}` },
  { a: "HasHost", b: "AskHost", d: `M${bottom("HasHost").x} ${bottom("HasHost").y} V${top("AskHost").y - 2}` },
  { a: "AskHost", b: "HostDecision", d: `M${bottom("AskHost").x} ${bottom("AskHost").y} V${top("HostDecision").y - 2}` },
  { a: "HasHost", b: "MarkUnresolved", d: `M${right("HasHost").x} 127 H${left("MarkUnresolved").x - 2}`, label: "none left", lx: 860, ly: 120 },
  { a: "AskHost", b: "MarkTimedOut", d: `M${right("AskHost").x} 197 H${left("MarkTimedOut").x - 2}`, label: "timeout", lx: 860, ly: 190 },
  { a: "HostDecision", b: "PublishPoint", d: `M${right("HostDecision").x} 267 H${left("PublishPoint").x - 2}`, label: "yes", lx: 860, ly: 260 },
  { a: "PublishPoint", b: "Summarize", d: `M${bottom("PublishPoint").x} ${bottom("PublishPoint").y} V347 H${right("Summarize").x + 2}` },
  { a: "Summarize", b: "Done", d: `M${left("Summarize").x} 347 H${right("Done").x + 2}` },
];

export function ExecutionGraph({ visited, labels }: { visited: string[]; labels: { aria: string; map: string; hit: string; miss: string; back: string } }) {
  const seen = new Set(visited);
  const loopHit = seen.has("MarkTimedOut");
  return (
    <svg viewBox="0 0 1060 400" role="img" aria-label={labels.aria} className="w-full">
      <Defs />
      <rect x={640} y={14} width={408} height={294} rx={10} fill="none" stroke="#e2e8ee" strokeDasharray="5 4" />
      <text x={652} y={32} fontSize="13" fill="#566573">{labels.map}</text>
      {GEDGES.map((e) => {
        const hit = seen.has(e.a) && seen.has(e.b);
        return (
          <g key={e.a + e.b}>
            <path d={e.d} fill="none" stroke={hit ? "#0a6c94" : "#c5ced6"} strokeWidth={hit ? 2 : 1.25} strokeDasharray={hit ? undefined : "4 3"} markerEnd={`url(#${hit ? "arrowKey" : "arrow"})`} />
            {e.label && <text x={e.lx} y={e.ly} textAnchor="middle" fontSize="13" fill="#566573">{e.label}</text>}
          </g>
        );
      })}
      {/* MarkTimedOut goes back to PickNextHost: the next candidate host is asked */}
      <path d="M1025 197 H1038 V57 H817" fill="none" stroke={loopHit ? "#0a6c94" : "#c5ced6"} strokeWidth={loopHit ? 2 : 1.25} strokeDasharray={loopHit ? undefined : "4 3"} markerEnd={`url(#${loopHit ? "arrowKey" : "arrow"})`} />
      <text x={1032} y={92} fontSize="13" fill="#566573" textAnchor="end">{labels.back}</text>
      {GN.map((n) => {
        const hit = seen.has(n.id);
        return (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={GH} rx={n.kind === "choice" ? 17 : 8} fill={hit ? "#e6f2f7" : "#fff"} stroke={hit ? "#0a6c94" : "#9aa6b1"} strokeWidth={hit ? 2 : 1.25} strokeDasharray={hit ? undefined : "4 3"} />
            <text x={n.x + n.w / 2} y={n.y + 22} textAnchor="middle" fontSize="14" fontWeight={hit ? 600 : 500} fill={hit ? "#0e1a22" : "#566573"}>{n.label}</text>
          </g>
        );
      })}
      <g transform="translate(10 376)">
        <rect width="16" height="12" rx="3" fill="#e6f2f7" stroke="#0a6c94" strokeWidth="2" />
        <text x="24" y="11" fontSize="13" fill="#0e1a22">{labels.hit}</text>
        <rect x="190" width="16" height="12" rx="3" fill="#fff" stroke="#9aa6b1" strokeDasharray="3 2" />
        <text x="214" y="11" fontSize="13" fill="#566573">{labels.miss}</text>
      </g>
    </svg>
  );
}

export function Pot({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="A clay water pot with a ladle" className="shrink-0">
      <ellipse cx="80" cy="146" rx="46" ry="7" fill="#e2e8ee" />
      <path d="M62 28h36" stroke="#0a6c94" strokeWidth="6" strokeLinecap="round" />
      <path d="M66 28v18C42 54 28 76 28 100c0 28 22 46 52 46s52-18 52-46c0-24-14-46-38-54V28" fill="#e6f2f7" stroke="#0a6c94" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M46 96c10-8 22-8 34 0s24 8 34 0" fill="none" stroke="#0a6c94" strokeWidth="6" strokeLinecap="round" />
      <path d="M116 38c14-14 26-14 30-4" fill="none" stroke="#566573" strokeWidth="5" strokeLinecap="round" />
      <circle cx="148" cy="36" r="8" fill="#fff" stroke="#566573" strokeWidth="5" />
    </svg>
  );
}

export function SampleDots({ covered, total, label }: { covered: number; total: number; label: string }) {
  return (
    <div>
      <p className="m-0 mb-1 text-[15px] font-medium">{label}</p>
      <div className="flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`inline-block h-3 w-3 rounded-full border-[1.5px] ${i < covered ? "border-water bg-water" : "border-gap bg-white"}`} />
        ))}
      </div>
    </div>
  );
}

export type { ReactNode };
