import { useRef, useState } from "react";
import { Check, Flag, Mic, Route as RouteIcon, Volume2 } from "lucide-react";
import { askVoice, helpFind, sendFeedback, type FeedbackKind, type FeedbackResult, type FindResponse, type MapHost, type Need } from "../api";
import { useLang } from "../i18n/lang";
import { MAX_RECORD_MS, pcmToBase64, startRecording, type Recording } from "../voice";
import { MapView } from "./MapView";
import { I, NEED_ICON, Offers, Segmented } from "./ui";

export interface RiderPanelProps {
  sessionId: string;
  zoneId: string;
  center: { lat: number; lng: number };
  hosts: MapHost[];
  /** Scripted rider locations (demo). The first is the default (area B, the fixture's rider-query point). */
  locations: { id: string; lat: number; lng: number }[];
  onAnswered?: (a: FindResponse) => void;
}

const NEEDS: Need[] = ["water", "shade", "toilet", "charging"];
const PROBLEMS: FeedbackKind[] = ["no_water", "closed", "dirty", "unsafe"];

export function RiderPanel({ sessionId, zoneId, center, hosts, locations, onAnswered }: RiderPanelProps) {
  const { t, lang } = useLang();
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
      showAnswer(await helpFind({ need, lat: location.lat, lng: location.lng, sessionId, zoneId, lang }));
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
      setFb({ result: await sendFeedback({ hostId: answer.host.id, kind, lat: location.lat, lng: location.lng, sessionId, zoneId }) });
    } catch (e) {
      setFb({ error: (e as Error).message });
    }
  };

  // ---- hold-to-talk voice question: the tap buttons always remain available ----
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
      setError(t("rider.micError"));
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
        setError(t("rider.tooShort"));
        return;
      }
      const v = await askVoice({ audioBase64: pcmToBase64(pcm), lat: location.lat, lng: location.lng, sessionId, zoneId, lang });
      setTranscript(v.transcript || "");
      if (v.needUnknown) {
        setAnswer(null);
        setError(v.answer[lang]);
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
        <div className="flex items-center gap-2 border-b border-border bg-panel px-3 py-2">
          <span className="text-[15px] text-muted">{t("rider.location")}</span>
          <Segmented size="sm" label={t("rider.location")} value={locId} onChange={(v) => { setLocId(v); setAnswer(null); setFb(null); }}
            options={locations.map((l) => ({ value: l.id, label: t(`area.${l.id}`) }))} />
        </div>
      )}
      <div className="relative min-h-[150px] flex-1">
        <MapView center={center} zoom={15.5} hosts={hosts} rider={location} routeLine={showRoute ? answer?.route?.line ?? null : null} />
      </div>
      <div className="flex max-h-[66%] flex-col gap-2 overflow-auto bg-panel p-3">
        {error && <p className="m-0 rounded-lg bg-gap-soft p-2 text-gap" role="alert">{error}</p>}
        {answer && (
          <section aria-live="polite" className="space-y-2">
            {answer.host && (
              <p className="m-0 flex items-baseline gap-2">
                <strong className="text-lg">{answer.host.label}</strong>
                <span className="text-[14px] text-muted tnum">{answer.host.id}</span>
              </p>
            )}
            <p lang={lang} className="m-0 text-base leading-snug">{answer.answer[lang]}</p>
            {answer.host && <Offers offers={answer.host.offers} highlight={answer.need} />}
            {answer.found && answer.host && (
              <p className="m-0 flex items-center gap-2 font-medium tnum">
                <I icon={RouteIcon} size={16} className="text-water" />
                {answer.distanceM} m
                {answer.route ? ` · ${t("rider.byScooter", { min: Math.max(1, Math.round(answer.route.durationS / 60)) })}` : ""}
                {answer.approximate && <span className="font-normal text-heat"> · {t("rider.approx")}</span>}
              </p>
            )}
            {!answer.found && <p className="m-0 font-medium text-gap">{t("rider.nothing")}</p>}
            <div className="flex gap-2">
              {answer.audio ? (
                <button className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-panel font-semibold" onClick={play}>
                  <I icon={Volume2} className="text-water" />{t("rider.play")}{playing === "blocked" ? ` (${t("rider.tap")})` : ""}
                </button>
              ) : (
                <span className="flex-1 self-center text-muted">{t("rider.noAudio")}</span>
              )}
              {answer.route && (
                <button className={`inline-flex min-h-12 items-center gap-2 rounded-lg px-4 font-semibold ${showRoute ? "bg-water text-on-water" : "border border-border bg-panel"}`}
                  onClick={() => setShowRoute((v) => !v)} aria-pressed={showRoute}>
                  <I icon={RouteIcon} />{t("rider.route")}
                </button>
              )}
            </div>
            {answer.host && (
              <div className="border-t border-border pt-2">
                {!fb?.result && !fb?.error && (
                  <div className="flex gap-2">
                    <button className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-panel font-semibold" onClick={() => void report("got_it")}>
                      <I icon={Check} className="text-water" />{t("rider.gotIt")}
                    </button>
                    <button className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-panel font-semibold" aria-expanded={!!fb?.asking} onClick={() => setFb({ asking: !fb?.asking })}>
                      <I icon={Flag} className="text-gap" />{t("rider.problem")}
                    </button>
                  </div>
                )}
                {fb?.asking && (
                  <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label={t("rider.whatProblem")}>
                    {PROBLEMS.map((k) => (
                      <button key={k} className="min-h-12 rounded-lg border border-border bg-panel px-2 font-medium" onClick={() => void report(k)}>{t(`fb.${k}`)}</button>
                    ))}
                  </div>
                )}
                {fb?.result && (
                  <p className="m-0 font-medium" role="status">
                    {fb.result.kind === "got_it"
                      ? t("rider.thanks")
                      : fb.result.pausedNow
                        ? t("rider.paused", { n: fb.result.problemCount })
                        : t("rider.reported", { n: fb.result.problemCount, max: fb.result.threshold })}
                  </p>
                )}
                {fb?.error && <p className="m-0 font-medium text-gap">{fb.error}</p>}
              </div>
            )}
          </section>
        )}
        {transcript !== null && (
          <p className="m-0 rounded-lg bg-canvas p-2" aria-live="polite">
            <span className="text-muted">{t("rider.heard")}</span> <span lang={lang} className="font-semibold">“{transcript || "…"}”</span>
          </p>
        )}
        <button
          className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border px-4 text-base font-semibold ${mic === "recording" ? "border-gap bg-gap-soft text-gap" : "border-water bg-water-soft text-water"}`}
          onPointerDown={() => void micStart()}
          onPointerUp={() => void micStop()}
          onPointerLeave={() => mic === "recording" && void micStop()}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && void micStart()}
          onKeyUp={(e) => (e.key === " " || e.key === "Enter") && void micStop()}
          disabled={mic === "sending"}
          aria-label={t("rider.micAria")}
        >
          <I icon={Mic} size={20} />
          {mic === "recording" ? t("rider.listening") : mic === "sending" ? t("rider.understanding") : t("rider.hold")}
        </button>
        <div className="grid grid-cols-2 gap-2">
          {NEEDS.map((need) => (
            <button
              key={need}
              disabled={busy !== null}
              onClick={() => void ask(need)}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-border bg-panel px-2 text-base font-semibold disabled:opacity-60"
            >
              <I icon={NEED_ICON[need]} size={20} className="text-water" />
              {busy === need ? t("rider.looking") : t(`need.${need}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
