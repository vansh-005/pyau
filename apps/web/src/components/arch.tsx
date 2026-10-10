import { useState } from "react";

/* Architecture diagram drawn with the official AWS Architecture Icons (served unmodified from /aws-icons/, only scaled).
   Left to right: client, edge and API, compute and orchestration, AI and maps, data, observability.
   Only services deployed in PyauStack are drawn. Two flows can be highlighted and animated. */

type Mode = "rider" | "run";
type N = { cx: number; cy: number; icon?: string; label: string; sub?: string; modes: Mode[]; idle?: boolean };

const ICON = (f: string) => `/aws-icons/Arch_${f}_64.svg`;
const ROW = { r1: 95, r2: 205, r3: 315, r4: 425, r5: 535 };

// edge points of a node: icons are 48 px, labels sit below the icon
const R = (n: N) => `${n.cx + 27} ${n.cy - 10}`;
const L = (n: N) => `${n.cx - 27} ${n.cy - 10}`;
const Bm = (n: N) => `${n.cx} ${n.cy + 54}`;
const T = (n: N) => `${n.cx} ${n.cy - 37}`;

export function AwsArchitecture({ labels }: { labels: Record<string, string> }) {
  const [mode, setMode] = useState<Mode>("rider");
  const N: Record<string, N> = {
    browser: { cx: 73, cy: ROW.r3, label: labels.browser, sub: labels.browserSub, modes: ["rider", "run"] },
    amplify: { cx: 239, cy: ROW.r1, icon: "AWS-Amplify", label: "AWS Amplify", sub: labels.amplify, modes: ["rider"] },
    apigw: { cx: 239, cy: ROW.r3, icon: "Amazon-API-Gateway", label: "API Gateway", sub: labels.apigw, modes: ["rider", "run"] },
    cognito: { cx: 239, cy: ROW.r5, icon: "Amazon-Cognito", label: "Amazon Cognito", sub: labels.cognito, modes: [], idle: true },
    apiL: { cx: 420, cy: ROW.r2, icon: "AWS-Lambda", label: "API Lambda", sub: labels.apiL, modes: ["rider", "run"] },
    sfn: { cx: 420, cy: ROW.r4, icon: "AWS-Step-Functions", label: "AWS Step Functions", sub: labels.sfn, modes: ["run"] },
    agent: { cx: 420, cy: ROW.r5, icon: "AWS-Lambda", label: "Agent Lambda", sub: labels.agent, modes: ["run"] },
    evb: { cx: 600, cy: ROW.r3, icon: "Amazon-EventBridge", label: "EventBridge", sub: labels.evb, modes: [], idle: true },
    wf: { cx: 600, cy: ROW.r4, icon: "AWS-Lambda", label: "Workflow Lambda", sub: labels.wf, modes: ["run"] },
    transcribe: { cx: 781, cy: ROW.r1, icon: "Amazon-Transcribe", label: "Amazon Transcribe", sub: labels.transcribe, modes: ["rider"] },
    polly: { cx: 781, cy: ROW.r2, icon: "Amazon-Polly", label: "Amazon Polly", sub: labels.polly, modes: ["rider"] },
    location: { cx: 781, cy: ROW.r3, icon: "Amazon-Location-Service", label: "Amazon Location", sub: labels.location, modes: ["rider"] },
    bedrock: { cx: 781, cy: ROW.r5, icon: "Amazon-Bedrock", label: "Amazon Bedrock", sub: labels.bedrock, modes: ["run"] },
    ddb: { cx: 965, cy: ROW.r3, icon: "Amazon-DynamoDB", label: "Amazon DynamoDB", sub: labels.ddb, modes: ["rider", "run"] },
    s3: { cx: 965, cy: ROW.r4, icon: "Amazon-Simple-Storage-Service", label: "Amazon S3", sub: labels.s3, modes: ["rider"] },
    cw: { cx: 1120, cy: 520, icon: "Amazon-CloudWatch", label: "Amazon CloudWatch", sub: labels.cw, modes: ["run"] },
  };
  const n = N;

  type E = { d: string; modes: Mode[]; idle?: boolean; label?: { t: string; x: number; y: number; anchor?: "start" | "middle" | "end" } };
  const E: E[] = [
    { d: `M100 ${n.browser.cy - 10} H146 V${n.amplify.cy - 10} H${n.amplify.cx - 27}`, modes: ["rider"], label: { t: labels.eLoad, x: 146, y: 200, anchor: "middle" } },
    { d: `M100 ${n.browser.cy - 10} H${n.apigw.cx - 27}`, modes: ["rider", "run"], label: { t: "HTTPS", x: 186, y: n.browser.cy - 6, anchor: "middle" } },
    { d: `M${R(n.apigw)} H332 V${n.apiL.cy - 10} H${n.apiL.cx - 27}`, modes: ["rider", "run"] },
    { d: `M${Bm(n.apigw)} V${n.cognito.cy - 38}`, modes: [], idle: true, label: { t: labels.eAuth, x: 247, y: 450, anchor: "start" } },
    { d: `M${Bm(n.apiL)} V${n.sfn.cy - 38}`, modes: ["run"], label: { t: labels.eStart, x: 428, y: 342, anchor: "start" } },
    { d: `M${R(n.apiL)} H${n.polly.cx - 27}`, modes: ["rider"], label: { t: labels.eVoice, x: 560, y: 199, anchor: "middle" } },
    { d: `M688 ${n.apiL.cy - 10} V${n.transcribe.cy - 10} H${n.transcribe.cx - 27}`, modes: ["rider"] },
    { d: `M688 ${n.apiL.cy - 10} V${n.location.cy - 10} H${n.location.cx - 27}`, modes: ["rider"] },
    { d: `M470 ${n.apiL.cy - 10} V268 H893 V${n.ddb.cy - 10} H${n.ddb.cx - 27}`, modes: ["rider", "run"], label: { t: labels.eStore, x: 560, y: 272, anchor: "middle" } },
    { d: `M893 268 V${n.s3.cy - 10} H${n.s3.cx - 27}`, modes: ["rider"] },
    { d: `M${R(n.sfn)} H${n.wf.cx - 27}`, modes: ["run"], label: { t: labels.eTasks, x: 510, y: 419, anchor: "middle" } },
    { d: `M${R(n.wf)} H893 V${n.ddb.cy - 10} H${n.ddb.cx - 27}`, modes: ["run"] },
    { d: `M${Bm(n.evb)} V${n.wf.cy - 38}`, modes: [], idle: true, label: { t: labels.eSched, x: 608, y: 382, anchor: "start" } },
    { d: `M${Bm(n.sfn)} V${n.agent.cy - 38}`, modes: ["run"], label: { t: labels.ePlan, x: 412, y: 491, anchor: "end" } },
    { d: `M${R(n.agent)} H${n.bedrock.cx - 27}`, modes: ["run"], label: { t: labels.eTools, x: 600, y: 529, anchor: "middle" } },
    { d: `M440 482 V488 H1070 V${n.cw.cy - 10} H${n.cw.cx - 27}`, modes: ["run"], idle: false, label: { t: labels.eLogs, x: 1000, y: 503, anchor: "middle" } },
  ];

  const regions = [
    { x: 8, w: 132, t: labels.client }, { x: 154, w: 170, t: labels.edge }, { x: 340, w: 340, t: labels.compute },
    { x: 696, w: 170, t: labels.ai }, { x: 882, w: 150, t: labels.data }, { x: 1048, w: 144, t: labels.obs },
  ];
  const ink = { fill: "var(--ink)" } as const, muted = { fill: "var(--muted)" } as const;
  const halo = { paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 4, strokeLinejoin: "round" } as const;

  return (
    <div>
      <div role="group" aria-label={labels.modeLabel} className="mb-3 inline-flex rounded-lg border border-border bg-canvas p-1">
        {(["rider", "run"] as Mode[]).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={`min-h-12 cursor-pointer rounded-md border-0 px-4 text-base font-semibold ${mode === m ? "bg-water text-on-water" : "bg-transparent text-ink"}`}>
            {m === "rider" ? labels.modeRider : labels.modeRun}
          </button>
        ))}
      </div>
      <p className="m-0 mb-3 max-w-[80ch] text-base text-muted" aria-live="polite">{mode === "rider" ? labels.flowRider : labels.flowRun}</p>
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <svg viewBox="0 0 1200 612" role="img" aria-label={labels.aria} className="block h-auto min-w-[1000px] w-full">
          <defs>
            <marker id="ah-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" style={{ fill: "var(--water)" }} /></marker>
            <marker id="ah-off" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" style={{ fill: "var(--standby)" }} /></marker>
          </defs>
          {regions.map((r) => (
            <g key={r.t}>
              <rect x={r.x} y={30} width={r.w} height={565} rx={14} style={{ fill: "color-mix(in srgb, var(--canvas) 70%, transparent)", stroke: "var(--border)" }} strokeWidth="1.5" strokeDasharray="6 5" />
              <text x={r.x + 14} y={54} fontSize="14" fontWeight="600" style={muted}>{r.t}</text>
            </g>
          ))}
          {E.map((e, i) => {
            const on = e.modes.includes(mode);
            return (
              <path key={i} d={e.d} fill="none" strokeLinejoin="round" strokeLinecap="round"
                className={on ? "flow-path" : undefined}
                style={{ stroke: on ? "var(--water)" : "var(--standby)" }}
                strokeWidth={on ? 2.5 : 1.25} opacity={on ? 1 : e.idle ? 0.7 : 0.4}
                strokeDasharray={on ? undefined : "4 4"}
                markerEnd={`url(#${on ? "ah-on" : "ah-off"})`} />
            );
          })}
          {E.filter((e) => e.label).map((e, i) => {
            const on = e.modes.includes(mode);
            const lb = e.label!;
            const w = lb.t.length * 6.9 + 12;
            const x0 = lb.anchor === "end" ? lb.x - w + 6 : lb.anchor === "start" ? lb.x - 6 : lb.x - w / 2;
            return (
              <g key={i} data-edge-label>
                <rect x={x0} y={lb.y - 13} width={w} height={18} rx={5} style={{ fill: "var(--panel)", stroke: on ? "var(--water)" : "var(--border)" }} strokeWidth="1" />
                <text x={lb.x} y={lb.y} textAnchor={lb.anchor} fontSize="12.5" fontWeight={on ? 600 : 400} style={on ? ink : muted}>{lb.t}</text>
              </g>
            );
          })}
          {Object.entries(N).map(([id, nd]) => {
            const active = nd.modes.includes(mode);
            return (
              <g key={id} opacity={active ? 1 : nd.idle ? 0.8 : 0.6}>
                {nd.icon ? (
                  <image href={ICON(nd.icon)} x={nd.cx - 24} y={nd.cy - 34} width={48} height={48} />
                ) : (
                  /* the browser has no AWS icon: a plain window glyph */
                  <g transform={`translate(${nd.cx - 24} ${nd.cy - 34})`}>
                    <rect x="1" y="5" width="46" height="36" rx="6" style={{ fill: "var(--panel)", stroke: "var(--ink)" }} strokeWidth="2.5" />
                    <path d="M1 16H47" style={{ stroke: "var(--ink)" }} strokeWidth="2.5" />
                    <circle cx="9" cy="10.5" r="1.8" style={ink} /><circle cx="16" cy="10.5" r="1.8" style={ink} />
                  </g>
                )}
                {nd.idle && <rect x={nd.cx - 27} y={nd.cy - 37} width={54} height={54} rx={9} fill="none" style={{ stroke: "var(--standby)" }} strokeWidth="1.5" strokeDasharray="4 3" />}
                {id === "agent" && (
                  <g>
                    <title>{labels.ecr}</title>
                    <rect x={nd.cx + 22} y={nd.cy - 42} width={30} height={30} rx={6} style={{ fill: "var(--panel)", stroke: "var(--border)" }} />
                    <image href={ICON("Amazon-Elastic-Container-Registry")} x={nd.cx + 25} y={nd.cy - 39} width={24} height={24} />
                  </g>
                )}
                <text x={nd.cx} y={nd.cy + 30} textAnchor="middle" fontSize="13" fontWeight="600" style={ink}>{nd.label}</text>
                {nd.sub && <text x={nd.cx} y={nd.cy + 46} textAnchor="middle" fontSize="12" style={muted}>{nd.sub}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="m-0 mt-2 text-[14px] text-muted">{labels.legend} {labels.credit}</p>
    </div>
  );
}
