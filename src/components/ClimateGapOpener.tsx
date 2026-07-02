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
  coral: "var(--danger, #e07a7a)",
  surface: "var(--surface, #ffffff)",
} as const;

/* Same framing as the Section 1 scatter, so the told version and the
   interactive version below are spatially consistent. */
const X_DOMAIN: [number, number] = [0.1, 0.82];
const Y_DOMAIN: [number, number] = [0.25, 0.7];

/* ------------------------------------------------------------------ story
   Five beats. Each owns one screen of scroll. The chart animates between
   them; the message crossfades. The final beat hands off to the title. */
interface Beat {
  kicker?: string;
  message: string;
}
const BEATS: Beat[] = [
  {
    kicker: "Every country in the world",
    message:
      "Placed by how exposed it is to a changing climate, and how ready it is to adapt.",
  },
  {
    kicker: "The Pacific Islands",
    message: "A small cluster, set apart from the rest of the world.",
  },
  {
    kicker: "Among the most vulnerable",
    message:
      "High on the scale of climate risk — and far from the most ready to adapt.",
  },
  {
    kicker: "Two decades pass",
    message: "The world moves around them. Their position barely does.",
  },
  {
    kicker: "A gap that has held for twenty years",
    message: "And a gap this persistent carries a cost.",
  },
];
const TIME_BEAT = 3; // 0-indexed: the "two decades" beat scrubs the years

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

interface ScatterColdOpenProps {
  onContinue?: () => void;
}

