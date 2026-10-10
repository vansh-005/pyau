import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { FieldError, getMap, hostAsks, registerHost, reverseGeocode, runFreshness, type Ask, type RegisteredHost } from "../api";
import { AskCard } from "../components/HostPanel";
import { Loading } from "../components/Loading";
import { MapView } from "../components/MapView";
import { I, LangToggle, ThemeToggle, NEED_ICON, Segmented, Wordmark } from "../components/ui";
import { useLang, type Lang } from "../i18n/lang";
import { useDemoSession } from "../session";

const TYPES = ["shop", "chemist", "temple", "rwa", "home", "dhaba", "other"] as const;
const OFFERS = ["water", "shade", "toilet", "charging"] as const;
const KEY = "pyau.myHosts";

function loadMine(): RegisteredHost[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

const field = "mt-1 min-h-12 w-full rounded-lg border border-border bg-panel px-3 text-base";

/** /host — register a point in under a minute, then answer the morning "still serving water today?" check. */
export default function Host() {
  const { t, lang } = useLang();
  const { session } = useDemoSession();
  const qc = useQueryClient();
  const sid = session?.sessionId ?? "";
  const [mine, setMine] = useState<RegisteredHost[]>(loadMine);
  const [label, setLabel] = useState("");
  const [hostType, setHostType] = useState<string>("shop");
  const [offers, setOffers] = useState<string[]>(["water"]);
  const [kind, setKind] = useState<"listed" | "standby">("listed");
  const [hostLang, setHostLang] = useState<Lang>(lang);
  const [open, setOpen] = useState("09:00");
  const [close, setClose] = useState("20:00");
  const [consent, setConsent] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const geoSeq = useRef(0);

  const map = useQuery({
    queryKey: ["map", sid],
    queryFn: () => getMap(session!.zoneId, sid),
    enabled: !!session,
    refetchInterval: () => (document.hidden ? false : 3000),
  });
  useEffect(() => {
    if (map.data && !pin) setPin({ lat: map.data.zone.center.lat + 0.0009, lng: map.data.zone.center.lng - 0.0012 });
  }, [map.data, pin]);

  const lookup = async (p: { lat: number; lng: number }) => {
    const n = ++geoSeq.current;
    try {
      const r = await reverseGeocode(p.lat, p.lng, sid, session!.token);
      if (n === geoSeq.current) setAddress(r.address);
    } catch {
      if (n === geoSeq.current) setAddress(null);
    }
  };
  useEffect(() => {
    if (pin && session) void lookup(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng, !!session]);

  const inbox = useQuery({
    queryKey: ["myinbox", sid, mine.map((h) => h.id).join()],
    queryFn: async () => (await Promise.all(mine.map((h) => hostAsks(h.id, sid, session!.token)))).flatMap((r) => r.asks),
    enabled: !!session && mine.length > 0,
    refetchInterval: () => (document.hidden ? false : 2000),
  });
  const serverTime = Date.now() / 1000;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !pin) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      const h = await registerHost({ zoneId: session.zoneId, sessionId: sid, label, hostType, offers, kind, language: hostLang, hours: [open, close], lat: pin.lat, lng: pin.lng, consentToAsks: consent }, session.token);
      const next = [...mine, h];
      setMine(next);
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      setLabel("");
      setConsent(false);
      setNotice(t(kind === "listed" ? "hostp.registeredListed" : "hostp.registeredStandby", { id: h.id }));
      void qc.invalidateQueries({ queryKey: ["map", sid] });
    } catch (err) {
      if (err instanceof FieldError) {
        setFields(err.fields);
        setError(t("hostp.fixFields"));
      } else setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const morning = async () => {
    setError("");
    try {
      const r = await runFreshness(session!.zoneId, sid, session!.token);
      setNotice(r.created.length ? t("hostp.morningSent", { ids: r.created.join(", ") }) : t("hostp.morningNone"));
      void inbox.refetch();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!session || !map.data) return <Loading>{t("loading.host")}</Loading>;
  const myState = (id: string) => map.data!.hosts.find((h) => h.id === id);
  const toggleOffer = (o: string) => setOffers((v) => (v.includes(o) ? v.filter((x) => x !== o) : [...v, o]));
  const Err = ({ k }: { k: string }) => (fields[k] ? <p className="m-0 mt-1 text-[15px] font-medium text-gap" role="alert">{fields[k]}</p> : null);

  return (
    <div className="mx-auto grid min-h-full max-w-5xl gap-4 p-4 md:grid-cols-[1fr_420px]">
      <div className="hidden min-h-[560px] overflow-hidden rounded-lg border border-border md:block">
        <MapView center={map.data.zone.center} zoom={15.5} hosts={map.data.hosts} pin={pin} onPinMove={setPin} />
      </div>
      <div className="space-y-4">
        <header className="flex items-start justify-between gap-2">
          <div>
            <Wordmark size={22} />
            <h1 className="m-0 mt-2 text-2xl font-semibold tracking-tight">{t("hostp.title")}</h1>
            <p className="m-0 text-[15px] text-muted">{t("hostp.sample", { id: sid.slice(0, 6) })}</p>
          </div>
          <span className="flex items-center gap-2"><LangToggle /><ThemeToggle /></span>
        </header>
        {notice && <p className="m-0 flex items-start gap-2 rounded-lg border border-water bg-water-soft p-3 font-medium text-water" role="status"><I icon={Check} className="mt-0.5 shrink-0" />{notice}</p>}
        {(inbox.data ?? []).length > 0 && (
          <section className="space-y-2" aria-label={t("hostp.inbox")}>
            {(inbox.data as Ask[]).map((a) => (
              <AskCard key={a.id} ask={a} serverTime={serverTime} sessionId={sid} token={session.token}
                onChanged={() => { void inbox.refetch(); void qc.invalidateQueries({ queryKey: ["map", sid] }); }} />
            ))}
          </section>
        )}
        {mine.length > 0 && (
          <section className="card p-4">
            <h2 className="m-0 text-lg font-semibold">{t("hostp.mine")}</h2>
            <ul className="m-0 list-none space-y-2 p-0 pt-2">
              {mine.map((h) => {
                const s = myState(h.id);
                return (
                  <li key={h.id} className="text-[15px]">
                    <span className="font-semibold tnum">{h.id}</span> {h.label} ·{" "}
                    <strong>{s?.state === "live" ? t("hostp.live", { from: s.window?.[0] ?? "", to: s.window?.[1] ?? "" }) : s?.state === "standby" ? t("state.standby") : t("state.not_confirmed")}</strong>
                    {h.address && <span className="block text-[14px] text-muted">{h.address}</span>}
                  </li>
                );
              })}
            </ul>
            <button className="mt-4 min-h-12 w-full rounded-lg border border-border bg-panel font-semibold" onClick={() => void morning()}>{t("hostp.morning")}</button>
          </section>
        )}
        <form className="card space-y-4 p-4" onSubmit={(e) => void submit(e)} noValidate>
          <h2 className="m-0 text-lg font-semibold">{t("hostp.register")}</h2>
          <label className="block text-base font-medium">
            {t("hostp.name")}
            <input className={field} value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder={t("hostp.namePh")} />
            <Err k="label" />
          </label>
          <label className="block text-base font-medium">
            {t("hostp.type")}
            <select className={field} value={hostType} onChange={(e) => setHostType(e.target.value)}>
              {TYPES.map((v) => <option key={v} value={v}>{t(`type.${v}`)}</option>)}
            </select>
            <Err k="hostType" />
          </label>
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-base font-medium">{t("hostp.offers")}</legend>
            <div className="mt-1 divide-y divide-border rounded-lg border border-border bg-panel">
              {OFFERS.map((o) => (
                <label key={o} className="flex min-h-12 cursor-pointer items-center gap-3 px-3 text-base">
                  <input type="checkbox" className="h-5 w-5 accent-water" checked={offers.includes(o)} onChange={() => toggleOffer(o)} />
                  <I icon={NEED_ICON[o]} className="text-water" />
                  {t(`need.${o}`)}
                </label>
              ))}
            </div>
            <Err k="offers" />
          </fieldset>
          <div className="flex gap-4">
            <label className="flex-1 text-base font-medium">{t("hostp.open")}
              <input type="time" className={field} value={open} onChange={(e) => setOpen(e.target.value)} />
            </label>
            <label className="flex-1 text-base font-medium">{t("hostp.close")}
              <input type="time" className={field} value={close} onChange={(e) => setClose(e.target.value)} />
            </label>
          </div>
          <Err k="hours" />
          <div>
            <p className="m-0 text-base font-medium">{t("hostp.where")}</p>
            <p className="m-0 mt-1 rounded-lg bg-canvas p-2 text-[15px]">{address ?? t("hostp.noAddress")}</p>
            <div className="mt-2 h-56 overflow-hidden rounded-lg border border-border md:hidden">
              <MapView center={map.data.zone.center} zoom={15.5} hosts={map.data.hosts} pin={pin} onPinMove={setPin} />
            </div>
            <Err k="location" />
          </div>
          <div>
            <p className="m-0 mb-1 text-base font-medium">{t("hostp.listing")}</p>
            <Segmented<"listed" | "standby"> label={t("hostp.listing")} value={kind} onChange={setKind}
              options={[{ value: "listed", label: t("hostp.listed") }, { value: "standby", label: t("hostp.standby") }]} />
            <p className="m-0 mt-1 text-[15px] text-muted">{t(kind === "listed" ? "hostp.listedHelp" : "hostp.standbyHelp")}</p>
            <Err k="kind" />
          </div>
          <div>
            <p className="m-0 mb-1 text-base font-medium">{t("hostp.language")}</p>
            <Segmented<Lang> label={t("hostp.language")} value={hostLang} onChange={setHostLang}
              options={[{ value: "en", label: "English" }, { value: "hi", label: "हिंदी" }]} />
            <p className="m-0 mt-1 text-[15px] text-muted">{t("hostp.languageHelp")}</p>
            <Err k="language" />
          </div>
          <label className="flex min-h-12 items-start gap-3 text-base">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-water" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{t("hostp.consent")}</span>
          </label>
          <Err k="consentToAsks" />
          {error && <p className="m-0 font-semibold text-gap" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="min-h-14 w-full rounded-lg bg-water px-4 text-lg font-semibold text-on-water disabled:opacity-60">
            {busy ? t("hostp.saving") : t("hostp.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
