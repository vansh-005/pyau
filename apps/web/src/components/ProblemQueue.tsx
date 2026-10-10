import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProblems, reactivateHost } from "../api";

const KIND: Record<string, string> = { no_water: "No water", closed: "Closed", dirty: "Dirty", unsafe: "Unsafe" };

/** Paused points and the rider reports behind them. Reactivation is a human decision. */
export function ProblemQueue({ sessionId, zoneId, token }: { sessionId: string; zoneId: string; token: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["problems", sessionId],
    queryFn: () => getProblems(zoneId, sessionId, token),
    refetchInterval: () => (document.hidden ? false : 3000),
  });
  const items = q.data?.problems ?? [];
  if (!items.length) return null;
  const act = async (h: string) => {
    await reactivateHost(h, zoneId, sessionId, token);
    void qc.invalidateQueries({ queryKey: ["problems", sessionId] });
    void qc.invalidateQueries({ queryKey: ["coverage", sessionId] });
    void qc.invalidateQueries({ queryKey: ["map", sessionId] });
  };
  return (
    <section className="card border-gap/40 p-3" aria-label="Problem queue">
      <h2 className="m-0 text-lg font-semibold">Problem queue <span className="font-mono text-base text-gap">{items.length}</span></h2>
      <ul className="m-0 list-none space-y-2 p-0 pt-1">
        {items.map((p) => (
          <li key={p.hostId} className="rounded-lg bg-gap/5 p-2 text-[15px]">
            <p className="m-0 flex items-baseline gap-2">
              <span className="font-mono font-semibold">{p.hostId}</span>
              <strong>{p.label}</strong>
              <span className="font-semibold text-gap">⏸ Paused</span>
              <button className="ml-auto min-h-10 rounded-lg border border-border bg-white px-3 font-semibold" onClick={() => void act(p.hostId)}>Reactivate</button>
            </p>
            <p className="m-0 text-sm text-muted">
              {p.reason}{p.seeded ? " (sample scenario)" : ""}
              {p.reports.length > 0 && <> · reports: {p.reports.map((r) => KIND[r.kind] ?? r.kind).join(", ")}</>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