export default function ScatterColdOpen({ onContinue }: ScatterColdOpenProps = {}) {
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
  const total = BEATS.length;

  /* ---- scroll → segment + progress (mirrors PacificScrollyMap) */
  const onScroll = useCallback(() => {
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

  const vulnRef = useMemo(() => {
    if (!ts) return 0.429;
    const vs = Object.values(ts.medianSplits).map((m) => m.vulnerability);
    return vs.reduce((s, n) => s + n, 0) / vs.length;
  }, [ts]);

  /* ---- scales */
  const margin = useMemo(
    () => ({
      top: isSmall ? 60 : 90,
      right: isSmall ? 26 : 70,
      bottom: isSmall ? 60 : 90,
      left: isSmall ? 26 : 70,
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

  /* ---- animation drivers derived from (seg, prog) ------------------------
     appear   – dots fade in during beat 0
     pacific  – coral ignites from beat 1 on
     lineOn   – reference line from beat 2 on
     yearT    – 0 for setup beats, scrubs 0→1 during the time beat, 1 after
     recede   – chart pulls back on the final beat to reveal the title      */
  const appear = seg > 0 ? 1 : smooth(prog);
  const pacific = seg >= 1 ? 1 : 0;
  const lineOn = seg >= 2 ? 1 : 0;
  const yearT =
    seg < TIME_BEAT ? 0 : seg === TIME_BEAT ? smooth(prog) : 1;
  const recede = seg >= total - 1 ? smooth(prog) : 0;

  /* ---- interpolate positions at yearT */
  const N = ts?.years.length ?? 0;
  const idxF = yearT * Math.max(N - 1, 0);
  const i0 = Math.floor(idxF);
  const i1 = Math.min(i0 + 1, Math.max(N - 1, 0));
  const frac = idxF - i0;
  const currentYear = ts ? ts.years[Math.round(idxF)] : null;

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
        };
      })
      .filter(
        (d): d is { iso: string; pic: boolean; cx: number; cy: number } =>
          d !== null
      );
  }, [ts, trajectories, i0, i1, frac, x, y, margin, innerW, innerH]);

  const refY = margin.top + y(vulnRef);
  const worldDim = pacific ? 0.34 : 0.5;
  const chartOpacity = 1 - 0.7 * recede;

  const ready = ts && w > 0 && h > 0;

  const handleContinue = () => {
    if (onContinue) onContinue();
    else window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <div ref={wrapRef} style={{ height: `${total * 100}vh` }}>
      <div
        className="sticky top-0 overflow-hidden"
        style={{ height: "100vh", background: C.surface }}
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
                opacity: chartOpacity,
                transition: "opacity 0.3s linear",
              }}
            >
              {/* reference line */}
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
                />
                <text
                  x={margin.left}
                  y={refY - 8}
                  fontSize={isSmall ? 9.5 : 11}
                  fill={C.muted}
                  opacity={0.75}
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    letterSpacing: "0.02em",
                  }}
                >
                  more vulnerable than most of the world ↑
                </text>
              </g>

              {/* world dots (grey base for everyone) */}
              <g style={{ opacity: appear, transition: "opacity 0.2s linear" }}>
                {positioned.map((d) => (
                  <circle
                    key={d.iso}
                    cx={d.cx}
                    cy={d.cy}
                    r={isSmall ? 2.4 : 3.2}
                    fill={C.faint}
                    opacity={d.pic ? worldDim : worldDim}
                    style={{ transition: "opacity 0.5s ease" }}
                  />
                ))}
              </g>

              {/* Pacific coral overlay — fades in on beat 1 */}
              <g style={{ opacity: pacific, transition: "opacity 0.7s ease" }}>
                {positioned
                  .filter((d) => d.pic)
                  .map((d) => (
                    <g key={`p-${d.iso}`}>
                      <circle cx={d.cx} cy={d.cy} r={isSmall ? 11 : 15} fill={C.coral} opacity={0.12} />
                      <circle
                        cx={d.cx}
                        cy={d.cy}
                        r={isSmall ? 4.6 : 6.2}
                        fill={C.coral}
                        stroke={C.surface}
                        strokeWidth={1.5}
                        opacity={0.95}
                      />
                    </g>
                  ))}
              </g>
            </svg>
          )}

          {/* ticking year — appears once the time beat begins */}
          {ready && currentYear != null && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: isSmall ? 18 : 30,
                right: isSmall ? 20 : 40,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: isSmall ? "1.5rem" : "2.2rem",
                fontWeight: 700,
                color: C.faint,
                letterSpacing: "0.04em",
                opacity: (seg >= TIME_BEAT ? 0.55 : 0) * (1 - recede),
                transition: "opacity 0.5s ease",
              }}
            >
              {currentYear}
            </div>
          )}

          {/* message — lower third, crossfades per beat */}
          {ready && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: isSmall ? 96 : 120,
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
                  maxWidth: 560,
                  textAlign: "center",
                  animation: "coldopen-fade 0.6s ease both",
                }}
              >
                {BEATS[seg].kicker && (
                  <p
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: isSmall ? "0.62rem" : "0.72rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: C.coral,
                      margin: 0,
                      marginBottom: 10,
                      opacity: 1 - recede,
                    }}
                  >
                    {BEATS[seg].kicker}
                  </p>
                )}
                <p
                  className="font-serif"
                  style={{
                    color: C.ink,
                    fontSize: isSmall ? "1.15rem" : "1.55rem",
                    lineHeight: 1.3,
                    fontWeight: 500,
                    margin: 0,
                    opacity: 1 - recede,
                  }}
                >
                  {BEATS[seg].message}
                </p>
              </div>
            </div>
          )}

          {/* scroll cue — only on the very first frame */}
          {ready && (
            <button
              onClick={handleContinue}
              aria-label="Scroll to begin"
              style={{
                position: "absolute",
                bottom: isSmall ? 28 : 40,
                left: "50%",
                transform: "translateX(-50%)",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.muted,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: isSmall ? "0.6rem" : "0.68rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: seg === 0 && prog < 0.4 ? 0.9 : 0,
                transition: "opacity 0.5s ease",
                pointerEvents: seg === 0 ? "auto" : "none",
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
            </button>
          )}
        </div>
      </div>

      {/* accessible summary */}
      <p className="sr-only">
        An opening sequence: every country in the world plotted by climate
        vulnerability and readiness. The Pacific Island Countries sit among the
        most vulnerable and least ready. Across 2004 to 2023 the world shifts
        around them while their position barely changes.
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