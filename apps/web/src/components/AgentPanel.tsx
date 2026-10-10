import { Link } from "react-router-dom";
import { ChevronRight, Play } from "lucide-react";
import type { Receipt, RunDetail } from "../api";
import { useLang } from "../i18n/lang";
import { I, StatusDot } from "./ui";

const fmtTime = (t: number) => new Date(t * 1000).toLocaleTimeString("en-GB", { hour12: false });

const TONE: Record<string, "water" | "heat" | "gap" | "muted"> = {
  QUEUED: "muted", PLANNING: "heat", AWAITING_APPROVAL: "heat", OUTREACH: "heat", COMPLETED: "water",
  FAILED: "gap", REJECTED: "muted", APPROVAL_EXPIRED: "muted", INSUFFICIENT_DATA: "heat", NO_GAPS: "water",
};

/** What the planner did, step by step: real tool receipts and workflow events (a log, not reasoning). */
export function AgentPanel({ events, detail, onRun, canRun, startError, replayId, readOnly }: {
  events: Receipt[]; detail?: RunDetail; onRun: () => void; canRun: boolean; startError: string; replayId?: string | null; readOnly?: boolean;
}) {
  const { t } = useLang();
  const run = detail?.run;
  const started = events[0]?.at;
  const last = events[events.length - 1]?.at;
  const elapsed = started ? Math.round(((run?.finishedAt ?? last ?? started) - started)) : 0;
  return (
    <section className="card p-4">
      <div className="flex items-center gap-2">
        <h2 className="m-0 text-lg font-semibold">{t("agent.title")}</h2>
        {run && (
          <span className="inline-flex items-center gap-2 text-base text-muted">
            <StatusDot tone={TONE[run.status] ?? "muted"} />
            {t(`run.${run.status}`)}
            {started && <span className="tnum">· {elapsed} s</span>}
          </span>
        )}
        {!readOnly && (
          <button
            className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-lg bg-water px-4 text-base font-semibold text-on-water disabled:opacity-50"
            onClick={onRun}
            disabled={!canRun}
          >
            <I icon={Play} size={16} />
            {t("agent.run")}
          </button>
        )}
      </div>
      {!readOnly && <p className="m-0 mt-2 text-[15px] text-muted">{t("agent.schedule")}</p>}
      {startError && (
        <p className="m-0 mt-2 text-gap">
          {startError}{" "}
          {replayId && <Link to={`/replay/${replayId}`} className="font-semibold underline">{t("agent.replay")}</Link>}
        </p>
      )}
      {run?.status === "FAILED" && <p className="m-0 mt-2 text-gap">{t("agent.failed", { error: run.error ?? "" })}</p>}
      {events.length === 0 && !run && <p className="m-0 mt-2 text-muted">{t("agent.idle")}</p>}
      <ol className="m-0 mt-2 list-none space-y-1 p-0">
        {events.map((e) => (
          <li key={e.seq} className="text-[15px]">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-baseline gap-2">
                <span className="w-[4.5rem] shrink-0 text-[14px] text-muted tnum">{fmtTime(e.at)}</span>
                <span className="min-w-0 flex-1">{e.summary}</span>
                <I icon={ChevronRight} size={14} className="shrink-0 self-center text-muted transition-transform group-open:rotate-90" />
              </summary>
              <pre className="my-1 ml-[4.5rem] overflow-auto rounded-lg bg-canvas p-2 text-[13px]">
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
