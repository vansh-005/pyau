import { useQuery } from "@tanstack/react-query";
import { getMap } from "../api";
import { CoordinatorPanel } from "../components/CoordinatorPanel";
import { useDemoSession } from "../session";

/** /coordinate/:zoneId — coordinator screen. Until Cognito sign-in is wired, it runs inside a demo session. */
export default function Coordinate() {
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
    <div className="mx-auto h-full max-w-6xl">
      <CoordinatorPanel sessionId={session.sessionId} zoneId={session.zoneId} token={session.token} map={map.data} />
    </div>
  );
}
