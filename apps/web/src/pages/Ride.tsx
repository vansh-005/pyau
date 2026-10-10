import { useQuery } from "@tanstack/react-query";
import { getMap } from "../api";
import { Loading } from "../components/Loading";
import { RiderPanel } from "../components/RiderPanel";
import { LangToggle, ThemeToggle } from "../components/ui";
import { useLang } from "../i18n/lang";
import { RIDER_LOCATIONS, useDemoSession } from "../session";

/** /ride — rider screen. Uses a demo session with the scripted area-B location (live mode arrives with geolocation). */
export default function Ride() {
  const { t } = useLang();
  const { session, error } = useDemoSession();
  const map = useQuery({
    queryKey: ["map", session?.sessionId],
    queryFn: () => getMap(session!.zoneId, session!.sessionId),
    enabled: !!session,
    refetchInterval: () => (document.hidden ? false : 5000),
  });
  if (error) return <p className="p-4 text-gap">{error}</p>;
  if (!session || !map.data) return <Loading>{t("loading.rider")}</Loading>;
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <div className="flex justify-end border-b border-border bg-panel p-2"><span className="flex items-center gap-2"><LangToggle /><ThemeToggle /></span></div>
      <div className="min-h-0 flex-1">
        <RiderPanel sessionId={session.sessionId} zoneId={session.zoneId} center={map.data.zone.center} hosts={map.data.hosts} locations={RIDER_LOCATIONS} />
      </div>
    </div>
  );
}
