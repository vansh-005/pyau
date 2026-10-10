import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FieldError, getMap, hostAsks, registerHost, reverseGeocode, runFreshness, type Ask, type RegisteredHost } from "../api";
import { AskCard } from "../components/HostPanel";
import { MapView } from "../components/MapView";
import { useDemoSession } from "../session";

const TYPES = [
  ["shop", "Shop", "दुकान"], ["chemist", "Chemist", "दवाई"], ["temple", "Temple", "मंदिर"], ["rwa", "RWA / office", "RWA"],
  ["home", "Home", "घर"], ["dhaba", "Dhaba", "ढाबा"], ["other", "Other", "अन्य"],
] as const;
const OFFERS = [["water", "Water", "पानी"], ["shade", "Shade", "छाँव"], ["toilet", "Toilet", "शौचालय"], ["charging", "Charging", "चार्ज"]] as const;
const KEY = "pyau.myHosts";

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" aria-pressed={on} onClick={onClick}
    className={`min-h-12 rounded-full border px-4 text-base font-medium ${on ? "border-water bg-water text-white" : "border-border bg-white"}`}>
    {on ? "✓ " : ""}{children}
  </button>
);

function loadMine(): RegisteredHost[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/** /host — register a point in under a minute, then answer the morning "still serving water today?" check. */
export default function Host() {
  const { session } = useDemoSession();
  const qc = useQueryClient();
  const sid = session?.sessionId ?? "";
  const [mine, setMine] = useState<RegisteredHost[]>(loadMine);
  const [label, setLabel] = useState("");
  const [hostType, setHostType] = useState<string>("shop");
  const [offers, setOffers] = useState<string[]>(["water"]);
  const [kind, setKind] = useState<"listed" | "standby">("listed");
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
      const h = await registerHost({ zoneId: session.zoneId, sessionId: sid, label, hostType, offers, kind, hours: [open, close], lat: pin.lat, lng: pin.lng, consentToAsks: consent }, session.token);
      const next = [...mine, h];
      setMine(next);
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      setLabel("");
      setConsent(false);
      setNotice(`Registered as ${h.id}. ${kind === "listed" ? "You appear greyed out until you confirm you're serving today." : "You're on standby: the coordinator asks you only when needed."}`);
      void qc.invalidateQueries({ queryKey: ["map", sid] });
    } catch (err) {
      if (err instanceof FieldError) {
        setFields(err.fields);
        setError(err.message);
      } else setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const morning = async () => {
    setError("");
    try {
      const r = await runFreshness(session!.zoneId, sid, session!.token);
      setNotice(r.created.length ? `Morning check sent to ${r.created.join(", ")}` : "No new morning checks needed.");
      void inbox.refetch();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!session || !map.data) return <p className="p-4">Loading…</p>;
  const myState = (id: string) => map.data!.hosts.find((h) => h.id === id);
  const toggleOffer = (o: string) => setOffers((v) => (v.includes(o) ? v.filter((x) => x !== o) : [...v, o]));
  const Err = ({ k }: { k: string }) => (fields[k] ? <p className="m-0 mt-1 text-sm font-semibold text-gap" role="alert">{fields[k]}</p> : null);

  return (
    <div className="mx-auto grid min-h-full max-w-5xl gap-4 p-4 md:grid-cols-[1fr_420px]">
      <div className="hidden min-h-[560px] overflow-hidden rounded-2xl border border-border md:block">
        <MapView center={map.data.zone.center} zoom={15.5} hosts={map.data.hosts} pin={pin} onPinMove={setPin} />
      </div>
      <div className="space-y-3">
        <header>
          <h1 className="m-0 font-serif text-3xl font-semibold text-clay">Pyau · Host</h1>
          <p className="hi m-0 text-lg">अपना पानी पॉइंट जोड़ें</p>
          <p className="m-0 text-sm text-muted">Sample scenario · demo session {sid.slice(0, 6)}</p>
        </header>
        {notice && <p className="m-0 rounded-lg bg-ok/10 p-2 font-medium text-ok" role="status">{notice}</p>}
        {(inbox.data ?? []).length > 0 && (
          <section className="space-y-2" aria-label="Inbox">
            {(inbox.data as Ask[]).map((a) => (
              <AskCard key={a.id} ask={a} serverTime={serverTime} sessionId={sid} token={session.token}
                onChanged={() => { void inbox.refetch(); void qc.invalidateQueries({ queryKey: ["map", sid] }); }} />
            ))}
          </section>
        )}
        {mine.length > 0 && (
          <section className="card p-3">
            <h2 className="m-0 text-lg font-semibold">My points</h2>
            <ul className="m-0 list-none space-y-1 p-0 pt-1">
              {mine.map((h) => {
                const s = myState(h.id);
                return (
                  <li key={h.id} className="text-[15px]">
                    <span className="font-mono font-semibold">{h.id}</span> {h.label} ·{" "}
                    <strong>{s?.state === "live" ? `Live ${s.window?.[0]}–${s.window?.[1]}` : s?.state === "standby" ? "Standby" : "Not confirmed today"}</strong>
                    {h.address && <span className="block text-sm text-muted">{h.address}</span>}
                  </li>
                );
              })}
            </ul>
            <button className="mt-2 min-h-12 w-full rounded-lg border border-border font-semibold" onClick={() => void morning()}>
              Demo: send the morning check now
            </button>
          </section>
        )}
        <form className="card space-y-3 p-3" onSubmit={(e) => void submit(e)} noValidate>
          <h2 className="m-0 text-lg font-semibold">Register a point</h2>
          <label className="block text-base font-medium">
            Name of your place
            <input className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 text-base" value={label} maxLength={60}
              onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sharma Chai Stall" />
            <Err k="label" />
          </label>
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-base font-medium">What kind of place?</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {TYPES.map(([v, en, hi]) => <Chip key={v} on={hostType === v} onClick={() => setHostType(v)}>{en} <span className="hi">{hi}</span></Chip>)}
            </div>
            <Err k="hostType" />
          </fieldset>
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-base font-medium">What can riders get?</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {OFFERS.map(([v, en, hi]) => <Chip key={v} on={offers.includes(v)} onClick={() => toggleOffer(v)}>{en} <span className="hi">{hi}</span></Chip>)}
            </div>
            <Err k="offers" />
          </fieldset>
          <div className="flex gap-3">
            <label className="flex-1 text-base font-medium">Open
              <input type="time" className="mt-1 min-h-12 w-full rounded-lg border border-border px-3" value={open} onChange={(e) => setOpen(e.target.value)} />
            </label>
            <label className="flex-1 text-base font-medium">Close
              <input type="time" className="mt-1 min-h-12 w-full rounded-lg border border-border px-3" value={close} onChange={(e) => setClose(e.target.value)} />
            </label>
          </div>
          <Err k="hours" />
          <div>
            <p className="m-0 text-base font-medium">Where? Drag the pin on the map</p>
            <p className="m-0 mt-1 rounded-lg bg-canvas p-2 text-sm">{address ?? "Address not available — your pin is still saved"}</p>
            <div className="mt-2 h-56 overflow-hidden rounded-lg border border-border md:hidden">
              <MapView center={map.data.zone.center} zoom={15.5} hosts={map.data.hosts} pin={pin} onPinMove={setPin} />
            </div>
            <Err k="location" />
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-base font-medium">How should we list you?</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Chip on={kind === "listed"} onClick={() => setKind("listed")}>Listed</Chip>
              <Chip on={kind === "standby"} onClick={() => setKind("standby")}>Standby</Chip>
            </div>
            <p className="m-0 mt-1 text-sm text-muted">
              {kind === "listed" ? "Riders see you every day you confirm in the morning." : "Hidden until the coordinator asks you on a hot day and you say yes."}
            </p>
            <Err k="kind" />
          </fieldset>
          <label className="flex items-start gap-3 text-base">
            <input type="checkbox" className="mt-1 h-6 w-6" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Coordinator may ask me on hot days <span className="hi">(गर्मी के दिनों में कोऑर्डिनेटर मुझसे पूछ सकते हैं)</span></span>
          </label>
          <Err k="consentToAsks" />
          {error && <p className="m-0 font-semibold text-gap" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="min-h-14 w-full rounded-xl bg-water px-4 text-lg font-semibold text-white disabled:opacity-60">
            {busy ? "Saving…" : "Register / जोड़ें"}
          </button>
        </form>
      </div>
    </div>
  );
}
