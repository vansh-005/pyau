import { Loading } from "../components/Loading";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, type Ask, type CovNum, type Proposal, type Receipt } from "../api";
import { AgentPanel } from "../components/AgentPanel";
import { PlanReview } from "../components/PlanReview";

interface Replay {
  id: string; capturedAt: number; runId: string; modelId: string | null; scenario: string;
  run: { status: string; date: string; startedAt: number; finishedAt: number | null; coverageCurrent?: CovNum };
  proposal: Proposal; asks: (Ask & { hostLabel?: string })[]; events: Receipt[];
}

/** /replay/:id — a saved real run, read-only. No model calls, no writes, signed out. */
export default function ReplayPage() {
  const { id = "latest" } = useParams();
  const q = useQuery({ queryKey: ["replay", id], queryFn: () => api<Replay>("GET", `/replays/${id}`) });
  if (q.isLoading) return <Loading>Loading the saved run…</Loading>;
  if (q.error || !q.data) return <p className="p-4 text-gap">No such replay.</p>;
  const r = q.data;
  const before = r.proposal.coverageBefore, after = r.run.coverageCurrent;
  const captured = new Date(r.capturedAt * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="rounded-xl bg-ink px-4 py-3 font-semibold text-white" role="status">
        Saved run replay · captured {captured} · nothing here is live <Link to="/demo" className="ml-3 text-white underline">Try the live demo</Link>
      </div>
      <header>
        <h1 className="m-0 font-serif text-3xl font-semibold text-clay">Pyau coverage run</h1>
        <p className="m-0 text-sm text-muted">{r.scenario} · agent model {r.modelId} · run <span className="font-mono">{r.runId}</span></p>
      </header>
      <section className="card p-4">
        <p className="m-0 text-base">Coverage of rider requests in the heat window</p>
        <p className="m-0 font-serif text-5xl font-semibold" style={{ color: "#2e7d4f" }}>
          {before?.percent}% → {after?.percent}% <span className="font-mono text-xl text-muted">({before?.covered}/{before?.total} → {after?.covered}/{after?.total})</span>
        </p>
        <p className="m-0 mt-1 text-sm font-semibold text-gap">Still uncovered: cluster {after?.uncoveredClusters?.join(", ")}</p>
      </section>
      <AgentPanel events={r.events} onRun={() => undefined} canRun={false} startError="" readOnly />
      <PlanReview proposal={{ ...r.proposal, status: "APPROVED" }} sessionId="" token="" onDone={() => undefined} readOnly />
      <section className="card p-3">
        <h2 className="m-0 text-lg font-semibold">Outreach</h2>
        <ul className="m-0 list-none space-y-1 p-0 pt-1 text-[15px]">
          {r.asks.map((a) => (
            <li key={a.id}>
              <span className="font-mono">{a.hostId}</span> {a.hostLabel}:{" "}
              <strong>{a.status === "TIMED_OUT" ? "no reply — timed out" : a.status === "ACCEPTED" ? `accepted ${a.window[0]}–${a.window[1]} (host confirmed)` : a.status.toLowerCase()}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
