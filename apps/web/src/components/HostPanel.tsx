import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Timer } from "lucide-react";
import { hostAsks, respondAsk, type Ask, type MapHost } from "../api";
import { fmtClock, useCountdown } from "../hooks";
import { FixedLang, useLang } from "../i18n/lang";
import { I } from "./ui";

const DEMO_HOSTS = [
  { id: "H4", label: "Kirana store" },
  { id: "H5", label: "RWA office" },
];

/** A request or a morning check, in the host's own language. */
export function AskCard({ ask, serverTime, sessionId, token, onChanged }: { ask: Ask; serverTime: number; sessionId: string; token: string; onChanged: () => void }) {
  const { t, lang } = useLang();
  const left = useCountdown(ask.status === "OPEN" ? ask.expiresAt : null, serverTime);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const open = ask.status === "OPEN" && (left ?? 0) > 0;
  const fresh = ask.kind === "freshness";
  const text = ask.message.text ?? (lang === "hi" ? ask.message.hi : ask.message.en) ?? ask.message.hi ?? ask.message.en ?? ""; // one language: the host's own
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
  const yes = (
    <button disabled={busy} onClick={() => void answer("accepted")} className="inline-flex min-h-14 items-center justify-center rounded-lg bg-water px-2 font-semibold text-on-water disabled:opacity-60">
      {fresh ? t("host.freshYes") : t("host.yes")}
    </button>
  );
  const no = (
    <button disabled={busy} onClick={() => void answer("declined")} className="min-h-14 rounded-lg border border-border bg-panel px-2 font-semibold disabled:opacity-60">
      {fresh ? t("host.freshNo") : t("host.no")}
    </button>
  );
  return (
    <section className="card p-4">
      <p className="m-0 text-[15px] font-medium text-muted">{fresh ? t("host.morning", { host: ask.hostLabel ?? "" }) : t("host.from")}</p>
      <p lang={lang} className={`m-0 mt-1 leading-snug ${fresh ? "text-xl font-semibold" : "text-[17px]"}`}>{text}</p>
      {!fresh && <p className="m-0 mt-2 text-base font-semibold tnum">{ask.window[0]}–{ask.window[1]}</p>}
      {ask.status === "OPEN" && !fresh && (
        <p className="m-0 mt-2 inline-flex items-center gap-1 text-[15px] font-semibold text-heat tnum">
          <I icon={Timer} size={16} />{open ? t("host.left", { time: fmtClock(left ?? 0) }) : t("host.timeUp")}
        </p>
      )}
      {(fresh ? ask.status === "OPEN" : open) && <div className="mt-2 grid grid-cols-2 gap-2">{yes}{no}</div>}
      {ask.status === "ACCEPTED" && (
        <p className="m-0 mt-2 flex items-center gap-2 font-semibold text-water"><I icon={Check} />{t(fresh ? "host.confirmedFresh" : "host.live", { from: ask.window[0], to: ask.window[1] })}</p>
      )}
      {ask.status === "DECLINED" && <p className="m-0 mt-2 text-muted">{t(fresh ? "host.notToday" : "host.declined")}</p>}
      {!fresh && (ask.status === "TIMED_OUT" || (ask.status === "OPEN" && !open)) && <p className="m-0 mt-2 font-semibold text-gap">{t("host.movedOn")}</p>}
      {msg && <p className="m-0 mt-2 font-semibold text-gap">{msg}</p>}
    </section>
  );
}

/** Host phone: switch between the two demo hosts. The phone follows each host's own preferred language (H4 Hindi, H5 English). */
export function HostPanel({ sessionId, token, hosts }: { sessionId: string; token: string; hosts: MapHost[] }) {
  const [hostId, setHostId] = useState("H4");
  const qc = useQueryClient();
  const inbox = useQuery({
    queryKey: ["inbox", sessionId, hostId],
    queryFn: () => hostAsks(hostId, sessionId, token),
    refetchInterval: () => (document.hidden ? false : 1500),
  });
  const asks = inbox.data?.asks ?? [];
  const hostLang = hosts.find((h) => h.id === hostId)?.language ?? "en";
  const { t } = useLang(); // the demo-room language, used for the switcher only
  return (
    <div className="flex h-full flex-col bg-canvas text-[15px]">
      <div className="flex gap-2 border-b border-border bg-panel p-2" role="tablist" aria-label={t("host.switch")}>
        {DEMO_HOSTS.map((h) => (
          <button
            key={h.id}
            role="tab"
            aria-selected={hostId === h.id}
            onClick={() => setHostId(h.id)}
            className={`min-h-12 flex-1 rounded-lg px-2 font-semibold ${hostId === h.id ? "bg-water text-on-water" : "border border-border bg-panel"}`}
          >
            <span className="tnum">{h.id}</span> {h.label}
            <span className={`ml-1 text-[13px] font-medium ${hostId === h.id ? "text-on-water/85" : "text-muted"}`}>{hosts.find((x) => x.id === h.id)?.language === "hi" ? "हिंदी" : "English"}</span>
          </button>
        ))}
      </div>
      <FixedLang lang={hostLang}>
        <HostInbox asks={asks} serverTime={inbox.data?.serverTime ?? Date.now() / 1000} sessionId={sessionId} token={token}
          onChanged={() => void qc.invalidateQueries({ queryKey: ["inbox", sessionId, hostId] })} />
      </FixedLang>
    </div>
  );
}

function HostInbox({ asks, serverTime, sessionId, token, onChanged }: { asks: Ask[]; serverTime: number; sessionId: string; token: string; onChanged: () => void }) {
  const { t } = useLang();
  return (
    <div className="flex-1 space-y-2 overflow-auto p-3">
      {asks.length === 0 && <p className="m-0 rounded-lg border border-border bg-panel p-4 text-muted">{t("host.empty")}</p>}
      {asks.map((a) => <AskCard key={a.id} ask={a} serverTime={serverTime} sessionId={sessionId} token={token} onChanged={onChanged} />)}
    </div>
  );
}
