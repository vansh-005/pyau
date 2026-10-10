import type { CoverageResponse } from "../api";
import { useLang } from "../i18n/lang";

const hm = (s: string) => Number(s.slice(0, 2)) + Number(s.slice(3, 5)) / 60;

/** Hourly apparent temperature. Each value covers [h, h+1). The heat window is shaded and the threshold is labelled on the chart. */
export function HeatCurve({ data }: { data: CoverageResponse }) {
  const { t } = useLang();
  const hours = Object.keys(data.forecast.hourly).sort();
  const vals = hours.map((h) => data.forecast.hourly[h]);
  const thr = data.policy.heatThresholdC;
  const W = 600, H = 262, L = 44, R = 16, T = 58, B = 32;
  const x0 = hm(hours[0]), x1 = hm(hours[hours.length - 1]) + 1;
  const lo = Math.floor(Math.min(...vals, thr) - 2), hi = Math.ceil(Math.max(...vals) + 1);
  const X = (h: number) => L + ((h - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const pts = hours.map((h, i) => `${X(hm(h) + 0.5)},${Y(vals[i])}`).join(" ");
  const win = data.heat.window;
  const peakI = vals.indexOf(Math.max(...vals));
  const yTicks = [lo + 1, Math.round((lo + hi) / 2), hi - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="w-full"
      aria-label={t("heat.aria", { peak: Math.max(...vals), at: hours[peakI], from: win?.[0] ?? "", to: win?.[1] ?? "" })}>
      {yTicks.map((v) => <line key={v} x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#e2e8ee" />)}
      {win && (
        <>
          <rect x={X(hm(win[0]))} y={T - 42} width={X(hm(win[1])) - X(hm(win[0]))} height={H - T - B + 42} fill="#fff4e0" />
          <text x={(X(hm(win[0])) + X(hm(win[1]))) / 2} y={T - 24} textAnchor="middle" fontSize="14" fontWeight="600" fill="#a85a00">{t("heat.window", { from: win[0], to: win[1] })}</text>
        </>
      )}
      <line x1={L} x2={W - R} y1={Y(thr)} y2={Y(thr)} stroke="#a85a00" strokeWidth="1.5" strokeDasharray="6 4" />
      <text x={L + 6} y={Y(thr) - 6} fontSize="14" fill="#a85a00" fontWeight="500">{t("heat.threshold", { c: thr })}</text>
      <polyline points={pts} fill="none" stroke="#0e1a22" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {hours.map((h, i) => (
        <circle key={h} cx={X(hm(h) + 0.5)} cy={Y(vals[i])} r={i === peakI ? 5.5 : 3.5} fill={vals[i] >= thr ? "#a85a00" : "#fff"} stroke={vals[i] >= thr ? "#a85a00" : "#0e1a22"} strokeWidth={2} />
      ))}
      <text x={X(hm(hours[peakI]) + 0.5)} y={Y(vals[peakI]) - 12} textAnchor="middle" fontSize="15" fontWeight="700" fill="#0e1a22">{vals[peakI]} °C</text>
      {hours.filter((_, i) => i % 2 === 0).map((h) => (
        <text key={h} x={X(hm(h) + 0.5)} y={H - 8} textAnchor="middle" fontSize="14" fill="#566573">{h}</text>
      ))}
      {yTicks.map((v) => (
        <text key={v} x={L - 8} y={Y(v) + 5} textAnchor="end" fontSize="14" fill="#566573">{v}°</text>
      ))}
    </svg>
  );
}
