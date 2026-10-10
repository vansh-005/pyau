import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Bike, Bot, Calculator, Mic, ClipboardCheck, Handshake, MapPin, Store, UserCheck, UserX, Hourglass, type LucideIcon } from "lucide-react";
import { PhoneShot, PyauPot, SunStreetScene, ZoneMap } from "../components/art";
import { AnimatedDots, Reveal } from "../components/motion";
import { ExtLink, SiteFooter, SiteNav } from "../components/site";
import { I, InfoTip } from "../components/ui";
import { useLang } from "../i18n/lang";
import { SRC, VIDEO_URL } from "../links";
import { useTheme } from "../theme";
import { C } from "./landing-content";

const ROLE_ICONS: LucideIcon[] = [Bike, Store, ClipboardCheck];
const STEP_ICONS: LucideIcon[] = [Mic, Store, Bot, ClipboardCheck];
const TRUST_ICONS: LucideIcon[] = [UserX, Handshake, Calculator, UserCheck, Hourglass];
const AWS_ICONS: string[][] = [
  ["AWS-Amplify"], ["Amazon-Location-Service"], ["Amazon-API-Gateway", "AWS-Lambda"], ["Amazon-DynamoDB"], ["AWS-Step-Functions"], ["Amazon-Bedrock"],
  ["Amazon-Polly"], ["Amazon-Transcribe"], ["Amazon-Simple-Storage-Service"], ["Amazon-CloudWatch"], [], ["Amazon-EventBridge"],
];

