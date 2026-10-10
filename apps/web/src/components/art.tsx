/* Original illustrations for the public pages. Drawn for Pyau; no stock art. Colours are theme tokens so
   every scene works in light and dark. */

/** A sun-bleached East Delhi street: a shop with a clay pyau under its awning, a rider on a scooter, a neem tree for shade. */
export function SunStreetScene({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 960 540" role="img" aria-label={label} className="block h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ss-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--scene-sky-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--scene-sky-bottom)" }} />
        </linearGradient>
        <radialGradient id="ss-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={{ stopColor: "var(--scene-sun)", stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: "var(--scene-sun)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <rect width="960" height="540" fill="url(#ss-sky)" />
      {/* sun and heat haze */}
      <circle cx="790" cy="120" r="150" fill="url(#ss-sun)" />
      <circle cx="790" cy="120" r="58" fill="var(--scene-sun)" />
      {[330, 346, 362].map((y, i) => (
        <path key={y} d={`M${-20 + i * 30} ${y} q40 -9 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0`} fill="none" stroke="var(--scene-haze)" strokeWidth="2" opacity="0.32" strokeDasharray="14 10" />
      ))}
      {/* far buildings */}
      <g fill="var(--scene-wall-2)" opacity="0.55">
        <rect x="430" y="250" width="90" height="150" />
        <rect x="530" y="215" width="70" height="185" />
        <rect x="610" y="270" width="110" height="130" />
        <rect x="730" y="235" width="100" height="165" />
        <rect x="840" y="280" width="120" height="120" />
      </g>
      <g fill="var(--scene-sky-bottom)" opacity="0.8">
        {[260, 285, 310, 335].map((y) => <rect key={`a${y}`} x="446" y={y} width="14" height="10" />)}
        {[230, 255, 280].map((y) => <rect key={`b${y}`} x="546" y={y} width="12" height="10" />)}
        {[250, 276, 302].map((y) => <rect key={`c${y}`} x="752" y={y} width="14" height="10" />)}
      </g>
      {/* shop building */}
      <rect x="30" y="140" width="400" height="262" fill="var(--scene-wall)" />
      <rect x="30" y="140" width="400" height="14" fill="var(--scene-wall-2)" />
      <rect x="62" y="168" width="64" height="44" rx="3" fill="var(--scene-sky-bottom)" />
      <rect x="338" y="168" width="64" height="44" rx="3" fill="var(--scene-sky-bottom)" />
      <rect x="50" y="244" width="330" height="158" fill="var(--scene-shade)" />
      {/* shop signboard and awning */}
      <rect x="120" y="172" width="190" height="52" rx="6" fill="var(--panel)" stroke="var(--clay)" strokeWidth="3" />
      <text x="215" y="208" textAnchor="middle" fontSize="34" fontWeight="700" fill="var(--clay)" style={{ fontFamily: "var(--font-display)" }}>प्याऊ</text>
      <path d="M40 232 H390 L378 276 H52 Z" fill="var(--clay)" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${40 + i * 50 + 25} 232 H${40 + i * 50 + 50} L${40 + i * 50 + 47} 276 H${52 + i * 47 + 24} Z`} fill="var(--scene-sun)" opacity="0.9" />
      ))}
      <path d="M52 276 q12 12 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="var(--clay)" />
      {/* water sign */}
      <circle cx="360" cy="214" r="0" />
      {/* counter and shelves inside */}
      <rect x="70" y="352" width="140" height="50" fill="var(--scene-wall-2)" />
      <rect x="82" y="300" width="116" height="6" fill="var(--scene-wall-2)" />
      <g fill="var(--water)" opacity="0.85">
        <rect x="92" y="276" width="14" height="24" rx="3" />
        <rect x="112" y="282" width="14" height="18" rx="3" />
        <rect x="132" y="272" width="14" height="28" rx="3" />
      </g>
      {/* the pyau: clay pot on a stand, a ladle and a steel glass */}
      <g>
        <rect x="236" y="364" width="6" height="38" fill="var(--scene-wall-2)" />
        <rect x="296" y="364" width="6" height="38" fill="var(--scene-wall-2)" />
        <rect x="226" y="358" width="86" height="9" rx="3" fill="var(--scene-wall-2)" />
        <path d="M269 300 c-30 0 -46 20 -46 40 c0 14 14 20 46 20 s46 -6 46 -20 c0 -20 -16 -40 -46 -40z" fill="var(--clay)" />
        <ellipse cx="269" cy="300" rx="22" ry="6" fill="var(--clay)" />
        <ellipse cx="269" cy="298" rx="18" ry="4.5" fill="var(--water)" />
        <path d="M232 332 q18 -8 37 0 t37 0" fill="none" stroke="var(--scene-sky-bottom)" strokeWidth="3" opacity="0.7" strokeLinecap="round" />
        <path d="M290 292 q20 -14 36 -6" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="330" cy="287" r="6" fill="var(--panel)" stroke="var(--ink)" strokeWidth="2" />
        <path d="M322 350 h16 l-3 8 h-10 z" fill="var(--panel)" stroke="var(--ink)" strokeWidth="1.5" />
      </g>
      {/* neem tree and its shade */}
      <ellipse cx="500" cy="414" rx="84" ry="10" fill="var(--scene-shade)" />
      <rect x="494" y="290" width="14" height="124" rx="4" fill="var(--scene-wall-2)" />
      {[[500, 262, 44], [468, 280, 34], [534, 282, 36], [490, 238, 30], [520, 248, 30]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--scene-leaf)" opacity={i < 3 ? 1 : 0.92} />
      ))}
      {/* street lamp */}
      <rect x="640" y="236" width="6" height="170" fill="var(--scene-wall-2)" />
      <path d="M643 240 h34" stroke="var(--scene-wall-2)" strokeWidth="6" strokeLinecap="round" />
      <rect x="670" y="236" width="18" height="9" rx="3" fill="var(--scene-lamp)" />
      {/* pavement and road */}
      <rect x="0" y="400" width="960" height="34" fill="var(--scene-wall-2)" />
      <rect x="0" y="434" width="960" height="106" fill="var(--scene-road)" />
      <g stroke="var(--panel)" strokeWidth="4" strokeDasharray="34 26" opacity="0.65"><path d="M0 492 H960" /></g>
      {/* rider on a scooter, heading right with a delivery bag */}
      <ellipse cx="760" cy="520" rx="96" ry="9" fill="var(--scene-shade)" />
      <g>
        <path d="M642 470 h-34 M648 482 h-44 M642 494 h-30" stroke="var(--scene-wall-2)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <circle cx="690" cy="496" r="23" fill="var(--panel)" stroke="var(--ink)" strokeWidth="6" />
        <circle cx="690" cy="496" r="6" fill="var(--ink)" />
        <circle cx="822" cy="496" r="23" fill="var(--panel)" stroke="var(--ink)" strokeWidth="6" />
        <circle cx="822" cy="496" r="6" fill="var(--ink)" />
        <path d="M700 470 h88 q6 0 8 6 l8 10 h-22 l-14 -14 h-56 z" fill="var(--water)" />
        <path d="M776 420 q18 8 20 50 h-12 q-2 -28 -14 -34 z" fill="var(--water)" />
        <path d="M784 420 h22" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
        <path d="M700 470 q-18 -4 -26 -22 h30 q10 8 8 22z" fill="var(--ink)" />
        {/* rider */}
        <path d="M716 468 q4 -34 14 -50 h26 q4 14 -2 26 l-8 24 z" fill="var(--scene-rider)" />
        <path d="M752 428 q20 0 40 -8" fill="none" stroke="var(--scene-rider)" strokeWidth="9" strokeLinecap="round" />
        <path d="M738 462 l22 6 l-6 24" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="752" cy="400" r="14" fill="var(--scene-wall)" stroke="var(--ink)" strokeWidth="2" />
        <path d="M737 400 a15 15 0 0 1 30 0 z" fill="var(--scene-helmet)" stroke="var(--ink)" strokeWidth="2" />
        {/* delivery bag */}
        <rect x="686" y="404" width="44" height="46" rx="6" fill="var(--scene-bag)" stroke="var(--ink)" strokeWidth="2" />
        <rect x="686" y="418" width="44" height="7" fill="var(--scene-bag-strip)" />
      </g>
    </svg>
  );
}

/* ---- the sample zone, stylised ----------------------------------------------------------------- */

const ZONE = { lat0: 28.642, lat1: 28.62, lng0: 77.265, lng1: 77.295, w: 800, h: 560 };
const px = (lng: number) => ((lng - ZONE.lng0) / (ZONE.lng1 - ZONE.lng0)) * ZONE.w;
const py = (lat: number) => ((ZONE.lat0 - lat) / (ZONE.lat0 - ZONE.lat1)) * ZONE.h;

/** Real positions of the six sample points and the Laxmi Nagar Metro station (from the fixture and Amazon Location Places). */
const POINTS = [
  { id: "H1", lat: 28.6334, lng: 77.2768, live: true }, { id: "H2", lat: 28.6262, lng: 77.2725, live: true },
  { id: "H3", lat: 28.6283, lng: 77.2826, live: true }, { id: "H4", lat: 28.6276, lng: 77.2836, live: false },
  { id: "H5", lat: 28.6292, lng: 77.2842, live: true }, { id: "H6", lat: 28.6326, lng: 77.2779, live: false },
];
const AREAS = [
  { id: "A", lat: 28.63283, lng: 77.27699, r: 34 }, { id: "B", lat: 28.62778, lng: 77.28306, r: 46 },
  { id: "C", lat: 28.62635, lng: 77.27192, r: 38 }, { id: "D", lat: 28.63816, lng: 77.29022, r: 24 },
];
const METRO = { lat: 28.6299, lng: 77.2771 };

/**
 * A stylised map of the East Delhi sample zone. Streets and the river are drawn by hand; the water points,
 * the four rider-demand areas and the metro station sit at their real coordinates. Dots pulse softly.
 */
export function ZoneMap({ label, river, vikas }: { label: string; river: string; vikas: string }) {
  const streets = Array.from({ length: 16 }, (_, i) => i);
  return (
    <svg viewBox="95 60 560 440" role="img" aria-label={label} className="block h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width={ZONE.w} height={ZONE.h} fill="var(--water-soft)" opacity="0.55" />
      {/* Yamuna */}
      <path d="M0 0 H150 C 120 90 190 150 150 250 C 120 330 170 420 130 560 H0 Z" fill="var(--water)" opacity="0.22" />
      <text x="26" y="300" fontSize="15" fill="var(--water)" fontWeight="600" transform="rotate(-82 26 300)" opacity="0.9">{river}</text>
      {/* minor streets */}
      <g stroke="var(--border)" strokeWidth="5" strokeLinecap="round" opacity="0.9" transform="rotate(-18 400 280)">
        {streets.map((i) => <path key={`h${i}`} d={`M160 ${-60 + i * 48} H900`} />)}
        {streets.map((i) => <path key={`v${i}`} d={`M${170 + i * 52} -80 V680`} strokeWidth="4" />)}
      </g>
      {/* Vikas Marg and a ring road */}
      <path d="M120 470 C 300 380 470 300 820 150" fill="none" stroke="var(--panel)" strokeWidth="16" strokeLinecap="round" />
      <path d="M120 470 C 300 380 470 300 820 150" fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="10 8" />
      <text x="470" y="318" fontSize="14" fill="var(--muted)" transform="rotate(-24 470 318)">{vikas}</text>
      <path d="M650 -10 C 640 200 680 380 640 580" fill="none" stroke="var(--panel)" strokeWidth="12" strokeLinecap="round" />
      {/* where riders ask in the heat window */}
      {AREAS.map((a) => (
        <g key={a.id}>
          <circle cx={px(a.lng)} cy={py(a.lat)} r={a.r} fill="var(--heat)" opacity="0.14" />
          <circle cx={px(a.lng)} cy={py(a.lat)} r={a.r} fill="none" stroke="var(--heat)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
        </g>
      ))}
      {/* metro */}
      <g transform={`translate(${px(METRO.lng)} ${py(METRO.lat)})`}>
        <rect x="-9" y="-9" width="18" height="18" rx="4" fill="var(--panel)" stroke="var(--muted)" strokeWidth="2" />
        <text x="0" y="5" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--muted)">M</text>
      </g>
      {/* water points */}
      {POINTS.map((p, i) => (
        <g key={p.id} transform={`translate(${px(p.lng)} ${py(p.lat)})`}>
          {p.live && (
            <circle r="11" fill="var(--water)" opacity="0.5" style={{ transformOrigin: "center", transformBox: "fill-box", animation: `pulse-ring 3.2s ease-out ${(i * 0.6).toFixed(1)}s infinite` }} />
          )}
          <circle r="10" fill={p.live ? "var(--water)" : "var(--panel)"} stroke={p.live ? "var(--panel)" : "var(--muted)"} strokeWidth={p.live ? 3 : 2} strokeDasharray={p.live ? undefined : "3 2"} />
        </g>
      ))}
    </svg>
  );
}

/** A phone frame around a real screenshot of the deployed app. */
export function PhoneShot({ src, alt, width = 280 }: { src: string; alt: string; width?: number }) {
  return (
    <div className="overflow-hidden rounded-[30px] border-[7px] border-[#10181e] bg-[#10181e] shadow-2xl" style={{ width: "100%", maxWidth: width, boxShadow: "0 0 0 1px var(--border), 0 30px 60px -24px rgb(0 0 0 / 0.55)" }}>
      <img src={src} alt={alt} width={780} className="block h-auto w-full rounded-[22px]" loading="lazy" />
    </div>
  );
}

/** The clay pyau on its stand, large, for the "what is a pyau" section. */
export function PyauPot({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-label={label} className="block h-auto w-full max-w-[320px]">
      <ellipse cx="160" cy="292" rx="112" ry="12" fill="var(--scene-shade)" />
      <rect x="86" y="236" width="10" height="58" rx="3" fill="var(--scene-wall-2)" />
      <rect x="224" y="236" width="10" height="58" rx="3" fill="var(--scene-wall-2)" />
      <rect x="70" y="224" width="180" height="16" rx="6" fill="var(--scene-wall-2)" />
      <path d="M160 52 c-70 0 -104 44 -104 90 c0 38 34 80 104 80 s104 -42 104 -80 c0 -46 -34 -90 -104 -90z" fill="var(--clay)" />
      <path d="M110 66 q50 -34 100 0 q-14 22 -50 22 t-50 -22z" fill="var(--clay)" />
      <ellipse cx="160" cy="62" rx="52" ry="13" fill="var(--clay)" />
      <ellipse cx="160" cy="59" rx="42" ry="9" fill="var(--water)" />
      <path d="M72 150 q22 -16 44 0 t44 0 t44 0 t44 0" fill="none" stroke="var(--clay-soft)" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
      <path d="M72 176 q22 -16 44 0 t44 0 t44 0 t44 0" fill="none" stroke="var(--clay-soft)" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
      <path d="M214 46 q48 -34 82 -14" fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="300" cy="32" r="12" fill="var(--panel)" stroke="var(--ink)" strokeWidth="5" />
      <path d="M262 214 h30 l-6 14 h-18 z" fill="var(--panel)" stroke="var(--ink)" strokeWidth="3" />
    </svg>
  );
}
