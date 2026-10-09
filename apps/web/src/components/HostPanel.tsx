import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { hostAsks, respondAsk, type Ask } from "../api";
import { fmtClock, useCountdown } from "../hooks";

const HOSTS = [
  { id: "H4", label: "Kirana store" },
  { id: "H5", label: "RWA office" },
];

function AskCard({ ask, serverTime, sessionId, token, onChanged }: { ask: Ask; serverTime: number; sessionId: string; token: string; onChanged: () => void }) {
  const left = useCountdown(ask.status === "OPEN" ? ask.expiresAt : null, serverTime);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const open = ask.status === "OPEN" && (left ?? 0) > 0;
  const answer = async (d: "accepted" | "declined") => {
    setBusy(true);
    setMsg("");
    try {
      await respondAsk(ask, sessionId, token, d);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      onChanged();
    }
  };
  return (
    <section className="card p-3">
      <p className="m-0 text-sm font-semibold text-muted">Request from the Pyau coordinator</p>
      <p className="hi m-0 mt-1 text-[17px] leading-snug">{ask.message.hi}</p>
      <p className="m-0 mt-1 text-[15px] text-muted">{ask.message.en}</p>
      <p className="m-0 mt-2 font-mono text-base font-bold">{ask.window[0]}–{ask.window[1]}</p>
      {ask.status === "OPEN" && (
        <p className="m-0 mt-1 inline-block rounded-full bg-heat/15 px-3 py-1 font-mono text-sm font-semibold text-heat">
          {open ? `${fmtClock(left ?? 0)} left` : "time is up"}
        </p>
      )}
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => void answer("accepted")} className="min-h-14 rounded-xl bg-ok px-2 font-semibold text-white disabled:opacity-60">
            <span className="hi">हाँ, मैं रखूँगा</span> / Yes
          </button>
          <button disabled={busy} onClick={() => void answer("declined")} className="min-h-14 rounded-xl border border-border bg-white px-2 font-semibold disabled:opacity-60">
            <span className="hi">नहीं</span> / No
          </button>
        </div>
      )}
      {ask.status === "ACCEPTED" && <p className="m-0 mt-2 font-semibold text-ok">You're live for riders {ask.window[0]}–{ask.window[1]} 🙏</p>}
      {ask.status === "DECLINED" && <p className="m-0 mt-2 text-muted">Thank you — we'll ask someone else.</p>}
      {(ask.status === "TIMED_OUT" || (ask.status === "OPEN" && !open)) && (
        <p className="m-0 mt-2 font-semibold text-gap">This request already moved on — thank you.</p>
      )}
      {msg && <p className="m-0 mt-2 font-semibold text-gap">{msg}</p>}
    </section>
  );
}

/** Host phone: switch between the two demo hosts; inbox polls the real asks API. */
export function HostPanel({ sessionId, token }: { sessionId: string; token: string }) {
  const [hostId, setHostId] = useState("H4");
  const qc = useQueryClient();
  const inbox = useQuery({
    queryKey: ["inbox", sessionId, hostId],
    queryFn: () => hostAsks(hostId, sessionId, token),
    refetchInterval: () => (document.hidden ? false : 1500),
  });
  const asks = inbox.data?.asks ?? [];
  return (
    <div className="flex h-full flex-col bg-canvas text-[15px]">
      <div className="flex gap-2 border-b border-border bg-white p-2" role="tablist" aria-label="Switch host">
        {HOSTS.map((h) => (
          <button
            key={h.id}
            role="tab"
            aria-selected={hostId === h.id}
            onClick={() => setHostId(h.id)}
            className={`min-h-12 flex-1 rounded-lg px-2 font-semibold ${hostId === h.id ? "bg-clay text-white" : "border border-border bg-white"}`}
          >
            <span className="font-mono">{h.id}</span> {h.label}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-2 overflow-auto p-3">
        {asks.length === 0 && (
          <p className="m-0 rounded-lg bg-white p-3 text-muted">
            <span className="hi">कोई नया अनुरोध नहीं।</span> No requests for {HOSTS.find((h) => h.id === hostId)?.label} right now.
          </p>
        )}
        {asks.map((a) => (
          <AskCard key={a.id} ask={a} serverTime={inbox.data!.serverTime} sessionId={sessionId} token={token}
            onChanged={() => void qc.invalidateQueries({ queryKey: ["inbox", sessionId, hostId] })} />
        ))}
      </div>
    </div>
  );
}
