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
  language: "en" | "hi";
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
  constructor(public status: number, public code: string, message: string, public data: Record<string, unknown> = {}) {
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
  if (!r.ok) throw new ApiError(r.status, data.code ?? "ERROR", data.message ?? "Request failed", data);
  return data as T;
}

export const createDemoSession = () => api<DemoSession>("POST", "/demo/sessions", {});
export const getMap = (zoneId: string, sessionId: string) =>
  api<MapResponse>("GET", `/zones/${zoneId}/map?sessionId=${sessionId}`);

export type Need = "water" | "shade" | "toilet" | "charging";

export interface FindResponse {
  need: Need;
  found: boolean;
  clock: { date: string; time: string };
  host: { id: string; label: string; lat: number; lng: number; closesAt: string; confirmedSource: string; straightLineM: number; offers: string[]; hours: [string, string] } | null;
  route: { distanceM: number; durationS: number; line: [number, number][] } | null;
  distanceM: number | null;
  approximate: boolean;
  answer: { hi: string; en: string };
  lang: "en" | "hi";
  audio: { url: string; voice: string; engine: string; language?: string; cached: boolean } | null;
  radiusM: number;
}

export const helpFind = (b: { need: Need; lat: number; lng: number; sessionId: string; zoneId: string; lang: "en" | "hi" }) =>
  api<FindResponse>("POST", "/help/find", b);

export const setClock = (sessionId: string, token: string, setLocalTime: "18:30" | "14:00") =>
  api<{ clock: MapResponse["clock"] }>("POST", `/demo/sessions/${sessionId}/clock`, { setLocalTime }, token);

export interface ClusterInfo {
  id: string; label: string; requests: number; covered: number; uncovered: boolean;
  nearestHostId: string | null; distanceM: number | null; lat: number; lng: number;
}
export interface CoverageResponse {
  zoneId: string; date: string; clock: MapResponse["clock"];
  policy: { id: string; heatThresholdC: number; coverageRadiusMeters: number; validationStatus: string; need: string };
  forecast: { mode: string; hourly: Record<string, number> };
  heat: { status: "OK" | "INSUFFICIENT_DATA" | "NO_HEAT"; window: [string, string] | null; peakC: number | null; missingHours: string[] };
  coverage: { window: [string, string]; total: number; covered: number; percent: number | null; uncoveredClusters: string[] } | null;
  clusters: ClusterInfo[];
  computedAt: number;
}
export const getCoverage = (zoneId: string, sessionId: string, token: string) =>
  api<CoverageResponse>("GET", `/zones/${zoneId}/coverage?sessionId=${sessionId}`, undefined, token);

// ---- runs, plan, outreach ----
export interface Receipt {
  runId: string; seq: number; at: number; type: string; actor: string; summary: string;
  toolCallId?: string | null; data: Record<string, unknown>;
}
export interface GapMessage { lang: "en" | "hi"; text: string; hi: string | null; en: string | null; window: [string, string]; trimmed: boolean }
export interface Gap {
  clusterId: string; label: string; requests: number; hours: [string, string]; priority: number; askWindow: [string, string];
  candidateOrder: string[]; candidates: { hostId: string; label: string; kind: string; distanceM: number }[];
  messages: Record<string, GapMessage>; dropped: Record<string, string>;
}
export interface Unresolved { clusterId: string; label: string; requests: number; recommendation: string; note: string; reason: string }
export interface CovNum { covered: number; total: number; percent: number | null; uncoveredClusters?: string[] }
export interface Proposal {
  id: string; runId: string; revision: number; status: string; gaps: Gap[]; unresolved: Unresolved[]; explanation: string;
  coverageBefore: CovNum; coverageProjected: CovNum; contentHash: string;
}
export interface Ask {
  id: string; runId: string; clusterId: string; hostId: string; hostLabel?: string; kind: string; message: { hi: string | null; en: string | null; text?: string; lang?: "en" | "hi" };
  window: [string, string]; status: "OPEN" | "ACCEPTED" | "DECLINED" | "TIMED_OUT"; createdAt: number; expiresAt: number;
  timeoutSeconds: number; answeredAt: number | null;
}
export interface Run {
  id: string; zoneId: string; status: string; date: string; mode: string; modelId: string | null; startedAt: number;
  finishedAt: number | null; error: string | null; coverageCurrent?: CovNum; summary?: unknown;
}
export interface RunDetail {
  run: Run; proposal: Proposal | null; asks: Ask[]; serverTime: number;
  coverage: { before: CovNum | null; projectedIfFirstChoicesAccept: CovNum | null; current: CovNum | null };
}
export const listRuns = (zoneId: string, sessionId: string, token: string) =>
  api<{ runs: Run[] }>("GET", `/zones/${zoneId}/runs?sessionId=${sessionId}`, undefined, token);
