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

interface LivelihoodsRow {
  iso: string;
  country: string;
  affected: number;
  livelihoods: number;
  livelihoodShare: number;
}
interface LivelihoodsData {
  year: number;
  reportingCountries: number;
  notReporting: string[];
  totals: { affected: number; livelihoods: number };
  data: LivelihoodsRow[];
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
  raw: { accent: "var(--accent, #de8e8e)", bubble: "var(--accent-bubble, #de8e8e)" },
  per: { accent: "var(--accent-dark, #de8e8e)", bubble: "var(--accent-bubble, #de8e8e)" },
  /* Nested "livelihoods lost" bubble, raw phase only. */
  livelihoods: "var(--primary-vivid, #2E6FA3)",
  ink: "var(--ink, #0f172a)",
  inkSoft: "var(--ink-soft, #1e293b)",
  mutedSoft: "var(--muted-soft, #64748b)",
  faint: "var(--faint, #94a3b8)",
  line: "var(--line, #cbd5e1)",
  surface: "var(--surface, #ffffff)",
  surfaceTranslucent: "var(--surface-translucent, rgba(255, 255, 255, 0.85))",
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

/* ----------------------------------------------- explicit bubble anchors */
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
  AS: { lon: -170.1, lat: -14.3 },
  CK: { lon: -159.8, lat: -21.2 },
  GU: { lon: 144.8, lat: 13.4 },
  MP: { lon: 145.8, lat: 15.2 },
  NC: { lon: 165.9, lat: -21.5 },
  NU: { lon: -169.9, lat: -19.1 },
  PF: { lon: -149.6, lat: -17.5 },
  TK: { lon: -171.8, lat: -9.2 },
  WF: { lon: -176.2, lat: -14.3 }
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
    body: "In 2020, disasters directly affected more than half a million people across the Pacific Islands and left about 94 dead. For nearly three-quarters of those affected, the disaster also disrupted the livelihoods they depend on.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["VUT"],
    title: "Vanuatu",
    body: "Vanuatu recorded the largest number of people directly affected in 2020, with 246,802 people impacted by disasters. Of these, 160,000 (65%) also lost the livelihoods on which they depended, showing how widely the impacts extended beyond the immediate event.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["FJI"],
    title: "Fiji",
    body: "Fiji followed closely behind, with 235,921 people directly affected. Together, Fiji and Vanuatu accounted for nearly 88% of everyone directly affected across the Pacific Island Countries that year. In Fiji, 182,892 people (78%) also lost the livelihoods on which they depended.",
  },
  {
    phase: "raw",
    kind: "highlight",
    focus: ["MHL"],
    title: "Marshall Islands",
    body: "The Marshall Islands recorded far fewer people directly affected than Fiji or Vanuatu. Judged by total numbers alone, it appears to have experienced a much smaller disaster. Yet of those it did reach (56,718 people), almost none were spared: 53,158 people, more than nine in ten, lost the livelihood they depend on.",
  },
  {
    phase: "raw",
    kind: "setup",
    focus: ["VUT", "FJI"],
    title: "",
    body: "But absolute numbers reveal where the greatest numbers of people were affected. They do not, however, show how widespread those impacts were within each country. Looking at people affected relative to population reveals a different picture.",
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
    focus: ["MHL", "VUT", "FJI"],
    title: "",
    body: "Once the size of population is taken into account, the picture changes. The Marshall Islands joins Vanuatu and Fiji among the countries most heavily affected, showing that disasters reached a much larger share of the population than absolute numbers alone suggest.",
  },
  {
    phase: "per",
    kind: "highlight",
    focus: ["TUV"],
    title: "",
    body: "Tuvalu also rises to the top. Although fewer people were affected in total, they represented a much larger share of the country's population, revealing how heavily disasters can affect even the smallest island nations.",
  },
  {
    phase: "per",
    kind: "reveal",
    focus: [],
    title: "",
    body: "Whether measured by sheer numbers or by share of the population, disasters reached deep into these countries, disrupting lives, interrupting livelihoods and leaving many communities with consequences that extended well beyond the immediate disaster.",
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
  title = "People directly affected by weather-related disasters in Pacific Island Countries, 2020",
}: PacificScrollyMapProps = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [yearData, setYearData] = useState<YearData | null>(null);
  const [livelihoodsData, setLivelihoodsData] = useState<LivelihoodsData | null>(null);

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
      fetch(asset("/data/affected_2020.json")).then((r) => r.json()),
      fetch(asset("/data/livelihoods_2020.json")).then((r) => r.json()),
    ])
      .then(([g, y, l]) => {
        setGeo(g);
        setYearData(y);
        setLivelihoodsData(l);
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

  const focusISOs: string[] = useMemo(() => step?.focus ?? [], [step]);
  const anyFocus = focusISOs.length > 0;

  /* On the closing per-100k reveal, every cell holds the highlight
     treatment instead of dropping back to the muted style. */
  const isPerReveal = inPer && stepKind === "reveal";

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

  const livelihoodsByIso = useMemo(() => {
    const m = new Map<string, LivelihoodsRow>();
    livelihoodsData?.data.forEach((r) => m.set(r.iso, r));
    return m;
  }, [livelihoodsData]);

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

    const proj = geoEquirectangular().rotate([-172, 0]);
    proj.fitExtent(
      [
        [pad, pad],
        [width - pad, height - pad],
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
     phase-aware (raw counts vs. per-100k). */
  const scaleNote = inPer
    ? "Filled circles are scaled to people directly affected per 100,000 residents. Outer rings are fixed for comparison."
    : "Circles are scaled to the number of people directly affected; the nested blue circle is the share who also lost their livelihood.";

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
        return [
          { match: "246,802 people impacted", color: bubbleFill },
          { match: "160,000 (65%) also lost the livelihoods", color: PALETTE.livelihoods },
        ];
      case 2: // Fiji
        return [
          { match: "235,921 people directly affected", color: bubbleFill },
          { match: "182,892 people (78%) also lost the livelihoods", color: PALETTE.livelihoods },
        ];
      case 3: // Marshall Islands
        return [
          { match: "(56,718 people)", color: bubbleFill },
          { match: "53,158 people, more than nine in ten, lost the livelihood", color: PALETTE.livelihoods },
        ];
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
              paddingTop: `calc(env(safe-area-inset-top, 0px) + ${isSmall ? 36 : 28}px)`,
              paddingBottom: isSmall ? 8 : 14,
            }}
          >
            <p className="section-title" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {title}
            </p>
            {/* Raw phase: legend only, no textual cue. Per-100k phase: the
                scale-note textual cue only, no legend (livelihoods doesn't
                exist as a bubble there, and a single-swatch legend for just
                "people affected per 100,000" is redundant with the note). */}
            {inPer && (
              <p className="section-subtitle" style={{ marginTop: isSmall ? 10 : 14 }}>
                {scaleNote}
              </p>
            )}

            {!inPer && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px 16px",
                  marginTop: isSmall ? 10 : 14,
                  fontSize: "0.72rem",
                  color: "#707070",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: bubbleFill,
                      display: "inline-block",
                    }}
                  />
                  People affected
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: PALETTE.livelihoods,
                      display: "inline-block",
                    }}
                  />
                  Lost their livelihood
                </span>
              </div>
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
                    const isFoc = isPerReveal || focusISOs.includes(iso);
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

                    const per100kRaw = perByIso.get(iso)?.per100k;
                    const gridNoData = per100kRaw == null;
                    const gridPositive = per100kRaw != null && per100kRaw > 0;
                    const gridConfirmedZero = per100kRaw === 0;
                    const gridR = Math.min(radiusFor(iso), ringR - 3);
                    const gridDisplayR = Math.max(gridR, baseR * 0.7);
                    const gridName = nameFor(iso);
                    const gridDim = anyFocus && !isFoc ? 0.4 : 1;

                    /* Livelihoods lost: a second bubble clustered next to the
                       affected circle (offset, not concentric) so both stay
                       visible as distinct overlapping circles — like a small
                       Dorling cluster — rather than one hiding inside the
                       other. Scaled on the same rScaleRaw domain so its
                       radius is always <= the affected bubble's (livelihoods
                       lost can never exceed people affected). Phase-agnostic
                       2020 figure, not tied to raw vs. per-100k. */
                    const livelihoodsValue = livelihoodsByIso.get(iso)?.livelihoods ?? 0;
                    const hasLivelihoods = livelihoodsValue > 0;
                    const livelihoodsR = hasLivelihoods
                      ? Math.max(rScaleRaw ? rScaleRaw(livelihoodsValue) : 0, 2)
                      : 0;
                    // Push the smaller circle's centre out from the affected
                    // circle's centre so the two partially overlap rather
                    // than sitting concentric.
                    const clusterOffset = displayR * 0.55;
                    const livelihoodsCx = clusterOffset * Math.cos(Math.PI / 4);
                    const livelihoodsCy = clusterOffset * Math.sin(Math.PI / 4);

                    /* Per-bubble hover/click state: whichever of the two the
                       reader is engaging with comes to the front and gets
                       the bold border; the other recedes (dimmer fill,
                       thinner border) rather than the two competing equally. */
                    const isAffectedHovered = bubbleHover?.iso === iso && bubbleHover.kind === "affected";
                    const isLivelihoodsHovered = bubbleHover?.iso === iso && bubbleHover.kind === "livelihoods";
                    const affectedInteractive = !inPer && !noData;
                    const livelihoodsInteractive = !inPer && hasLivelihoods;

                    const affectedHighlight = fmtInt(value);
                    const affectedContent = `${affectedHighlight} people directly affected`;
                    const livelihoodsShare = livelihoodsByIso.get(iso)?.livelihoodShare;
                    const livelihoodsHighlight = fmtInt(livelihoodsValue);
                    const livelihoodsContent =
                      livelihoodsShare != null
                        ? `${livelihoodsHighlight} lost their livelihood (${Math.round(livelihoodsShare * 100)}% of those affected)`
                        : `${livelihoodsHighlight} lost their livelihood`;

                    const affectedCircleEl = (
                      <>
                        <circle
                          key="affected"
                          r={displayR}
                          fill={hasValue ? bubbleFill : confirmedZero ? PALETTE.mutedSoft : "none"}
                          fillOpacity={
                            (hasValue ? (isFoc ? 0.5 : anyFocus ? 0.25 : 0.4) : confirmedZero ? 0.35 : 0) *
                            (isLivelihoodsHovered ? 0.55 : 1)
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
                            handleBubbleInteraction(e, iso, "affected", affectedContent, affectedHighlight, bubbleFill)
                          }
                          onMouseLeave={() => handleBubbleLeave(iso, "affected")}
                          onTouchStart={(e) =>
                            affectedInteractive &&
                            handleBubbleInteraction(e, iso, "affected", affectedContent, affectedHighlight, bubbleFill)
                          }
                          onClick={(e) =>
                            affectedInteractive &&
                            handleBubbleInteraction(e, iso, "affected", affectedContent, affectedHighlight, bubbleFill)
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

                    /* "Livelihoods lost" bubble — offset next to the affected
                       circle (not concentric) and translucent, so the two
                       read as overlapping circles that blend where they
                       overlap, like a small two-circle cluster. Same border
                       colour as the affected circle so the pair reads as one
                       family of bubbles. */
                    const livelihoodsCircleEl = hasLivelihoods ? (
                      <circle
                        key="livelihoods"
                        cx={livelihoodsCx}
                        cy={livelihoodsCy}
                        r={livelihoodsR}
                        fill={PALETTE.livelihoods}
                        fillOpacity={(isFoc ? 0.55 : anyFocus ? 0.25 : 0.45) * (isAffectedHovered ? 0.55 : 1)}
                        stroke={PALETTE.bubbleBorder}
                        strokeOpacity={isFoc || isLivelihoodsHovered ? 1 : 0.55}
                        strokeWidth={isFoc || isLivelihoodsHovered ? 1.2 : 0.75}
                        style={{
                          cursor: livelihoodsInteractive ? "pointer" : "default",
                          transition:
                            "cx 0.6s cubic-bezier(0.34,1.56,0.64,1), cy 0.6s cubic-bezier(0.34,1.56,0.64,1), r 0.6s cubic-bezier(0.34,1.56,0.64,1), fill-opacity 0.4s ease",
                        }}
                        onMouseEnter={(e) =>
                          livelihoodsInteractive &&
                          handleBubbleInteraction(
                            e,
                            iso,
                            "livelihoods",
                            livelihoodsContent,
                            livelihoodsHighlight,
                            PALETTE.livelihoods
                          )
                        }
                        onMouseLeave={() => handleBubbleLeave(iso, "livelihoods")}
                        onTouchStart={(e) =>
                          livelihoodsInteractive &&
                          handleBubbleInteraction(
                            e,
                            iso,
                            "livelihoods",
                            livelihoodsContent,
                            livelihoodsHighlight,
                            PALETTE.livelihoods
                          )
                        }
                        onClick={(e) =>
                          livelihoodsInteractive &&
                          handleBubbleInteraction(
                            e,
                            iso,
                            "livelihoods",
                            livelihoodsContent,
                            livelihoodsHighlight,
                            PALETTE.livelihoods
                          )
                        }
                      />
                    ) : null;

                    return (
                      <g
                        key={iso}
                        transform={`translate(${x},${y})`}
                        style={{ transition: flyTransition }}
                      >
                        {/* ================= MAP-STYLE LAYER ================= */}
                        {(!inPer || gridT < 1) && (
                          <g style={{ opacity: mapOpacity }}>
                            {/* Whichever bubble is the current focus of
                                interaction paints last (on top); by default
                                (nothing hovered) livelihoods sits on top of
                                affected, matching the resting cluster look. */}
                            {isAffectedHovered && livelihoodsCircleEl ? (
                              <>
                                {livelihoodsCircleEl}
                                {affectedCircleEl}
                              </>
                            ) : (
                              <>
                                {affectedCircleEl}
                                {livelihoodsCircleEl}
                              </>
                            )}
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
                              stroke={isFoc ? accent : PALETTE.line}
                              strokeWidth={0.8}
                              style={{ transition: "stroke 0.4s ease" }}
                            />

                            {gridPositive && (
                              <circle
                                r={gridDisplayR}
                                fill={bubbleFill}
                                fillOpacity={isFoc ? 0.55 : 0.3}
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
                                  ? bubbleFill
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
                className="pointer-events-none fixed z-50 rounded-lg bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm transition-opacity duration-75"
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
                  <p style={{ fontWeight: 350 }}>{renderBody(boxBody, bodyHighlights)}</p>
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
          Source: Number of directly affected persons attributed to disasters from the{" "}
          <a
            href="https://stats.pacificdata.org/vis?lc=en&df[ds]=ds%3ASPC2&df[id]=DF_SDG_11&df[ag]=SPC&df[vs]=3.0&dq=A.VC_DSR_AFFCT.........&pd=,&to[TIME_PERIOD]=false&lb=bt"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            Pacific Data Hub.
          </a>{" "}
          Population-adjusted figures (per 100,000 residents) and livelihoods disrupted/destroyed from{" "}
          <a
            href="https://stats.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_SDG_11&df[ag]=SPC&dq=A.G%2BN.EN_LND_SLUM%2BVC_DSR_MISS%2BVC_DSR_AFFCT%2BVC_DSR_MORT%2BVC_DSR_MTMP%2BVC_DSR_MMHN%2BVC_DSR_DAFF%2BVC_DSR_IJILN%2BVC_DSR_PDAN%2BVC_DSR_PDYN%2BVC_DSR_PDLN%2BVC_DSR_GDPLS%2BVC_DSR_LSGP%2BVC_DSR_AGLH%2BVC_DSR_HOLH%2BVC_DSR_CILN%2BVC_DSR_CHLN%2BVC_DSR_DDPA%2BEN_REF_WASCOL............&pd=2020,2020&to[TIME_PERIOD]=false"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            Pacific Data Hub SDG 11 Disaster Statistics
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
                    {livelihoodsByIso.get(c.iso)?.livelihoods != null
                      ? fmtInt(livelihoodsByIso.get(c.iso)!.livelihoods)
                      : "not reported"}
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
        </div>
      )}
    </figure>
  );
}