/** A section with a headline in the display serif; `flip` swaps the two columns so the page alternates. */
function Split({ id, title, flip, visual, children }: { id?: string; title: ReactNode; flip?: boolean; visual: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-14 md:py-20">
      <div className={`grid items-center gap-10 md:grid-cols-2 md:gap-16 ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
        <Reveal>
          <h2 className="display m-0 text-[32px] leading-[1.12] md:text-[40px]">{title}</h2>
          <div className="mt-4">{children}</div>
        </Reveal>
        <Reveal delay={120}>{visual}</Reveal>
      </div>
    </section>
  );
}

export default function Landing() {
  const { lang } = useLang();
  const { theme } = useTheme();
  const c = C[lang];
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView();
  }, [loc.hash]);
  const shot = (name: string) => `/shots/${name}-${theme}.png`;
  const btn = "inline-flex min-h-12 items-center gap-2 rounded-lg px-4 text-[15px] font-semibold no-underline";

  return (
    <div className="min-h-full bg-canvas">
      <SiteNav />

      {/* Hero: heat-shimmer backdrop, headline left, the real rider screen floating over the sample zone right */}
      <div className="heat-shimmer">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-24 pt-12 md:grid-cols-[1.3fr_1fr] md:pt-16">
          <div>
            <h1 className="display m-0 max-w-[16ch] text-[44px] leading-[1.04] md:text-[64px]">{c.h1}</h1>
            <p className="m-0 mt-5 max-w-[46ch] text-xl text-muted">{c.sub}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-3">
              <Link to="/demo" className={`${btn} w-full justify-center bg-water text-on-water sm:w-auto`}>{c.demo}<I icon={ArrowRight} /></Link>
              <a href={VIDEO_URL || "#video"} target="_blank" rel="noopener noreferrer" className={`${btn} w-full justify-center border border-border bg-panel text-ink sm:w-auto`}>{c.video}</a>
              <Link to="/engineering" className="inline-flex min-h-12 items-center gap-1.5 text-[15px] font-semibold text-water no-underline hover:underline">{c.eng}<I icon={ArrowRight} /></Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[560px]">
            <div className="relative pb-12">
              <div className="h-[440px] overflow-hidden rounded-2xl border border-border">
                <ZoneMap label={c.mapCaption} river={c.mapRiver} vikas={c.mapVikas} />
              </div>
              <div className="absolute bottom-0 right-3 w-[215px] md:right-5 md:w-[250px]">
                <PhoneShot src={shot("rider")} alt={c.shotRider} width={250} />
              </div>
            </div>
            <p className="m-0 mt-1 flex items-center justify-end gap-1 text-[14px] text-muted">{c.zoneCaption}<InfoTip label={c.zoneInfoLabel}>{c.mapCaption}</InfoTip></p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4">
        <Split id="mission" title={c.missionTitle} visual={<div className="aspect-video overflow-hidden rounded-2xl border border-border"><SunStreetScene label={c.sceneAlt} /></div>}>
          <p className="m-0 max-w-[52ch] text-lg leading-relaxed">{c.mission}</p>
        </Split>

        <section id="problem" className="scroll-mt-20 border-t border-border py-14 md:py-20">
          <Reveal>
            <h2 className="display m-0 text-[32px] leading-[1.12] md:text-[40px]">{c.problemTitle}</h2>
            <p className="m-0 mt-2 max-w-[60ch] text-lg text-muted">{c.problemIntro}</p>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {c.stats.map((s, i) => (
              <Reveal key={s.big} delay={i * 90}>
                <div className="h-full rounded-xl border border-border bg-panel p-5">
                  <p className="display m-0 text-[34px] leading-tight text-clay tnum">{s.big}</p>
                  <p className="m-0 mt-2 text-base">{s.text}</p>
                  <p className="m-0 mt-3 text-[15px]"><ExtLink href={s.href}>{s.src}</ExtLink></p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal><p className="m-0 mt-5 max-w-[72ch] text-base text-muted">{c.ndma} <ExtLink href={SRC.mongabay}>{c.ndmaSrc}</ExtLink></p></Reveal>
        </section>

        <Split id="what" flip title={c.pyauTitle} visual={<div className="flex justify-center rounded-2xl border border-border p-8" style={{ background: "var(--pot-tile)" }}><PyauPot label={c.pyauAlt} /></div>}>
          <p className="m-0 max-w-[52ch] text-lg leading-relaxed">{c.pyau}</p>
          <p className="m-0 mt-3 text-[15px]"><ExtLink href={SRC.piao}>{c.pyauSrc}</ExtLink></p>
        </Split>

        <section id="how" className="scroll-mt-20 border-t border-border py-14 md:py-20">
          <Reveal><h2 className="display m-0 text-[32px] leading-[1.12] md:text-[40px]">{c.howTitle}</h2></Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {c.roles.map((r, i) => {
              const name = ["rider", "host", "plan"][i];
              return (
                <Reveal key={r.t} delay={i * 90}>
                  <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-panel">
                    <div className="h-[330px] overflow-hidden bg-water-soft px-6 pt-6">
                      {name === "plan" ? (
                        <img src={shot("plan")} alt={c.shotPlan} width={960} loading="lazy" className="block h-auto w-full rounded-lg border border-border object-top" />
                      ) : (
                        <div className="flex justify-center"><PhoneShot src={shot(name)} alt={name === "rider" ? c.shotRider : c.shotHost} width={230} /></div>
                      )}
                    </div>
                    <div className="flex gap-3 p-5">
                      <span className="mt-0.5 text-water"><I icon={ROLE_ICONS[i]} size={24} /></span>
                      <div><p className="m-0 text-lg font-semibold">{r.t}</p><p className="m-0 mt-1 text-base text-muted">{r.x}</p></div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="m-0 mt-3 text-[14px] text-muted">{c.shotsNote}</p>
          <ol className="m-0 mt-10 grid list-none gap-5 p-0 md:grid-cols-4">
            {c.steps.map((s, i) => (
              <Reveal key={s.t} delay={i * 90}>
                <li className="border-t-2 border-clay pt-3">
                  <p className="display m-0 flex items-center gap-2 text-[22px] text-clay tnum"><span className="text-water"><I icon={STEP_ICONS[i]} size={22} /></span>{i + 1}</p>
                  <p className="m-0 text-lg font-semibold leading-snug">{s.t}</p>
                  <p className="m-0 mt-1 text-base text-muted">{s.x}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <p className="m-0 mt-4 text-[15px] text-muted">{c.demoNote}</p>
        </section>

        <Split id="results" flip title={c.resultsTitle}
          visual={
            <div className="space-y-6 rounded-2xl border border-border bg-panel p-6">
              <AnimatedDots covered={22} total={44} label={c.before} />
              <AnimatedDots covered={40} total={44} label={c.after} startDelay={900} />
              <p className="display m-0 text-[30px] tnum">50.0% <span className="text-muted">→</span> <span className="text-water">90.9%</span></p>
            </div>
          }>
          <p className="m-0 max-w-[52ch] text-lg leading-relaxed">{c.results}</p>
          <p className="m-0 mt-4 inline-block rounded-lg bg-heat-soft px-3 py-2 text-[15px] font-medium text-heat">{c.resultsLabel}</p>
          <p className="m-0 mt-4"><Link to="/replay/latest" className="inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-water">{c.replay}<I icon={ArrowRight} /></Link></p>
        </Split>

        <section id="trust" className="scroll-mt-20 border-t border-border py-14 md:py-20">
          <Reveal><h2 className="display m-0 text-[32px] leading-[1.12] md:text-[40px]">{c.trustTitle}</h2></Reveal>
          <ul className="m-0 mt-8 grid list-none gap-x-10 gap-y-7 p-0 md:grid-cols-2">
            {c.trust.map((t, i) => (
              <Reveal key={t.t} delay={(i % 2) * 90}>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-water"><I icon={TRUST_ICONS[i]} size={22} /></span>
                  <div><p className="m-0 text-lg font-semibold">{t.t}</p><p className="m-0 max-w-[52ch] text-base text-muted">{t.x}</p></div>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>

        <section id="aws" className="scroll-mt-20 border-t border-border py-14 md:py-20">
          <Reveal><h2 className="display m-0 text-[32px] leading-[1.12] md:text-[40px]">{c.awsTitle}</h2></Reveal>
          <ul className="m-0 mt-8 grid list-none gap-x-8 gap-y-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {c.aws.map(([n, r], i) => (
              <li key={n} className="flex items-center gap-3">
                <span className="flex w-[72px] shrink-0 gap-1">
                  {AWS_ICONS[i].map((f) => <img key={f} src={`/aws-icons/Arch_${f}_64.svg`} width={32} height={32} alt="" loading="lazy" />)}
                </span>
                <span><strong className="block text-base">{n}</strong><span className="text-[15px] text-muted">{r}</span></span>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-8"><Link to="/engineering" className="inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-water">{c.awsMore}<I icon={ArrowRight} /></Link></p>
        </section>

        <section id="roadmap" className="scroll-mt-20 border-t border-border py-14 md:py-20">
          <Reveal>
            <h2 className="display m-0 text-[32px] leading-[1.12] md:text-[40px]">{c.roadmapTitle}</h2>
            <p className="m-0 mt-2 text-lg text-muted">{c.roadmapLabel}</p>
          </Reveal>
          <ul className="m-0 mt-6 grid list-none gap-3 p-0 sm:grid-cols-2">
            {c.roadmap.map((r) => (
              <li key={r} className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-panel p-4 text-base"><I icon={MapPin} className="shrink-0 text-muted" />{r}</li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
