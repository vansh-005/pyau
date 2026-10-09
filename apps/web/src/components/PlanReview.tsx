import { useState } from "react";
import { approveProposal, rejectProposal, type Proposal } from "../api";

const shortName = (l: string) => l.split("·").pop()!.split("(")[0].trim();

export function PlanReview({ proposal, sessionId, token, onDone }: { proposal: Proposal; sessionId: string; token: string; onDone: () => void }) {
  const [ack, setAck] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const decided = proposal.status !== "PROPOSED";

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onDone();
    } catch (e) {
      setError((e as Error).message);
      onDone();
    } finally {
      setBusy(false);
    }
  };
  const toggle = (h: string) =>
    setRemoved((s) => {
      const n = new Set(s);
      if (n.has(h)) n.delete(h);
      else n.add(h);
      return n;
    });

  return (
    <section className="card p-3">
      <div className="flex items-center gap-3">
        <h2 className="m-0 text-lg font-semibold">Plan for review</h2>
        <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-sm">{proposal.status}</span>
      </div>
      <p className="m-0 mt-1 text-[15px] text-muted">{proposal.explanation}</p>
      {proposal.gaps.map((g) => (
        <div key={g.clusterId} className="mt-2 rounded-lg border border-border p-2">
          <p className="m-0 font-semibold">
            Cluster {g.clusterId} · <span className="font-mono">{g.requests}</span> requests · ask window{" "}
            <span className="font-mono">{g.askWindow[0]}–{g.askWindow[1]}</span>
          </p>
          <p className="m-0 mt-1 text-sm text-muted">Ask in this order (fixed by code):</p>
          {g.candidateOrder.map((h, i) => {
            const m = g.messages[h];
            const c = g.candidates.find((x) => x.hostId === h);
            return (
              <div key={h} className={`mt-1 rounded-lg bg-canvas p-2 ${removed.has(h) ? "opacity-40" : ""}`}>
                <p className="m-0 flex items-center gap-2 text-[15px] font-semibold">
                  <span className="font-mono">{i + 1}. {h}</span> {c ? shortName(c.label) : ""}
                  {c && <span className="font-normal text-muted">· {c.distanceM} m from the cluster centre · {c.kind}</span>}
                  {!decided && (
                    <button className="ml-auto rounded border border-border bg-white px-2 py-0.5 text-sm" onClick={() => toggle(h)}>
                      {removed.has(h) ? "Keep" : "Remove"}
                    </button>
                  )}
                </p>
                <p className="hi m-0 mt-1 text-base leading-snug">{m.hi}</p>
                <p className="m-0 mt-1 text-sm text-muted">{m.en}</p>
                <p className="m-0 mt-1 font-mono text-sm">window {m.window[0]}–{m.window[1]}{m.trimmed ? " (trimmed to host hours)" : ""} · buttons: हाँ / Yes · नहीं / No</p>
              </div>
            );
          })}
        </div>
      ))}
      {proposal.unresolved.length > 0 && (
        <div className="mt-2 rounded-lg border-2 border-gap bg-gap/5 p-2">
          <p className="m-0 font-semibold text-gap">Needs a human decision</p>
          {proposal.unresolved.map((u) => (
            <p key={u.clusterId} className="m-0 mt-1 text-[15px]">
              <strong>Cluster {u.clusterId}</strong> · {u.requests} requests · {u.reason === "NO_HOST_WITHIN_RADIUS" ? "no host within 500 m" : u.reason}
              <br />
              Recommendation: <span className="font-mono">{u.recommendation}</span>
              {u.note ? ` — ${u.note}` : ""}
            </p>
          ))}
        </div>
      )}
      <p className="m-0 mt-2 text-[15px]">
        Projected if first choices accept:{" "}
        <strong className="font-mono">{proposal.coverageProjected.covered}/{proposal.coverageProjected.total} ({proposal.coverageProjected.percent}%)</strong>
        <span className="text-muted"> · from code, not the model</span>
      </p>
      {!decided && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" className="h-5 w-5" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            I reviewed the messages and the unfilled gaps
          </label>
          <button
            className="ml-auto min-h-11 rounded-lg bg-water px-4 font-semibold text-white disabled:opacity-50"
            disabled={!ack || busy}
            onClick={() => void act(() => approveProposal(proposal, sessionId, token, [...removed], key))}
          >
            Approve outreach
          </button>
          <button
            className="min-h-11 rounded-lg border border-border px-4 font-semibold disabled:opacity-50"
            disabled={busy}
            onClick={() => void act(() => rejectProposal(proposal, sessionId, token, "Rejected by coordinator"))}
          >
            Reject
          </button>
        </div>
      )}
      {error && <p className="m-0 mt-2 text-gap">{error}</p>}
    </section>
  );
}
