import type { Ask, Proposal, RunDetail, Receipt } from "../api";
import { fmtClock, useCountdown } from "../hooks";

const name = (a: Ask) => a.hostLabel ?? a.hostId;

function Step({ ask, serverTime }: { ask: Ask; serverTime: number }) {
  const left = useCountdown(ask.status === "OPEN" ? ask.expiresAt : null, serverTime);
  if (ask.status === "OPEN")
    return <li className="text-heat-ink">⏳ Asking <strong>{name(ask)}</strong> · <span className="font-mono">{fmtClock(left ?? 0)} left</span></li>;
  if (ask.status === "TIMED_OUT") return <li className="text-gap">✗ {name(ask)}: no reply — timed out</li>;
  if (ask.status === "DECLINED") return <li className="text-gap">✗ {name(ask)} said No</li>;
  return <li className="text-ok">✓ {name(ask)} accepted <span className="font-mono">{ask.window[0]}–{ask.window[1]}</span> (host confirmed)</li>;
}

/** Mirrors the state machine: one row per gap; every line is a real ask record or event. */
export function OutreachBoard({ proposal, detail, events }: { proposal: Proposal; detail: RunDetail; events: Receipt[] }) {
  const published = events.filter((e) => e.type === "point_published");
  const done = detail.run.status === "COMPLETED";
  return (
    <section className="card p-3">
      <h2 className="m-0 text-lg font-semibold">Outreach</h2>
      {proposal.gaps.map((g) => {
        const asks = detail.asks.filter((a) => a.clusterId === g.clusterId);
        const live = published.find((e) => (e.data as { clusterId?: string }).clusterId === g.clusterId);
        return (
          <div key={g.clusterId} className="mt-2">
            <p className="m-0 font-semibold">Cluster {g.clusterId} · {g.requests} requests</p>
            <ul className="m-0 list-none space-y-0.5 p-0 pl-2 text-[15px]">
              {asks.map((a) => <Step key={a.id} ask={a} serverTime={detail.serverTime} />)}
              {live && <li className="font-semibold text-ok">● Point live on the rider map</li>}
              {!asks.length && <li className="text-muted">Waiting to ask the first host…</li>}
              {done && !live && <li className="font-semibold text-gap">No host accepted — gap stays open</li>}
            </ul>
          </div>
        );
      })}
      {proposal.unresolved.map((u) => (
        <p key={u.clusterId} className="m-0 mt-2 text-[15px] font-semibold text-gap">
          Cluster {u.clusterId} · {u.requests} requests — unresolved: {u.recommendation.replaceAll("_", " ")}
        </p>
      ))}
    </section>
  );
}
