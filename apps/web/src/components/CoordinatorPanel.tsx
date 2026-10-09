import { useQuery } from "@tanstack/react-query";
import { getCoverage, type MapResponse } from "../api";
import { HeatCurve } from "./HeatCurve";
import { MapView } from "./MapView";

export interface CoordinatorPanelProps {
  sessionId: string;
  zoneId: string;
  token: string;
  map: MapResponse;
}

/** Coordinator centre: heat curve, the API's coverage number, cluster map. Agent run + approval + outreach board join in T06–T07. */
export function CoordinatorPanel({ sessionId, zoneId, token, map }: CoordinatorPanelProps) {
  const cov = useQuery({
    queryKey: ["coverage", sessionId],
    queryFn: () => getCoverage(zoneId, sessionId, token),
    refetchInterval: 4000,
  });
  const d = cov.data;
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4">
      {cov.error && <p className="m-0 text-gap">{(cov.error as Error).message}</p>}
      {d && (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <section className="card p-3">
              <h2 className="m-0 mb-1 text-base font-semibold">Tomorrow's heat · {d.date}</h2>
              <HeatCurve data={d} />
            </section>
            <section className="card flex min-w-[250px] flex-col justify-center p-4" aria-live="polite">
              {d.heat.status !== "OK" || !d.coverage ? (
                <p className="m-0 font-semibold text-heat">
                  {d.heat.status === "INSUFFICIENT_DATA" ? "Insufficient forecast data — not treated as safe" : "No hours at or above the demo threshold"}
                </p>
              ) : (
                <>
                  <p className="m-0 font-serif text-[48px] font-semibold leading-none" style={{ color: (d.coverage.percent ?? 0) >= 80 ? "#2e7d4f" : "#b3261e" }}>
                    {d.coverage.percent === null ? "—" : `${d.coverage.percent}%`}
                  </p>
                  <p className="m-0 mt-2 text-base">
                    of <strong className="font-mono">{d.coverage.total}</strong> rider requests are near an open water point during{" "}
                    <strong className="font-mono">{d.coverage.window[0]}–{d.coverage.window[1]}</strong>
                  </p>
                  <p className="m-0 mt-1 font-mono text-sm text-muted">
                    {d.coverage.covered}/{d.coverage.total} · radius {d.policy.coverageRadiusMeters} m
                  </p>
                  <p className="m-0 mt-2 text-sm font-medium text-gap">
                    {d.coverage.uncoveredClusters.length
                      ? `Uncovered: cluster ${d.coverage.uncoveredClusters.join(", ")}`
                      : "Every cluster covered"}
                  </p>
                </>
              )}
              <p className="m-0 mt-2 text-xs text-muted">
                Demo policy, {d.policy.validationStatus.replaceAll("_", " ")}. Sample scenario data.
              </p>
            </section>
          </div>
          <section className="card relative min-h-[300px] flex-1 overflow-hidden">
            <MapView center={map.zone.center} zoom={15} hosts={map.hosts} clusters={d.clusters} fitAll />
          </section>
        </>
      )}
    </div>
  );
}