export const startRun = (zoneId: string, sessionId: string, token: string, date: string, idempotencyKey: string) =>
  api<Run>("POST", `/zones/${zoneId}/coverage-runs`, { sessionId, date, idempotencyKey }, token);
export const getRun = (runId: string, sessionId: string, token: string) =>
  api<RunDetail>("GET", `/runs/${runId}?sessionId=${sessionId}`, undefined, token);
export const getEvents = (runId: string, sessionId: string, token: string, after: number) =>
  api<{ events: Receipt[]; serverTime: number }>("GET", `/runs/${runId}/events?sessionId=${sessionId}&after=${after}`, undefined, token);
export const approveProposal = (p: Proposal, sessionId: string, token: string, removedHostIds: string[], key: string) =>
  api<{ ok: boolean; status: string }>("POST", `/proposals/${encodeURIComponent(p.id)}/approve`,
    { sessionId, contentHash: p.contentHash, revision: p.revision, removedHostIds, acknowledgesGaps: true, idempotencyKey: key }, token);
export const rejectProposal = (p: Proposal, sessionId: string, token: string, reason: string) =>
  api<{ ok: boolean }>("POST", `/proposals/${encodeURIComponent(p.id)}/reject`, { sessionId, revision: p.revision, reason }, token);
export const hostAsks = (hostId: string, sessionId: string, token: string) =>
  api<{ asks: Ask[]; serverTime: number }>("GET", `/hosts/${hostId}/asks?sessionId=${sessionId}`, undefined, token);
export const respondAsk = (ask: Ask, sessionId: string, token: string, decision: "accepted" | "declined") =>
  api<{ ok: boolean; status: string; window?: [string, string] }>("POST", `/asks/${encodeURIComponent(ask.id)}/respond`,
    { sessionId, actingHostId: ask.hostId, decision, window: decision === "accepted" ? ask.window : undefined, idempotencyKey: `${ask.id}:${decision}` }, token);

export interface VoiceResponse extends Partial<FindResponse> {
  transcript: string;
  needUnknown: boolean;
  intentVia?: "rules" | "model";
  answer: { hi: string; en: string };
}
export const askVoice = (b: { audioBase64: string; lat: number; lng: number; sessionId: string; zoneId: string; lang: "en" | "hi" }) =>
  api<VoiceResponse>("POST", "/help/ask-voice", b);

export interface RegisterBody {
  zoneId: string; sessionId: string; label: string; hostType: string; offers: string[]; kind: "listed" | "standby";
  hours: [string, string]; lat: number; lng: number; consentToAsks: boolean; language: "en" | "hi";
}
export interface RegisteredHost { id: string; label: string; address: string | null; kind: string; hours: [string, string] }
export class FieldError extends Error {
  constructor(message: string, public fields: Record<string, string>) { super(message); }
}
export async function registerHost(b: RegisterBody, token: string): Promise<RegisteredHost> {
  const r = await fetch(config.apiBase + "/hosts", { method: "POST", headers: { "content-type": "application/json", "x-demo-token": token }, body: JSON.stringify(b) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 422) throw new FieldError(d.message, d.fieldErrors ?? {});
  if (!r.ok) throw new ApiError(r.status, d.code ?? "ERROR", d.message ?? "Request failed");
  return d as RegisteredHost;
}
export const reverseGeocode = (lat: number, lng: number, sessionId: string, token: string) =>
  api<{ address: string | null; approximate: boolean }>("GET", `/hosts/reverse-geocode?lat=${lat}&lng=${lng}&sessionId=${sessionId}`, undefined, token);
export const runFreshness = (zoneId: string, sessionId: string, token: string) =>
  api<{ date: string; created: string[] }>("POST", "/schedules/freshness/run", { zoneId, sessionId }, token);

// ---- trust loop ----
export type FeedbackKind = "got_it" | "closed" | "no_water" | "dirty" | "unsafe";
export interface FeedbackResult { recorded: boolean; kind: FeedbackKind; hostId: string; problemCount: number; threshold: number; windowHours: number; paused: boolean; pausedNow: boolean }
export const sendFeedback = (b: { hostId: string; kind: FeedbackKind; lat: number; lng: number; sessionId: string; zoneId: string }) =>
  api<FeedbackResult>("POST", `/points/${b.hostId}/feedback`, { kind: b.kind, lat: b.lat, lng: b.lng, sessionId: b.sessionId, zoneId: b.zoneId });
export interface ProblemItem { hostId: string; label: string; reason: string | null; pausedAt: number | null; seeded: boolean; reports: { kind: string; at: number }[] }
export const getProblems = (zoneId: string, sessionId: string, token: string) =>
  api<{ problems: ProblemItem[]; serverTime: number }>("GET", `/zones/${zoneId}/problems?sessionId=${sessionId}`, undefined, token);
export const reactivateHost = (hostId: string, zoneId: string, sessionId: string, token: string) =>
  api<{ ok: boolean }>("POST", `/hosts/${hostId}/reactivate`, { zoneId, sessionId }, token);
