"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular } from "d3-geo";
import { scaleSqrt } from "d3-scale";
import { asset } from "@/lib/basePath";

/* ------------------------------------------------------------------ types */
interface CountryDatum {
  iso: string;
  country: string;
  affected?: number; // raw-count phase
  per100k?: number; // per-100k phase
}
interface MeasureBlock {
  source: string;
  unit: string;
  data: CountryDatum[];
}
interface YearData {
  year: number;
  anchorEvent: string;
  rawCounts: MeasureBlock;
  per100k: MeasureBlock;
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

/* --------------------------------------------------------------- palette */
const PALETTE = {
  raw: { accent: "var(--accent, #b45309)", bubble: "var(--accent-bubble, #e0793a)" },
  per: { accent: "var(--primary, #3f6e8c)", bubble: "var(--primary-bubble, #5a8fb0)" },
  ink: "var(--ink, #0f172a)",
  inkSoft: "var(--ink-soft, #1e293b)",
  muted: "var(--muted, #475569)",
  mutedSoft: "var(--muted-soft, #64748b)",
  faint: "var(--faint, #94a3b8)",
  line: "var(--line, #cbd5e1)",
  lineSoft: "var(--line-soft, #e2e8f0)",
  surface: "var(--surface, #ffffff)",
  land: "var(--land, #f5f5f5)",
  landStroke: "var(--land-stroke, #cfcfcf)",
} as const;

/* ----------------------------------------------- explicit bubble anchors */
const COORDS: Record<string, { lon: number; lat: number }> = {
  FJI: { lon: 178.0, lat: -17.8 },
  VUT: { lon: 167.0, lat: -16.5 },
  SLB: { lon: 160.0, lat: -9.6 },
  TON: { lon: -175.2, lat: -21.2 },
  WSM: { lon: -172.1, lat: -13.6 },
  MHL: { lon: 171.2, lat: 7.1 },
  FSM: { lon: 158.2, lat: 6.9 },
  PLW: { lon: 134.5, lat: 7.5 },
  KIR: { lon: 173.0, lat: 1.4 },
  TUV: { lon: 179.2, lat: -8.5 },
  NRU: { lon: 166.9, lat: -0.5 },
  PNG: { lon: 144.3, lat: -6.0 },
};

/* ===================================================================== */
type RawStep =
  | { phase: "raw"; kind: "intro"; focus: string[]; title: string; body: string }
  | { phase: "raw"; kind: "highlight"; focus: string[]; title: string; body: string }
  | { phase: "raw"; kind: "setup"; focus: string[]; title: string; body: string };

type PerStep =
  | { phase: "per"; kind: "flip"; focus: string[]; title: string; body: string }
  | { phase: "per"; kind: "highlight"; focus: string[]; title: string; body: string }
  | { phase: "per"; kind: "reveal"; focus: string[]; title: string; body: string };

type Step = RawStep | PerStep;

const STEPS: Step[] = [
  /* ---------------- PHASE 1 — RAW COUNTS (2020) ---------------- */
  {
    phase: "raw",
    kind: "intro",
    focus: [],
    title: "Intro",
    body: "Climate-related disasters directly affected more than half a million people across the Pacific Island Countries in 2020. The data show disaster impacts in more Pacific Island Countries that year than in any other over the past two decades. But those impacts were far from evenly distributed.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["VUT"],
    title: "Vanuatu",
    body: "Vanuatu recorded the largest number of people directly affected. Nearly 247,000 people were affected by climate-related disasters, more than the entire population of many Pacific Island nations.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["FJI"],
    title: "Fiji",
    body: "Fiji followed closely behind. Together, Fiji and Vanuatu accounted for nearly 88% of everyone directly affected across the Pacific Island Countries that year.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["MHL"],
    title: "Marshall Islands",
    body: "The Marshall Islands recorded far fewer people affected than Fiji or Vanuatu. At first glance, it appears to have escaped the worst impacts.",
  },
  {
    phase: "raw",
    kind: "setup",
    focus: ["VUT", "FJI"],
    title: "",
    body: "But absolute numbers reveal where the greatest numbers of people were affected. They do not, however, show how widespread those impacts were within each country. Viewing people affected relative to population offers another perspective.",
  },

  /* ---------------- PHASE 2 — PER 100,000 (2020) ---------------- */
  {
    phase: "per",
    kind: "flip",
    focus: [],
    title: "",
    body: "The map now adjusts for population size, showing the number of people affected for every 100,000 residents. Countries of very different sizes can now be compared on equal terms.",
  },
  {
    phase: "per",
    kind: "highlight",
    focus: ["MHL", "VUT"],
    title: "",
    body: "Once population is taken into account, the picture changes. The Marshall Islands joins Vanuatu among the countries most heavily affected relative to their population.",
  },
  {
    phase: "per",
    kind: "highlight",
    focus: ["TUV"],
    title: "",
    body: "Tuvalu also rises to the top. These countries no longer stand out because they have larger populations but rather a much greater share of their people were affected.",
  },
  {
    phase: "per",
    kind: "reveal",
    focus: [],
    title: "",
    body: "Whether measured in absolute numbers or relative to population, the charts show that climate-related disasters affected thousands of people across the Pacific Islands. Going deeper, the impacts are also felt in the livelihoods that sustain these people.",
  },
];

const FLIP_STEP_INDEX = STEPS.findIndex((s) => s.kind === "flip");

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ---------------------------------------------------------------- helpers */
function fmtInt(n: number): string {
  return n.toLocaleString();
}

/* Build an SVG path by projecting each vertex directly and connecting them —
   deliberately BYPASSING d3-geo's spherical antimeridian clipping. */
type LonLat = [number, number];
type Projector = (p: LonLat) => [number, number] | null;
function planarLandPath(
  geometry: { type: string; coordinates: unknown },
  project: Projector
): string {
  const polys =
    geometry.type === "Polygon"
      ? [geometry.coordinates as LonLat[][]]
      : (geometry.coordinates as LonLat[][][]);
  let d = "";
  for (const poly of polys) {
    for (const ring of poly) {
      let started = false;
      for (const pt of ring) {
        const p = project(pt);
        if (!p || Number.isNaN(p[0]) || Number.isNaN(p[1])) continue;
        d += (started ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1);
        started = true;
      }
      if (started) d += "Z";
    }
  }
  return d;
}

/* ================================================================ component */
interface PacificScrollyMapProps {
  title?: string;
  subtitle?: string;
}

export default function PacificScrollyMap({
  title = "The Cost of Disasters",
  subtitle = "Hundreds of thousands of people across the Pacific Islands were directly affected by climate-related disasters in 2020",
}: PacificScrollyMapProps = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [yearData, setYearData] = useState<YearData | null>(null);

  const [segIndex, setSegIndex] = useState(0);
  const [segProgress, setSegProgress] = useState(0);

  const [tooltip, setTooltip] = useState<{ iso: string; x: number; y: number } | null>(null);
  const [viewportH, setViewportH] = useState(0);

  /* ---- data load */
  useEffect(() => {
    Promise.all([
      fetch(asset("/data/pacific_countries.json")).then((r) => r.json()),
      fetch(asset("/data/affected_2020.json")).then((r) => r.json()),
    ])
      .then(([g, y]) => {
        setGeo(g);
        setYearData(y);
      })
      .catch((err) => console.error("Map load failed:", err));
  }, []);

  /* ---- responsive stage */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setWidth(r.width);
      setHeight(r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [geo, yearData]);

  const isSmall = width > 0 && width < 480;
  const isMedium = width >= 480 && width < 768;

  /* ---- segment model */
  const totalSegments = STEPS.length;

  const tickingRef = useRef(false);
  const onScroll = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      tickingRef.current = false;
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      setViewportH(vh);
      const total = el.offsetHeight - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;

      const scaled = p * totalSegments;
      let idx = Math.floor(scaled);
      if (idx >= totalSegments) idx = totalSegments - 1;
      const prog = scaled - idx;

      setSegIndex(idx);
      setSegProgress(prog);
    });
  }, [totalSegments]);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  /* ---- which phase / step */
  const step = STEPS[segIndex];
  const inPer = step?.phase === "per";
  const stepKind = step?.kind;

  const focusISOs: string[] = useMemo(() => step?.focus ?? [], [step]);
  const anyFocus = focusISOs.length > 0;

  const gridT = useMemo(
    () => (segIndex >= FLIP_STEP_INDEX ? 1 : 0),
    [segIndex]
  );

  /* ---- lookups */
  const rawByIso = useMemo(() => {
    const m = new Map<string, CountryDatum>();
    yearData?.rawCounts.data.forEach((c) => m.set(c.iso, c));
    return m;
  }, [yearData]);

  const perByIso = useMemo(() => {
    const m = new Map<string, CountryDatum>();
    yearData?.per100k.data.forEach((c) => m.set(c.iso, c));
    return m;
  }, [yearData]);

  const isoList = useMemo(() => Object.keys(COORDS), []);

  const nameFor = useCallback(
    (iso: string): string =>
      perByIso.get(iso)?.country ?? rawByIso.get(iso)?.country ?? iso,
    [perByIso, rawByIso]
  );

  /* ---- projection */
  const projection = useMemo(() => {
    if (width === 0 || height === 0) return null;
    const shiftLon = (lon: number) => (lon < 0 ? lon + 360 : lon);
    const fitPoints = {
      type: "MultiPoint" as const,
      coordinates: Object.values(COORDS).map((c) => [shiftLon(c.lon), c.lat]),
    };
    const padFrac = isSmall ? 0.1 : isMedium ? 0.08 : 0.06;
    const pad = Math.min(width, height) * padFrac;

    const proj = geoEquirectangular().rotate([-172, 0]);
    proj.fitExtent(
      [
        [pad, pad],
        [width - pad, height - pad],
      ],
      fitPoints
    );
    return proj;
  }, [width, height, isSmall, isMedium]);

  /* ---- radius scales */
  const rScaleRaw = useMemo(() => {
    if (!yearData) return null;
    const mx = Math.max(...yearData.rawCounts.data.map((c) => c.affected ?? 0));
    const maxR = isSmall ? 18 : isMedium ? 26 : 34;
    return scaleSqrt().domain([0, mx]).range([0, maxR]);
  }, [yearData, isSmall, isMedium]);

  const rScalePer = useMemo(() => {
    if (!yearData) return null;
    const mx = Math.max(...yearData.per100k.data.map((c) => c.per100k ?? 0));
    const maxR = isSmall ? 18 : isMedium ? 26 : 34;
    return scaleSqrt().domain([0, mx]).range([0, maxR]);
  }, [yearData, isSmall, isMedium]);

  const haveData =
    width > 0 && height > 0 && geo && yearData && projection;

  /* ---- bubble positions on the map */
  const positioned = useMemo(() => {
    if (!projection) return [];
    return isoList
      .map((iso) => {
        const c = COORDS[iso];
        if (!c) return null;
        const pt = projection([c.lon, c.lat]) as [number, number] | null;
        if (!pt || Number.isNaN(pt[0])) return null;
        return { iso, x: pt[0], y: pt[1] };
      })
      .filter((d): d is { iso: string; x: number; y: number } => d !== null);
  }, [projection, isoList]);

  const ringR = isSmall ? 16 : isMedium ? 22 : 26;

  /* ---- Dorling-style layout */
  const gridPositioned = useMemo(() => {
    if (!width || !height || positioned.length === 0) return [];
    const fs = isSmall ? 8.5 : 11;
    const charW = fs * 0.62;
    const labelPadX = 6;
    const GAP = 5;
    const topPad = isSmall ? 10 : 16;

    const nodes = positioned.map((p) => {
      const name = nameFor(p.iso);
      const hx = Math.max(ringR + 6, (name.length * charW) / 2 + labelPadX) + GAP;
      const hy = ringR + (isSmall ? 22 : 26) + GAP;
      return { iso: p.iso, x: p.x, y: p.y, tx: p.x, ty: p.y, hx, hy };
    });

    for (let iter = 0; iter < 240; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const ox = a.hx + b.hx - Math.abs(dx);
          const oy = a.hy + b.hy - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            if (ox < oy) {
              const push = (ox / 2) * (dx < 0 ? -1 : 1);
              a.x -= push;
              b.x += push;
            } else {
              const push = (oy / 2) * (dy < 0 ? -1 : 1);
              a.y -= push;
              b.y += push;
            }
          }
        }
      }
      for (const n of nodes) {
        n.x += (n.tx - n.x) * 0.04;
        n.y += (n.ty - n.y) * 0.04;
        n.x = Math.max(n.hx, Math.min(width - n.hx, n.x));
        n.y = Math.max(n.hy + topPad, Math.min(height - n.hy, n.y));
      }
    }

    return nodes.map((n) => ({ iso: n.iso, x: n.x, y: n.y }));
  }, [width, height, positioned, ringR, nameFor, isSmall]);

  const geoByIso = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    positioned.forEach((p) => m.set(p.iso, { x: p.x, y: p.y }));
    return m;
  }, [positioned]);

  const gridByIso = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    gridPositioned.forEach((p) => m.set(p.iso, { x: p.x, y: p.y }));
    return m;
  }, [gridPositioned]);

  const blendedPositioned = useMemo(() => {
    if (gridT <= 0) return positioned;
    return isoList
      .map((iso) => {
        const g = geoByIso.get(iso);
        const gr = gridByIso.get(iso);
        if (!g || !gr) return null;
        return { iso, x: lerp(g.x, gr.x, gridT), y: lerp(g.y, gr.y, gridT) };
      })
      .filter((d): d is { iso: string; x: number; y: number } => d !== null);
  }, [gridT, positioned, isoList, geoByIso, gridByIso]);

  /* ---- radius helpers */
  const radiusFor = useCallback(
    (iso: string): number => {
      if (inPer) {
        if (!rScalePer) return 0;
        const v = perByIso.get(iso)?.per100k ?? 0;
        return rScalePer(v);
      }
      if (!rScaleRaw) return 0;
      const v = rawByIso.get(iso)?.affected ?? 0;
      return rScaleRaw(v);
    },
    [inPer, rScalePer, rScaleRaw, perByIso, rawByIso]
  );

  const valueFor = useCallback(
    (iso: string): { value: number; label: string } => {
      if (inPer) {
        const v = perByIso.get(iso)?.per100k ?? 0;
        return { value: v, label: `${fmtInt(v)} per 100,000` };
      }
      const v = rawByIso.get(iso)?.affected ?? 0;
      return { value: v, label: `${fmtInt(v)} affected` };
    },
    [inPer, perByIso, rawByIso]
  );

  /* ---- FLY-TO ZOOM */
  const zoomActive =
    !inPer && gridT === 0 && stepKind === "highlight" && focusISOs.length === 1;

  const fly = useMemo(() => {
    if (!zoomActive || !width || !height) return { k: 1, tx: 0, ty: 0 };
    const g = geoByIso.get(focusISOs[0]);
    if (!g) return { k: 1, tx: 0, ty: 0 };
    const k = isSmall ? 1.7 : 1.9;
    const cx = width / 2;
    const cy = height / 2;
    return { k, tx: cx - k * g.x, ty: cy - k * g.y };
  }, [zoomActive, width, height, geoByIso, focusISOs, isSmall]);

  const camPositioned = useMemo(() => {
    if (!zoomActive) return blendedPositioned;
    return blendedPositioned.map((d) => ({
      iso: d.iso,
      x: fly.k * d.x + fly.tx,
      y: fly.k * d.y + fly.ty,
    }));
  }, [zoomActive, blendedPositioned, fly]);

  /* ---- narrative box content */
  const boxTitle = step?.title ?? "";
  const boxBody = step?.body ?? "";
  const isIntro = step?.kind === "intro";

  const stepKicker: string | null = useMemo(() => {
    if (!step) return null;
    if (step.kind === "highlight" || step.kind === "setup") {
      const iso = step.focus[0];
      if (iso) {
        const datum = inPer ? perByIso.get(iso) : rawByIso.get(iso);
        if (datum) {
          const v = inPer ? datum.per100k ?? 0 : datum.affected ?? 0;
          const unit = inPer ? "per 100,000" : "affected";
          const titleHasCountry = step.title.includes(datum.country);
          if (titleHasCountry) return `2020 · ${fmtInt(v)} ${unit}`;
          return `${datum.country} · 2020 · ${fmtInt(v)} ${unit}`;
        }
      }
    }
    return null;
  }, [step, inPer, perByIso, rawByIso]);

  const travelTop = useMemo(() => {
    if (!height) return 0;
    const vh = viewportH || height;
    const titleH = Math.max(vh - height, 0);
    const BOX_CLEAR = isSmall ? 220 : 260;
    const startY = height * (isSmall ? 0.74 : 0.8);
    const endY = -(titleH + BOX_CLEAR);
    return startY + (endY - startY) * segProgress;
  }, [height, viewportH, segProgress, isSmall]);

  const boxOpacity = segProgress < 0.06 ? segProgress / 0.06 : 1;

  const accent = inPer ? PALETTE.per.accent : PALETTE.raw.accent;
  const bubbleFill = inPer ? PALETTE.per.bubble : PALETTE.raw.bubble;

  const handleMouseEnter = (iso: string, event: React.MouseEvent<SVGGElement>) => {
    setTooltip({ iso, x: event.clientX, y: event.clientY - 10 });
  };
  const handleMouseLeave = () => setTooltip(null);
  const getTooltipContent = (iso: string) => {
    const datum = rawByIso.get(iso);
    if (!datum) return null;
    return { country: datum.country, affected: datum.affected ?? 0 };
  };

  const flyTransition = "transform 0.9s cubic-bezier(0.4,0,0.2,1)";

  return (
    <figure className="w-full" aria-label="Pacific disaster scrollytelling map">
      <div ref={wrapRef} style={{ height: `${totalSegments * 115}vh` }}>
        <div
          className="sticky top-0 flex w-full flex-col overflow-hidden"
          style={{ height: "100vh", background: PALETTE.surface }}
        >
          {/* Pinned title + subtitle */}
          <div
            className="w-full"
            style={{
              flexShrink: 0,
              maxWidth: 640,
              marginLeft: "auto",
              marginRight: "auto",
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: `calc(env(safe-area-inset-top, 0px) + ${isSmall ? 36 : 28}px)`,
              paddingBottom: isSmall ? 8 : 14,
            }}
          >
            <h2 className="section-title">{title}</h2>
            <p className="section-subtitle">{subtitle}</p>
          </div>

          {/* Map stage */}
          <div
            ref={stageRef}
            className="relative w-full flex-1"
            style={{ minHeight: 0, background: PALETTE.surface }}
          >
            {haveData && (
              <svg
                className="absolute inset-0"
                width={width}
                height={height}
                aria-hidden="true"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <clipPath id="stageClip">
                    <rect x={0} y={0} width={width} height={height} />
                  </clipPath>
                  <filter id="landShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow
                      dx="0"
                      dy="1.5"
                      stdDeviation="2.5"
                      floodColor="#8f9aa8"
                      floodOpacity="0.28"
                    />
                  </filter>
                </defs>

                <g clipPath={gridT > 0 ? undefined : "url(#stageClip)"}>
                  {/* Land */}
                  <g
                    filter="url(#landShadow)"
                    style={{
                      transform: `translate(${fly.tx}px, ${fly.ty}px) scale(${fly.k})`,
                      transformOrigin: "0px 0px",
                      transformBox: "view-box",
                      transition: flyTransition,
                      opacity: 1 - gridT,
                      pointerEvents: "none",
                    }}
                  >
                    {geo!.features.map((f) => {
                      const d = planarLandPath(
                        f.geometry as { type: string; coordinates: unknown },
                        projection! as Projector
                      );
                      if (!d) return null;
                      return (
                        <path
                          key={f.properties.iso}
                          d={d}
                          fill={PALETTE.land}
                          stroke={PALETTE.landStroke}
                          strokeWidth={isSmall ? 1.5 : 1.25}
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}
                  </g>

                  {/* Bubbles */}
                  {camPositioned.map(({ iso, x, y }) => {
                    const r = radiusFor(iso);
                    const isFoc = focusISOs.includes(iso);
                    const baseR = isSmall ? 3.5 : 5;
                    const value = inPer
                      ? perByIso.get(iso)?.per100k ?? 0
                      : rawByIso.get(iso)?.affected ?? 0;
                    const hasValue = value > 0;
                    const displayR = Math.max(r, baseR);
                    const tooltipData = getTooltipContent(iso);
                    const hoverable = !inPer && !!tooltipData;
                    const mapOpacity = inPer ? 1 - gridT : 1;

                    const per100kRaw = perByIso.get(iso)?.per100k;
                    const gridNoData = per100kRaw == null;
                    const gridPositive = per100kRaw != null && per100kRaw > 0;
                    const gridR = Math.min(radiusFor(iso), ringR - 3);
                    const gridDisplayR = Math.max(gridR, baseR * 0.7);
                    const gridName = nameFor(iso);
                    const gridDim = anyFocus && !isFoc ? 0.4 : 1;

                    return (
                      <g
                        key={iso}
                        transform={`translate(${x},${y})`}
                        onMouseEnter={(e) => hoverable && handleMouseEnter(iso, e)}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          cursor: hoverable ? "pointer" : "default",
                          transition: flyTransition,
                        }}
                      >
                        {/* ================= MAP-STYLE LAYER ================= */}
                        {(!inPer || gridT < 1) && (
                          <g style={{ opacity: mapOpacity }}>
                            <circle
                              r={displayR}
                              fill={hasValue ? bubbleFill : "none"}
                              fillOpacity={
                                hasValue ? (isFoc ? 0.62 : anyFocus ? 0.22 : 0.32) : 0
                              }
                              stroke={
                                isFoc ? accent : hasValue ? "none" : PALETTE.line
                              }
                              strokeWidth={hasValue ? 2 : 1.2}
                              strokeDasharray={hasValue ? undefined : "2 3"}
                              style={{
                                transition:
                                  "r 0.6s cubic-bezier(0.34,1.56,0.64,1), fill-opacity 0.4s ease",
                              }}
                            />

                            {/* Country labels — ALWAYS visible in raw phase */}
                            {!inPer && (() => {
                              const { label } = valueFor(iso);
                              const datum = rawByIso.get(iso);
                              const countryName = datum?.country ?? iso;
                              const labelDimmed = anyFocus && !isFoc;
                              const nameColor = labelDimmed ? PALETTE.faint : isFoc ? PALETTE.ink : PALETTE.mutedSoft;
                              const valueColor = labelDimmed ? PALETTE.faint : isFoc ? accent : PALETTE.faint;
                              const nameOpacity = labelDimmed ? 0.55 : isFoc ? 1 : 0.9;
                              const valueOpacity = labelDimmed ? 0.45 : 1;
                              const nameFW = isFoc ? 700 : 600;

                              if (isSmall) {
                                return (
                                  <g style={{ transition: "opacity 0.4s ease" }}>
                                    <text
                                      y={displayR + 12}
                                      textAnchor="middle"
                                      fontSize={10}
                                      fontWeight={nameFW}
                                      fill={nameColor}
                                      fillOpacity={nameOpacity}
                                      style={{ fontFamily: "var(--font-sans)" }}
                                    >
                                      {`${iso} ${fmtInt(value)}`}
                                    </text>
                                  </g>
                                );
                              }

                              return (
                                <g transform={`translate(0, ${displayR + 13})`} style={{ transition: "opacity 0.4s ease" }}>
                                  <text
                                    textAnchor="middle"
                                    fontSize={11}
                                    fontWeight={nameFW}
                                    fill={nameColor}
                                    fillOpacity={nameOpacity}
                                    style={{ fontFamily: "var(--font-sans)" }}
                                  >
                                    {countryName}
                                  </text>
                                  <text
                                    y={13}
                                    textAnchor="middle"
                                    fontSize={9.5}
                                    fontWeight={isFoc ? 600 : 500}
                                    fill={valueColor}
                                    fillOpacity={valueOpacity}
                                    style={{ fontFamily: "var(--font-sans)" }}
                                  >
                                    {label}
                                  </text>
                                </g>
                              );
                            })()}
                          </g>
                        )}

                        {/* ================= GRID-STYLE LAYER (per-100k) ================= */}
                        {inPer && gridT > 0 && (
                          <g style={{ opacity: gridT * gridDim, transition: "opacity 0.4s ease" }}>
                            <text
                              y={-ringR - 9}
                              textAnchor="middle"
                              fontSize={isSmall ? 8.5 : 11}
                              fontWeight={700}
                              fill={isFoc ? PALETTE.ink : PALETTE.mutedSoft}
                              fillOpacity={isFoc ? 1 : 0.55}
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              {gridName}
                            </text>

                            <circle
                              r={ringR}
                              fill="none"
                              stroke={isFoc ? accent : PALETTE.line}
                              strokeWidth={isFoc ? 1.8 : 1.3}
                              style={{ transition: "stroke 0.4s ease" }}
                            />

                            {gridPositive && (
                              <circle
                                r={gridDisplayR}
                                fill={bubbleFill}
                                fillOpacity={isFoc ? 0.8 : 0.5}
                                stroke={isFoc ? accent : "none"}
                                strokeWidth={1.5}
                                style={{
                                  transition:
                                    "r 0.6s cubic-bezier(0.34,1.56,0.64,1), fill-opacity 0.4s ease",
                                }}
                              />
                            )}
                            {gridNoData && (
                              <text
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={ringR * 0.7}
                                fontWeight={700}
                                fill={PALETTE.faint}
                                style={{ fontFamily: "var(--font-sans)" }}
                              >
                                ?
                              </text>
                            )}

                            <text
                              y={ringR + (isSmall ? 14 : 18)}
                              textAnchor="middle"
                              fontSize={isSmall ? 8.5 : 10.5}
                              fontWeight={gridNoData ? 500 : 600}
                              fill={
                                gridNoData
                                  ? PALETTE.faint
                                  : isFoc
                                  ? accent
                                  : PALETTE.mutedSoft
                              }
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              {gridNoData
                                ? "no data"
                                : `${fmtInt(per100kRaw as number)} /100k`}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {/* Tooltip (raw phase only) */}
            {tooltip && !inPer && (() => {
              const data = getTooltipContent(tooltip.iso);
              if (!data) return null;
              return (
                <div
                  className="pointer-events-none absolute z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
                  style={{
                    left: tooltip.x + 12,
                    top: tooltip.y - 20,
                    transform: "translateY(-50%)",
                    maxWidth: 240,
                    fontSize: "0.8rem",
                  }}
                >
                  <p className="font-bold text-slate-900">{data.country}</p>
                  <p className="text-slate-600">{fmtInt(data.affected)} people directly affected</p>
                </div>
              );
            })()}

            {/* Travelling narrative box */}
            {haveData && (
              <div
                className="pointer-events-none absolute inset-x-0 flex justify-center"
                style={{
                  top: 0,
                  transform: `translateY(${travelTop}px)`,
                  willChange: "transform",
                  zIndex: 30,
                  paddingLeft: 16,
                  paddingRight: 16,
                }}
              >
                <div
                  className="w-full rounded-lg px-4 py-3 leading-relaxed"
                  style={{
                    maxWidth: 620,
                    background: "rgba(255,255,255,0.55)",
                    color: PALETTE.inkSoft,
                    fontSize: isSmall ? "0.8rem" : "0.9rem",
                    boxShadow: "0 4px 18px rgba(100,116,139,0.14)",
                    opacity: boxOpacity,
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    pointerEvents: "auto",
                    userSelect: "text",
                    WebkitUserSelect: "text",
                  }}
                >
                  {stepKicker && (
                    <p
                      className="mb-1 font-bold uppercase tracking-widest"
                      style={{
                        color: accent,
                        fontFamily: "var(--font-sans)",
                        fontSize: isSmall ? "0.6rem" : "0.72rem",
                      }}
                    >
                      {stepKicker}
                    </p>
                  )}
                  {!isIntro && boxTitle && (
                    <p
                      className="mb-1 font-semibold"
                      style={{ fontSize: isSmall ? "0.85rem" : "0.95rem" }}
                    >
                      {boxTitle}
                    </p>
                  )}
                  <p>{boxBody}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caption */}
      <div
        className="w-full"
        style={{
          maxWidth: 640,
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: isSmall ? 10 : 18,
          paddingBottom: isSmall ? 4 : 10,
        }}
      >
        <p className="chart-caption text-left" style={{ paddingBottom: 0 }}>
          <span className="font-medium">Note: </span> 2020 is shown because it recorded disaster impacts in more Pacific Island Countries than any other year in the dataset. Rates can exceed 100,000 per 100,000 population where people were affected by more than one disaster in the same year. Number of directly affected persons attributed to disasters and people directly affected per 100,000 population are sourced from{" "}
          <a
            href="https://stats.pacificdata.org/vis?lc=en&df[ds]=ds%3ASPC2&df[id]=DF_SDG_11&df[ag]=SPC&df[vs]=3.0&dq=A.VC_DSR_AFFCT.........&pd=,&to[TIME_PERIOD]=false&lb=bt"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-sky-700"
          >
            Pacific Community (SPC), Pacific Data Hub
          </a>
          {" and "}
          <a
            href="https://unstats.un.org/sdgs/dataportal/database"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-sky-700"
          >
            United Nations Statistics Division
          </a>
          , respectively.
        </p>
      </div>

      {/* Accessible data payload */}
      {yearData && (
        <div className="sr-only">
          <table>
            <caption>
              People directly affected by climate-related disasters in the
              Pacific Island Countries, 2020: total counts.
            </caption>
            <thead>
              <tr>
                <th scope="col">Country</th>
                <th scope="col">People directly affected (2020)</th>
              </tr>
            </thead>
            <tbody>
              {yearData.rawCounts.data.map((c) => (
                <tr key={`a11y-raw-${c.iso}`}>
                  <td>{c.country}</td>
                  <td>{fmtInt(c.affected ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <caption>
              People directly affected per 100,000 population, 2020, adjusted
              for population size.
            </caption>
            <thead>
              <tr>
                <th scope="col">Country</th>
                <th scope="col">Affected per 100,000 (2020)</th>
              </tr>
            </thead>
            <tbody>
              {yearData.per100k.data.map((c) => (
                <tr key={`a11y-per-${c.iso}`}>
                  <td>{c.country}</td>
                  <td>{c.per100k == null ? "no data" : fmtInt(c.per100k)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}