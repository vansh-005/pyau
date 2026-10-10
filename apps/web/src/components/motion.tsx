import { useEffect, useRef, useState, type ReactNode } from "react";

/** True once the element has scrolled into view (once). Without IntersectionObserver the content simply shows. */
export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/** Fades and lifts its children in once when scrolled into view. Under prefers-reduced-motion the CSS shows it immediately. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  return (
    <div ref={ref} className={`reveal ${seen ? "in" : ""} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

/** One dot per rider request. When scrolled into view the dots fill from empty, one after another. */
export function AnimatedDots({ covered, total, label, startDelay = 0 }: { covered: number; total: number; label: string; startDelay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  return (
    <div ref={ref}>
      <p className="m-0 mb-2 text-base font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => {
          const on = seen && i < covered;
          return (
            <span key={i} className="inline-block h-3.5 w-3.5 rounded-full border-2"
              style={{
                borderColor: on ? "var(--water)" : "var(--gap)",
                background: on ? "var(--water)" : "var(--panel)",
                transition: "background-color .35s ease, border-color .35s ease",
                transitionDelay: `${startDelay + i * 28}ms`,
              }} />
          );
        })}
      </div>
    </div>
  );
}
