import { useCallback, useEffect, useState } from "react";
import { createDemoSession, type DemoSession } from "./api";

const KEY = "pyau.demoSession";

function load(): DemoSession | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

/** One demo session per browser tab (sessionStorage); `fresh()` creates a new isolated session. */
export function useDemoSession() {
  const [session, setSession] = useState<DemoSession | null>(load);
  const [error, setError] = useState("");

  const fresh = useCallback(async () => {
    setError("");
    try {
      const s = await createDemoSession();
      try {
        sessionStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        /* storage blocked: in-memory only */
      }
      setSession(s);
      return s;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!session) void fresh();
  }, [session, fresh]);

  return { session, error, fresh };
}

/** The fixture's scripted rider position, inside cluster B (demo only). */
export const RIDER_B = { lat: 28.6281, lng: 77.2829 };
/** Demo rider locations: cluster B (default, the hero scenario) and cluster A (for the trust-loop take). */
export const RIDER_LOCATIONS = [
  { id: "B", ...RIDER_B },
  { id: "A", lat: 28.63283, lng: 77.27699 },
];
