import { useRef, useState } from "react";
import { askVoice, helpFind, sendFeedback, type FeedbackKind, type FeedbackResult, type FindResponse, type MapHost, type Need } from "../api";
import { MAX_RECORD_MS, pcmToBase64, startRecording, type Recording } from "../voice";
import { MapView } from "./MapView";
import hi from "../i18n/hi.json";
import en from "../i18n/en.json";

export interface RiderPanelProps {
  sessionId: string;
  zoneId: string;
  center: { lat: number; lng: number };
  hosts: MapHost[];
  /** Scripted rider locations (demo). The first is the default (cluster B, the fixture's rider-query point). */
  locations: { id: string; label: string; lat: number; lng: number }[];
  /** Changes when the session state changes so the pot icons refresh. */
  onAnswered?: (a: FindResponse) => void;
}

const NEEDS: { need: Need; icon: string }[] = [
  { need: "water", icon: "💧" },
  { need: "shade", icon: "☂" },
  { need: "toilet", icon: "🚻" },
  { need: "charging", icon: "🔌" },
];

export function RiderPanel({ sessionId, zoneId, center, hosts, locations, onAnswered }: RiderPanelProps) {
  const [locId, setLocId] = useState(locations[0].id);
  const location = locations.find((l) => l.id === locId) ?? locations[0];
  const [fb, setFb] = useState<{ result?: FeedbackResult; asking?: boolean; error?: string } | null>(null);
  const [busy, setBusy] = useState<Need | null>(null);
  const [answer, setAnswer] = useState<FindResponse | null>(null);
  const [error, setError] = useState("");
  const [showRoute, setShowRoute] = useState(true);
  const [playing, setPlaying] = useState<"idle" | "playing" | "blocked">("idle");
  const audio = useRef<HTMLAudioElement | null>(null);

  const play = () => {
    audio.current?.play().then(() => setPlaying("playing"), () => setPlaying("blocked"));
  };

  const showAnswer = (a: FindResponse) => {
    setFb(null);
    setAnswer(a);
    setShowRoute(true);
    onAnswered?.(a);
    if (a.audio) {
      const el = new Audio(a.audio.url);
      el.onended = () => setPlaying("idle");
      audio.current = el;
      play();
    }
  };

  const ask = async (need: Need) => {
    setBusy(need);
    setError("");
    setTranscript(null);
    try {
      showAnswer(await helpFind({ need, lat: location.lat, lng: location.lng, sessionId, zoneId }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const report = async (kind: FeedbackKind) => {
    if (!answer?.host) return;
    setFb({ asking: false });
    try {
      const result = await sendFeedback({ hostId: answer.host.id, kind, lat: location.lat, lng: location.lng, sessionId, zoneId });
      setFb({ result });
    } catch (e) {
      setFb({ error: (e as Error).message });
    }
  };

  // ---- hold-to-talk voice question (P0b): tap buttons always remain available ----
  const [mic, setMic] = useState<"idle" | "recording" | "sending">("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const rec = useRef<Recording | null>(null);
  const recTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const micStart = async () => {
    if (mic !== "idle") return;
    setError("");
    try {
      rec.current = await startRecording();
      setMic("recording");
      recTimer.current = setTimeout(() => void micStop(), MAX_RECORD_MS);
    } catch {
      setError("Microphone not available — please use the buttons. / माइक नहीं मिला, बटन दबाएँ।");
    }
  };
  const micStop = async () => {
    if (recTimer.current) clearTimeout(recTimer.current);
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    setMic("sending");
    try {
      const pcm = await r.stop();
      if (pcm.length < 6400) {
        setError("Too short — hold the button while you speak. / बोलते समय बटन दबाए रखें।");
        return;
      }
      const v = await askVoice({ audioBase64: pcmToBase64(pcm), lat: location.lat, lng: location.lng, sessionId, zoneId });
      setTranscript(v.transcript || "");
      if (v.needUnknown) {
        setAnswer(null);
        setError(`${v.answer.hi} ${v.answer.en}`);
      } else {
        showAnswer(v as FindResponse);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMic("idle");
    }
  };

  return (
    <div className="flex h-full flex-col bg-canvas text-[15px]">
      {locations.length > 1 && (
        <div className="flex items-center gap-2 border-b border-border bg-white px-2 py-1 text-[15px]" role="group" aria-label="Demo rider location">
          <span className="text-muted">Demo location:</span>
          {locations.map((l) => (
            <button key={l.id} aria-pressed={locId === l.id} onClick={() => { setLocId(l.id); setAnswer(null); setFb(null); }}
              className={`min-h-12 rounded-full px-3 font-semibold ${locId === l.id ? "bg-water text-white" : "border border-border"}`}>
              {l.label}
            </button>
          ))}
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <MapView
          center={center}
          zoom={15.5}
          hosts={hosts}
          rider={location}
          routeLine={showRoute ? answer?.route?.line ?? null : null}
        />
      </div>
      <div className="flex max-h-[66%] flex-col gap-2 overflow-auto p-3">
        {error && <p className="m-0 rounded-lg bg-gap/10 p-2 text-gap">{error}</p>}
        {answer && (
          <section className="card p-3" aria-live="polite">
            {answer.host && (
              <p className="m-0 flex flex-wrap items-baseline gap-x-2">
                <strong className="text-lg">{answer.host.label}</strong>
                <span className="font-mono text-[15px] text-muted">{answer.host.id}</span>
              </p>
            )}
            <p className="hi m-0 mt-1 text-base leading-snug">{answer.answer.hi}</p>
            <p className="m-0 mt-1 text-[15px] text-muted">{answer.answer.en}</p>
            {answer.found && answer.host && (
              <p className="m-0 mt-2 text-[15px]">
                <span className="font-mono font-semibold">
                  {answer.distanceM} m
                  {answer.route ? ` · ~${Math.max(1, Math.round(answer.route.durationS / 60))} min by scooter` : ""}
                </span>
                {answer.approximate && <span className="text-heat-ink"> · approximate</span>}
              </p>
            )}
            {!answer.found && (
              <p className="m-0 mt-2 text-[15px] font-medium text-gap">
                {hi.nothingNearby} · {en.nothingNearby}
              </p>
            )}
            {answer.host && (
              <div className="mt-2 border-t border-border pt-2">
                {!fb?.result && !fb?.error && (
                  <div className="flex gap-2">
                    <button className="min-h-11 flex-1 rounded-lg border border-ok px-2 font-semibold text-ok" onClick={() => void report("got_it")}>
                      <span className="hi">मिल गया</span> ✓ Got it
                    </button>
                    <button className="min-h-11 flex-1 rounded-lg border border-gap px-2 font-semibold text-gap" aria-expanded={!!fb?.asking} onClick={() => setFb({ asking: !fb?.asking })}>
                      <span className="hi">दिक्कत</span> ✗ Problem
                    </button>
                  </div>
                )}
                {fb?.asking && (
                  <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="What was the problem?">
                    {([["no_water", "पानी नहीं", "No water"], ["closed", "बंद है", "Closed"], ["dirty", "गंदा", "Dirty"], ["unsafe", "असुरक्षित", "Unsafe"]] as const).map(([k, hi2, en2]) => (
                      <button key={k} className="min-h-12 rounded-lg border border-gap bg-white px-2 font-semibold" onClick={() => void report(k)}>
                        <span className="hi">{hi2}</span> {en2}
                      </button>
                    ))}
                  </div>
                )}
                {fb?.result && (
                  <p className="m-0 text-[15px] font-semibold" role="status">
                    {fb.result.kind === "got_it"
                      ? "Thanks! 🙏 Good to hear."
                      : fb.result.pausedNow
                        ? `Thanks — ${fb.result.problemCount} problem reports: this point is now paused and the coordinator has been told.`
                        : `Thanks — reported (${fb.result.problemCount} of ${fb.result.threshold} before a point is paused).`}
                  </p>
                )}
                {fb?.error && <p className="m-0 text-[15px] font-semibold text-gap">{fb.error}</p>}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              {answer.audio ? (
                <button className="min-h-12 flex-1 rounded-lg border border-water px-3 font-semibold text-water" onClick={play}>
                  🔊 {hi.playAudio} / {en.playAudio}
                  {playing === "blocked" ? " (tap)" : ""}
                </button>
              ) : (
                <span className="flex-1 self-center text-[15px] text-muted">Audio unavailable — text answer above</span>
              )}
              {answer.route && (
                <button
                  className="min-h-12 rounded-lg bg-water px-4 font-semibold text-white"
                  onClick={() => setShowRoute((v) => !v)}
                  aria-pressed={showRoute}
                >
                  {hi.route} / {en.route}
                </button>
              )}
            </div>
          </section>
        )}
        {transcript !== null && (
          <p className="m-0 rounded-lg bg-white p-2 text-[15px]" aria-live="polite">
            <span className="text-muted">सुना / Heard:</span> <span className="hi font-semibold">“{transcript || "…"}”</span>
          </p>
        )}
        <button
          className={`min-h-14 rounded-xl border-2 px-3 text-base font-semibold ${mic === "recording" ? "border-gap bg-gap/10 text-gap" : "border-clay bg-white text-clay"}`}
          onPointerDown={() => void micStart()}
          onPointerUp={() => void micStop()}
          onPointerLeave={() => mic === "recording" && void micStop()}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && void micStart()}
          onKeyUp={(e) => (e.key === " " || e.key === "Enter") && void micStop()}
          disabled={mic === "sending"}
          aria-label="Hold to ask by voice"
        >
          🎤 <span className="hi">{mic === "recording" ? "सुन रहे हैं… छोड़ें" : mic === "sending" ? "समझ रहे हैं…" : "बोलकर पूछें"}</span>{" "}
          / {mic === "recording" ? "Listening — release" : mic === "sending" ? "Understanding…" : "Hold to ask"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          {NEEDS.map(({ need, icon }) => (
            <button
              key={need}
              disabled={busy !== null}
              onClick={() => void ask(need)}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-water px-2 text-base font-semibold text-white disabled:opacity-60"
            >
              <span aria-hidden>{icon}</span>
              <span className="hi">{hi.needs[need]}</span>
              <span>{busy === need ? en.asking : en.needs[need]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
