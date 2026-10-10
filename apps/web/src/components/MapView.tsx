import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { mapStyleUrl } from "../config";
import { useTheme } from "../theme";
import type { MapHost, HostState, ClusterInfo } from "../api";

maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);

export type VisualState = HostState | "closed";

/** Point states: icon shape + outline style + a word in the UI, never colour alone. Colours are theme tokens. */
export const STATE_STYLE: Record<VisualState, { color: string; fill: boolean; dash: boolean; key: string }> = {
  live: { color: "var(--water)", fill: true, dash: false, key: "state.live" },
  not_confirmed: { color: "var(--muted)", fill: false, dash: false, key: "state.not_confirmed" },
  standby: { color: "var(--standby)", fill: false, dash: true, key: "state.standby" },
  paused: { color: "var(--gap)", fill: false, dash: false, key: "state.paused" },
  closed: { color: "var(--muted)", fill: false, dash: true, key: "state.closed" },
};

export const visualState = (h: MapHost): VisualState => (h.state === "live" && h.openNow === false ? "closed" : h.state);

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Same pot as the logo, in the point's state: solid = confirmed today, outline = not confirmed, dashed = standby/closed, struck = paused. */
function potSvg(state: VisualState, label: string) {
  const s = STATE_STYLE[state];
  const fill = s.fill ? s.color : "var(--panel)";
  const dash = s.dash ? 'stroke-dasharray="3 2.5"' : "";
  const strike = state === "paused" ? `<line x1="4" y1="4" x2="20" y2="21" stroke="${s.color}" stroke-width="2.2" stroke-linecap="round"/>` : "";
  const wave = s.fill ? `<path d="M8.3 12.4c1.2-.9 2.4-.9 3.7 0s2.5.9 3.7 0" stroke="var(--on-water)" stroke-width="1.75" fill="none" stroke-linecap="round"/>` : "";
  return `<svg width="34" height="34" viewBox="0 0 24 24" role="img" aria-label="${label}" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 3.5h6" stroke="${s.color}" stroke-width="2"/>
    <path d="M10 3.5v2.4C7.2 7 5.5 9.6 5.5 12.8c0 4 2.9 7.2 6.5 7.2s6.5-3.2 6.5-7.2c0-3.2-1.7-5.8-4.5-6.9V3.5" fill="${fill}" stroke="${s.color}" stroke-width="1.9" ${dash}/>
    ${wave}${strike}</svg>`;
}

export interface MapViewProps {
  center: { lat: number; lng: number };
  hosts: MapHost[];
  zoom?: number;
  onSelectHost?: (h: MapHost) => void;
  className?: string;
  rider?: { lat: number; lng: number };
  clusters?: ClusterInfo[];
  routeLine?: [number, number][] | null;
  /** Fit the view to all hosts and clusters once data is present (coordinator map). */
  fitAll?: boolean;
  /** Draggable registration pin (host sign-up). */
  pin?: { lat: number; lng: number } | null;
  onPinMove?: (p: { lat: number; lng: number }) => void;
}

