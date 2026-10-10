// i18n completeness: en and hi have identical keys, every static t("key") used in src exists, and no placeholder is lost in Hindi.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = "apps/web/src";
const en = JSON.parse(readFileSync(join(root, "i18n/en.json"), "utf8"));
const hi = JSON.parse(readFileSync(join(root, "i18n/hi.json"), "utf8"));
let bad = 0;
const fail = (m) => { bad++; console.log("FAIL", m); };

for (const k of Object.keys(en)) if (!(k in hi)) fail(`missing in hi: ${k}`);
for (const k of Object.keys(hi)) if (!(k in en) && k !== "_needsNativeReview") fail(`missing in en: ${k}`);
const ph = (s) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");
for (const k of Object.keys(en)) if (k in hi && ph(en[k]) !== ph(hi[k])) fail(`placeholders differ for ${k}: en ${ph(en[k])} vs hi ${ph(hi[k])}`);

const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && files.push(p); } })(root);
const used = new Set(), prefixes = new Set();
for (const f of files) {
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/\bt\(\s*"([^"]+)"/g)) used.add(m[1]);
  for (const m of s.matchAll(/\bt\(\s*`([^`$]*)\$\{/g)) prefixes.add(m[1]);
  for (const m of s.matchAll(/\bt\(\s*[^"`)]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g)) { used.add(m[1]); used.add(m[2]); }
}
for (const k of used) if (!(k in en)) fail(`used but not defined: ${k}`);
for (const p of prefixes) if (!Object.keys(en).some((k) => k.startsWith(p))) fail(`no keys for dynamic prefix: ${p}`);
const unusedHint = Object.keys(en).filter((k) => !used.has(k) && ![...prefixes].some((p) => k.startsWith(p)));
console.log(`keys: en ${Object.keys(en).length}, hi ${Object.keys(hi).length}; used static ${used.size}; dynamic prefixes ${[...prefixes].join(" ")}`);
if (unusedHint.length) console.log("not referenced statically (check they are used via variables):", unusedHint.slice(0, 40).join(", "));
console.log(bad ? `I18N CHECK: ${bad} problem(s)` : "I18N CHECK OK");
process.exit(bad ? 1 : 0);
