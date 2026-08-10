"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { asset } from "@/lib/basePath";

/* ------------------------------------------------------------------ types */
interface YearCountry {
  country: string;
  iso: string;
  vulnerability: number;
  readiness: number;
  pic?: boolean;
}
interface TimeseriesData {
  years: number[];
  byYear: Record<string, YearCountry[]>;
  medianSplits: Record<string, { readiness: number; vulnerability: number }>;
}

/* --------------------------------------------------------------- palette */
const C = {
  ink: "var(--text-color, #0f172a)",
  muted: "var(--text-secondary, #475569)",
  faint: "var(--faint, #94a3b8)",
  line: "var(--border, #cbd5e1)",
  surface: "var(--surface, #ffffff)",
} as const;

/* Quadrant colors matching the vulnerability scatter plot exactly */
const QUADRANT_COLORS = {
  UL: "#e68e8d", // High vulnerability, Low readiness - Red/coral
  UR: "#7C94AB", // High vulnerability, High readiness - Blue
  LL: "#d4c5b3", // Low vulnerability, Low readiness - Beige/tan
  LR: "#7bbf9e", // Low vulnerability, High readiness - Green
};

/* Neutral highlight for beat 1: identifies the Pacific group without
   pre-assigning any quadrant before the splits are introduced. */
const PACIFIC_HIGHLIGHT = "#e68e8d"; // Changed to match the red used for "Several"

/* Same framing as the Section 1 scatter, so the told version and the
   interactive version below are spatially consistent. */
const X_DOMAIN: [number, number] = [0.1, 0.82];
const Y_DOMAIN: [number, number] = [0.25, 0.7];

/* ------------------------------------------------------------------ story
   Six beats. Each owns one screen of scroll. The chart animates between them;
   the message crossfades. The final beat recedes and hands off to the title. */
interface Beat {
  kicker?: string;
  message: string;
}
const BEATS: Beat[] = [
  {
    kicker: "Every country in the world",
    message:
      "Placed by how vulnerable it is to a changing climate, and how ready it is to adapt.",
  },
  {
    kicker: "The Pacific Islands",
    message: "A small group, and among the most vulnerable to a changing climate.",
  },
  {
    kicker: "Yet not the most ready",
    message: "Several sit far from the readiness needed to meet that risk.",
  },
  {
    kicker: "Two decades pass",
    message:
      "Readiness shifts, but vulnerability holds. Every Pacific Island Country remained above the global vulnerability median in every year.",
  },
  {
    kicker: "The gap holds",
    message: "And a gap this persistent carries a cost.",
  },
];
const LINE_BEAT = 1; // "more exposed" reference line appears (beat 1: Pacific highlighted)
const READY_BEAT = 2; // readiness line appears (beat 2: "not the most ready")
const TIME_BEAT = 3; // the years scrub across this beat (beat 3: "two decades pass")

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getQuadrant(vulnerability: number, readiness: number, vulnSplit: number, readySplit: number): string {
  const highVuln = vulnerability >= vulnSplit;
  const highReady = readiness >= readySplit;
  if (highVuln && !highReady) return "UL";
  if (highVuln && highReady) return "UR";
  if (!highVuln && !highReady) return "LL";
  return "LR";
}

