"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { scaleSqrt } from "d3-scale";
import { asset } from "@/lib/basePath";

interface CountrySeries {
  year: number;
  affected: number | null;
  per100k: number | null;
}
interface MapCountry {
  country: string;
  iso: string;
  cumulativeAffected: number;
  worstYear: number | null;
  worstYearAffected: number | null;
  yearsWithData: number;
  series: CountrySeries[];
}
interface MapData {
  source: string;
  countries: MapCountry[];
}
interface GeoFeature {
  type: "Feature";
  properties: { iso: string; name: string };
  geometry: { type: string; coordinates: unknown };
}
interface GeoData {
  type: "FeatureCollection";
  features: GeoFeature[];
}

const SHORT: Record<string, string> = {
  "Micronesia (Federated States of)": "Micronesia",
  "Marshall Islands": "Marshall Is.",
};

// Date-line-safe representative coordinates [lon, lat] per country.
// Polygon centroids break for Fiji/Kiribati (territory crosses the antimeridian),
// so we project these explicit points for bubble placement instead.
const COORDS: Record<string, [number, number]> = {
  PNG: [147.2, -9.4],
  FJI: [178.4, -17.8],
  KIR: [172.9, 1.3],
  MHL: [171.2, 7.1],
  TON: [-175.2, -21.1],
  WSM: [-171.8, -13.8],
  SLB: [160.0, -9.4],
  TUV: [179.2, -8.5],
  NRU: [166.9, -0.5],
  FSM: [158.2, 6.9],
  VUT: [168.3, -17.7],
  PLW: [134.6, 7.5],
};

interface Step {
  year: number;
  title: string;
  body: string;
}
const STEPS: Step[] = [
  {
    year: 2013,
    title: "",
    body: "Between 2013 and 2022, the same scattered nations were struck again and again. Watch where the damage falls — and how rarely the same places are spared.",
  },
  {
    year: 2015,
    title: "",
    body: "In 2015, flash flooding reached a large share of the Solomon Islands' population — vast in its reach, in a nation far too small to absorb it.",
  },
  {
    year: 2016,
    title: "",
    body: "Tropical Cyclone Winston, the strongest storm ever recorded in the Southern Hemisphere at landfall, directly affected close to two-thirds of Fiji's people — over 633,000 in a single year.",
  },
  {
    year: 2018,
    title: "",
    body: "In 2018 the blows came in succession. Tonga alone saw most of its population directly affected — one year's disaster arriving before the last had been undone.",
  },
  {
    year: 2020,
    title: "",
    body: "Tropical Cyclone Harold crossed Vanuatu as a Category 5 storm, then struck Fiji — close to a quarter of a million people directly affected in Vanuatu's worst year on record.",
  },
  {
    year: 2022,
    title: "",
    body: "The mark these years leave is measured in the displaced and the dispossessed — homes, crops and incomes lost. For the lowest-lying atolls, the burden is heaviest of all.",
  },
];

const START_YEAR = 2013;
const END_YEAR = 2022;
const SIGNIFICANT = 500;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return `${n}`;
}

