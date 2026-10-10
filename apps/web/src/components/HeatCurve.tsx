import type { CoverageResponse } from "../api";

const hm = (s: string) => Number(s.slice(0, 2)) + Number(s.slice(3, 5)) / 60;

/** Hourly apparent temperature. Each value covers [h, h+1); the heat window band is shaded and the demo threshold labelled. */
export function HeatCurve({ data }: { data: CoverageResponse }) {
  const hours = Object.keys(data.forecast.hourly).sort();
  const vals = hours.map((h) => data.forecast.hourly[h]);
  const W = 560, H = 190, L = 40, R = 12, T = 16, B = 28;
  const x0 = hm(hours[0]), x1 = hm(hours[hours.length - 1]) + 1;
  const lo = Math.floor(Math.min(...vals, data.policy.heatThresholdC) - 2), hi = Math.ceil(Math.max(...vals) + 1);
  const X = (h: number) => L + ((h - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const pts = hours.map((h, i) => `${X(hm(h) + 0.5)},${Y(vals[i])}`).join(" ");
  const win = data.heat.window;
  const peakI = vals.indexOf(Math.max(...vals));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="w-full" style={{ maxHeight: 210 }}
      aria-label={`Hourly apparent temperature, peak ${Math.max(...vals)} °C at ${hours[peakI]}${win ? `, heat window ${win[0]} to ${win[1]}` : ""}`}>
      {win && <rect x={X(hm(win[0]))} y={T} width={X(hm(win[1])) - X(hm(win[0]))} height={H - T - B} fill="#c9771c" opacity={0.16} />}
      <line x1={L} x2={W - R} y1={Y(data.policy.heatThresholdC)} y2={Y(data.policy.heatThresholdC)} stroke="#c9771c" strokeDasharray="5 4" />
      <text x={W - R} y={Y(data.policy.heatThresholdC) - 5} textAnchor="end" fontSize="14" fill="#8a5410">Demo policy {data.policy.heatThresholdC} °C</text>
      <polyline points={pts} fill="none" stroke="#b5562e" strokeWidth={3} strokeLinejoin="round" />
      {hours.map((h, i) => (
        <circle key={h} cx={X(hm(h) + 0.5)} cy={Y(vals[i])} r={i === peakI ? 5 : 3} fill={vals[i] >= data.policy.heatThresholdC ? "#b5562e" : "#fff"} stroke="#b5562e" strokeWidth={2} />
      ))}
      <text x={X(hm(hours[peakI]) + 0.5)} y={Y(vals[peakI]) - 9} textAnchor="middle" fontSize="15" fontWeight="700" fill="#1d2a33">{vals[peakI]} °C</text>
      {hours.filter((_, i) => i % 2 === 0).map((h) => (
        <text key={h} x={X(hm(h) + 0.5)} y={H - 8} textAnchor="middle" fontSize="14" fill="#5b6770" fontFamily="JetBrains Mono Variable, monospace">{h.slice(0, 2)}</text>
      ))}
      {[lo + 2, Math.round((lo + hi) / 2), hi - 1].map((v) => (
        <text key={v} x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize="14" fill="#5b6770">{v}°</text>
      ))}
    </svg>
  );
}
