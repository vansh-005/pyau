import { useQuery } from "@tanstack/react-query";
import { getMap } from "../api";
import { CoordinatorPanel } from "../components/CoordinatorPanel";
import { Loading } from "../components/Loading";
import { LangToggle, Wordmark } from "../components/ui";
import { useRun } from "../hooks";
import { useLang } from "../i18n/lang";
import { useDemoSession } from "../session";

/** /coordinate/:zoneId — coordinator screen. Until Cognito sign-in is wired it runs inside a demo session. */
export default function Coordinate() {
  const { t } = useLang();
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
  if (!session || !map.data) return <Loading>{t("loading.coordinator")}</Loading>;
  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col">
      <header className="flex items-center justify-between border-b border-border bg-white px-4 py-2"><Wordmark /><LangToggle /></header>
      <div className="min-h-0 flex-1">
        <CoordinatorPanel sessionId={sid} zoneId={session.zoneId} token={session.token} map={map.data} run={run} />
      </div>
    </div>
  );
}
