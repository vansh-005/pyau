import { Link } from "react-router-dom";
import type { Receipt, RunDetail } from "../api";

const fmtTime = (t: number) => new Date(t * 1000).toLocaleTimeString("en-GB", { hour12: false });

const TYPE_LABEL: Record<string, string> = {
  tool_receipt: "tool", run_started: "run", run_queued: "run", proposal_ready: "plan", awaiting_approval: "wait",
  plan_approved: "approved", ask_sent: "ask", ask_timed_out: "timeout", ask_answered: "host", point_published: "live",
  gap_unresolved: "gap", run_completed: "done", run_failed: "failed", host_skipped: "skip", approval_expired: "expired",
  plan_rejected: "rejected", run_finished: "run",
};

/** Real run events: tool receipts (not reasoning) and workflow transitions, newest at the bottom. */
export function AgentPanel({ events, detail, onRun, canRun, startError, replayId, readOnly }: {
  events: Receipt[]; detail?: RunDetail; onRun: () => void; canRun: boolean; startError: string; replayId?: string | null; readOnly?: boolean;
}) {
  const run = detail?.run;
  const started = events[0]?.at;
  const last = events[events.length - 1]?.at;
  const elapsed = started ? Math.round(((run?.finishedAt ?? last ?? started) - started)) : 0;
  return (
    <section className="card p-3">
      <div className="flex items-center gap-3">
        <h2 className="m-0 text-lg font-semibold">Coverage agent</h2>
        {run && <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-sm">{run.status}</span>}
        {started && <span className="font-mono text-sm text-muted">{elapsed}s</span>}
        {!readOnly && (
          <button
            className="ml-auto min-h-11 rounded-lg bg-clay px-4 text-base font-semibold text-white disabled:opacity-50"
            onClick={onRun}
            disabled={!canRun}
          >
            Run coverage plan
          </button>
        )}
      </div>
      {startError && (
        <p className="m-0 mt-2 text-gap">
          {startError}{" "}
          {replayId && <Link to={`/replay/${replayId}`} className="font-semibold underline">Open the saved run replay</Link>}
        </p>
      )}
      {run?.status === "FAILED" && <p className="m-0 mt-2 text-gap">Run failed: {run.error ?? "see events"}. Starting again creates a new run.</p>}
      {events.length === 0 && !run && <p className="m-0 mt-2 text-muted">Idle. The agent reads the heat outlook, demand and coverage, then proposes who to ask.</p>}
      <ol className="m-0 mt-2 list-none space-y-1 p-0">
        {events.map((e) => (
          <li key={e.seq} className="text-[15px]">
            <details>
              <summary className="cursor-pointer list-none">
                <span className="font-mono text-sm text-muted">{fmtTime(e.at)}</span>{" "}
                <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs uppercase text-muted">{TYPE_LABEL[e.type] ?? e.type}</span>{" "}
                <span>{e.summary}</span>
              </summary>
              <pre className="m-1 overflow-auto rounded-lg bg-canvas p-2 font-mono text-xs">
                {e.type === "tool_receipt"
                  ? `${(e.data as { tool?: string }).tool}(${(e.data as { input?: string }).input ?? ""})  ${(e.data as { durationMs?: number }).durationMs} ms\n→ ${(e.data as { output?: string }).output ?? ""}`
                  : JSON.stringify(e.data, null, 1)}
              </pre>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
