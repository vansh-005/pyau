import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { mapStyleUrl } from "../config";
import type { MapHost, HostState } from "../api";

maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);

const STATE_STYLE: Record<HostState, { color: string; fill: boolean; dash: boolean; word: string }> = {
  live: { color: "#16708f", fill: true, dash: false, word: "Confirmed today" },
  not_confirmed: { color: "#5b6770", fill: false, dash: false, word: "Not confirmed today" },
  standby: { color: "#7a6fb0", fill: false, dash: true, word: "Standby" },
  paused: { color: "#b3261e", fill: false, dash: false, word: "Paused" },
};

/** Clay-pot glyph: filled = confirmed today, outline = not confirmed, dashed = standby, struck = paused. */
function potSvg(state: HostState, label: string) {
  const s = STATE_STYLE[state];
  const fill = s.fill ? s.color : "#ffffff";
  const dash = s.dash ? 'stroke-dasharray="3 2.5"' : "";
  const strike = state === "paused" ? `<line x1="6" y1="6" x2="30" y2="34" stroke="${s.color}" stroke-width="3"/>` : "";
  return `<svg width="36" height="40" viewBox="0 0 36 40" role="img" aria-label="${label}: ${s.word}">
    <path d="M12 6h12v4c6 2 9 8 9 14 0 8-6 13-15 13S3 32 3 24c0-6 3-12 9-14z" fill="${fill}" stroke="${s.color}" stroke-width="2.5" ${dash}/>
    <rect x="10" y="3" width="16" height="5" rx="2" fill="${s.color}"/>${strike}</svg>`;
}

export interface MapViewProps {
  center: { lat: number; lng: number };
  hosts: MapHost[];
  zoom?: number;
  onSelectHost?: (h: MapHost) => void;
  className?: string;
  rider?: { lat: number; lng: number };
  routeLine?: [number, number][] | null;
}

export function MapView({ center, hosts, zoom = 14.5, onSelectHost, className, rider, routeLine }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: mapStyleUrl(),
      center: [center.lng, center.lat],
      zoom,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    markers.current = hosts.map((h) => {
      const node = document.createElement("button");
      node.className = "pot-marker";
      node.style.cssText = "background:none;border:0;padding:0;display:flex;flex-direction:column;align-items:center";
      node.innerHTML = `${potSvg(h.state, h.label)}<span style="font:600 12px Inter,sans-serif;background:#fff;border:1px solid #ded6c8;border-radius:6px;padding:0 4px;color:#1d2a33">${h.id}</span>`;
      node.onclick = () => onSelectHost?.(h);
      return new maplibregl.Marker({ element: node, anchor: "bottom" }).setLngLat([h.lng, h.lat]).addTo(m);
    });
  }, [hosts, onSelectHost]);

  const riderMarker = useRef<Marker | null>(null);
  useEffect(() => {
    const m = map.current;
    riderMarker.current?.remove();
    riderMarker.current = null;
    if (!m || !rider) return;
    const dot = document.createElement("div");
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label", "You are here");
    dot.style.cssText =
      "width:22px;height:22px;border-radius:50%;background:#c9771c;border:4px solid #fff;box-shadow:0 0 0 3px rgba(201,119,28,.35)";
    riderMarker.current = new maplibregl.Marker({ element: dot }).setLngLat([rider.lng, rider.lat]).addTo(m);
  }, [rider?.lat, rider?.lng]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      const src = m.getSource("route") as maplibregl.GeoJSONSource | undefined;
      const data = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: routeLine ?? [] },
      };
      if (src) src.setData(data);
      else if (routeLine) {
        m.addSource("route", { type: "geojson", data });
        m.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": "#fff", "line-width": 9 } });
        m.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": "#16708f", "line-width": 5 } });
      }
      if (routeLine && routeLine.length > 1) {
        const b = new maplibregl.LngLatBounds(routeLine[0], routeLine[0]);
        routeLine.forEach((c) => b.extend(c));
        m.fitBounds(b, { padding: 60, maxZoom: 17, duration: 600 });
      }
    };
    if (m.isStyleLoaded()) apply();
    else m.once("load", apply);
  }, [routeLine]);

  return <div ref={el} className={className ?? "h-full w-full"} />;
}

export { STATE_STYLE };
