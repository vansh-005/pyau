import { Loading } from "../components/Loading";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getMap, setClock } from "../api";
import { CoordinatorPanel } from "../components/CoordinatorPanel";
import { HostPanel } from "../components/HostPanel";
import { PhoneFrame } from "../components/PhoneFrame";
import { RiderPanel } from "../components/RiderPanel";
import { useRun } from "../hooks";
import { RIDER_LOCATIONS, useDemoSession } from "../session";

const COACH_KEY = "pyau.coachDismissed";

function clockText(c?: { date: string; time: string; label?: string }) {
  if (!c) return "…";
  const d = new Date(c.date + "T12:00:00");
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} ${c.time}${c.label ? ` (${c.label})` : ""}`;
}

/** /demo — one 1920×1080 screen: rider phone, coordinator centre, host phone. Every panel talks to the deployed API. */
export default function Demo() {
  const { session, error, fresh } = useDemoSession();
  const [coach, setCoach] = useState(() => {
    try {
      return sessionStorage.getItem(COACH_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [copied, setCopied] = useState(false);
  const [jumpErr, setJumpErr] = useState("");
  const sid = session?.sessionId ?? "", zone = session?.zoneId ?? "", token = session?.token ?? "";

  const map = useQuery({
    queryKey: ["map", sid],
    queryFn: () => getMap(zone, sid),
    enabled: !!session,
    refetchInterval: () => (document.hidden ? false : 3000),
  });
  const run = useRun(sid, zone, token, session?.scenarioDate ?? "");

  if (error) return <p className="p-4 text-gap">{error}</p>;
  if (!session || !map.data) return <Loading>Starting a fresh demo session…</Loading>;

  const clock = map.data.clock;
  const jump = async () => {
    setJumpErr("");
    try {
      await setClock(sid, token, "14:00");
      await map.refetch();
    } catch (e) {
      setJumpErr((e as Error).message);
    }
  };
  const copy = async () => {
    if (!run.runId) return;
    try {
      await navigator.clipboard.writeText(run.runId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const dismissCoach = () => {
    setCoach(false);
    try {
      sessionStorage.setItem(COACH_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex h-full min-h-[1000px] min-w-[1500px] flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-panel px-4 py-2">
        <span className="font-serif text-2xl font-semibold text-clay">Pyau</span>
        <span className="text-base">Demo room · {map.data.zone.name}</span>
        <span className="rounded-full bg-heat/15 px-3 py-1 text-base font-semibold text-heat-ink">{map.data.badge}</span>
        <span className="rounded-full bg-ink px-3 py-1 font-mono text-base text-white">Demo timers: {session.demoTimersSeconds} s</span>
        <span className="ml-auto text-base">
          Clock: <strong className="font-mono">{clockText(clock)}</strong>
        </span>
        <button className="min-h-10 rounded-lg bg-heat-ink px-3 text-base font-semibold text-white disabled:opacity-50" onClick={() => void jump()} disabled={clock.time === "14:00"}>
          Jump to 14:00 tomorrow
        </button>
        <button className="min-h-10 rounded-lg border border-border px-3 text-base" onClick={() => void copy()} disabled={!run.runId}>
          {copied ? "Copied ✓" : run.runId ? "Copy run ID" : "Run ID (after a run)"}
        </button>
        <button className="min-h-10 rounded-lg border border-border px-3 text-base" onClick={() => void fresh()}>
          New session
        </button>
      </header>
      {coach && (
        <div className="flex items-center gap-3 bg-water/10 px-4 py-1.5 text-base">
          <span>
            <strong>1.</strong> Run the plan → <strong>2.</strong> Approve → <strong>3.</strong> Answer as a host → <strong>4.</strong> Ask as a rider
          </span>
          <button className="ml-auto text-base underline" onClick={dismissCoach}>Dismiss</button>
        </div>
      )}
      {jumpErr && <p className="m-0 px-4 text-gap">{jumpErr}</p>}
      <main className="grid min-h-0 flex-1 grid-cols-[430px_1fr_430px] gap-3 p-3">
        <PhoneFrame title="Rider">
          <RiderPanel sessionId={sid} zoneId={zone} center={map.data.zone.center} hosts={map.data.hosts} locations={RIDER_LOCATIONS} />
        </PhoneFrame>
        <div className="min-h-0 overflow-hidden rounded-2xl">
          <CoordinatorPanel sessionId={sid} zoneId={zone} token={token} map={map.data} run={run} />
        </div>
        <PhoneFrame title="Host">
          <HostPanel sessionId={sid} token={token} />
        </PhoneFrame>
      </main>
    </div>
  );
}
