import { useRef, useState } from "react";
import { askVoice, helpFind, type FindResponse, type MapHost, type Need } from "../api";
import { MAX_RECORD_MS, pcmToBase64, startRecording, type Recording } from "../voice";
import { MapView } from "./MapView";
import hi from "../i18n/hi.json";
import en from "../i18n/en.json";

export interface RiderPanelProps {
  sessionId: string;
  zoneId: string;
  center: { lat: number; lng: number };
  hosts: MapHost[];
  /** Scripted rider location (demo): cluster B at the fixture's rider-query point. */
  location: { lat: number; lng: number };
  /** Changes when the session state changes so the pot icons refresh. */
  onAnswered?: (a: FindResponse) => void;
}

const NEEDS: { need: Need; icon: string }[] = [
  { need: "water", icon: "💧" },
  { need: "shade", icon: "☂" },
  { need: "toilet", icon: "🚻" },
  { need: "charging", icon: "🔌" },
];

export function RiderPanel({ sessionId, zoneId, center, hosts, location, onAnswered }: RiderPanelProps) {
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
      <div className="relative min-h-0 flex-1">
        <MapView
          center={center}
          zoom={15.5}
          hosts={hosts}
          rider={location}
          routeLine={showRoute ? answer?.route?.line ?? null : null}
        />
      </div>
      <div className="flex flex-col gap-2 p-3">
        {error && <p className="m-0 rounded-lg bg-gap/10 p-2 text-gap">{error}</p>}
        {answer && (
          <section className="card p-3" aria-live="polite">
            {answer.host && (
              <p className="m-0 flex flex-wrap items-baseline gap-x-2">
                <strong className="text-lg">{answer.host.label}</strong>
                <span className="font-mono text-sm text-muted">{answer.host.id}</span>
              </p>
            )}
            <p className="hi m-0 mt-1 text-base leading-snug">{answer.answer.hi}</p>
            <p className="m-0 mt-1 text-sm text-muted">{answer.answer.en}</p>
            {answer.found && answer.host && (
              <p className="m-0 mt-2 text-sm">
                <span className="font-mono font-semibold">
                  {answer.distanceM} m
                  {answer.route ? ` · ~${Math.max(1, Math.round(answer.route.durationS / 60))} min by scooter` : ""}
                </span>
                {answer.approximate && <span className="text-heat"> · approximate</span>}
                <span className="block text-muted">
                  Open till {answer.host.closesAt} · {en.hostConfirmed} ({answer.host.confirmedSource === "accepted_ask" ? "accepted request" : "confirmed today"})
                </span>
              </p>
            )}
            {!answer.found && (
              <p className="m-0 mt-2 text-sm font-medium text-gap">
                {hi.nothingNearby} · {en.nothingNearby}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              {answer.audio ? (
                <button className="min-h-12 flex-1 rounded-lg border border-water px-3 font-semibold text-water" onClick={play}>
                  🔊 {hi.playAudio} / {en.playAudio}
                  {playing === "blocked" ? " (tap)" : ""}
                </button>
              ) : (
                <span className="flex-1 self-center text-sm text-muted">Audio unavailable — text answer above</span>
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
          <p className="m-0 rounded-lg bg-white p-2 text-sm" aria-live="polite">
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
