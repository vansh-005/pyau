import { config } from "./config";

export type HostState = "live" | "not_confirmed" | "standby" | "paused";

export interface MapHost {
  id: string;
  label: string;
  kind: "listed" | "standby";
  lat: number;
  lng: number;
  offers: string[];
  hours: [string, string];
  state: HostState;
  window: [string, string] | null;
  source: string | null;
  openNow: boolean | null;
}

export interface MapResponse {
  zone: { id: string; name: string; center: { lat: number; lng: number }; timezone: string };
  sessionId: string;
  planDate: string;
  clock: { date: string; time: string; label?: string };
  hosts: MapHost[];
  badge: string;
}

export interface DemoSession {
  sessionId: string;
  zoneId: string;
  token: string;
  clock: { date: string; time: string; label?: string };
  scenarioDate: string;
  demoTimersSeconds: number;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function api<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const r = await fetch(config.apiBase + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { "x-demo-token": token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, data.code ?? "ERROR", data.message ?? "Request failed");
  return data as T;
}

export const createDemoSession = () => api<DemoSession>("POST", "/demo/sessions", {});
export const getMap = (zoneId: string, sessionId: string) =>
  api<MapResponse>("GET", `/zones/${zoneId}/map?sessionId=${sessionId}`);
