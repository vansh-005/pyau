// Public config only (Vite build-time). No secrets in the browser.
export const config = {
  apiBase: (import.meta.env.VITE_API_BASE_URL as string) || "",
  region: (import.meta.env.VITE_AWS_REGION as string) || "ap-south-1",
  mapStyle: (import.meta.env.VITE_LOCATION_MAP_STYLE as string) || "Standard",
  mapKey: (import.meta.env.VITE_LOCATION_API_KEY as string) || "",
};

export const mapStyleUrl = () =>
  `https://maps.geo.${config.region}.amazonaws.com/v2/styles/${config.mapStyle}/descriptor?key=${config.mapKey}`;
