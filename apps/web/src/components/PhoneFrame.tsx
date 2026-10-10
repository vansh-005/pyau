import type { ReactNode } from "react";

/** 390×780 phone frame for the rider and host panels (real app components inside, not images). */
export function PhoneFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <h2 className="m-0 text-base font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="overflow-hidden rounded-[34px] border-[10px] border-ink bg-ink shadow-xl" style={{ width: 390, height: 780, maxWidth: "100%" }}>
        <div className="h-full w-full overflow-hidden rounded-[24px] bg-canvas">{children}</div>
      </div>
    </div>
  );
}
