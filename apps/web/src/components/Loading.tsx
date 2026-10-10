/** Accessible loading state (announced to screen readers; the spinner stops under reduced motion via the global CSS rule). */
export function Loading({ children = "Loading…" }: { children?: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="flex h-full min-h-40 items-center justify-center gap-2 p-6 text-base text-muted">
      <span aria-hidden className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-water" />
      <span>{children}</span>
    </div>
  );
}