export default function ClimateGapOpener() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [ts, setTs] = useState<TimeseriesData | null>(null);

  const [seg, setSeg] = useState(0);
  const [prog, setProg] = useState(0);

  /* ---- data */
  useEffect(() => {
    fetch(asset("/data/vulnerability_global.json"))
      .then((r) => r.json())
      .then((d: TimeseriesData) => setTs(d))
      .catch((err) => console.error("Cold open load failed:", err));
  }, []);

  /* ---- responsive stage */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setW(r.width);
      setH(r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ts]);

  const isSmall = w > 0 && w < 480;
  const isMedium = w >= 480 && w < 768;
  const total = BEATS.length;

  /* ---- scroll → segment + progress. 100vh per beat - each scroll reveals a new phase */
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
      const span = el.offsetHeight - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), span);
      const p = span > 0 ? scrolled / span : 0;
      const scaled = p * total;
      let idx = Math.floor(scaled);
      if (idx >= total) idx = total - 1;
      setSeg(idx);
      setProg(scaled - idx);
    });
  }, [total]);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  /* ---- trajectories in data space */
  const trajectories = useMemo(() => {
    if (!ts) return [];
    const years = ts.years.map(String);
    const order: string[] = [];
    const byIso = new Map<
      string,
      { pic: boolean; pts: (null | { v: number; r: number })[] }
    >();
    years.forEach((y, yi) => {
      (ts.byYear[y] ?? []).forEach((c) => {
        let rec = byIso.get(c.iso);
        if (!rec) {
          rec = { pic: !!c.pic, pts: new Array(years.length).fill(null) };
          byIso.set(c.iso, rec);
          order.push(c.iso);
        }
        rec.pts[yi] = { v: c.vulnerability, r: c.readiness };
      });
    });
    return order.map((iso) => ({ iso, ...byIso.get(iso)! }));
  }, [ts]);

  // Updated: Use year-specific split values for 2023, matching the VulnerabilityScatter
  const vulnRef = useMemo(() => {
    if (!ts) return 0.422;
    const yearData = ts.medianSplits?.["2023"];
    if (yearData) return yearData.vulnerability;
    const vs = Object.values(ts.medianSplits).map((m) => m.vulnerability);
    return vs.reduce((s, n) => s + n, 0) / vs.length;
  }, [ts]);

  const readyRef = useMemo(() => {
    if (!ts) return 0.407;
    const yearData = ts.medianSplits?.["2023"];
    if (yearData) return yearData.readiness;
    const vs = Object.values(ts.medianSplits).map((m) => m.readiness);
    return vs.reduce((s, n) => s + n, 0) / vs.length;
  }, [ts]);

  /* ---- scales */
  const margin = useMemo(
    () => ({
      top: isSmall ? 56 : 90,
      right: isSmall ? 22 : 70,
      bottom: isSmall ? 60 : 90,
      left: isSmall ? 22 : 70,
    }),
    [isSmall]
  );
  const innerW = Math.max(w - margin.left - margin.right, 0);
  const innerH = Math.max(h - margin.top - margin.bottom, 0);
  const x = useMemo(
    () => scaleLinear().domain(X_DOMAIN).range([0, innerW]).clamp(true),
    [innerW]
  );
  const y = useMemo(
    () => scaleLinear().domain(Y_DOMAIN).range([innerH, 0]).clamp(true),
    [innerH]
  );

  /* ---- dot radius: matches the Svelte reference's flat 6px node size,
     with a small step-down on phones so it isn't oversized there. */
  const dotR = isSmall ? 4 : 6;

  /* ---- animation drivers derived from (seg, prog) */
  const appear = seg > 0 ? 1 : smooth(prog);
  const pacific = seg >= 1 ? 1 : 0;
  const lineOn = seg >= LINE_BEAT ? 1 : 0;
  const readyOn = seg >= READY_BEAT ? 1 : 0;
  const yearT =
    seg < TIME_BEAT ? 0 : seg === TIME_BEAT ? smooth(prog) : 1;

  /* Trail visibility: fades in as the years begin to scrub, and holds at full
     once we pass the time beat so the accumulated shape stays on screen for
     the "gap holds" beat. */
  const trailOn =
    seg < TIME_BEAT ? 0 : seg === TIME_BEAT ? smooth(prog) : 1;

  /* During the time beat, positions are scrubbed frame-by-frame by scroll,
     so a CSS position transition would lag and fight the scroll. Everywhere
     else, a transition lets dots glide when a beat changes their target.
     Longhand only: mixing the `transition` shorthand with `transitionDelay`
     in one style object triggers a React reconciliation warning. */
  const scrubbing = seg === TIME_BEAT;

  /* Beat 0's cluster -> scatter explosion is likewise driven frame-by-frame
     by `appear` (derived from scroll progress), so it needs the same
     transition-free treatment as the time-beat scrub. */
  const revealing = seg === 0;

  /* ---- scatter-and-settle -------------------------------------------------
     On the frame a phase begins, each dot is kicked to a small seeded offset
     and then released; the CSS transform transition carries it back to its
     true position, reading as a quick reshuffle. Fires on first appearance
     (whole field) and when each reference line arrives (Pacific dots only),
     never during the scrub beat, and never when the user prefers reduced
     motion. */
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* settlePhase: which beat's settle is currently playing (or null).
     kick=true for the single frame the dots are displaced, then flipped
     off so the transition animates them home. */
  const [kick, setKick] = useState(false);
  const settledBeatRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion || scrubbing) return;
    // Trigger only on entry to beats 0, 1 and 2 (appearance + each line).
    if (seg > READY_BEAT) return;
    if (settledBeatRef.current === seg) return; // already settled this beat
    settledBeatRef.current = seg;
    setKick(true);
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setKick(false))
    );
    return () => cancelAnimationFrame(id);
  }, [seg, reducedMotion, scrubbing]);

  /* World dots now animate in via the cluster -> scatter explosion (below)
     rather than a kick; only the Pacific dots still get the settle-kick
     flourish when a reference line drops in. */
  const picKick = kick && seg <= READY_BEAT;

  /* Deterministic per-index offset so the kick is stable across renders. */
  const kickOffset = useCallback(
    (i: number, active: boolean): { dx: number; dy: number } => {
      if (!active) return { dx: 0, dy: 0 };
      const mag = isSmall ? 7 : 10;
      const a = Math.sin(i * 12.9898) * 43758.5453;
      const b = Math.sin(i * 78.233) * 12543.1234;
      const ang = (a - Math.floor(a)) * Math.PI * 2;
      const dist = (0.4 + (b - Math.floor(b)) * 0.6) * mag;
      return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist };
    },
    [isSmall]
  );

  // Gradual fade: starts gently in beat 4, completes as section scrolls away
  const fadeOut = seg >= total - 1 ? smooth(prog) : 0;

  /* ---- interpolate positions at yearT */
  const N = ts?.years.length ?? 0;
  const idxF = yearT * Math.max(N - 1, 0);
  const i0 = Math.floor(idxF);
  const i1 = Math.min(i0 + 1, Math.max(N - 1, 0));
  const frac = idxF - i0;
  const currentYear = ts ? ts.years[Math.round(idxF)] : null;

  // Get country names for Pacific Islands
  const countryNames = useMemo(() => {
    if (!ts) return new Map();
    const names = new Map();
    const years = ts.years.map(String);
    years.forEach((y) => {
      (ts.byYear[y] ?? []).forEach((c) => {
        if (c.pic) {
          names.set(c.iso, c.country);
        }
      });
    });
    return names;
  }, [ts]);

  const positioned = useMemo(() => {
    if (!ts || innerW === 0 || innerH === 0) return [];
    return trajectories
      .map((t) => {
        const a = t.pts[i0] ?? t.pts[i1];
        const b = t.pts[i1] ?? t.pts[i0];
        if (!a || !b) return null;
        const v = a.v + (b.v - a.v) * frac;
        const r = a.r + (b.r - a.r) * frac;
        return {
          iso: t.iso,
          pic: t.pic,
          cx: margin.left + x(r),
          cy: margin.top + y(v),
          vulnerability: v,
          readiness: r,
        };
      })
      .filter(
        (d): d is { iso: string; pic: boolean; cx: number; cy: number; vulnerability: number; readiness: number } =>
          d !== null
      );
  }, [ts, trajectories, i0, i1, frac, x, y, margin, innerW, innerH]);

  /* ---- persistence trails: each Pacific country's path from 2004 up to the
     currently-scrubbed year. Rendered faintly behind the dots so the eye
     accumulates the shape: the tracks wander left and right (readiness moves)
     but never drop below the vulnerability median line (vulnerability holds). */
  const picTrails = useMemo(() => {
    if (!ts || innerW === 0 || innerH === 0) return [];
    const upTo = i0; // last fully-passed year index
    return trajectories
      .filter((t) => t.pic)
      .map((t) => {
        const pts: { x: number; y: number }[] = [];
        for (let yi = 0; yi <= upTo; yi++) {
          const p = t.pts[yi];
          if (p) pts.push({ x: margin.left + x(p.r), y: margin.top + y(p.v) });
        }
        // interpolated head at the current scrub position
        const a = t.pts[i0] ?? t.pts[i1];
        const b = t.pts[i1] ?? t.pts[i0];
        if (a && b) {
          const v = a.v + (b.v - a.v) * frac;
          const r = a.r + (b.r - a.r) * frac;
          pts.push({ x: margin.left + x(r), y: margin.top + y(v) });
        }
        return { iso: t.iso, pts };
      });
  }, [ts, trajectories, i0, i1, frac, x, y, margin, innerW, innerH]);

  /* ---- resting cluster: where every dot sits before the first scroll.
     Packed into a block a few dots wide (taller than it is wide, so it
     reads as a vertical cluster) at stage centre, instead of each dot
     starting at its true scatter position. Beat 0's scroll then explodes
     the cluster outward into the real vulnerability/readiness layout. */
  const clusterPositions = useMemo(() => {
    const isos = trajectories.map((t) => t.iso);
    const n = isos.length;
    const m = new Map<string, { x: number; y: number }>();
    if (!w || !h || n === 0) return m;
    const spacing = dotR * 2.3;
    const cols = Math.max(4, Math.round(Math.sqrt(n) * 0.65));
    const rows = Math.ceil(n / cols);
    const cx = w / 2;
    const cy = h / 2;
    isos.forEach((iso, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      m.set(iso, {
        x: cx + (col - (cols - 1) / 2) * spacing,
        y: cy + (row - (rows - 1) / 2) * spacing,
      });
    });
    return m;
  }, [trajectories, w, h, dotR]);

  const refY = margin.top + y(vulnRef);
  const readyX = margin.left + x(readyRef);
  const worldDim = pacific ? 0.34 : 0.5;

  const ready = ts && w > 0 && h > 0;

  const kickerColor = C.muted;

  /* ---- render the beat 1 message with highlighted "vulnerable" ---- */
  const renderMessage = (beatIdx: number, message: string) => {
    if (beatIdx === 1) {
      const parts = message.split("vulnerable");
      return (
        <>
          {parts[0]}
          <span style={{ color: QUADRANT_COLORS.UL, fontWeight: 600 }}>
            vulnerable
          </span>
          {parts[1]}
        </>
      );
    }
    if (beatIdx === 2) {
      const parts = message.split("Several");
      return (
        <>
          {parts[0]}
          <span style={{ color: QUADRANT_COLORS.UL, fontWeight: 600 }}>
            Several
          </span>
          {parts[1]}
        </>
      );
    }
    return message;
  };

  return (
    <div 
      ref={wrapRef} 
      style={{ 
        height: `${total * 100}vh`,
      }}
    >
      <div
        className="sticky top-0 overflow-hidden"
        style={{ 
          height: "100vh", 
          background: C.surface,
          opacity: 1 - fadeOut,
          transition: "opacity 1s ease",
        }}
        aria-label="Opening story: where the Pacific Islands sit on climate vulnerability and readiness, and how little it changes over two decades"
      >
        <div ref={stageRef} style={{ position: "absolute", inset: 0 }}>
          {ready && (
            <svg
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
              }}
            >
              {/* horizontal "more vulnerable" reference line — draws in
                  left-to-right (scaleX from its left edge) rather than
                  just fading in place. */}
              <g style={{ opacity: lineOn, transition: "opacity 0.6s ease" }}>
                <line
                  x1={margin.left}
                  x2={w - margin.right}
                  y1={refY}
                  y2={refY}
                  stroke={C.muted}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                  opacity={0.4}
                  style={{
                    transformBox: "view-box",
                    transformOrigin: `${margin.left}px ${refY}px`,
                    transform: `scaleX(${lineOn})`,
                    transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
                <text
                  x={margin.left}
                  y={refY - 8}
                  fontSize={isSmall ? 12 : 14}
                  fill={C.muted}
                  opacity={0.75}
                  style={{
                    fontFamily: "var(--font-sans)",
                    letterSpacing: "0.02em",
                  }}
                >
                  more vulnerable than most of the world ↑
                </text>
              </g>

              {/* vertical readiness line - appears at beat 2, drawing in
                  top-to-bottom (scaleY from its top edge). */}
              <g style={{ opacity: readyOn, transition: "opacity 0.6s ease" }}>
                <line
                  x1={readyX}
                  x2={readyX}
                  y1={margin.top}
                  y2={margin.top + innerH}
                  stroke={C.muted}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                  opacity={0.4}
                  style={{
                    transformBox: "view-box",
                    transformOrigin: `${readyX}px ${margin.top}px`,
                    transform: `scaleY(${readyOn})`,
                    transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
                <text
                  x={readyX + 6}
                  y={margin.top + (isSmall ? 10 : 12)}
                  fontSize={isSmall ? 12 : 14}
                  fill={C.muted}
                  opacity={0.75}
                  style={{
                    fontFamily: "var(--font-sans)",
                    letterSpacing: "0.02em",
                  }}
                >
                  more ready to adapt →
                </text>
              </g>

              {/* persistence trails — each Pacific country's 2004→now path,
                  faint and behind the dots. They drift horizontally but stay
                  pinned above the vulnerability median line. */}
              <g style={{ opacity: trailOn, transition: "opacity 0.4s ease" }}>
                {picTrails.map((t) => {
                  if (t.pts.length < 2) return null;
                  const d = t.pts
                    .map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + "," + p.y.toFixed(1))
                    .join("");
                  return (
                    <path
                      key={`trail-${t.iso}`}
                      d={d}
                      fill="none"
                      stroke={QUADRANT_COLORS.UL}
                      strokeWidth={1.25}
                      strokeOpacity={0.32}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}
              </g>

             {/* world dots (grey base for everyone) — actual scatter size,
    kept low-opacity so the colored Pacific dots read against them.
    Rest in a packed vertical cluster until scrolling starts, then fly
    out to their true vulnerability/readiness position as beat 0 plays
    (tracked 1:1 with scroll, like the time-beat scrub, so the motion
    doesn't lag behind the scrollbar). Pacific dots are part of this
    field too: they explode in as grey with everyone else, and the
    colored + labelled versions layer on top and wave in at beat 1. */}
<g style={{ opacity: appear, transition: "opacity 0.2s linear" }}>
  {positioned.map((d, i) => {
    const cluster = clusterPositions.get(d.iso) ?? { x: d.cx, y: d.cy };
    const curX = lerp(cluster.x, d.cx, appear);
    const curY = lerp(cluster.y, d.cy, appear);
    return (
    <rect
      key={d.iso}
      x={-dotR}
      y={-dotR}
      width={dotR * 2}
      height={dotR * 2}
      fill={C.faint}
      opacity={0.2} /* All dots (incl. Pacific) explode in as grey */
      style={{
        transform: `translate(${curX}px, ${curY}px) rotate(45deg)`,
        transitionProperty: scrubbing || revealing ? "opacity" : "transform, opacity",
        transitionDuration: scrubbing || revealing ? "0.5s" : "0.7s, 0.5s",
        transitionTimingFunction:
          scrubbing || revealing
            ? "ease"
            : "cubic-bezier(0.34,1.2,0.64,1), ease",
        transitionDelay: scrubbing || revealing ? "0ms" : `${Math.min(i * 3, 220)}ms`,
      }}
    />
    );
  })}
</g>

              {/* Pacific — beat 1: all red/coral; beat 2+: quadrant colors.
    The colored dots and their labels reveal as a left-to-right wave
    (per-dot opacity delay by x-rank) rather than a single group fade. */}
<g>
  {(() => {
    const picDots = positioned.filter((d) => d.pic);
    /* Rank by x-position rather than raw pixel offset: an evenly spaced
       step per dot reads as a clean wave, whereas a delay proportional
       to (possibly clustered) pixel position lets several close-together
       dots flip almost together and breaks the sweep. The same rank drives
       both the beat-1 reveal wave and the beat-2 fill-color wave. */
    const picOrder = [...picDots].sort((a, b) => a.cx - b.cx);
    const rankByIso = new Map(picOrder.map((d, idx) => [d.iso, idx]));
    const waveStepMs = 80;

    return picDots.map((d, i) => {
      const quadrant = getQuadrant(d.vulnerability, d.readiness, vulnRef, readyRef);
      // Beat 1: neutral highlight identifies the Pacific group
      // Beat 2+: differentiate by quadrant once the splits exist
      const color = seg >= 2
        ? QUADRANT_COLORS[quadrant as keyof typeof QUADRANT_COLORS]
        : QUADRANT_COLORS.UL; // Now using #e07a7a red for beat 1
      const countryName = countryNames.get(d.iso) || d.iso;
      const k = kickOffset(i, picKick);
      // Left-to-right stagger, collapsed to 0 under reduced-motion so the
      // group simply fades in together.
      const waveDelayMs = reducedMotion
        ? 0
        : (rankByIso.get(d.iso) ?? i) * waveStepMs;
      const transformDelayMs = Math.min(i * 12, 200);
      const noTransform = scrubbing || picKick;

      return (
        <g
          key={`p-${d.iso}`}
          style={{
            transform: `translate(${d.cx + k.dx}px, ${d.cy + k.dy}px)`,
            // Reveal each dot (and its label) as the wave reaches it. opacity
            // stays in the transition list in both branches so the stagger
            // survives the settle-kick's transform-none frames without
            // restarting.
            opacity: pacific ? 1 : 0,
            transitionProperty: noTransform ? "opacity" : "transform, opacity",
            transitionDuration: noTransform ? "0.4s" : "0.7s, 0.4s",
            transitionTimingFunction: noTransform
              ? "ease"
              : "cubic-bezier(0.34,1.2,0.64,1), ease",
            transitionDelay: noTransform
              ? `${waveDelayMs}ms`
              : `${transformDelayMs}ms, ${waveDelayMs}ms`,
          }}
        >
          <g transform="rotate(45)">
            <rect
              x={-dotR}
              y={-dotR}
              width={dotR * 2}
              height={dotR * 2}
              fill={color}
              stroke="rgba(0, 0, 0, 0.25)" /* Dark border for visibility */
              strokeWidth={isSmall ? "0.8" : "1"} /* Thin but visible border */
              opacity={0.95}
              style={{ transition: `fill 0.5s ease ${waveDelayMs}ms` }}
            />
          </g>
          {/* Country name label — above the dot, same size as the
              VulnerabilityScatter chart's active country label. */}
          <text
            x={0}
            y={-(dotR + 6)}
            textAnchor="middle"
            fontSize={isSmall ? 12 : isMedium ? 13 : 15}
            fill={C.ink}
            fontWeight={400}
            opacity={0.85}
            style={{
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.02em",
              pointerEvents: "none",
            }}
          >
            {countryName}
          </text>
        </g>
      );
    });
  })()}
</g>

              {/* Tuvalu anchor — on the "gap holds" beat, single out the
                  region's most-ready country to make the point that readiness
                  does not buy you out of vulnerability. */}
              {seg >= 4 && (() => {
                const tuv = positioned.find((d) => d.iso === "TUV");
                if (!tuv) return null;
                return (
                  <g
                    style={{ opacity: 1, transition: "opacity 0.5s ease" }}
                    pointerEvents="none"
                  >
                    <circle
                      cx={tuv.cx}
                      cy={tuv.cy}
                      r={dotR * 2.6}
                      fill="none"
                      stroke={C.ink}
                      strokeOpacity={0.45}
                      strokeWidth={1}
                    />
                    <text
                      x={tuv.cx}
                      y={tuv.cy + dotR * 2.6 + (isSmall ? 13 : 16)}
                      textAnchor="middle"
                      fontSize={isSmall ? 11 : 13}
                      fill={C.muted}
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Even the most ready still ranks 15th most vulnerable of 187
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}

          {/* ticking year — appears once the time beat begins */}
          {ready && currentYear != null && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: isSmall ? 12 : 30,
                right: isSmall ? 12 : 40,
                fontFamily: "var(--font-sans)",
                fontSize: isSmall ? "1.05rem" : "2.2rem",
                fontWeight: 700,
                color: "rgb(45, 45, 45)",
                letterSpacing: "0.04em",
                lineHeight: 1,
                opacity: seg >= TIME_BEAT ? 0.55 : 0,
                transition: "opacity 0.5s ease",
              }}
            >
              {currentYear}
            </div>
          )}

          {/* message — lower third, crossfades per beat. Pulled down closer
              to the bottom edge (was 96/120) so the block clears the dot
              cluster above it instead of nearly touching it. */}
          {ready && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: isSmall ? 58 : 72,
                display: "flex",
                justifyContent: "center",
                paddingLeft: 24,
                paddingRight: 24,
                pointerEvents: "none",
              }}
            >
              <div
                key={seg}
                style={{
                  maxWidth: 660,
                  textAlign: "center",
                  animation: "coldopen-fade 0.6s ease both",
                  pointerEvents: "auto",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                }}
              >
                {BEATS[seg].kicker && (
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: isSmall ? "0.62rem" : "0.72rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: kickerColor,
                      margin: 0,
                      marginBottom: 12,
                    }}
                  >
                    {BEATS[seg].kicker}
                  </p>
                )}
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: "rgb(45, 45, 45)",
                    fontSize: isSmall ? "1.15rem" : "1.3rem",
                    lineHeight: 1.75,
                    letterSpacing: "0.012em",
                    fontWeight: 350,
                    margin: 0,
                  }}
                >
                  {renderMessage(seg, BEATS[seg].message)}
                </p>
              </div>
            </div>
          )}

          {/* scroll indicator — subtle visual cue, not clickable */}
          {ready && seg === 0 && prog < 0.4 && (
            <div
              style={{
                position: "absolute",
                bottom: isSmall ? 28 : 40,
                left: "50%",
                transform: "translateX(-50%)",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                color: C.muted,
                fontFamily: "var(--font-sans)",
                fontSize: isSmall ? "0.6rem" : "0.68rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.7,
                pointerEvents: "none",
              }}
            >
              Scroll
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M4 6l4 4 4-4"
                  fill="none"
                  stroke={C.muted}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <animate
                    attributeName="opacity"
                    values="0.4;1;0.4"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* accessible summary */}
      <p className="sr-only">
        An opening sequence: every country in the world plotted by climate
        vulnerability and readiness. The Pacific Island Countries all sit in
        the high-vulnerability half, and several remain among the least ready
        to adapt. Across 2004 to 2023 the world shifts around them while their
        position barely changes.
      </p>

      <style>{`
        @keyframes coldopen-fade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}