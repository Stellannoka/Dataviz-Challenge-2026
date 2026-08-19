"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular } from "d3-geo";
import { scaleSqrt } from "d3-scale";
import { CONTAINER_WIDTH } from "@/components/Container";
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

/* Unified single-file schema (public/data/disaster_2020.json). Everything
   the map needs per country now lives in one row; the raw/per-100k/
   livelihoods lookups below are all derived from it. */
interface UnifiedRow {
  iso: string;
  country: string;
  affected: number | null;
  per100k: number | null;
  injured: number | null;
  dwellingsDamaged: number | null;
  dwellingsDestroyed: number | null;
  livelihoods: number | null;
  livelihoodShare: number | null;
}
interface UnifiedData {
  year: number;
  anchorEvent: string;
  sources: { affected: string; per100k: string; components: string };
  countries: UnifiedRow[];
}
/* The four Sendai components of "people affected" (B1 = B2+B3+B4+B5),
   used for the split-on-zoom in the raw phase. */
interface CountryComponents {
  iso: string;
  country: string;
  affected: number | null;
  injured: number | null;
  dwellingsDamaged: number | null;
  dwellingsDestroyed: number | null;
  livelihoods: number | null;
  livelihoodShare: number | null;
}

/* Displacement per-100k (public/data/displacement_2020.json) — a separate
   dataset from disaster_2020.json, reusing the same per-100k Dorling grid
   once the map has already flipped into that layout. Countries absent from
   this file (MHL, KIR, FSM, PLW, NRU) simply have no lookup entry, which
   the existing "no data" handling already covers. */
