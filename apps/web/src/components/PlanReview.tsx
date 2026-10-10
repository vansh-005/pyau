import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { approveProposal, rejectProposal, type Proposal } from "../api";
import { useLang } from "../i18n/lang";
import { I } from "./ui";

const shortName = (l: string) => l.split("·").pop()!.split("(")[0].trim();

export function PlanReview({ proposal, sessionId, token, onDone, readOnly }: { proposal: Proposal; sessionId: string; token: string; onDone: () => void; readOnly?: boolean }) {
  const { t } = useLang();
  const [ack, setAck] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const decided = readOnly || proposal.status !== "PROPOSED";

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onDone();
    }
  };
  const toggle = (h: string) =>
    setRemoved((s) => {
      const n = new Set(s);
      if (n.has(h)) n.delete(h);
      else n.add(h);
      return n;
    });

  return (
    <section className="card p-4">
      <h2 className="m-0 text-lg font-semibold">
        {t("plan.title")}
        <span className="ml-2 text-base font-normal text-muted">{t(`plan.status.${readOnly ? "APPROVED" : proposal.status}`)}</span>
      </h2>
      <p className="m-0 mt-2 text-[15px] text-muted">{proposal.explanation}</p>
      {proposal.gaps.map((g) => (
        <div key={g.clusterId} className="mt-4 border-t border-border pt-4">
          <p className="m-0 text-base font-semibold">
            {g.label ?? `Area ${g.clusterId}`} <span className="font-normal text-muted tnum">· {t("plan.requests", { n: g.requests })}</span>
          </p>
          <p className="m-0 text-[15px]">{t("plan.asking", { from: g.askWindow[0], to: g.askWindow[1] })}</p>
          <p className="m-0 mt-2 text-[15px] text-muted">{t("plan.order")}</p>
          {g.candidateOrder.map((h, i) => {
            const m = g.messages[h];
            const c = g.candidates.find((x) => x.hostId === h);
            const text = m.text ?? m.hi ?? m.en ?? "";
            return (
              <div key={h} className={`mt-2 rounded-lg bg-canvas p-3 ${removed.has(h) ? "opacity-40" : ""}`}>
                <div className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
                  <span className="font-semibold tnum">{i + 1}. {h}</span>
                  <span className="font-semibold">{c ? shortName(c.label) : ""}</span>
                  {c && <span className="text-muted">· {t("plan.distance", { m: c.distanceM })}</span>}
                  {!decided && (
                    <button className="ml-auto min-h-10 shrink-0 rounded-lg border border-border bg-panel px-3 text-[15px] font-medium" onClick={() => toggle(h)}>
                      {removed.has(h) ? t("plan.keep") : t("plan.remove")}
                    </button>
                  )}
                </div>
                <p className="m-0 mt-1 text-[14px] text-muted">{t(m.lang === "hi" ? "plan.msgHi" : "plan.msgEn")}</p>
                <p lang={m.lang ?? "hi"} className="m-0 text-base leading-snug">{text}</p>
              </div>
            );
          })}
        </div>
      ))}
      {proposal.unresolved.length > 0 && (
        <div className="mt-4 rounded-lg border border-gap bg-gap-soft p-3">
          <p className="m-0 flex items-center gap-2 font-semibold text-gap"><I icon={CircleAlert} />{t("plan.decide")}</p>
          {proposal.unresolved.map((u) => (
            <p key={u.clusterId} className="m-0 mt-2 text-[15px]">
              <strong>{u.label ?? `Area ${u.clusterId}`}</strong> <span className="tnum">· {t("plan.requests", { n: u.requests })}</span> · {t(`reason.${u.reason}`)}
              <br />
              {t("plan.suggestion")}: <strong>{t(`rec.${u.recommendation}`)}</strong>{u.note ? ` — ${u.note}` : ""}
            </p>
          ))}
        </div>
      )}
      <p className="m-0 mt-4 text-[15px]">
        {t("plan.projected", { covered: proposal.coverageProjected.covered, total: proposal.coverageProjected.total, pct: proposal.coverageProjected.percent ?? "—" })}
        <span className="text-muted"> {t("plan.byApp")}</span>
      </p>
      {!decided && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex min-h-12 items-center gap-2 text-[15px]">
            <input type="checkbox" className="h-5 w-5 accent-water" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            {t("plan.ack")}
          </label>
          <div className="ml-auto flex gap-2">
            <button
              className="min-h-12 rounded-lg border border-border bg-panel px-4 font-semibold disabled:opacity-50"
              disabled={busy}
              onClick={() => void act(() => rejectProposal(proposal, sessionId, token, "Rejected by coordinator"))}
            >
              {t("plan.reject")}
            </button>
            <button
              className="min-h-12 rounded-lg bg-water px-4 font-semibold text-on-water disabled:opacity-50"
              disabled={!ack || busy}
              onClick={() => void act(() => approveProposal(proposal, sessionId, token, [...removed], key))}
            >
              {t("plan.approve")}
            </button>
          </div>
        </div>
      )}
      {error && <p className="m-0 mt-2 text-gap">{error}</p>}
    </section>
  );
}
