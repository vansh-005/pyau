import type { ClusterInfo } from "../api";
import { useLang } from "../i18n/lang";

/**
 * One dot per rider request in the heat window, grouped by area. A filled dot has an open water point within 500 m;
 * a hollow dot does not. Counts come straight from the coverage API, so the dots change only when the API's numbers do.
 */
export function RequestDots({ clusters }: { clusters: ClusterInfo[] }) {
  const { t } = useLang();
  const total = clusters.reduce((n, c) => n + c.requests, 0);
  const covered = clusters.reduce((n, c) => n + c.covered, 0);
  return (
    <div>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-2 p-0" aria-label={t("dots.aria", { covered, total })}>
        {clusters.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span className={`text-[15px] font-semibold ${c.uncovered ? "text-gap" : "text-ink"}`}>{c.id}</span>
            <span className="flex flex-wrap gap-1" style={{ maxWidth: 134 }}>
              {Array.from({ length: c.requests }, (_, i) => (
                <span key={i} className={`inline-block h-2.5 w-2.5 rounded-full border-[1.5px] transition-colors duration-500 ${i < c.covered ? "border-water bg-water" : "border-gap bg-panel"}`} />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-water bg-water" />{t("dots.covered")}</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-gap bg-panel" />{t("dots.uncovered")}</span>
      </p>
    </div>
  );
}
