import { Loading } from "../components/Loading";
import { useQuery } from "@tanstack/react-query";
import { getMap } from "../api";
import { CoordinatorPanel } from "../components/CoordinatorPanel";
import { useRun } from "../hooks";
import { useDemoSession } from "../session";

/** /coordinate/:zoneId — coordinator screen. Until Cognito sign-in is wired it runs inside a demo session. */
export default function Coordinate() {
  const { session, error } = useDemoSession();
  const sid = session?.sessionId ?? "";
  const map = useQuery({
    queryKey: ["map", sid],
    queryFn: () => getMap(session!.zoneId, sid),
    enabled: !!session,
    refetchInterval: () => (document.hidden ? false : 5000),
  });
  const run = useRun(sid, session?.zoneId ?? "", session?.token ?? "", session?.scenarioDate ?? "");
  if (error) return <p className="p-4 text-gap">{error}</p>;
  if (!session || !map.data) return <Loading>Loading the coordinator screen…</Loading>;
  return (
    <div className="mx-auto h-full max-w-6xl">
      <CoordinatorPanel sessionId={sid} zoneId={session.zoneId} token={session.token} map={map.data} run={run} />
    </div>
  );
}
