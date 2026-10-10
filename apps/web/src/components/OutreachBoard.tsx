import { Check, Hourglass, MapPin, X } from "lucide-react";
import type { Ask, Proposal, RunDetail, Receipt } from "../api";
import { fmtClock, useCountdown } from "../hooks";
import { useLang } from "../i18n/lang";
import { I } from "./ui";

const name = (a: Ask) => a.hostLabel ?? a.hostId;

function Step({ ask, serverTime }: { ask: Ask; serverTime: number }) {
  const { t } = useLang();
  const left = useCountdown(ask.status === "OPEN" ? ask.expiresAt : null, serverTime);
  if (ask.status === "OPEN")
    return <li className="flex items-center gap-2 text-heat"><I icon={Hourglass} />{t("out.asking", { host: name(ask), time: fmtClock(left ?? 0) })}</li>;
  if (ask.status === "TIMED_OUT") return <li className="flex items-center gap-2 text-gap"><I icon={X} />{t("out.timedOut", { host: name(ask) })}</li>;
  if (ask.status === "DECLINED") return <li className="flex items-center gap-2 text-gap"><I icon={X} />{t("out.declined", { host: name(ask) })}</li>;
  return <li className="flex items-center gap-2 text-water"><I icon={Check} />{t("out.accepted", { host: name(ask), from: ask.window[0], to: ask.window[1] })}</li>;
}

/** Mirrors the state machine: one block per area; every line is a real ask record or event. */
export function OutreachBoard({ proposal, detail, events }: { proposal: Proposal; detail: RunDetail; events: Receipt[] }) {
  const { t } = useLang();
  const published = events.filter((e) => e.type === "point_published");
  const done = detail.run.status === "COMPLETED";
  return (
    <section className="card p-4">
      <h2 className="m-0 text-lg font-semibold">{t("out.title")}</h2>
      {proposal.gaps.map((g) => {
        const asks = detail.asks.filter((a) => a.clusterId === g.clusterId);
        const live = published.find((e) => (e.data as { clusterId?: string }).clusterId === g.clusterId);
        return (
          <div key={g.clusterId} className="mt-2">
            <p className="m-0 font-semibold">{g.label ?? `Area ${g.clusterId}`} <span className="font-normal text-muted tnum">· {t("plan.requests", { n: g.requests })}</span></p>
            <ul className="m-0 list-none space-y-1 p-0 pt-1 text-[15px]">
              {asks.map((a) => <Step key={a.id} ask={a} serverTime={detail.serverTime} />)}
              {live && <li className="flex items-center gap-2 font-semibold text-water"><I icon={MapPin} />{t("out.live")}</li>}
              {!asks.length && <li className="text-muted">{t("out.waiting")}</li>}
              {done && !live && <li className="flex items-center gap-2 font-semibold text-gap"><I icon={X} />{t("out.none")}</li>}
            </ul>
          </div>
        );
      })}
      {proposal.unresolved.map((u) => (
        <p key={u.clusterId} className="m-0 mt-2 text-[15px] font-semibold text-gap">
          {t("out.unresolved", { area: u.label ?? `Area ${u.clusterId}`, n: u.requests, rec: t(`rec.${u.recommendation}`) })}
        </p>
      ))}
    </section>
  );
}
