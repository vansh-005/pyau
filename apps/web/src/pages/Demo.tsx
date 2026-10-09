import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMap, type MapHost } from "../api";
import { useDemoSession } from "../session";
import { MapView, STATE_STYLE } from "../components/MapView";

/** T03 vertical slice: a demo session + the map with seeded hosts. The full three-panel room arrives in T08. */
export default function Demo() {
  const { session, error: err, fresh: newSession } = useDemoSession();
  const [selected, setSelected] = useState<MapHost | null>(null);

  const map = useQuery({
    queryKey: ["map", session?.sessionId],
    queryFn: () => getMap(session!.zoneId, session!.sessionId),
    enabled: !!session,
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-panel px-4 py-3">
        <span className="font-serif text-2xl font-semibold text-clay">Pyau</span>
        <span className="text-sm text-muted">Demo room · {map.data?.zone.name ?? "…"}</span>
        <span className="rounded-full bg-heat/15 px-3 py-1 text-sm font-medium text-heat">{map.data?.badge}</span>
        <button className="ml-auto rounded-lg border border-border px-3 py-2 text-sm" onClick={() => void newSession()}>
          New session
        </button>
      </header>
      {err && <p className="p-4 text-gap">{err}</p>}
      <div className="relative min-h-0 flex-1">
        {map.data && <MapView center={map.data.zone.center} hosts={map.data.hosts} onSelectHost={setSelected} />}
        <ul className="card absolute bottom-4 left-4 m-0 list-none p-3 text-sm">
          {map.data?.hosts.map((h) => (
            <li key={h.id} className="flex items-center gap-2 py-0.5">
              <span className="font-mono font-semibold">{h.id}</span>
              <span>{h.label.replace("Sample host · ", "")}</span>
              <span className="text-muted">· {STATE_STYLE[h.state].word}</span>
            </li>
          ))}
        </ul>
        {selected && (
          <div className="card absolute right-4 top-4 w-72 p-4">
            <p className="m-0 font-semibold">{selected.label}</p>
            <p className="m-0 mt-1 text-sm text-muted">
              {STATE_STYLE[selected.state].word} · hours {selected.hours.join("–")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
