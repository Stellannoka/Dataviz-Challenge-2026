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
  UL: "#e07a7a", // High vulnerability, Low readiness - Red/coral
  UR: "#7a9fd4", // High vulnerability, High readiness - Blue
  LL: "#d4c5b3", // Low vulnerability, Low readiness - Beige/tan
  LR: "#7bbf9e", // Low vulnerability, High readiness - Green
};

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
      "Placed by how exposed it is to a changing climate, and how ready it is to adapt.",
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
    message: "The world shifts, but the Pacific Islands' position changes remarkably little.",
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

function getQuadrant(vulnerability: number, readiness: number, vulnSplit: number, readySplit: number): string {
  const highVuln = vulnerability >= vulnSplit;
  const highReady = readiness >= readySplit;
  if (highVuln && !highReady) return "UL";
  if (highVuln && highReady) return "UR";
  if (!highVuln && !highReady) return "LL";
  return "LR";
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

  /* ---- scroll → segment + progress. 100vh per beat - each scroll reveals a new phase */
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

  /* ---- animation drivers derived from (seg, prog) */
  const appear = seg > 0 ? 1 : smooth(prog);
  const pacific = seg >= 1 ? 1 : 0;
  const lineOn = seg >= LINE_BEAT ? 1 : 0;
  const readyOn = seg >= READY_BEAT ? 1 : 0;
  const yearT =
    seg < TIME_BEAT ? 0 : seg === TIME_BEAT ? smooth(prog) : 1;
  
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

  const refY = margin.top + y(vulnRef);
  const readyX = margin.left + x(readyRef);
  const worldDim = pacific ? 0.34 : 0.5;

  const ready = ts && w > 0 && h > 0;

  const handleContinue = () => {
    if (onContinue) onContinue();
    else window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
  };

  // Kicker color: beats 0 and 1 use the same muted color, beat 2+ use UL red
  const kickerColor = C.muted;

  /* ---- render the beat 1 message with highlighted "vulnerable" ---- */
  const renderMessage = (beatIdx: number, message: string) => {
    if (beatIdx === 1) {
      const parts = message.split("vulnerable");
      return (
        <>
          {parts[0]}
          <span
            style={{
              backgroundColor: QUADRANT_COLORS.UL,
              color: "#ffffff",
              padding: "1px 5px",
              borderRadius: "3px",
            }}
          >
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
          <span
            style={{
              backgroundColor: QUADRANT_COLORS.UL,
              color: "#ffffff",
              padding: "1px 5px",
              borderRadius: "3px",
            }}
          >
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
          transition: "opacity 0.4s ease",
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
              {/* horizontal "more vulnerable" reference line */}
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
                    fontFamily: "var(--font-sans)",
                    letterSpacing: "0.02em",
                  }}
                >
                  more vulnerable than most of the world ↑
                </text>
              </g>

              {/* vertical readiness line - appears at beat 2 */}
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
                />
                <text
                  x={readyX + 6}
                  y={margin.top + (isSmall ? 10 : 12)}
                  fontSize={isSmall ? 9.5 : 11}
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

              {/* world dots (grey base for everyone) */}
              <g style={{ opacity: appear, transition: "opacity 0.2s linear" }}>
                {positioned.map((d) => (
                  <circle
                    key={d.iso}
                    cx={d.cx}
                    cy={d.cy}
                    r={isSmall ? 2.4 : 3.2}
                    fill={C.faint}
                    opacity={worldDim}
                    style={{ transition: "opacity 0.5s ease" }}
                  />
                ))}
              </g>

              {/* Pacific — beat 1: all red/coral; beat 2+: quadrant colors */}
              <g style={{ opacity: pacific, transition: "opacity 0.7s ease" }}>
                {positioned
                  .filter((d) => d.pic)
                  .map((d) => {
                    const quadrant = getQuadrant(d.vulnerability, d.readiness, vulnRef, readyRef);
                    // Beat 1: all PICs use the same red/coral color
                    // Beat 2+: differentiate by quadrant
                    const color = seg >= 2
                      ? QUADRANT_COLORS[quadrant as keyof typeof QUADRANT_COLORS]
                      : QUADRANT_COLORS.UL;
                    const countryName = countryNames.get(d.iso) || d.iso;
                    const isNearRight = d.cx > w * 0.7;
                    const isNearTop = d.cy < h * 0.3;
                    const labelX = isNearRight ? d.cx - 8 : d.cx + 8;
                    const labelY = isNearTop ? d.cy + 18 : d.cy - 12;
                    const textAnchor = isNearRight ? "end" : "start";
                    
                    return (
                      <g key={`p-${d.iso}`}>
                        <circle
                          cx={d.cx}
                          cy={d.cy}
                          r={isSmall ? 5 : 7}
                          fill={color}
                          fillOpacity={0.2}
                          stroke="none"
                          style={{ transition: "fill 0.6s ease" }}
                        />
                        <circle
                          cx={d.cx}
                          cy={d.cy}
                          r={isSmall ? 3.6 : 4.8}
                          fill={color}
                          stroke={C.surface}
                          strokeWidth={0.9}
                          opacity={0.95}
                          style={{ transition: "fill 0.6s ease" }}
                        />
                        {/* Country name label */}
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor={textAnchor}
                          dominantBaseline="middle"
                          fontSize={isSmall ? 7 : 9}
                          fill={C.ink}
                          fontWeight={600}
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
                  })}
              </g>
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
                color: C.faint,
                letterSpacing: "0.04em",
                lineHeight: 1,
                opacity: seg >= TIME_BEAT ? 0.55 : 0,
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
                      marginBottom: 10,
                    }}
                  >
                    {BEATS[seg].kicker}
                  </p>
                )}
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: C.ink,
                    fontSize: isSmall ? "1.15rem" : "1.55rem",
                    lineHeight: 1.3,
                    fontWeight: 400,
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