interface DisplacementRow {
  iso: string;
  country: string;
  absolute: number;
  per100k: number;
  dominantHazard: string;
}
interface DisplacementData {
  year: number;
  source: string;
  data: DisplacementRow[];
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

/* --------------------------------------------------------------- palette
   Both phases now draw from the WARM family. The raw -> per-100k change is
   the SAME disaster data with only the denominator changed, so the encoding
   must not switch hue at the flip. The phase change is already carried by
   the Dorling grid morph (map dissolves into ringed cells), so colour is
   free to stay constant and say "same subject". Blue is otherwise reserved
   for finance (Section 3) — the one exception is the nested livelihoods-lost
   bubble below, which deliberately breaks from the warm family so it reads
   as a distinct measure nested inside the (warm) affected bubble. */
const PALETTE = {
  raw: { accent: "var(--accent, #d0645a)", bubble: "var(--accent-bubble, #d0645a)" },
  per: { accent: "var(--accent-dark, #A65048)", bubble: "var(--accent-bubble, #d0645a)" },
  /* Livelihoods hue — kept for the body-copy highlight colour. */
  livelihoods: "var(--primary-vivid, #2E6FA3)",
  ink: "var(--ink, #0f172a)",
  inkSoft: "var(--ink-soft, #1e293b)",
  mutedSoft: "var(--muted-soft, #64748b)",
  faint: "var(--faint, #94a3b8)",
  line: "var(--line, #cbd5e1)",
  surface: "var(--surface, #ffffff)",
  surfaceTranslucent: "var(--surface-translucent, rgba(255, 255, 255, 0.82))",
  cardShadow: "var(--card-shadow, rgba(100, 116, 139, 0.14))",
  land: "var(--land, #f6f6f6)",
  landStroke: "var(--land-stroke, #cfcfcf)",
  /* The zoomed-into country's outline, darkened so it reads as the subject
     of the fly-to zoom against the rest of the (lighter) land. */
  landFocus: "var(--land-focus, #595959)",
  landFocusStroke: "var(--land-focus-stroke, #3d3d3d)",
  landShadow: "var(--land-shadow, #8f9aa8)",
  /* Border on every bubble (raw phase), regardless of highlight state. */
  bubbleBorder: "var(--bubble-border, #666666)",
} as const;

/* Micronesia's bubble, raw ("people directly affected") phase only —
   an ash grey instead of the usual warm bubble colour. */
const ASH = "#8c8b86";

/* ----------------------------------------------- explicit bubble anchors
   The 12 Pacific Island Countries only — matches COORDS_PER100K exactly, so
   the raw phase's fitExtent doesn't have to stretch out to fit the more
   far-flung non-PIC territories (American Samoa, Cook Islands, Guam, etc.)
   that used to be plotted here too. Dropping them lets the projection zoom
   in tighter on the 12 that actually carry data in both phases. */
const COORDS_RAW: Record<string, { lon: number; lat: number }> = {
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

const COORDS_PER100K: Record<string, { lon: number; lat: number }> = {
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
  | { phase: "raw"; kind: "intro"; focus: string[]; title: string; body: string; metric?: "displacement" }
  | { phase: "raw"; kind: "highlight"; focus: string[]; title: string; body: string; metric?: "displacement" }
  | { phase: "raw"; kind: "setup"; focus: string[]; title: string; body: string; metric?: "displacement" };

/* `metric: "displacement"` marks the steps where the per-100k grid switches
   from "people directly affected" to displacement data — same phase, same
   Dorling layout, different data source and header text. */
type PerStep =
  | { phase: "per"; kind: "flip"; focus: string[]; title: string; body: string; metric?: "displacement" }
  | { phase: "per"; kind: "highlight"; focus: string[]; title: string; body: string; metric?: "displacement" }
  | { phase: "per"; kind: "reveal"; focus: string[]; title: string; body: string; metric?: "displacement" };

type Step = RawStep | PerStep;

const STEPS: Step[] = [
  /* ---------------- PHASE 1 — RAW COUNTS (2020) ---------------- */
  {
    phase: "raw",
    kind: "intro",
    focus: [],
    title: "Intro",
    body: "Floods, tropical cyclones and storm surges are among the climate-related hazards threatening Pacific Island nations. In 2020, 548,686 people across the region were directly affected by these extreme weather events. \n\n This includes people who were injured or fell ill, whose homes were damaged or destroyed, or whose livelihoods were disrupted or destroyed.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["VUT"],
    title: "Vanuatu",
    body: "Vanuatu recorded 246,802 people directly affected, the highest total among the countries shown. About 160,000 of these were people whose livelihoods were disrupted or destroyed.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["FJI"],
    title: "Fiji",
    body: "Fiji recorded 235,921 people directly affected. Together, Fiji and Vanuatu accounted for nearly 88% of the regional total.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["MHL"],
    title: "Marshall Islands",
    body: "The Marshall Islands recorded far fewer people directly affected than Fiji or Vanuatu. Judged by total numbers alone, it appears to have experienced a much smaller impact. Yet of those it did reach — 56,718 people — the impact was substantial for a country of its size.",
  },
  {
    phase: "raw",
    kind: "setup",
    focus: ["VUT", "FJI"],
    title: "",
    body: "The scale of the impact changes when the number of people affected is measured against the population of each country.",
  },

  /* ---------------- PHASE 2 — PER 100,000 (2020) ---------------- */
  {
    phase: "per",
    kind: "flip",
    focus: [],
    title: "",
    body: "The map now adjusts for population size, showing the number of people affected for every 100,000 people. Countries of very different sizes can now be compared on equal terms.",
  },
  {
    phase: "per",
    kind: "highlight",
    focus: ["MHL", "VUT", "FJI"],
    title: "",
    body: "The Marshall Islands now moves alongside Vanuatu and Fiji among the countries with the highest rates of people directly affected. Its smaller absolute total had masked the scale of the impact relative to its population.",
  },
  {
    phase: "per",
    kind: "highlight",
    focus: ["TUV"],
    title: "",
    body: "Tuvalu also moves to the top of the comparison. Although fewer people were affected in total, they represented a much larger share of the population.",
  },
  {
    phase: "per",
    kind: "reveal",
    focus: [],
    title: "",
    body: "Beyond those directly affected, people across the region are also among those most at risk of displacement from disasters.",
  },

  /* ---------------- PHASE 3 — DISPLACEMENT PER 100,000 (2020) ---------------- */
  {
    phase: "per",
    kind: "flip",
    metric: "displacement",
    focus: [],
    title: "",
    body: "The same population-adjusted view now shows displacements triggered by these disasters in 2020.",
  },
  {
    phase: "per",
    kind: "highlight",
    metric: "displacement",
    focus: ["VUT"],
    title: "",
    body: "Weather-related disasters triggered 123,346 displacements across the region, with Vanuatu recording more than 26,000 per 100,000 people, by far the highest rate in the region, driven largely by tropical cyclones.",
  },
];

const FLIP_STEP_INDEX = STEPS.findIndex((s) => s.kind === "flip");

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ---------------------------------------------------------------- helpers */
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
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

/* ------------------------------------------------------- bubble tooltips
   Each bubble (affected / livelihoods) gets its own dynamically-placed,
   connector-style tooltip — same mechanism as FinanceGap's bar tooltips:
   try each side in turn, take the first that actually has room, clamp to
   the viewport, and point a small rotated-square caret back at the dot. */
const TOOLTIP_GAP = 10;
const TOOLTIP_EDGE_MARGIN = 8;
const TOOLTIP_FALLBACK_VIEWPORT_WIDTH = 1200;
const TOOLTIP_FALLBACK_VIEWPORT_HEIGHT = 800;
const TOOLTIP_TOUCH_DISMISS_MS = 4500;
const CARET_SIZE = 10;
const CARET_HALF = CARET_SIZE / 2;
const CARET_MARGIN = 12;

type BubbleKind = "affected" | "livelihoods";
type TipPlacement = "right" | "left" | "top" | "bottom";

interface BubbleHoverState {
  iso: string;
  kind: BubbleKind;
  dotX: number; // screen-space centre
  dotY: number;
  dotR: number; // screen-space radius
  content: string;
  /* The exact numeric substring of `content` to bold and colour. */
  highlight: string;
  color: string;
  isTouch: boolean;
}

function computeBubbleTooltipPosition(
  dot: { dotX: number; dotY: number; dotR: number },
  measuredWidth: number,
  measuredHeight: number
): { left: number; top: number; caretLeft: number; caretTop: number; placement: TipPlacement } {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : TOOLTIP_FALLBACK_VIEWPORT_WIDTH;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : TOOLTIP_FALLBACK_VIEWPORT_HEIGHT;

  const spaceRight = viewportWidth - (dot.dotX + dot.dotR);
  const spaceLeft = dot.dotX - dot.dotR;
  const spaceAbove = dot.dotY - dot.dotR;
  const spaceBelow = viewportHeight - (dot.dotY + dot.dotR);
  const fitsHorizontally = (space: number) => space >= measuredWidth + TOOLTIP_GAP;
  const fitsVertically = (space: number) => space >= measuredHeight + TOOLTIP_GAP;

  const placement: TipPlacement = fitsHorizontally(spaceRight)
    ? "right"
    : fitsHorizontally(spaceLeft)
    ? "left"
    : fitsVertically(spaceBelow)
    ? "bottom"
    : fitsVertically(spaceAbove)
    ? "top"
    : "right";

  const gap = dot.dotR + TOOLTIP_GAP;
  let left: number;
  let top: number;

  if (placement === "right") {
    left = dot.dotX + gap;
    top = dot.dotY - measuredHeight / 2;
  } else if (placement === "left") {
    left = dot.dotX - gap - measuredWidth;
    top = dot.dotY - measuredHeight / 2;
  } else if (placement === "top") {
    left = dot.dotX - measuredWidth / 2;
    top = dot.dotY - gap - measuredHeight;
  } else {
    left = dot.dotX - measuredWidth / 2;
    top = dot.dotY + gap;
  }

  left = Math.min(Math.max(left, TOOLTIP_EDGE_MARGIN), viewportWidth - measuredWidth - TOOLTIP_EDGE_MARGIN);
  top = Math.min(Math.max(top, TOOLTIP_EDGE_MARGIN), viewportHeight - measuredHeight - TOOLTIP_EDGE_MARGIN);

  let caretLeft: number;
  let caretTop: number;
  if (placement === "right") {
    caretLeft = -CARET_HALF;
    caretTop = Math.min(Math.max(dot.dotY - top, CARET_MARGIN), measuredHeight - CARET_MARGIN) - CARET_HALF;
  } else if (placement === "left") {
    caretLeft = measuredWidth - CARET_HALF;
    caretTop = Math.min(Math.max(dot.dotY - top, CARET_MARGIN), measuredHeight - CARET_MARGIN) - CARET_HALF;
  } else if (placement === "top") {
    caretTop = measuredHeight - CARET_HALF;
    caretLeft = Math.min(Math.max(dot.dotX - left, CARET_MARGIN), measuredWidth - CARET_MARGIN) - CARET_HALF;
  } else {
    caretTop = -CARET_HALF;
    caretLeft = Math.min(Math.max(dot.dotX - left, CARET_MARGIN), measuredWidth - CARET_MARGIN) - CARET_HALF;
  }

  return { left, top, caretLeft, caretTop, placement };
}

/* ================================================================ component */
interface PacificScrollyMapProps {
  /* The pinned title. The section framing now lives in page.tsx; this map
     pins only its own title, in bold, for the duration of the scroll. */
  title?: string;
}

export default function PacificScrollyMap({
  title = "More than half a million people across Pacific Island Countries were directly affected by disasters in 2020",
}: PacificScrollyMapProps = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [yearData, setYearData] = useState<YearData | null>(null);
  const [components, setComponents] = useState<CountryComponents[] | null>(null);
  const [displacementData, setDisplacementData] = useState<DisplacementData | null>(null);

  const [segIndex, setSegIndex] = useState(0);
  const [segProgress, setSegProgress] = useState(0);

  const [bubbleHover, setBubbleHover] = useState<BubbleHoverState | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [viewportH, setViewportH] = useState(0);
  const [hasStartedScrolling, setHasStartedScrolling] = useState(false);

  /* ---- data load */
  useEffect(() => {
    Promise.all([
      fetch(asset("/data/pacific_countries.json")).then((r) => r.json()),
      fetch(asset("/data/disaster_2020.json")).then((r) => r.json()),
      fetch(asset("/data/displacement_2020.json")).then((r) => r.json()),
    ])
      .then(([g, u, d]: [GeoData, UnifiedData, DisplacementData]) => {
        setGeo(g);
        setDisplacementData(d);
        setYearData({
          year: u.year,
          anchorEvent: u.anchorEvent,
          rawCounts: {
            source: u.sources.affected,
            unit: "people directly affected",
            data: u.countries.map((c) => ({
              iso: c.iso,
              country: c.country,
              affected: c.affected ?? undefined,
            })),
          },
          per100k: {
            source: u.sources.per100k,
            unit: "people affected per 100,000 residents",
            data: u.countries.map((c) => ({
              iso: c.iso,
              country: c.country,
              per100k: c.per100k ?? undefined,
            })),
          },
        });
        setComponents(
          u.countries.map((c) => ({
            iso: c.iso,
            country: c.country,
            affected: c.affected,
            injured: c.injured,
            dwellingsDamaged: c.dwellingsDamaged,
            dwellingsDestroyed: c.dwellingsDestroyed,
            livelihoods: c.livelihoods,
            livelihoodShare: c.livelihoodShare,
          }))
        );
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

      // The sticky title+map block only pins once the wrapper's own top
      // has scrolled past the viewport top (rect.top <= 0) — that's the
      // exact moment CSS position:sticky engages and the map + title are
      // fully locked in place. Gate the narrative box's entrance on that
      // directly, not on the (numerically similar but indirect) scrolled
      // value, so it can never start before the map/title are pinned.
      if (rect.top <= 0) {
        setHasStartedScrolling(true);
      }

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
  const showDisplacement = step?.metric === "displacement";

  const focusISOs: string[] = useMemo(() => step?.focus ?? [], [step]);
  const anyFocus = focusISOs.length > 0;

  /* On the closing per-100k reveal, every cell holds the highlight
     treatment instead of dropping back to the muted style. */
  const isPerReveal = inPer && stepKind === "reveal";

  /* On the raw phase's closing "setup" step (the bridge just before the
     flip to per-100k), every bubble holds the highlight treatment too —
     a full-map reveal of every country's name and figure right before
     the map transforms, rather than staying dimmed except VUT/FJI. */
  const isRawSetupReveal = !inPer && stepKind === "setup";

  /* On the final step (the displacement highlight), every country reveals
     in place once the reader has scrolled far enough through it — no
     extra STEPS entry needed, just a progress threshold within this
     last segment, mirroring the two reveals above. */
  const isLastStep = segIndex === STEPS.length - 1;
  const isFinalReveal = isLastStep && showDisplacement && stepKind === "highlight" && segProgress > 0.5;

  /* ---- GRADUAL TRANSITION: gridT completes BEFORE the flip step reaches the top */
  const gridT = useMemo(() => {
    // Before the flip step: no grid (0)
    if (segIndex < FLIP_STEP_INDEX) return 0;

    // During the flip step: transition completes in the first 30% of the step
    // so by the time the flip step reaches the top of the viewport, it's done
    if (segIndex === FLIP_STEP_INDEX) {
      const t = Math.min(1, Math.max(0, segProgress / 0.3)); // Complete by 30% of scroll
      // Cubic ease in-out for smoother motion
      return t * t * (3 - 2 * t);
    }

    // After the flip step: fully in grid mode (1)
    return 1;
  }, [segIndex, segProgress]);

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

  const componentsByIso = useMemo(() => {
    const m = new Map<string, CountryComponents>();
    components?.forEach((r) => m.set(r.iso, r));
    return m;
  }, [components]);

  const displacementByIso = useMemo(() => {
    const m = new Map<string, DisplacementRow>();
    displacementData?.data.forEach((r) => m.set(r.iso, r));
    return m;
  }, [displacementData]);

  // Use different COORDS based on phase
  const coords = inPer ? COORDS_PER100K : COORDS_RAW;
  const isoList = useMemo(() => Object.keys(coords), [coords]);

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
      coordinates: Object.values(coords).map((c) => [shiftLon(c.lon), c.lat]),
    };
    /* Raw phase (the first map) gets tighter padding than per-100k, so the
       land fills more of the stage there. Land only ever renders during
       the raw phase (it's hidden once the grid takes over), so this can't
       affect the per-100k phase's own layout. */
    const padFrac = inPer
      ? (isSmall ? 0.1 : isMedium ? 0.08 : 0.06)
      : (isSmall ? 0.05 : isMedium ? 0.04 : 0.03);
    const pad = Math.min(width, height) * padFrac;
    /* Raw phase only: the southernmost point (Tonga) sits close to the
       fitted extent's bottom edge, and its country-name + figure callout
       renders below the bubble — extra bottom clearance keeps that label
       from clipping against the stage edge instead of just the bubble. */
    const bottomPad = inPer ? pad : pad + (isSmall ? 40 : 55);

    const proj = geoEquirectangular().rotate([-172, 0]);
    proj.fitExtent(
      [
        [pad, pad],
        [width - pad, height - bottomPad],
      ],
      fitPoints
    );
    return proj;
  }, [width, height, isSmall, isMedium, coords, inPer]);

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

  const rScaleDisp = useMemo(() => {
    if (!displacementData) return null;
    const mx = Math.max(...displacementData.data.map((c) => c.per100k ?? 0));
    const maxR = isSmall ? 18 : isMedium ? 26 : 34;
    return scaleSqrt().domain([0, mx]).range([0, maxR]);
  }, [displacementData, isSmall, isMedium]);

  const haveData =
    width > 0 && height > 0 && geo && yearData && projection;

  /* ---- bubble positions on the map */
  const positioned = useMemo(() => {
    if (!projection) return [];
    return isoList
      .map((iso) => {
        const c = coords[iso];
        if (!c) return null;
        const pt = projection([c.lon, c.lat]) as [number, number] | null;
        if (!pt || Number.isNaN(pt[0])) return null;
        return { iso, x: pt[0], y: pt[1] };
      })
      .filter((d): d is { iso: string; x: number; y: number } => d !== null);
  }, [projection, isoList, coords]);

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
      if (showDisplacement) {
        if (!rScaleDisp) return 0;
        const v = displacementByIso.get(iso)?.per100k ?? 0;
        return rScaleDisp(v);
      }
      if (inPer) {
        if (!rScalePer) return 0;
        const v = perByIso.get(iso)?.per100k ?? 0;
        return rScalePer(v);
      }
      if (!rScaleRaw) return 0;
      const v = rawByIso.get(iso)?.affected ?? 0;
      return rScaleRaw(v);
    },
    [showDisplacement, inPer, rScaleDisp, rScalePer, rScaleRaw, displacementByIso, perByIso, rawByIso]
  );

  /* ---- FLY-TO ZOOM. Phase 1 only — phase 2's fly-to zoom didn't read well
     against the grid-of-dots layout, so it stays plain there. */
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
  const boxBody = step?.body ?? "";

  /* Header is the country name alone — only when the step spotlights
     exactly one country (ambiguous otherwise, so multi-country steps like
     the "setup" bridge or the per-100k trio highlight get no header, same
     as intro/flip/reveal). Falls back to nameFor(iso) for steps whose
     `title` is empty (the per-100k single-country highlights). */
  const boxHeader: string | null = useMemo(() => {
    if (!step) return null;
    if (step.kind !== "highlight" && step.kind !== "setup") return null;
    if (step.focus.length !== 1) return null;
    return step.title || nameFor(step.focus[0]);
  }, [step, nameFor]);

  /* Scaling annotation: pinned under the title as the subtitle, so the
     encoding is explained while the circles are on screen. Text is
     phase-aware (raw counts vs. per-100k vs. displacement). Doubles as the
     displacement chart's own subtitle once the metric flips. */
  const scaleNote = showDisplacement
    ? "Displacements triggered by weather-related disasters per 100,000 people, 2020"
    : inPer
    ? "Filled circles are scaled to people directly affected per 100,000 residents. Outer rings are fixed for comparison."
    : "Circles are scaled to the number of people directly affected.";

  /* Title mirrors DisplacementChart's own headline once the map's metric
     flips to displacement — the map now stands in for that chart. */
  const displayTitle = showDisplacement
    ? "Displacements varied widely between countries, even after accounting for population size."
    : title;

  const travelTop = useMemo(() => {
    if (!height) return 0;
    const vh = viewportH || height;
    const titleH = Math.max(vh - height, 0);
    const BOX_CLEAR = isSmall ? 220 : 260;
    const startY = height * (isSmall ? 0.74 : 0.8);
    const endY = -(titleH + BOX_CLEAR);
    return startY + (endY - startY) * segProgress;
  }, [height, viewportH, segProgress, isSmall]);

  // True until the reader has scrolled a little way into the first step.
  // Bubbles show their real colors from the very start (see the bubble
  // render loop below); this flag only gates the narrative box, which
  // must stay hidden until the map is fully sticky and the reader has
  // actually begun scrolling.
  const isInitialState = !hasStartedScrolling || (segIndex === 0 && segProgress < 0.05);

  // The box stays fully hidden until isInitialState clears — no fade, a
  // hard snap, right as scrolling begins.
  const boxOpacity = isInitialState ? 0 : 1;

  /* First scrolly message slides up into place rather than fading in.
     Scroll-scrubbed (not time-based), like the rest of this component's
     motion, so it tracks scroll position exactly instead of racing ahead
     of or lagging behind the reader. Later steps have no entrance — they
     just travel continuously via travelTop once already on screen. */
  const ENTRANCE_SLIDE_PX = 36;
  const entranceOffset = useMemo(() => {
    if (isInitialState) return ENTRANCE_SLIDE_PX;
    if (segIndex !== 0) return 0;
    const t = Math.min(1, Math.max(0, (segProgress - 0.05) / 0.15));
    return (1 - t) * ENTRANCE_SLIDE_PX;
  }, [isInitialState, segIndex, segProgress]);

  const accent = inPer ? PALETTE.per.accent : PALETTE.raw.accent;
  const bubbleFill = inPer ? PALETTE.per.bubble : PALETTE.raw.bubble;

  /* Inline figure highlights: the exact phrase from each step's hand-written
     body copy is colored to match its bubble — affected in bubbleFill,
     livelihoods-lost in PALETTE.livelihoods (plain colored text, no
     background). The livelihoods match extends through the word
     "livelihood(s)" itself, not just the leading figure, so the color
     carries the whole idea, not merely the number. Hardcoded per segIndex
     since the phrasing is hand-written prose, not derived from data. */
  const bodyHighlights = useMemo((): { match: string; color: string }[] => {
    switch (segIndex) {
      case 1: // Vanuatu
        return [{ match: "246,802 people", color: bubbleFill }];
      case 2: // Fiji
        return [{ match: "235,921 people directly affected", color: bubbleFill }];
      case 3: // Marshall Islands
        return [{ match: "— 56,718 people —", color: bubbleFill }];
      case 10: // Vanuatu, displacement
        return [{ match: "more than 26,000", color: bubbleFill }];
      default:
        return [];
    }
  }, [segIndex, bubbleFill]);

  function renderBody(text: string, highlights: { match: string; color: string }[]) {
    if (highlights.length === 0) return text;
    const found = highlights
      .map((h) => ({ ...h, start: text.indexOf(h.match) }))
      .filter((h) => h.start !== -1)
      .sort((a, b) => a.start - b.start);
    if (found.length === 0) return text;

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    found.forEach((h, i) => {
      if (h.start > cursor) nodes.push(text.slice(cursor, h.start));
      nodes.push(
        <span key={i} style={{ color: h.color, fontWeight: 600 }}>
          {h.match}
        </span>
      );
      cursor = h.start + h.match.length;
    });
    if (cursor < text.length) nodes.push(text.slice(cursor));
    return <>{nodes}</>;
  }

  /* Per-bubble tooltip: anchored to the dot's true on-screen centre, read
     directly off the hovered circle's own getBoundingClientRect() so it's
     automatically correct under every transform in play (fly-zoom, cluster
     offset) without having to replicate that math by hand. The tooltip
     itself is position:fixed; computeBubbleTooltipPosition then picks
     whichever side actually has room and points a caret back at the dot. */
  const handleBubbleInteraction = useCallback(
    (
      e: React.MouseEvent<SVGCircleElement> | React.TouchEvent<SVGCircleElement>,
      iso: string,
      kind: BubbleKind,
      content: string,
      highlight: string,
      color: string
    ) => {
      const isTouch = !("clientX" in e);
      const rect = e.currentTarget.getBoundingClientRect();
      setBubbleHover({
        iso,
        kind,
        dotX: rect.left + rect.width / 2,
        dotY: rect.top + rect.height / 2,
        dotR: rect.width / 2,
        content,
        highlight,
        color,
        isTouch,
      });
    },
    []
  );

  const handleBubbleLeave = useCallback((iso: string, kind: BubbleKind) => {
    setBubbleHover((cur) => (cur && cur.iso === iso && cur.kind === kind ? null : cur));
  }, []);

  useLayoutEffect(() => {
    if (!bubbleHover) {
      setTooltipSize(null);
      return;
    }
    const node = tooltipRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    setTooltipSize({ width: r.width, height: r.height });
  }, [bubbleHover]);

  const tooltipPosition = useMemo(
    () =>
      bubbleHover && tooltipSize
        ? computeBubbleTooltipPosition(bubbleHover, tooltipSize.width, tooltipSize.height)
        : null,
    [bubbleHover, tooltipSize]
  );

  /* Mouse-triggered tooltips dismiss on mouseleave; touch has no equivalent
     "leave" gesture, so those still need a timed dismiss. */
  useEffect(() => {
    if (!bubbleHover || !bubbleHover.isTouch) return;
    const id = window.setTimeout(() => setBubbleHover(null), TOOLTIP_TOUCH_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [bubbleHover]);

  useEffect(() => {
    if (!bubbleHover) return;
    const dismiss = () => setBubbleHover(null);
    window.addEventListener("scroll", dismiss, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", dismiss, { capture: true });
  }, [bubbleHover]);

  const flyTransition = "transform 0.9s cubic-bezier(0.4,0,0.2,1)";

  return (
    <figure className="w-full" aria-label="Pacific disaster scrollytelling map">
      <div ref={wrapRef} style={{ height: `${totalSegments * 115}vh` }}>
        <div
          className="sticky top-0 flex w-full flex-col overflow-hidden"
          style={{ height: "100vh", background: PALETTE.surface }}
        >
          {/* Pinned title (bold), then the scale-note subtitle — kept
              visible for the whole scroll so the reading key (what the
              circles mean) stays on screen while interacting with the
              map. */}
          <div
            className="w-full"
            style={{
              flexShrink: 0,
              maxWidth: CONTAINER_WIDTH,
              marginLeft: "auto",
              marginRight: "auto",
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: `calc(env(safe-area-inset-top, 0px) + ${isSmall ? 8 : 6}px)`,
              paddingBottom: isSmall ? 8 : 14,
            }}
          >
            <p className="section-subtitle" style={{ fontWeight: 350 }}>
              {displayTitle}
            </p>
            {showDisplacement ? (
              <div
                className="section-subtitle"
                style={{
                  marginTop: isSmall ? 10 : 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: "0.74rem",
                  fontWeight: 250,
                }}
              >
                <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: bubbleFill,
                      display: "inline-block",
                    }}
                  />
                  Tropical cyclone
                </span>
                <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "var(--primary-vivid, #2E6FA3)",
                      display: "inline-block",
                    }}
                  />
                  Flood
                </span>
                <span className="sr-only">{scaleNote}</span>
              </div>
            ) : (
              <p
                className="section-subtitle"
                style={{ marginTop: isSmall ? 10 : 14, fontSize: "0.74rem", fontWeight: 250 }}
              >
                {scaleNote}
              </p>
            )}
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
                      floodColor={PALETTE.landShadow}
                      floodOpacity="0.28"
                    />
                  </filter>
                </defs>

                <g clipPath={gridT > 0 ? undefined : "url(#stageClip)"}>
                  {/* Land — stays visible at low opacity behind the per-100k
                      grid instead of fading out entirely, so the geography
                      is still legible once the dots morph into the grid. */}
                  <g
                    filter="url(#landShadow)"
                    style={{
                      transform: `translate(${fly.tx}px, ${fly.ty}px) scale(${fly.k})`,
                      transformOrigin: "0px 0px",
                      transformBox: "view-box",
                      transition: flyTransition,
                      opacity: 1 - gridT * 0.7,
                      pointerEvents: "none",
                    }}
                  >
                    {geo!.features.map((f) => {
                      const d = planarLandPath(
                        f.geometry as { type: string; coordinates: unknown },
                        projection! as Projector
                      );
                      if (!d) return null;
                      const isFocusLand = zoomActive && focusISOs.includes(f.properties.iso);
                      return (
                        <path
                          key={f.properties.iso}
                          d={d}
                          fill={isFocusLand ? PALETTE.landFocus : PALETTE.land}
                          stroke={isFocusLand ? PALETTE.landFocusStroke : PALETTE.landStroke}
                          strokeWidth={isSmall ? 1.5 : 1.25}
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          style={{ transition: "fill 0.4s ease, stroke 0.4s ease" }}
                        />
                      );
                    })}
                  </g>

                  {/* Bubbles */}
                  {camPositioned.map(({ iso, x, y }) => {
                    const r = radiusFor(iso);
                    const isFoc = isPerReveal || isRawSetupReveal || isFinalReveal || focusISOs.includes(iso);
                    const baseR = isSmall ? 3.5 : 5;
                    // Bigger fixed radius for "no data" dots — there's no
                    // value to scale by, and the tiny baseR circle leaves no
                    // room for a legible "?" glyph.
                    const noDataR = isSmall ? 11 : 15;
                    /* A reported 0 ("this country had no one affected") and
                       no data being reported at all are different things —
                       collapsing both into value=0 would badge a confirmed
                       zero with the same "?" as genuinely missing data. */
                    const rawDatum = inPer ? perByIso.get(iso) : rawByIso.get(iso);
                    const rawFigure = inPer ? rawDatum?.per100k : rawDatum?.affected;
                    const noData = rawFigure == null;
                    const value = rawFigure ?? 0;
                    const hasValue = value > 0;
                    const confirmedZero = !noData && value === 0;
                    const displayR = Math.max(r, hasValue ? baseR : noDataR);
                    const mapOpacity = inPer ? 1 - gridT : 1;

                    const per100kRaw = showDisplacement
                      ? displacementByIso.get(iso)?.per100k
                      : perByIso.get(iso)?.per100k;
                    const gridNoData = per100kRaw == null;
                    const gridPositive = per100kRaw != null && per100kRaw > 0;
                    const gridConfirmedZero = per100kRaw === 0;
                    const gridR = Math.min(radiusFor(iso), ringR - 3);
                    const gridDisplayR = Math.max(gridR, baseR * 0.7);
                    const gridName = nameFor(iso);
                    const gridDim = anyFocus && !isFoc ? 0.4 : 1;

                    /* Displacement phase only: flood-driven displacement
                       gets the project's blue instead of the warm bubble
                       colour, so the dominant hazard reads at a glance. */
                    const isFlood = showDisplacement && displacementByIso.get(iso)?.dominantHazard === "flood";
                    const gridFill = isFlood ? "var(--primary-vivid, #2E6FA3)" : bubbleFill;

                    /* ---- On zoom into a single country, show its name above
                       the (single, unsplit) affected bubble. */
                    const showCallout = (zoomActive && focusISOs[0] === iso) || isRawSetupReveal;

                    const isAffectedHovered = bubbleHover?.iso === iso && bubbleHover.kind === "affected";
                    const affectedInteractive = !inPer && !noData;

                    const affectedHighlight = fmtInt(value);
                    const affectedContent = `${affectedHighlight} people directly affected`;

                    /* Raw phase only: Micronesia's bubble is ash grey instead
                       of the usual warm bubble colour. */
                    const rawFill = !inPer && iso === "FSM" ? ASH : bubbleFill;

                    const affectedCircleEl = (
                      <>
                        <circle
                          key="affected"
                          r={displayR}
                          fill={hasValue ? rawFill : confirmedZero ? PALETTE.mutedSoft : "none"}
                          fillOpacity={
                            hasValue ? (isFoc ? 0.65 : anyFocus ? 0.35 : 0.55) : confirmedZero ? 0.45 : 0
                          }
                          stroke={PALETTE.bubbleBorder}
                          strokeOpacity={isFoc || isAffectedHovered ? 1 : 0.55}
                          strokeWidth={isFoc || isAffectedHovered ? 1.2 : 0.75}
                          strokeDasharray={noData ? "2 3" : undefined}
                          style={{
                            cursor: affectedInteractive ? "pointer" : "default",
                            transition:
                              "r 0.6s cubic-bezier(0.34,1.56,0.64,1), fill-opacity 0.4s ease, fill 0.4s ease, stroke-opacity 0.4s ease",
                          }}
                          onMouseEnter={(e) =>
                            affectedInteractive &&
                            handleBubbleInteraction(e, iso, "affected", affectedContent, affectedHighlight, rawFill)
                          }
                          onMouseLeave={() => handleBubbleLeave(iso, "affected")}
                          onTouchStart={(e) =>
                            affectedInteractive &&
                            handleBubbleInteraction(e, iso, "affected", affectedContent, affectedHighlight, rawFill)
                          }
                          onClick={(e) =>
                            affectedInteractive &&
                            handleBubbleInteraction(e, iso, "affected", affectedContent, affectedHighlight, rawFill)
                          }
                        />
                        {/* Confirmed 0 gets a "0" glyph: that country DID
                            report, and reported no one affected — a real
                            answer, not a missing one. No-data countries get
                            no glyph, just the dashed outline. */}
                        {confirmedZero && (
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={displayR * 0.7}
                            fontWeight={700}
                            fill={PALETTE.faint}
                            style={{ fontFamily: "var(--font-sans)", pointerEvents: "none" }}
                          >
                            0
                          </text>
                        )}
                      </>
                    );

                    /* On-zoom callout: the country name above the bubble, the
                       overall affected figure below it in the bubble's own
                       colour. Fades in with the fly-to zoom; the affected
                       bubble itself is unchanged (single circle).

                       On the raw-phase "setup" step, every bubble shows this
                       at once (full-map reveal just before the flip), so it
                       switches to a compact layout — name and figure both
                       stacked directly under the bubble, at map-scale type —
                       instead of the spacious above/below layout tuned for a
                       single zoomed-in bubble with room to spare. */
                    const nameY = isRawSetupReveal
                      ? displayR + (isSmall ? 13 : 16)
                      : -displayR - (isSmall ? 12 : 15);
                    const figureY = isRawSetupReveal
                      ? nameY + (isSmall ? 12 : 14)
                      : displayR + (isSmall ? 16 : 20);
                    const nameFontSize = isRawSetupReveal ? (isSmall ? 11 : 13) : isSmall ? 14 : 17;
                    const figureFontSize = isRawSetupReveal ? (isSmall ? 9 : 11) : isSmall ? 12 : 14;
                    /* Country name always shows — even for "no data" or
                       confirmed-zero countries — so a full reveal doesn't
                       silently skip anyone. The figure line adapts: the
                       real number when there is one, "0 people affected"
                       for a confirmed zero, and a muted "no data" note
                       otherwise. */
                    const calloutEl = (
                      <g
                        key="callout"
                        style={{ opacity: showCallout ? 1 : 0, transition: "opacity 0.45s ease" }}
                        pointerEvents="none"
                      >
                        <text
                          x={0}
                          y={nameY}
                          textAnchor="middle"
                          fontSize={nameFontSize}
                          fontWeight={400}
                          fill={PALETTE.ink}
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {nameFor(iso)}
                        </text>
                        <text
                          x={0}
                          y={figureY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={figureFontSize}
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {noData ? (
                            <tspan fill={PALETTE.faint} fontStyle="italic">
                              no data
                            </tspan>
                          ) : (
                            <>
                              <tspan fontWeight={700} fill={rawFill}>
                                {fmtInt(value)}
                              </tspan>
                              <tspan fill={PALETTE.mutedSoft} fontWeight={400}>
                                {"  people affected"}
                              </tspan>
                            </>
                          )}
                        </text>
                      </g>
                    );

                    return (
                      <g
                        key={iso}
                        transform={`translate(${x},${y})`}
                        style={{ transition: flyTransition }}
                      >
                        {/* ================= MAP-STYLE LAYER ================= */}
                        {(!inPer || gridT < 1) && (
                          <g style={{ opacity: mapOpacity }}>
                            {affectedCircleEl}
                            {calloutEl}
                          </g>
                        )}

                        {/* ================= GRID-STYLE LAYER (per-100k) ================= */}
                        {inPer && gridT > 0 && (
                          <g style={{ opacity: gridT * gridDim, transition: "opacity 0.4s ease" }}>
                            <text
                              y={-ringR - 9}
                              textAnchor="middle"
                              fontSize={isSmall ? 12 : 15}
                              fontWeight={400}
                              fill={isFoc ? PALETTE.ink : PALETTE.mutedSoft}
                              fillOpacity={isFoc ? 1 : 0.55}
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              {gridName}
                            </text>

                            <circle
                              r={ringR}
                              fill="none"
                              stroke={isFoc ? (isFlood ? "var(--primary-vivid, #2E6FA3)" : accent) : PALETTE.line}
                              strokeWidth={0.8}
                              style={{ transition: "stroke 0.4s ease" }}
                            />

                            {gridPositive && (
                              <circle
                                r={gridDisplayR}
                                fill={gridFill}
                                fillOpacity={isFoc ? 0.7 : 0.45}
                                stroke="none"
                                strokeWidth={0}
                                style={{
                                  transition:
                                    "r 0.6s cubic-bezier(0.34,1.56,0.64,1), fill-opacity 0.4s ease",
                                }}
                              />
                            )}
                            {gridConfirmedZero && (
                              <text
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={ringR * 0.7}
                                fontWeight={700}
                                fill={PALETTE.faint}
                                style={{ fontFamily: "var(--font-sans)" }}
                              >
                                0
                              </text>
                            )}

                            <text
                              y={ringR + (isSmall ? 14 : 18)}
                              textAnchor="middle"
                              fontSize={isSmall ? 10 : 12}
                              fontWeight={500}
                              fill={
                                gridNoData
                                  ? PALETTE.faint
                                  : isFoc
                                  ? gridFill
                                  : PALETTE.mutedSoft
                              }
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              {gridNoData ? (
                                "no data"
                              ) : (
                                <>
                                  <tspan fontWeight={700}>{fmtInt(per100kRaw as number)}</tspan> /100k
                                </>
                              )}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {/* Tooltip: one per bubble (affected / livelihoods), dynamically
                placed on whichever side of the dot actually has room, with a
                caret connector pointing back at it. No border — shadow only
                separates it from the page. Rendered invisibly first so its
                real size can be measured before it's positioned and shown. */}
            {bubbleHover && !inPer && (
              <div
                ref={tooltipRef}
                className="pointer-events-none fixed z-50 rounded-lg bg-white/85 px-3 py-2 shadow-xl transition-opacity duration-75"
                style={{
                  left: tooltipPosition ? tooltipPosition.left : bubbleHover.dotX,
                  top: tooltipPosition ? tooltipPosition.top : bubbleHover.dotY,
                  opacity: tooltipPosition ? 1 : 0,
                  maxWidth: "min(260px, 80vw)",
                  minWidth: 160,
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.8rem",
                  lineHeight: 1.35,
                  color: PALETTE.mutedSoft,
                }}
              >
                {tooltipPosition && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: tooltipPosition.caretLeft,
                      top: tooltipPosition.caretTop,
                      width: CARET_SIZE,
                      height: CARET_SIZE,
                      background: "rgba(255, 255, 255, 0.95)",
                      transform: "rotate(45deg)",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)",
                    }}
                  />
                )}
                <p style={{ margin: 0, fontWeight: 700, color: PALETTE.ink }}>{nameFor(bubbleHover.iso)}</p>
                <p style={{ margin: "2px 0 0" }}>
                  {(() => {
                    const idx = bubbleHover.content.indexOf(bubbleHover.highlight);
                    if (idx === -1) return bubbleHover.content;
                    const before = bubbleHover.content.slice(0, idx);
                    const after = bubbleHover.content.slice(idx + bubbleHover.highlight.length);
                    return (
                      <>
                        {before}
                        <strong style={{ color: bubbleHover.color }}>{bubbleHover.highlight}</strong>
                        {after}
                      </>
                    );
                  })()}
                </p>
              </div>
            )}

            {/* Travelling narrative box - TRANSPARENT BACKGROUND, NO BLUR */}
            {haveData && (
              <div
                className="pointer-events-none absolute inset-x-0 flex justify-center"
                style={{
                  top: 0,
                  transform: `translateY(${travelTop + entranceOffset}px)`,
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
                    background: PALETTE.surfaceTranslucent,
                    color: PALETTE.inkSoft,
                    fontSize: isSmall ? "0.8rem" : "0.9rem",
                    boxShadow: `0 4px 18px ${PALETTE.cardShadow}`,
                    opacity: boxOpacity,
                    pointerEvents: "auto",
                    userSelect: "text",
                    WebkitUserSelect: "text",
                  }}
                >
                  {boxHeader && (
                    <p
                      className="mb-1 font-semibold"
                      style={{ fontSize: isSmall ? "0.85rem" : "0.95rem" }}
                    >
                      {boxHeader}
                    </p>
                  )}
                  {boxBody.split("\n\n").map((para, i) => (
                    <p key={i} style={{ fontWeight: 350, marginTop: i > 0 ? 8 : 0 }}>
                      {renderBody(para, bodyHighlights)}
                    </p>
                  ))}
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
          maxWidth: CONTAINER_WIDTH,
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: isSmall ? 10 : 18,
          paddingBottom: isSmall ? 4 : 10,
        }}
      >
        <p className="chart-caption text-left" style={{ paddingBottom: 0 }}>
          Note: 2020 was selected because it is the most recent year with near-complete regional coverage, with data available for 11 of the 12 Pacific Island Countries.
        </p>
        <p className="chart-caption text-left" style={{ paddingBottom: 0, marginTop: isSmall ? 6 : 10 }}>
          Sources:{" "}
          <a
            href="https://stats.pacificdata.org/vis?lc=en&df[ds]=ds%3ASPC2&df[id]=DF_SDG_11&df[ag]=SPC&df[vs]=3.0&dq=A.VC_DSR_AFFCT.........&pd=,&to[TIME_PERIOD]=false&lb=bt"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-[var(--primary,#6d8499)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            Pacific Data Hub
          </a>
          ;{" "}
          <a
            href="https://unstats.un.org/sdgs/dataportal"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-[var(--primary,#6d8499)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            United Nations Statistics Division (UNSD)
          </a>
          ; displacement data from the{" "}
          <a
            href="https://www.internal-displacement.org/database/displacement-data"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-[var(--primary,#6d8499)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            Internal Displacement Monitoring Centre (IDMC)
          </a>
          .
        </p>
      </div>

      {/* Accessible data payload */}
      {yearData && (
        <div className="sr-only">
          <table>
            <caption>
              People directly affected by disasters in the
              Pacific Island Countries, 2020: total counts.
            </caption>
            <thead>
              <tr>
                <th scope="col">Country</th>
                <th scope="col">People directly affected (2020)</th>
                <th scope="col">Lost their livelihood (2020)</th>
              </tr>
            </thead>
            <tbody>
              {yearData.rawCounts.data.map((c) => (
                <tr key={`a11y-raw-${c.iso}`}>
                  <td>{c.country}</td>
                  <td>{fmtInt(c.affected ?? 0)}</td>
                  <td>
                    {(() => {
                      const v = componentsByIso.get(c.iso)?.livelihoods;
                      return v != null ? fmtInt(v) : "not reported";
                    })()}
                  </td>
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
          {displacementData && (
            <table>
              <caption>
                Displacements triggered by weather-related disasters per 100,000
                people, 2020.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Country</th>
                  <th scope="col">Displacements per 100,000 (2020)</th>
                </tr>
              </thead>
              <tbody>
                {displacementData.data.map((c) => (
                  <tr key={`a11y-disp-${c.iso}`}>
                    <td>{c.country}</td>
                    <td>{fmtInt(c.per100k)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </figure>
  );
}