export default function DisasterMapScrolly() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [progress, setProgress] = useState(0);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    Promise.all([
      fetch(asset("/data/pacific_countries.json")).then((r) => r.json()),
      fetch(asset("/data/map_unsd.json")).then((r) => r.json()),
    ])
      .then(([g, d]) => {
        setGeo(g);
        setData(d);
      })
      .catch((e) => console.error("Map load failed:", e));
  }, []);

  useEffect(() => {
    if (!stickyRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(stickyRef.current);
    return () => ro.disconnect();
  }, [geo]);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(total > 0 ? scrolled / total : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [geo, data]);

  const isSmall = width < 560;

  // Inject the fade keyframe once
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("dm-fade-kf")) return;
    const el = document.createElement("style");
    el.id = "dm-fade-kf";
    el.textContent =
      "@keyframes dmFade{0%{opacity:0;transform:translateX(-16px)}100%{opacity:1;transform:translateX(0)}}";
    document.head.appendChild(el);
  }, []);

  // Map height: tall on mobile so bubbles/labels have room; capped to viewport on desktop.
  const reserved = 170;
  const maxByViewport = Math.max(vh - reserved, 260);
  const height = isSmall
    ? Math.max(width * 1.15, 460)
    : Math.min(width * 0.6, maxByViewport);

  const projection = useMemo(() => {
    if (width === 0) return null;
    // 54° is the true country spread; add margin for edge bubbles + labels.
    // Mobile uses a wider degree-frame so big bubbles don't dominate the narrow width.
    const degreesAcross = isSmall ? 76 : 70;
    const scale = width / ((Math.PI / 180) * degreesAcross) / 2;
    return geoEquirectangular()
      .rotate([-172, 0])
      .center([0, -8])
      .scale(scale)
      .translate([width / 2, height / 2]);
  }, [width, height, isSmall]);

  const pathGen = useMemo(
    () => (projection ? geoPath(projection) : null),
    [projection]
  );

  const rScale = useMemo(() => {
    if (!data) return null;
    let mx = 0;
    for (const c of data.countries)
      for (const s of c.series) if ((s.affected ?? 0) > mx) mx = s.affected ?? 0;
    return scaleSqrt()
      .domain([0, mx])
      .range([0, isSmall ? 52 : 78]);
  }, [data, isSmall]);

  const span = END_YEAR - START_YEAR;
  const exactYear = START_YEAR + progress * span;
  const yearLo = Math.floor(exactYear);
  const yearHi = Math.min(yearLo + 1, END_YEAR);
  const frac = exactYear - yearLo;
  const displayYear = Math.round(exactYear);

  const activeStep = useMemo(() => {
    let s = STEPS[0];
    for (const step of STEPS) if (displayYear >= step.year) s = step;
    return s;
  }, [displayYear]);

  const items = useMemo(() => {
    if (!geo || !data || !projection || !pathGen || !rScale) return [];
    const byIso = new Map(data.countries.map((c) => [c.iso, c]));
    const getAff = (c: MapCountry, y: number) =>
      c.series.find((s) => s.year === y)?.affected ?? 0;
    return geo.features
      .map((f) => {
        const c = byIso.get(f.properties.iso);
        if (!c) return null;
        // Project explicit coordinates (date-line-safe), NOT polygon centroid.
        const ll = COORDS[c.iso];
        const cen = ll && projection ? projection(ll) : null;
        if (!cen || Number.isNaN(cen[0])) return null;
        const aLo = getAff(c, yearLo);
        const aHi = getAff(c, yearHi);
        const aff = aLo + (aHi - aLo) * frac;
        return {
          iso: c.iso,
          name: SHORT[c.country] ?? c.country,
          x: cen[0],
          y: cen[1],
          r: rScale(aff),
          affected: Math.round(aff),
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => b.r - a.r);
  }, [geo, data, projection, pathGen, rScale, yearLo, yearHi, frac]);

  const haveData = width > 0 && geo && data && pathGen;

  return (
    <figure className="mx-auto w-full">
      <figcaption className="mx-auto mb-1 max-w-[720px] text-[var(--caption)] text-[clamp(0.7rem,0.68rem+0.15vw,0.8rem)] font-medium leading-snug">
        Year by year, the same nations are struck again and again
      </figcaption>

      {/* Scroll driver — height scales with number of steps (stable across devices) */}
      <div
        ref={containerRef}
        style={{ height: `${STEPS.length * (isSmall ? 70 : 90) + 80}vh` }}
      >
        <div
          ref={stickyRef}
          className="sticky top-0 mx-auto flex h-screen w-full max-w-[1040px] flex-col justify-center overflow-visible"
        >
          {/* Scroll-synced narrative block */}
          <div className="mx-auto mb-4 w-full max-w-[720px] px-4">
            <div className="flex min-h-[72px] items-center rounded-lg bg-white/40 px-4 py-3 shadow-[0_1px_8px_rgba(100,116,139,0.12)]">
              <p
                key={activeStep.year}
                style={{ animation: "dmFade 600ms ease-out" }}
                className="text-slate-700 text-[clamp(0.85rem,0.8rem+0.25vw,0.98rem)] leading-snug"
              >
                {activeStep.body}
              </p>
            </div>
          </div>

          <div className="relative w-full">
            {haveData && (
              <svg
                width={width}
                height={height}
                role="img"
                aria-label={`Pacific disaster map for ${displayYear}`}
              >
                {/* Land — outline only */}
                <g>
                  {geo.features.map((f) => {
                    const d = pathGen(f as unknown as GeoJSON.Feature);
                    if (!d) return null;
                    return (
                      <path
                        key={f.properties.iso}
                        d={d}
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </g>

                {/* Leader lines + labels — clamped inside SVG, capped on mobile */}
                <g style={{ pointerEvents: "none" }}>
                  {items
                    .filter((d) => d.affected >= SIGNIFICANT)
                    .slice(0, isSmall ? 3 : 6)
                    .map((d) => {
                      const roomRight = width - (d.x + d.r);
                      const roomLeft = d.x - d.r;
                      const labelRight = roomRight >= roomLeft;
                      const labelW = isSmall ? 64 : 90;
                      let lx = labelRight ? d.x + d.r + 10 : d.x - d.r - 10;
                      if (labelRight) lx = Math.min(lx, width - labelW);
                      else lx = Math.max(lx, labelW);
                      const anchor = labelRight ? "start" : "end";
                      const tx = lx + (labelRight ? 2 : -2);
                      const ly = Math.min(Math.max(d.y, 30), height - 10);
                      return (
                        <g key={`lbl-${d.iso}`}>
                          <line
                            x1={labelRight ? d.x + d.r : d.x - d.r}
                            y1={d.y}
                            x2={lx}
                            y2={ly}
                            stroke="#475569"
                            strokeWidth={1.25}
                          />
                          <text
                            x={tx}
                            y={ly - 11}
                            textAnchor={anchor}
                            fontSize={isSmall ? 12 : 16}
                            fontWeight={700}
                            fill="#1e293b"
                          >
                            {d.name}
                          </text>
                          <text
                            x={tx}
                            y={ly + 4}
                            textAnchor={anchor}
                            fontSize={isSmall ? 10 : 13}
                            fontWeight={600}
                            fill="#475569"
                          >
                            {displayYear}
                          </text>
                          <text
                            x={tx}
                            y={ly + 22}
                            textAnchor={anchor}
                            fontSize={isSmall ? 15 : 21}
                            fontWeight={800}
                            fill="#b45309"
                          >
                            {fmt(d.affected)}
                          </text>
                        </g>
                      );
                    })}
                </g>

                {/* Bubbles */}
                <g>
                  {items.map((d) => (
                    <g key={d.iso} transform={`translate(${d.x},${d.y})`}>
                      {d.r > 0.5 && (
                        <circle
                          r={d.r}
                          fill="#5a8fb0"
                          fillOpacity={0.55}
                          stroke="#3f6e8c"
                          strokeWidth={1.25}
                        />
                      )}
                      <rect
                        x={-2.5}
                        y={-2.5}
                        width={5}
                        height={5}
                        transform="rotate(45)"
                        fill="#fff"
                        stroke="#3f6e8c"
                        strokeWidth={1}
                      />
                    </g>
                  ))}
                </g>
              </svg>
            )}
          </div>
        </div>
      </div>

      <figcaption className="mx-auto mt-3 max-w-[720px] px-4 text-[var(--caption)] text-[clamp(0.7rem,0.68rem+0.1vw,0.78rem)] leading-snug">
        Circle size shows people directly affected by disasters each year. Scroll
        to advance through time. Source:{" "}
        <a
          href="https://unstats.un.org/sdgs/indicators/database/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-sky-700"
        >
          UN Statistics Division
        </a>{" "}
        (SDG indicator 1.5.1 / 11.5.1).
      </figcaption>
    </figure>
  );
}