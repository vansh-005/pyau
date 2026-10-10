import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause } from "lucide-react";
import { getProblems, reactivateHost } from "../api";
import { useLang } from "../i18n/lang";
import { I } from "./ui";

/** Paused points and the rider reports behind them. Reactivation is a human decision. */
export function ProblemQueue({ sessionId, zoneId, token }: { sessionId: string; zoneId: string; token: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["problems", sessionId],
    queryFn: () => getProblems(zoneId, sessionId, token),
    refetchInterval: () => (document.hidden ? false : 3000),
  });
  const items = q.data?.problems ?? [];
  if (!items.length) return null;
  const act = async (h: string) => {
    await reactivateHost(h, zoneId, sessionId, token);
    void qc.invalidateQueries({ queryKey: ["problems", sessionId] });
    void qc.invalidateQueries({ queryKey: ["coverage", sessionId] });
    void qc.invalidateQueries({ queryKey: ["map", sessionId] });
  };
  return (
    <section className="card p-4" aria-label={t("problem.title")}>
      <h2 className="m-0 text-lg font-semibold">{t("problem.title")} <span className="text-base font-normal text-gap tnum">{items.length}</span></h2>
      <ul className="m-0 list-none space-y-2 p-0 pt-2">
        {items.map((p) => (
          <li key={p.hostId} className="rounded-lg bg-gap-soft p-3 text-[15px]">
            <p className="m-0 flex items-center gap-2">
              <span className="font-semibold tnum">{p.hostId}</span>
              <strong>{p.label}</strong>
              <span className="inline-flex items-center gap-1 font-semibold text-gap"><I icon={Pause} size={16} />{t("problem.paused")}</span>
              <button className="ml-auto min-h-12 rounded-lg border border-border bg-panel px-4 font-semibold" onClick={() => void act(p.hostId)}>{t("problem.reactivate")}</button>
            </p>
            <p className="m-0 text-[14px] text-muted">
              {t("problem.reason", { n: p.reports.length || 2, h: 3 })}{p.seeded ? ` ${t("problem.sample")}` : ""}
              {p.reports.length > 0 && <> · {p.reports.map((r) => t(`fb.${r.kind}`)).join(", ")}</>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
