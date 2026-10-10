import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Clock, Copy, RefreshCw } from "lucide-react";
import { getMap, setClock } from "../api";
import { CoordinatorPanel } from "../components/CoordinatorPanel";
import { HostPanel } from "../components/HostPanel";
import { Loading } from "../components/Loading";
import { PhoneFrame } from "../components/PhoneFrame";
import { RiderPanel } from "../components/RiderPanel";
import { I, LangToggle, ThemeToggle, Segmented, Wordmark } from "../components/ui";
import { useRun } from "../hooks";
import { useLang } from "../i18n/lang";
import { RIDER_LOCATIONS, useDemoSession } from "../session";

const COACH_KEY = "pyau.coachDismissed";
type Tab = "rider" | "coord" | "host";

/** /demo — one 1920×1080 screen: rider phone, coordinator centre, host phone. Every panel talks to the deployed API. */
export default function Demo() {
  const { t, lang } = useLang();
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
  const [tab, setTab] = useState<Tab>("coord");
  const sid = session?.sessionId ?? "", zone = session?.zoneId ?? "", token = session?.token ?? "";

  const map = useQuery({
    queryKey: ["map", sid],
    queryFn: () => getMap(zone, sid),
    enabled: !!session,
    refetchInterval: () => (document.hidden ? false : 3000),
  });
  const run = useRun(sid, zone, token, session?.scenarioDate ?? "");

  if (error) return <p className="p-4 text-gap">{error}</p>;
  if (!session || !map.data) return <Loading>{t("loading.session")}</Loading>;

  const clock = map.data.clock;
  const locale = lang === "hi" ? "hi-IN" : "en-GB";
  const clockDay = new Date(clock.date + "T12:00:00").toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const scenarioDate = new Date(map.data.planDate + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
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
  const btn = "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-base font-medium disabled:opacity-50";
  const btnPlain = `${btn} border-border bg-panel`;
  const btnPrimary = `${btn} border-water bg-water text-on-water`;
  return (
    <div className="flex h-full flex-col min-[1500px]:min-h-[1000px]">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-panel px-4 py-2">
        <Wordmark />
        <span className="text-base text-muted">{map.data.zone.name}</span>
        <span className="rounded-full bg-heat-soft px-3 py-1 text-base font-medium text-heat">{t("demo.badge", { date: scenarioDate })}</span>
        <span className="rounded-full bg-ink px-3 py-1 text-base font-medium text-canvas tnum">{t("demo.timers", { s: session.demoTimersSeconds })}</span>
        <span className="ml-auto" />
        <span className="flex items-center gap-2"><LangToggle /><ThemeToggle /></span>
        <span className="text-base">
          {t("demo.clock")} <strong className="tnum">{clockDay} {clock.time}</strong>
          <span className="text-muted"> ({t(`clock.${clock.label ?? "scenario day"}`)})</span>
        </span>
        <button className={btnPrimary} onClick={() => void jump()} disabled={clock.time === "14:00"}>
          <I icon={Clock} size={16} />{t("demo.jump")}
        </button>
        <button className={btnPlain} onClick={() => void copy()} disabled={!run.runId}>
          <I icon={copied ? Check : Copy} size={16} />{copied ? t("demo.copied") : run.runId ? t("demo.copy") : t("demo.copyWait")}
        </button>
        <button className={btnPlain} onClick={() => void fresh()}>
          <I icon={RefreshCw} size={16} />{t("demo.new")}
        </button>
      </header>
      {coach && (
        <div className="flex items-center gap-4 border-b border-border bg-water-soft px-4 py-2 text-base">
          <span>{t("demo.coach")}</span>
          <button className="ml-auto min-h-8 text-[15px] underline" onClick={dismissCoach}>{t("demo.dismiss")}</button>
        </div>
      )}
      {jumpErr && <p className="m-0 px-4 text-gap">{jumpErr}</p>}
      <div className="flex justify-center border-b border-border bg-panel px-4 py-2 min-[1500px]:hidden">
        <Segmented<Tab> label={t("demo.panels")} value={tab} onChange={setTab}
          options={[{ value: "rider", label: t("demo.tabRider") }, { value: "coord", label: t("demo.tabCoord") }, { value: "host", label: t("demo.tabHost") }]} />
      </div>
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-4 min-[1500px]:grid-cols-[430px_1fr_430px] min-[1500px]:overflow-visible">
        <div className={`${tab === "rider" ? "block" : "hidden"} justify-self-center min-[1500px]:block`}>
          <PhoneFrame title={t("demo.rider")}>
            <RiderPanel sessionId={sid} zoneId={zone} center={map.data.zone.center} hosts={map.data.hosts} locations={RIDER_LOCATIONS} />
          </PhoneFrame>
        </div>
        <div className={`${tab === "coord" ? "block" : "hidden"} min-h-[900px] overflow-hidden rounded-lg border border-border bg-canvas min-[1500px]:block min-[1500px]:min-h-0`}>
          <CoordinatorPanel sessionId={sid} zoneId={zone} token={token} map={map.data} run={run} />
        </div>
        <div className={`${tab === "host" ? "block" : "hidden"} justify-self-center min-[1500px]:block`}>
          <PhoneFrame title={t("demo.host")}>
            <HostPanel sessionId={sid} token={token} hosts={map.data.hosts} />
          </PhoneFrame>
        </div>
      </main>
    </div>
  );
}
