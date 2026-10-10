import { useQuery } from "@tanstack/react-query";
import { getMap } from "../api";
import { RiderPanel } from "../components/RiderPanel";
import { RIDER_LOCATIONS, useDemoSession } from "../session";

/** /ride — rider screen. Uses a demo session with the scripted cluster-B location (live mode arrives with geolocation). */
export default function Ride() {
  const { session, error } = useDemoSession();
  const map = useQuery({
    queryKey: ["map", session?.sessionId],
    queryFn: () => getMap(session!.zoneId, session!.sessionId),
    enabled: !!session,
    refetchInterval: 5000,
  });
  if (error) return <p className="p-4 text-gap">{error}</p>;
  if (!session || !map.data) return <p className="p-4">Loading…</p>;
  return (
    <div className="mx-auto h-full max-w-md">
      <RiderPanel
        sessionId={session.sessionId}
        zoneId={session.zoneId}
        center={map.data.zone.center}
        hosts={map.data.hosts}
        locations={RIDER_LOCATIONS}
      />
    </div>
  );
}
