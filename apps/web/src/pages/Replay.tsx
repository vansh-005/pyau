import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, type Ask, type CovNum, type Proposal, type Receipt } from "../api";
import { AgentPanel } from "../components/AgentPanel";
import { Loading } from "../components/Loading";
import { PlanReview } from "../components/PlanReview";
import { LangToggle, Wordmark } from "../components/ui";
import { useLang } from "../i18n/lang";

interface Replay {
  id: string; capturedAt: number; runId: string; modelId: string | null; scenario: string;
  run: { status: string; date: string; startedAt: number; finishedAt: number | null; coverageCurrent?: CovNum };
  proposal: Proposal; asks: (Ask & { hostLabel?: string })[]; events: Receipt[];
}

/** /replay/:id — a saved real run, read-only. No model calls, no writes, signed out. */
export default function ReplayPage() {
  const { t, lang } = useLang();
  const { id = "latest" } = useParams();
  const q = useQuery({ queryKey: ["replay", id], queryFn: () => api<Replay>("GET", `/replays/${id}`) });
  if (q.isLoading) return <Loading>{t("loading.replay")}</Loading>;
  if (q.error || !q.data) return <p className="p-4 text-gap">{t("replay.none")}</p>;
  const r = q.data;
  const before = r.proposal.coverageBefore, after = r.run.coverageCurrent;
  const captured = new Date(r.capturedAt * 1000).toLocaleString(lang === "hi" ? "hi-IN" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ink px-4 py-3 font-medium text-white" role="status">
        <span>{t("replay.banner", { when: captured })}</span>
        <Link to="/demo" className="ml-auto text-white underline">{t("replay.live")}</Link>
      </div>
      <header className="flex items-start justify-between gap-2">
        <div>
          <Wordmark size={22} />
          <h1 className="m-0 mt-2 text-2xl font-semibold tracking-tight">{t("replay.title")}</h1>
          <p className="m-0 text-[15px] text-muted">{r.scenario} · {t("replay.model", { m: r.modelId ?? "" })} · <span className="tnum">{r.runId}</span></p>
        </div>
        <LangToggle />
      </header>
      <section className="card p-4">
        <p className="m-0 text-base text-muted">{t("replay.coverage")}</p>
        <p className="m-0 text-[44px] font-semibold leading-tight tracking-tight tnum text-water">
          {before?.percent}% → {after?.percent}% <span className="text-xl font-normal text-muted">({before?.covered}/{before?.total} → {after?.covered}/{after?.total})</span>
        </p>
        <p className="m-0 mt-1 text-[15px] font-medium text-gap">{t("replay.open", { areas: (after?.uncoveredClusters ?? []).map((c) => r.proposal.unresolved.find((u) => u.clusterId === c)?.label ?? `Area ${c}`).join(", ") })}</p>
      </section>
      <AgentPanel events={r.events} onRun={() => undefined} canRun={false} startError="" readOnly />
      <PlanReview proposal={{ ...r.proposal, status: "APPROVED" }} sessionId="" token="" onDone={() => undefined} readOnly />
      <section className="card p-4">
        <h2 className="m-0 text-lg font-semibold">{t("out.title")}</h2>
        <ul className="m-0 list-none space-y-1 p-0 pt-2 text-[15px]">
          {r.asks.map((a) => (
            <li key={a.id}>
              <span className="font-semibold tnum">{a.hostId}</span> {a.hostLabel}:{" "}
              <strong>{a.status === "TIMED_OUT" ? t("out.timedOutShort") : a.status === "ACCEPTED" ? t("out.acceptedShort", { from: a.window[0], to: a.window[1] }) : a.status.toLowerCase()}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
