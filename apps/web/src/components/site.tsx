import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Code, ExternalLink } from "lucide-react";
import { useLang } from "../i18n/lang";
import { GITHUB_URL } from "../links";
import { I, LangToggle, ThemeToggle, Wordmark } from "./ui";

export function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-water underline decoration-water/40 underline-offset-2 hover:decoration-water ${className ?? ""}`}>
      {children}
      <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
    </a>
  );
}

const NAV = {
  en: { how: "How it works", eng: "Engineering", gh: "GitHub", demo: "Try the live demo", label: "Main" },
  hi: { how: "कैसे काम करता है", eng: "इंजीनियरिंग", gh: "GitHub", demo: "लाइव डेमो आज़माएँ", label: "मुख्य मेनू" },
};

/** Sticky top navigation shared by the landing and engineering pages. */
export function SiteNav() {
  const { lang } = useLang();
  const n = NAV[lang];
  const link = "inline-flex min-h-10 items-center text-base font-medium text-ink no-underline hover:text-water";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-panel/95 backdrop-blur">
      <nav aria-label={n.label} className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
        <Link to="/" className="no-underline"><Wordmark size={22} /></Link>
        <span className="order-3 flex w-full items-center gap-x-6 overflow-x-auto md:order-none md:w-auto">
          <Link to="/#how" className={link}>{n.how}</Link>
          <Link to="/engineering" className={link}>{n.eng}</Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={link}><I icon={Code} size={16} className="mr-1" />{n.gh}</a>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
          <Link to="/demo" className="inline-flex min-h-10 items-center rounded-lg bg-water px-4 text-base font-semibold text-on-water no-underline">{n.demo}</Link>
        </span>
      </nav>
    </header>
  );
}

/** A page section with a consistent rhythm: 64 px between sections, content width 72 characters for prose. */
export function Section({ id, title, children, intro }: { id?: string; title: ReactNode; children: ReactNode; intro?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border py-12 first:border-t-0">
      <h2 className="display m-0 text-[30px] leading-tight md:text-[36px]">{title}</h2>
      {intro && <p className="m-0 mt-2 max-w-[68ch] text-lg text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const FOOT = {
  en: {
    repo: "Source code on GitHub", sources: "All sources", built: "Built by Vansh Deep Singh",
    ai: "AI tools used: Claude Code (Claude Opus 5.5 and Claude Sonnet 5.5) wrote and debugged most of the code under direction, checked by tests and deployed end-to-end checks. At runtime Pyau uses Strands Agents with Amazon Nova 2 Lite on Amazon Bedrock, Amazon Polly and Amazon Transcribe.",
    credits: "Credits: MapLibre GL JS, React, Vite, Tailwind CSS, TanStack Query, Lucide icons, Inter and Noto Sans Devanagari (Fontsource), Pydantic, AWS CDK. Map data © AWS, HERE.",
    sample: "The demo uses a documented synthetic scenario on a real map. Hosts, requests and temperatures are invented.",
    event: "Made for WeMakeDevs × AWS Environmental Hacks, Track 02 Heat and Water.",
    icons: "AWS Architecture Icons © Amazon Web Services.",
  },
  hi: {
    repo: "GitHub पर सोर्स कोड", sources: "सभी स्रोत", built: "वंश दीप सिंह द्वारा बनाया गया",
    ai: "इस्तेमाल किए गए AI टूल: Claude Code (Claude Opus 5.5 और Claude Sonnet 5.5) ने निर्देश के तहत ज़्यादातर कोड लिखा और जाँचा, जिसे टेस्ट और डिप्लॉय किए गए एंड-टू-एंड परीक्षणों से परखा गया। चलते समय प्याऊ Amazon Bedrock पर Strands Agents और Amazon Nova 2 Lite, Amazon Polly और Amazon Transcribe इस्तेमाल करता है।",
    credits: "श्रेय: MapLibre GL JS, React, Vite, Tailwind CSS, TanStack Query, Lucide आइकन, Inter और Noto Sans Devanagari (Fontsource), Pydantic, AWS CDK. नक्शे का डेटा © AWS, HERE.",
    sample: "डेमो असली नक्शे पर एक दर्ज किए गए कृत्रिम परिदृश्य का इस्तेमाल करता है। होस्ट, अनुरोध और तापमान काल्पनिक हैं।",
    event: "WeMakeDevs × AWS Environmental Hacks, ट्रैक 02 गर्मी और पानी के लिए बनाया गया।",
    icons: "AWS Architecture Icons © Amazon Web Services.",
  },
};

export function SiteFooter() {
  const { lang } = useLang();
  const f = FOOT[lang];
  return (
    <footer className="border-t border-border bg-panel">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-[15px] text-muted">
        <p className="m-0 flex flex-wrap items-center gap-x-6 gap-y-1 text-base text-ink">
          <ExtLink href={GITHUB_URL}>{f.repo}</ExtLink>
          <ExtLink href={`${GITHUB_URL}/blob/main/sources.md`}>{f.sources}</ExtLink>
          <span className="font-medium">{f.built}</span>
        </p>
        <p className="m-0 max-w-[88ch]">{f.ai}</p>
        <p className="m-0 max-w-[88ch]">{f.credits}</p>
        <p className="m-0 max-w-[88ch]">{f.sample}</p>
        <p className="m-0 max-w-[88ch]">{f.event} {f.icons}</p>
      </div>
    </footer>
  );
}
