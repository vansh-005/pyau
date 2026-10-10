import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCoverage, type MapResponse } from "../api";
import { isTerminal, type useRun } from "../hooks";
import { useLang } from "../i18n/lang";
import { AgentPanel } from "./AgentPanel";
import { HeatCurve } from "./HeatCurve";
import { Loading } from "./Loading";
import { MapView } from "./MapView";
import { OutreachBoard } from "./OutreachBoard";
import { PlanReview } from "./PlanReview";
import { ProblemQueue } from "./ProblemQueue";
import { RequestDots } from "./RequestDots";
import { InfoTip } from "./ui";

export interface CoordinatorPanelProps {
  sessionId: string;
  zoneId: string;
  token: string;
  map: MapResponse;
  run: ReturnType<typeof useRun>;
}

/** Coordinator centre: heat curve, the API's water-access number, the area map, the planner, plan review and outreach. */
export function CoordinatorPanel({ sessionId, zoneId, token, map, run }: CoordinatorPanelProps) {
  const { t } = useLang();
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
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      {cov.error && <p className="m-0 text-gap">{(cov.error as Error).message}</p>}
      {!d && !cov.error && <Loading>{t("loading.coverage")}</Loading>}
      {d && (
        <div className="grid shrink-0 grid-cols-1 gap-4 min-[900px]:grid-cols-[1fr_360px]">
          <section className="card p-4">
            <h2 className="m-0 text-lg font-semibold">{t("heat.title")} <span className="font-normal text-muted tnum">· {d.date}</span></h2>
            <HeatCurve data={d} />
          </section>
          <section className="card flex flex-col p-4" aria-live="polite">
            <div className="flex items-start justify-between gap-2">
              <h2 className="m-0 text-lg font-semibold">{t("stat.title")}</h2>
              <InfoTip label={t("stat.info.label")}>
                <>
                  {t("stat.info.text", { c: d.policy.heatThresholdC, m: d.policy.coverageRadiusMeters })}
                </>
              </InfoTip>
            </div>
            {d.heat.status !== "OK" || !d.coverage ? (
              <p className="m-0 mt-2 font-semibold text-heat">{d.heat.status === "INSUFFICIENT_DATA" ? t("stat.insufficient") : t("stat.noheat")}</p>
            ) : (
              <>
                <p className="m-0 mt-1 text-[44px] font-semibold leading-none tracking-tight tnum" style={{ color: (d.coverage.percent ?? 0) >= 80 ? "var(--water)" : "var(--gap)" }}>
                  {d.coverage.percent === null ? "—" : `${d.coverage.percent}%`}
                </p>
                <p className="m-0 mt-2 text-base leading-snug">
                  {t("stat.sentence", { covered: d.coverage.covered, total: d.coverage.total, from: d.coverage.window[0], to: d.coverage.window[1], m: d.policy.coverageRadiusMeters })}
                </p>
                <div className="mt-2"><RequestDots clusters={d.clusters} /></div>
              </>
            )}
          </section>
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 min-[900px]:grid-cols-[1fr_1.15fr]">
        <section className="card relative min-h-[260px] overflow-hidden">
          {d && <MapView center={map.zone.center} zoom={15} hosts={map.hosts} clusters={d.clusters} fitAll />}
        </section>
        <div ref={scroller} className="min-h-0 space-y-4 overflow-auto pr-1">
          {status === "COMPLETED" && detail?.coverage.current && (
            <section className="card p-4">
              <h2 className="m-0 text-lg font-semibold">{t("summary.title")}</h2>
              <p className="m-0 mt-1 text-base">
                {t("summary.line", { from: detail.coverage.before?.percent ?? "?", to: detail.coverage.current.percent ?? "?", covered: detail.coverage.current.covered, total: detail.coverage.current.total })}
                {detail.coverage.current.uncoveredClusters?.length ? ` ${t("summary.open", { areas: detail.coverage.current.uncoveredClusters.map((c) => d?.clusters.find((x) => x.id === c)?.label ?? `Area ${c}`).join(", ") })}` : ""}
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
