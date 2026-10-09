// MapLibre 6 loads a module worker (+ shared chunk) at runtime. Serve them as static files and point setWorkerUrl at them.
import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const dist = join(dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")), "dist");
mkdirSync("public/maplibre", { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) cpSync(join(dist, f), join("public/maplibre", f));
