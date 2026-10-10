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
          <div className="flex min-w-[8.5rem] max-w-[11.5rem] flex-col gap-1 rounded-lg border border-border bg-panel p-3">
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
function Defs() {
  return (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" style={{ fill: "var(--standby)" }} />
      </marker>
      <marker id="arrowKey" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" style={{ fill: "var(--water)" }} />
      </marker>
    </defs>
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
      <rect x={640} y={14} width={408} height={294} rx={10} fill="none" stroke="var(--border)" strokeDasharray="5 4" />
      <text x={652} y={32} fontSize="13" fill="var(--muted)">{labels.map}</text>
      {GEDGES.map((e) => {
        const hit = seen.has(e.a) && seen.has(e.b);
        return (
          <g key={e.a + e.b}>
            <path d={e.d} fill="none" stroke={hit ? "var(--water)" : "var(--standby)"} opacity={hit ? 1 : 0.55} strokeWidth={hit ? 2 : 1.25} strokeDasharray={hit ? undefined : "4 3"} markerEnd={`url(#${hit ? "arrowKey" : "arrow"})`} />
            {e.label && <text x={e.lx} y={e.ly} textAnchor="middle" fontSize="13" fill="var(--muted)">{e.label}</text>}
          </g>
        );
      })}
      {/* MarkTimedOut goes back to PickNextHost: the next candidate host is asked */}
      <path d="M1025 197 H1038 V57 H817" fill="none" stroke={loopHit ? "var(--water)" : "var(--standby)"} opacity={loopHit ? 1 : 0.55} strokeWidth={loopHit ? 2 : 1.25} strokeDasharray={loopHit ? undefined : "4 3"} markerEnd={`url(#${loopHit ? "arrowKey" : "arrow"})`} />
      <text x={1032} y={92} fontSize="13" fill="var(--muted)" textAnchor="end">{labels.back}</text>
      {GN.map((n) => {
        const hit = seen.has(n.id);
        return (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={GH} rx={n.kind === "choice" ? 17 : 8} fill={hit ? "var(--water-soft)" : "var(--panel)"} stroke={hit ? "var(--water)" : "var(--standby)"} strokeWidth={hit ? 2 : 1.25} strokeDasharray={hit ? undefined : "4 3"} />
            <text x={n.x + n.w / 2} y={n.y + 22} textAnchor="middle" fontSize="14" fontWeight={hit ? 600 : 500} fill={hit ? "var(--ink)" : "var(--muted)"}>{n.label}</text>
          </g>
        );
      })}
      <g transform="translate(10 376)">
        <rect width="16" height="12" rx="3" fill="var(--water-soft)" stroke="var(--water)" strokeWidth="2" />
        <text x="24" y="11" fontSize="13" fill="var(--ink)">{labels.hit}</text>
        <rect x="190" width="16" height="12" rx="3" fill="var(--panel)" stroke="var(--standby)" strokeDasharray="3 2" />
        <text x="214" y="11" fontSize="13" fill="var(--muted)">{labels.miss}</text>
      </g>
    </svg>
  );
}

export type { ReactNode };