export function MapView({ center, hosts, zoom = 14.5, onSelectHost, className, rider, routeLine, clusters, fitAll, pin, onPinMove }: MapViewProps) {
  const { theme } = useTheme();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const routeRef = useRef<[number, number][] | null>(null);
  const firstTheme = useRef(true);

  const applyRoute = (fit: boolean) => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    const line = routeRef.current;
    const data = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: line ?? [] } };
    const src = m.getSource("route") as maplibregl.GeoJSONSource | undefined;
    const accent = cssVar("--water") || "#0a6c94";
    const casing = cssVar("--panel") || "#fff";
    if (src) {
      src.setData(data);
      m.setPaintProperty("route-line", "line-color", accent);
      m.setPaintProperty("route-casing", "line-color", casing);
    } else if (line) {
      m.addSource("route", { type: "geojson", data });
      m.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": casing, "line-width": 8 } });
      m.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": accent, "line-width": 4 } });
    }
    if (fit && line && line.length > 1) {
      const b = new maplibregl.LngLatBounds(line[0], line[0]);
      line.forEach((c) => b.extend(c));
      m.fitBounds(b, { padding: 60, maxZoom: 17, duration: 600 });
    }
  };

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: mapStyleUrl(theme),
      center: [center.lng, center.lat],
      zoom,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("style.load", () => applyRoute(false)); // a new style (theme change) drops our route layer: put it back
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme change: swap the Amazon Location style (light / dark).
  useEffect(() => {
    if (firstTheme.current) {
      firstTheme.current = false;
      return;
    }
    map.current?.setStyle(mapStyleUrl(theme));
  }, [theme]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    markers.current = hosts.map((h) => {
      const node = document.createElement("button");
      node.className = "pot-marker";
      node.style.cssText = "background:none;border:0;padding:0;display:flex;flex-direction:column;align-items:center";
      node.innerHTML = `${potSvg(visualState(h), h.label)}<span style="font:600 13px Inter,sans-serif;background:var(--panel);border:1px solid var(--border);border-radius:4px;padding:0 4px;color:var(--ink);margin-top:-2px">${h.id}</span>`;
      node.onclick = () => onSelectHost?.(h);
      return new maplibregl.Marker({ element: node, anchor: "bottom" }).setLngLat([h.lng, h.lat]).addTo(m);
    });
  }, [hosts, onSelectHost]);

  const clusterMarkers = useRef<Marker[]>([]);
  useEffect(() => {
    const m = map.current;
    clusterMarkers.current.forEach((x) => x.remove());
    clusterMarkers.current = [];
    if (!m || !clusters) return;
    clusterMarkers.current = clusters.map((c) => {
      const size = 36 + Math.round(c.requests * 2.2);
      const color = c.uncovered ? "var(--gap)" : "var(--water)";
      const node = document.createElement("div");
      node.setAttribute("role", "img");
      node.setAttribute("aria-label", `${c.label}: ${c.requests} requests, ${c.uncovered ? "not covered" : "covered"}`);
      node.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:color-mix(in srgb, ${color} 14%, transparent);border:2px ${c.uncovered ? "dashed" : "solid"} ${color};display:flex;align-items:center;justify-content:center;font:600 14px Inter,sans-serif;color:${color};pointer-events:none`;
      node.innerHTML = `<span style="background:var(--panel);border-radius:4px;padding:0 4px;white-space:nowrap">${c.id} · ${c.requests}</span>`;
      return new maplibregl.Marker({ element: node }).setLngLat([c.lng, c.lat]).addTo(m);
    });
  }, [clusters]);

  const pinMarker = useRef<Marker | null>(null);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pin) {
      pinMarker.current?.remove();
      pinMarker.current = null;
      return;
    }
    if (pinMarker.current) {
      pinMarker.current.setLngLat([pin.lng, pin.lat]);
      return;
    }
    const mk = new maplibregl.Marker({ color: cssVar("--water") || "#0a6c94", draggable: true }).setLngLat([pin.lng, pin.lat]).addTo(m);
    mk.getElement().setAttribute("aria-label", "Your place: drag to move");
    mk.on("dragend", () => {
      const p = mk.getLngLat();
      onPinMove?.({ lat: p.lat, lng: p.lng });
    });
    pinMarker.current = mk;
  }, [pin?.lat, pin?.lng]);

  const fitted = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m || !fitAll || fitted.current || !clusters?.length) return;
    const b = new maplibregl.LngLatBounds();
    clusters.forEach((c) => b.extend([c.lng, c.lat]));
    hosts.forEach((h) => b.extend([h.lng, h.lat]));
    m.fitBounds(b, { padding: 70, maxZoom: 16, duration: 0 });
    fitted.current = true;
  }, [clusters, hosts, fitAll]);

  const riderMarker = useRef<Marker | null>(null);
  useEffect(() => {
    const m = map.current;
    riderMarker.current?.remove();
    riderMarker.current = null;
    if (!m || !rider) return;
    const dot = document.createElement("div");
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label", "You are here");
    dot.style.cssText = "width:20px;height:20px;border-radius:50%;background:var(--ink);border:3px solid var(--panel);box-shadow:0 0 0 3px color-mix(in srgb, var(--ink) 25%, transparent)";
    riderMarker.current = new maplibregl.Marker({ element: dot }).setLngLat([rider.lng, rider.lat]).addTo(m);
  }, [rider?.lat, rider?.lng]);

  useEffect(() => {
    routeRef.current = routeLine ?? null;
    const m = map.current;
    if (!m) return;
    if (m.isStyleLoaded()) applyRoute(true);
    else m.once("load", () => applyRoute(true));
  }, [routeLine]);

  return <div ref={el} className={className ?? "h-full w-full"} />;
}
