import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCoverage, type MapResponse } from "../api";
import { isTerminal, type useRun } from "../hooks";
import { AgentPanel } from "./AgentPanel";
import { Loading } from "./Loading";
import { HeatCurve } from "./HeatCurve";
import { MapView } from "./MapView";
import { OutreachBoard } from "./OutreachBoard";
import { PlanReview } from "./PlanReview";
import { ProblemQueue } from "./ProblemQueue";

export interface CoordinatorPanelProps {
  sessionId: string;
  zoneId: string;
  token: string;
  map: MapResponse;
  run: ReturnType<typeof useRun>;
}

/** Coordinator centre: heat curve, the API's coverage number, cluster map, agent receipts, plan review, outreach board. */
export function CoordinatorPanel({ sessionId, zoneId, token, map, run }: CoordinatorPanelProps) {
  const cov = useQuery({
    queryKey: ["coverage", sessionId],
    queryFn: () => getCoverage(zoneId, sessionId, token),
    refetchInterval: () => (document.hidden ? false : 4000),
  });
  const d = cov.data;
  const detail = run.detail;
  const status = detail?.run.status;
  const busy = !!status && !isTerminal(status);
  const scroller = useRef<HTMLDivElement>(null);
  // New phase (proposal, outreach, summary): show it from the top so the active card is always on screen.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [status, detail?.proposal?.status, run.runId]);
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-3">
      {cov.error && <p className="m-0 text-gap">{(cov.error as Error).message}</p>}
      {!d && !cov.error && <Loading>Loading coverage…</Loading>}
      {d && (
        <div className="grid shrink-0 grid-cols-[1fr_330px] gap-3">
          <section className="card p-2">
            <h2 className="m-0 text-base font-semibold">Tomorrow's heat · {d.date}</h2>
            <HeatCurve data={d} />
          </section>
          <section className="card flex flex-col justify-center p-3" aria-live="polite">
            {d.heat.status !== "OK" || !d.coverage ? (
              <p className="m-0 font-semibold text-heat-ink">
                {d.heat.status === "INSUFFICIENT_DATA" ? "Insufficient forecast data — not treated as safe" : "No hours at or above the demo threshold"}
              </p>
            ) : (
              <>
                <p className="m-0 font-serif text-[48px] font-semibold leading-none" style={{ color: (d.coverage.percent ?? 0) >= 80 ? "#2e7d4f" : "#b3261e" }}>
                  {d.coverage.percent === null ? "—" : `${d.coverage.percent}%`}
                </p>
                <p className="m-0 mt-1 text-base leading-snug">
                  of <strong className="font-mono">{d.coverage.total}</strong> rider requests are near an open water point,{" "}
                  <strong className="font-mono">{d.coverage.window[0]}–{d.coverage.window[1]}</strong>
                </p>
                <p className="m-0 mt-1 font-mono text-base text-muted">{d.coverage.covered}/{d.coverage.total} · radius {d.policy.coverageRadiusMeters} m</p>
                <p className="m-0 mt-1 text-base font-semibold text-gap">
                  {d.coverage.uncoveredClusters.length ? `Uncovered: cluster ${d.coverage.uncoveredClusters.join(", ")}` : "Every cluster covered"}
                </p>
              </>
            )}
            <p className="m-0 mt-1 text-[14px] text-muted">Demo policy ({d.policy.heatThresholdC} °C, unvalidated). Sample scenario.</p>
          </section>
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.15fr] gap-3">
        <section className="card relative min-h-[260px] overflow-hidden">
          {d && <MapView center={map.zone.center} zoom={15} hosts={map.hosts} clusters={d.clusters} fitAll />}
        </section>
        <div ref={scroller} className="min-h-0 space-y-3 overflow-auto pr-1">
          {status === "COMPLETED" && detail?.coverage.current && (
            <section className="card p-3">
              <h2 className="m-0 text-lg font-semibold">Run summary</h2>
              <p className="m-0 mt-1 text-[15px]">
                Coverage <span className="font-mono">{detail.coverage.before?.percent}%</span> →{" "}
                <strong className="font-mono">{detail.coverage.current.percent}% ({detail.coverage.current.covered}/{detail.coverage.current.total})</strong>
                {detail.coverage.current.uncoveredClusters?.length ? ` · still uncovered: cluster ${detail.coverage.current.uncoveredClusters.join(", ")}` : ""}
              </p>
            </section>
          )}
          {detail?.proposal && detail.proposal.status === "APPROVED" && (
            <OutreachBoard proposal={detail.proposal} detail={detail} events={run.events} />
          )}
          {detail?.proposal && ["PROPOSED", "APPROVED", "REJECTED", "EXPIRED"].includes(detail.proposal.status) && (
            <PlanReview proposal={detail.proposal} sessionId={sessionId} token={token} onDone={run.refresh} />
          )}
          <ProblemQueue sessionId={sessionId} zoneId={zoneId} token={token} />
          <AgentPanel events={run.events} detail={detail} onRun={() => void run.start()} canRun={!busy} startError={run.startError} replayId={run.replayId} />
        </div>
      </div>
    </div>
  );
}
