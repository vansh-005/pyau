import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Check, Droplet, Info, PlugZap, Toilet, Umbrella,
  type LucideIcon,
} from "lucide-react";
import { useLang, type Lang } from "../i18n/lang";

/** One icon size and stroke everywhere (Lucide, 1.75 stroke). */
export function I({ icon: C, size = 18, className, label }: { icon: LucideIcon; size?: number; className?: string; label?: string }) {
  return <C size={size} strokeWidth={1.75} className={className} aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} />;
}

/** The Pyau mark: a clay water pot in the same line style as the Lucide set. */
export function PotIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 3.5h6" />
      <path d="M10 3.5v2.4C7.2 7 5.5 9.6 5.5 12.8c0 4 2.9 7.2 6.5 7.2s6.5-3.2 6.5-7.2c0-3.2-1.7-5.8-4.5-6.9V3.5" />
      <path d="M8.3 12.4c1.2-.9 2.4-.9 3.7 0s2.5.9 3.7 0" />
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-water" style={{ fontSize: size }}>
      <PotIcon size={size + 4} />
      Pyau
    </span>
  );
}

export const NEED_ICON: Record<string, LucideIcon> = { water: Droplet, shade: Umbrella, toilet: Toilet, charging: PlugZap };

/** Everything a point offers, as icon + word (never colour alone). */
export function Offers({ offers, highlight }: { offers: string[]; highlight?: string }) {
  const { t } = useLang();
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
      {["water", "shade", "toilet", "charging"].filter((o) => offers.includes(o)).map((o) => (
        <li key={o} className={`inline-flex items-center gap-1 text-[15px] ${o === highlight ? "font-semibold text-water" : "text-muted"}`}>
          <I icon={NEED_ICON[o]} size={16} />
          {t(`need.${o}`)}
        </li>
      ))}
    </ul>
  );
}

/** Segmented control (radio semantics). */
export function Segmented<T extends string>({ value, onChange, options, label, size = "md" }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-canvas p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${size === "sm" ? "min-h-12 px-3" : "min-h-12 px-4"} rounded-md text-base font-medium transition-colors ${value === o.value ? "bg-white text-ink shadow-[0_0_0_1px_var(--color-border)]" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** English / हिंदी toggle (one language at a time, persisted). */
export function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <Segmented<Lang> size="sm" label={t("lang.label")} value={lang} onChange={setLang}
      options={[{ value: "en", label: "English" }, { value: "hi", label: "हिंदी" }]} />
  );
}

/** Small "i" button that explains a detail without cluttering the screen. */
export function InfoTip({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex">
      <button type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink">
        <I icon={Info} size={16} />
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute right-0 top-9 z-20 w-64 rounded-lg border border-border bg-white p-3 text-left text-[15px] leading-snug text-ink shadow-lg">
          {children}
        </span>
      )}
    </span>
  );
}

export function StatusDot({ tone }: { tone: "water" | "heat" | "gap" | "muted" }) {
  const c = { water: "bg-water", heat: "bg-heat", gap: "bg-gap", muted: "bg-muted" }[tone];
  return <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${c}`} />;
}

export { Check };
