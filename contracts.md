# Domain, API and persistence contracts

Implement these as Pydantic models in `packages/domain`; generate TypeScript types/OpenAPI from them after implementation. Don't hand-maintain contradictory types.

## Shared rules

- IDs: opaque UUIDs, except deterministic keys noted below. Timestamps: RFC3339 UTC. Local operational times: `HH:MM` plus the zone timezone (`Asia/Kolkata`); windows are half-open `[start, end)`.
- Distances in metres (haversine for coverage; Routes distance/duration only for the rider's route). Percentages rounded only in presentation (one decimal).
- Every mutable record has integer `version`; commands carry `expectedVersion`; conflicts return 409.
- Errors: `{code, message, retryable, requestId, fieldErrors?}`. No stack traces, tokens or task tokens in responses or logs.
- Actor identity and roles come from the verified JWT or the signed demo token, never from the body.
- `sessionId` is `live` or a demo session ID; every record is scoped by it.

## Core objects

| Object | Fields and invariants |
|---|---|
| Zone | id, sessionId, name, center, radiusMeters, timezone, policyId, coordinatorIds, active, version |
| Policy | id, version, heatMetric, heatThresholdC, coverageRadiusMeters, maxCandidatesPerCluster, maxAsksPerHostPerDay, askTimeoutSecondsLive/Demo, approvalTimeoutSecondsLive/Demo, pauseAfterProblemReports, pauseWindowHours, validationStatus (`unvalidated_demo_policy`) |
| Host | id, sessionId, zoneId, ownerSub, label, kind (`listed`/`standby`), lat, lng, address (from Places), offers[] (`water`,`shade`,`toilet`,`charging`,`food`), hours [open, close], contactHours, consentToAsks, paused, pausedReason, photoKey?, version |
| Availability | id = `hostId:date:source`, hostId, date, window [start,end), source (`listed_confirmed`, `accepted_ask`), confirmedAt, version. A listed host is *live* on a date only after a `listed_confirmed` availability exists for that date. |
| ForecastSnapshot | id, zoneId, mode (`synthetic`/`live_forecast`), validDate, fetchedAt, hourly {HH:MM: °C}, units, attribution, version |
| DemandRecord | id, zoneId, date, hour, need, geohash7, clusterId?, answered (bool), answeredHostId?, source (`rider`,`fixture`) |
| Run | id, zoneId, sessionId, date, mode, status, executionArn, inputVersions {zone, forecast, policy, hostsHash}, modelId, startedAt, finishedAt, error |
| Proposal | id, runId, revision, status (`PROPOSED`,`APPROVED`,`REJECTED`,`SUPERSEDED`,`EXPIRED`), gaps[], unresolved[], explanation (≤ 120 words), coverageBefore, coverageProjected, contentHash, taskToken (never returned to clients) |
| Gap | clusterId, requests, hours, centroid, candidateOrder [hostId], messages {hostId: {hi, en}}, priority |
| Ask | id = `runId:clusterId:hostId`, hostId, kind (`outreach`/`freshness`), message {hi,en}, window, status (`OPEN`,`ACCEPTED`,`DECLINED`,`TIMED_OUT`), taskToken (server only), createdAt, answeredAt, version |
| Feedback | id, hostId, date, kind (`got_it`,`closed`,`no_water`,`unsafe`,`dirty`), geohash7, createdAt |
| Event | runId, seq, at, type, actor (`agent`,`system`,`coordinator`,`host`,`rider`), summary, toolCallId?, data (small, sanitized) |
| CoverageReport | zoneId, date, window, total, covered, percent, byCluster {id: {requests, covered, nearestHostId?, distanceM?}}, uncoveredClusters, computedAt |

Run status: `QUEUED → PLANNING → AWAITING_APPROVAL → OUTREACH → COMPLETED`, or `INSUFFICIENT_DATA`, `NO_GAPS`, `REJECTED`, `APPROVAL_EXPIRED`, `FAILED`.

## Coverage definition (single implementation, used by API, agent tools, checker port)

A demand record in the heat window is **covered** if at least one host: offers the need, is not paused, has an availability for that date whose window contains the whole request hour (listed hosts need `listed_confirmed`; standby hosts need `accepted_ask`), and is within `coverageRadiusMeters`. Heat window = contiguous hours whose forecast value ≥ threshold. Missing hours → `INSUFFICIENT_DATA`.

**Clusters:** group demand records by geohash-6 cell (≈ 1.2 km × 0.6 km), then merge cells whose centroids are < 300 m apart. The fixture provides `clusterId` directly; live data uses this rule. Keep it deterministic.

**Candidates for a gap:** consenting, not paused, offers need, within radius of **every** request in the cluster, declared hours overlap the heat window, not already asked today. Rank by distance to cluster centroid, then host ID. Keep the top `maxCandidatesPerCluster`.

## Routes

| Method & path | Auth | Input | Behavior |
|---|---|---|---|
| POST /help/find | anonymous | need, lat, lng, lang, sessionId? | nearest live point + route + audioUrl + answer text; logs demand |
| POST /help/ask-voice | anonymous (P0b) | 16 kHz PCM ≤ 8 s (base64 or binary), lat, lng, lang | transcript + same as find |
| POST /points/{hostId}/feedback | anonymous | kind, lat, lng | stores feedback; pauses host after policy threshold; returns new state |
| GET /zones/{id}/map | anonymous | date, time | live points (public fields only), greyed unconfirmed points |
| POST /hosts | host | label, kind, lat, lng, offers, hours, contactHours, consentToAsks | Places reverse-geocode → stored host |
| PATCH /hosts/{id} | owner | expectedVersion, allowlisted fields | |
| POST /hosts/{id}/photo-url | owner | contentType | presigned S3 PUT |
| GET /hosts/me/asks | host | — | open asks + freshness checks |
| POST /asks/{id}/respond | addressed host | decision, window?, idempotencyKey | conditional; SendTaskSuccess for outreach asks; writes availability on accept |
| POST /hosts/{id}/confirm-today | owner | date, window | `listed_confirmed` availability |
| GET /zones/{id}/coverage | coordinator | date | CoverageReport (computed in code) |
| POST /zones/{id}/coverage-runs | coordinator | date, idempotencyKey | 202 {runId, status}; starts execution |
| GET /runs/{id} | coordinator | — | run, proposal (no token), coverage before/projected/actual |
| GET /runs/{id}/events | coordinator | after, limit ≤ 100 | ordered events |
| POST /proposals/{id}/approve | coordinator | contentHash, revision, removedHostIds?, acknowledgesGaps: true, idempotencyKey | validates freshness → SendTaskSuccess |
| POST /proposals/{id}/reject | coordinator | revision, reason | SendTaskFailure |
| POST /demo/sessions | public, throttled | fixtureId | isolated seeded session + signed token |
| POST /demo/sessions/{id}/clock | demo token | setLocalTime (`18:30` eve / `14:00` scenario day) | session clock only; never live |
| POST /demo/sessions/{id}/simulate-requests | demo token | — | replays the fixture's 44 rider requests into the session (labelled) |
| GET /replays/{id} | public | — | sanitized published run replay; no writes, no model calls |
| POST /schedules/freshness/run | coordinator | zoneId | manual trigger of the morning job (P0) |

Approval failures: `STALE_INPUT` (hosts/forecast/policy changed), `STALE_PROPOSAL` (hash/revision mismatch), `NOT_APPROVABLE` (validation failed, gaps not acknowledged), `FORBIDDEN`, `APPROVAL_EXPIRED`. Duplicate approval with the same idempotency key returns the original success.

## Example run response (illustrative)

```json
{
  "runId": "…",
  "status": "OUTREACH",
  "mode": "demo",
  "coverage": {
    "before": {"covered": 22, "total": 44, "percent": 50.0},
    "projectedIfAllAccept": {"covered": 40, "total": 44, "percent": 90.9},
    "current": {"covered": 22, "total": 44, "percent": 50.0}
  },
  "proposal": {
    "revision": 1,
    "status": "APPROVED",
    "gaps": [{"clusterId": "B", "requests": 18, "hours": ["13:00","16:00"], "candidateOrder": ["H4","H5"]}],
    "unresolved": [{"clusterId": "D", "requests": 4, "reason": "NO_HOST_WITHIN_RADIUS"}]
  }
}
```

## DynamoDB (single table, on-demand)

| Entity | PK | SK |
|---|---|---|
| Zone | `S#{session}#ZONE#{z}` | `META` |
| Host | `S#{session}#ZONE#{z}` | `HOST#{h}` |
| Availability | `S#{session}#ZONE#{z}` | `AVAIL#{date}#{h}#{source}` |
| Forecast snapshot | `S#{session}#ZONE#{z}` | `FC#{date}#{snapshotId}` |
| Demand | `S#{session}#ZONE#{z}#DEMAND#{date}` | `{hour}#{id}` |
| Feedback | `S#{session}#HOST#{h}` | `FB#{createdAt}#{id}` |
| Run | `S#{session}#RUN#{r}` | `META` |
| Proposal | `S#{session}#RUN#{r}` | `PROPOSAL#{rev}` |
| Ask | `S#{session}#ASK#{id}` | `META` |
| Event | `S#{session}#RUN#{r}` | `EVT#{seq:06d}` |
| Idempotency | `S#{session}#IDEM#{actor}` | `{op}#{key}` |
| Demo session | `DEMO#{session}` | `META` (TTL 48 h) |
| Published replay | `PUBLIC#REPLAY#{id}` | `META` |

GSI1 (host inbox): PK `S#{session}#HOSTASKS#{h}`, SK `{status}#{createdAt}` on Ask records.
GSI2 (zone runs): PK `S#{session}#ZONE#{z}#RUNS`, SK `{startedAt}#{r}` on Run records.

Zone partitions hold hosts and availability together so one query returns everything needed for coverage. This is a small-zone design (≤ 500 hosts per zone); say so in limitations.
