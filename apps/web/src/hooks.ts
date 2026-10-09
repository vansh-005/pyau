import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEvents, getRun, listRuns, startRun, type Receipt, type RunDetail } from "./api";

const TERMINAL = ["COMPLETED", "INSUFFICIENT_DATA", "NO_GAPS", "REJECTED", "APPROVAL_EXPIRED", "FAILED"];
export const isTerminal = (s?: string) => !!s && TERMINAL.includes(s);

/** Tab-visibility aware polling interval: faster while a run is active, off when the tab is hidden. */
function useInterval(activeMs: number | false) {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const f = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  return visible ? activeMs : false;
}

/** Latest run of the session (restored after refresh), its detail and its ordered events. All real API reads. */
export function useRun(sessionId: string, zoneId: string, token: string, date: string) {
  const qc = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<Receipt[]>([]);
  const lastSeq = useRef(0);
  const [startError, setStartError] = useState("");

  // New session => forget everything.
  useEffect(() => {
    setRunId(null);
    setEvents([]);
    lastSeq.current = 0;
  }, [sessionId]);

  const runs = useQuery({
    queryKey: ["runs", sessionId],
    queryFn: () => listRuns(zoneId, sessionId, token),
    enabled: !runId,
    refetchInterval: useInterval(3000),
  });
  useEffect(() => {
    if (!runId && runs.data?.runs.length) setRunId(runs.data.runs[0].id);
  }, [runs.data, runId]);

  const detail = useQuery<RunDetail>({
    queryKey: ["run", sessionId, runId],
    queryFn: () => getRun(runId!, sessionId, token),
    enabled: !!runId,
  });
  const active = !!runId && !isTerminal(detail.data?.run.status);
  const poll = useInterval(active ? 1500 : false);
  useEffect(() => {
    if (!poll || !runId) return;
    const t = setInterval(() => {
      void qc.invalidateQueries({ queryKey: ["run", sessionId, runId] });
      void qc.invalidateQueries({ queryKey: ["coverage", sessionId] });
      void qc.invalidateQueries({ queryKey: ["map", sessionId] });
    }, poll);
    return () => clearInterval(t);
  }, [poll, runId, sessionId, qc]);

  useEffect(() => {
    if (!runId) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await getEvents(runId, sessionId, token, lastSeq.current);
        if (!stop && r.events.length) {
          lastSeq.current = r.events[r.events.length - 1].seq;
          setEvents((e) => [...e, ...r.events]);
        }
      } catch {
        /* transient: next tick retries */
      }
    };
    void tick();
    const t = setInterval(() => {
      if (!document.hidden && !isTerminal(detail.data?.run.status)) void tick();
    }, 1500);
    // one final drain shortly after the run turns terminal
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [runId, sessionId, token, detail.data?.run.status]);

  const start = useCallback(async () => {
    setStartError("");
    try {
      const r = await startRun(zoneId, sessionId, token, date, crypto.randomUUID());
      lastSeq.current = 0;
      setEvents([]);
      setRunId(r.id);
    } catch (e) {
      setStartError((e as Error).message);
    }
  }, [zoneId, sessionId, token, date]);

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["run", sessionId, runId] });
    void qc.invalidateQueries({ queryKey: ["coverage", sessionId] });
    void qc.invalidateQueries({ queryKey: ["map", sessionId] });
  }, [qc, sessionId, runId]);

  return { runId, detail: detail.data, events, start, startError, refresh };
}

/** Seconds left from the server's expiresAt, corrected by the server clock offset (no fake timers). */
export function useCountdown(expiresAt: number | null, serverTime: number | undefined) {
  const offset = useRef(0);
  if (serverTime) offset.current = serverTime - Date.now() / 1000;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, expiresAt - (now / 1000 + offset.current)) : null;
}

export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
