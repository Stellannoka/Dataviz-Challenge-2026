"use client";

import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { asset } from "@/lib/basePath";
import { CONTAINER_WIDTH } from "@/components/Container";

/* =====================================================================
   AdaptationBurden: closing visual of Section 3.
   A scatter of adaptation need (% of GDP) against economic size
   (nominal GDP, log scale), reproducing the encoding of the source
   paper's Figure 2.7 panel 1. The downward trend is the thesis: the
   smallest economies carry the largest relative adaptation burden.

   X: nominal GDP, US$ million, log scale  (IMF WEO, Oct 2019)
   Y: annual adaptation need as % of GDP    (IMF WP/26/83, Fig 2.8)
   The two axes are separate published inputs, NOT a quotient. The
   paper's % uses a different denominator, so we never recompute it.

   One dot colour throughout; the message rests on position, not
   category. Nauru's need is a random-forest model estimate (marked *).
   ===================================================================== */

interface Row {
  iso: string;
  country: string;
  pctGDP: number;
  gdpUSDm: number;
  imputed: boolean;
  /* Annual adaptation need in 2024 USD million. Source: Figure 2.3 of the
     paper (bar chart values), except Nauru which uses pctGDP × 2024 WEO GDP
     (the paper uses an RF synthetic estimate for Nauru and excludes it from
     Fig 2.3). NOT derived from pctGDP × gdpUSDm: the x-axis uses 2019 WEO
     GDP while the paper's % denominators are heterogeneous across source
     studies spanning 2013-2024, making that multiplication unreliable. */
  needUSDm?: number;
}
interface BurdenData {
  data: Row[];
}

/* Single dot colour: the piece's muted blue. */
const DOT = "var(--primary, #6d8499";
/* Thin edge on the dots, default state. */
const DOT_EDGE = "var(--surface, #ffffff)";
/* Grey treatment for non-hovered dots while another dot is hovered. */
const DOT_DIM = "#d7dbe3";
const DOT_DIM_EDGE = "var(--surface, #ffffff)";

/* Axis styling, mirrored from the finance chart so the two read as one
   family: tick labels at 0.88rem / 300 / --text-secondary, axis titles
   at 0.72rem / 300 / #707070, gridlines #e9e9f1 at 0.5 opacity, tick
   rules #9096a1 at 0.6 opacity. */
const GRID = "#e9e9f1";
const GRID_OPACITY = 0.6;
const GRID_STROKE_WIDTH = 0.6;
const TICK_RULE = "#4d5561";
const TICK_RULE_OPACITY = 0.5;
const TICK_TEXT = "#404040"; // var(--text-secondary)
const AXIS_TITLE = "#707070";
const TREND = "#707070";

const TICK_FONT_SIZE = "0.88rem";
const TICK_WEIGHT = 300;
const AXIS_TITLE_FONT_SIZE = "0.72rem";
const AXIS_TITLE_WEIGHT = 300;

const ANIM = "0.7s cubic-bezier(0.4, 0, 0.2, 1)";

/* How far the vertical gridlines rise above the top (40%) horizontal
   gridline, matching the finance chart's grid treatment. */
const GRID_TOP_OVERSHOOT = 16;

/* Tooltip geometry. The box is placed on whichever side of the dot has
   room (above, below, right or left) and a small caret points back to it. */
const DOT_GAP = 6; // gap between the dot and the caret tip
const CARET_SIZE = 12; // side of the rotated square that forms the caret
const CARET_HALF = CARET_SIZE / 2;
const CARET_PROT = 7; // caret reach, reserved when spacing the box
const CARET_MARGIN = 14; // keep the caret clear of the box's rounded corners
const TIP_EDGE = 8; // viewport edge padding

/* Fallback side placement (dx, dy from the dot, text-anchor) for country
   labels that can't sit above their dot. Tuned to the log-GDP layout; any
   iso not listed falls back to a right nudge. */
const LABEL_OFFSET: Record<string, [number, number, "start" | "end"]> = {
  MHL: [9, -6, "start"],
  KIR: [-9, -2, "end"],
  TUV: [9, 0, "start"],
  FSM: [9, 4, "start"],
  NRU: [-9, 4, "end"],
  SLB: [9, 0, "start"],
  TON: [-9, -3, "end"],
  VUT: [9, -3, "start"],
  WSM: [9, 9, "start"],
  FJI: [-9, 0, "end"],
  PLW: [-9, 0, "end"],
  PNG: [-9, 0, "end"],
};

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const u = () => setPhone(window.innerWidth < 640);
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);
  return phone;
}
function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const u = () => setR(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);
  return r;
}

/* Least-squares fit of y on ln(x), for the dotted trend line. */
function trendLine(rows: Row[]) {
  const pts = rows.map((r) => ({ x: Math.log(r.gdpUSDm), y: r.pctGDP }));
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export default function AdaptationBurden() {
  const [d, setD] = useState<BurdenData | null>(null);
  const [w, setW] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const isPhone = useIsPhone();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  /* Tooltip anchored to the hovered/tapped dot. We store the dot's on-screen
     centre (the tooltip is position:fixed) so the box can be placed on the
     side that has room and a caret can point back to the dot. */
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<
    { dotX: number; dotY: number; dotR: number; row: Row; isTouch: boolean } | null
  >(null);
  const [tipSize, setTipSize] = useState<{ w: number; h: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const showTip = (row: Row, cx: number, cy: number, isTouch: boolean) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = w > 0 ? rect.width / w : 1;
    const sy = rect.height / H;
    setHover({
      dotX: rect.left + cx * sx,
      dotY: rect.top + cy * sy,
      dotR: rDot * sy,
      row,
      isTouch,
    });
  };
  const hideTip = () => setHover(null);

  /* Measure the box so it can be centred over the dot and flipped if needed. */
  useLayoutEffect(() => {
    if (!hover) {
      setTipSize(null);
      return;
    }
    const n = tipRef.current;
    if (!n) return;
    const r = n.getBoundingClientRect();
    setTipSize({ w: r.width, h: r.height });
  }, [hover]);

  /* Dismiss on scroll always. Mouse-triggered tooltips are dismissed by
     onMouseLeave; touch has no equivalent "leave" gesture, so those still
     need a timed dismiss. */
  useEffect(() => {
    if (!hover) return;
    const dismiss = () => setHover(null);
    window.addEventListener("scroll", dismiss, { capture: true, passive: true });
    const t = hover.isTouch ? window.setTimeout(dismiss, 6000) : undefined;
    return () => {
      window.removeEventListener("scroll", dismiss, { capture: true });
      if (t !== undefined) window.clearTimeout(t);
    };
  }, [hover]);

  /* Always position below the dot, clamped horizontally to stay on screen,
     with the caret pointing back up at the dot. */
  const tip = useMemo(() => {
    if (!hover || !tipSize) return null;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const clamp = (v: number, lo: number, hi: number) =>
      Math.min(Math.max(v, lo), hi);

    const boxW = tipSize.w;
    const { dotX, dotY, dotR } = hover;
    const off = dotR + DOT_GAP + CARET_PROT;

    const left = clamp(dotX - boxW / 2, TIP_EDGE, vw - boxW - TIP_EDGE);
    const top = dotY + off;
    const cl = clamp(dotX - left, CARET_MARGIN, boxW - CARET_MARGIN);
    const caret = { left: cl - CARET_HALF, top: -CARET_HALF };

    return { left, top, caret };
  }, [hover, tipSize]);

  useEffect(() => {
    fetch(asset("/data/adaptation_gdp_scatter.json"))
      .then((r) => r.json())
      .then((j: BurdenData) => setD(j))
      .catch((err) => console.error("Adaptation burden load failed:", err));
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [d]);

  useEffect(() => {
    if (!d) return;
    if (reduced) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [d, reduced]);

  const H = isPhone ? 380 : 440;
  const m = useMemo(
    () => ({ t: isPhone ? 42 : 46, r: isPhone ? 16 : 26, b: 58, l: isPhone ? 56 : 62 }),
    [isPhone]
  );
  const iw = Math.max(w - m.l - m.r, 0);
  const ih = H - m.t - m.b;

  /* Shared left edge for the y tick numbers and the y-axis title, so the
     title reads as the label for the column of numbers below it. */
  const yLabelX = m.l - 34;

  const xMinLog = Math.log10(30);
  const xMaxLog = Math.log10(35000);
  const X = (g: number) =>
    m.l + ((Math.log10(g) - xMinLog) / (xMaxLog - xMinLog)) * iw;
  const yMax = 40;
  const Y = (v: number) => m.t + ih - (v / yMax) * ih;

  const xTicks = [100, 300, 1000, 3000, 10000, 30000];
  const yTicks = [0, 10, 20, 30, 40];

  const fit = useMemo(() => (d ? trendLine(d.data) : null), [d]);

  if (!d) {
    return (
      <div
        className="w-full animate-pulse rounded-lg bg-slate-100"
        style={{ height: 460 }}
      />
    );
  }

  const rDot = isPhone ? 5.5 : 6.5;

  const fmtGDP = (g: number) =>
    g >= 1000 ? `$${(g / 1000).toFixed(g >= 10000 ? 0 : 1)}b` : `$${g}m`;

  return (
    <figure className="w-full" style={{ margin: 0, background: "transparent" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
        <p
          className="leading-snug"
          style={{
            marginTop: 40,
            marginBottom: 8,
            fontSize: "0.9rem",
            fontWeight: 500,
            color: "var(--text-color)",
            fontFamily: "var(--font-serif)",
          }}
        >
         Annual adaptation needs are large relative to the size of the economies.
        </p>
        <p className="section-subtitle" style={{ marginBottom: 18 }}>
          Annual adaptation need as a share of GDP, against economic size.
        </p>
      </div>

      <div
        ref={stageRef}
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "0 16px",
          fontFamily: "var(--font-sans)",
        }}
        role="img"
        aria-label={
          "Scatter plot of adaptation need as a percentage of GDP against nominal GDP on a log scale, for the 12 Pacific Island Countries. Smaller economies carry higher relative adaptation needs."
        }
      >
        {w > 0 && (
          <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H}>
            {/* gridlines + Y tick labels */}
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                {t !== 0 && (
                  <line
                    x1={m.l}
                    y1={Y(t)}
                    x2={m.l + iw}
                    y2={Y(t)}
                    stroke={GRID}
                    strokeWidth={GRID_STROKE_WIDTH}
                    opacity={GRID_OPACITY}
                  />
                )}
                <text
                  x={yLabelX}
                  y={Y(t) + 4}
                  textAnchor="start"
                  fill={TICK_TEXT}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: TICK_FONT_SIZE,
                    fontWeight: TICK_WEIGHT,
                  }}
                >
                  {t}%
                </text>
              </g>
            ))}

            {/* X tick marks + labels */}
            {xTicks.map((t) => (
              <g key={`x${t}`}>
                <line
                  x1={X(t)}
                  y1={m.t - GRID_TOP_OVERSHOOT}
                  x2={X(t)}
                  y2={m.t + ih}
                  stroke={GRID}
                  strokeWidth={GRID_STROKE_WIDTH}
                  opacity={GRID_OPACITY}
                />
                <line
                  x1={X(t)}
                  y1={m.t + ih}
                  x2={X(t)}
                  y2={m.t + ih + 5}
                  stroke={TICK_RULE}
                  strokeWidth={0.75}
                  opacity={TICK_RULE_OPACITY}
                />
                <text
                  x={X(t)}
                  y={m.t + ih + 19}
                  textAnchor="middle"
                  fill={TICK_TEXT}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: TICK_FONT_SIZE,
                    fontWeight: TICK_WEIGHT,
                  }}
                >
                  {fmtGDP(t)}
                </text>
              </g>
            ))}

            {/* dotted trend line (need falls as economic size rises) */}
            {fit && (
              <>
                <line
                  x1={X(40)}
                  y1={Y(Math.max(0, Math.min(yMax, fit.intercept + fit.slope * Math.log(40))))}
                  x2={X(30000)}
                  y2={Y(Math.max(0, Math.min(yMax, fit.intercept + fit.slope * Math.log(30000))))}
                  stroke={TREND}
                  strokeWidth={1.5}
                  strokeDasharray="2 3"
                  opacity={0.7}
                />
                <text
                  x={X(30000)}
                  y={Y(Math.max(0, Math.min(yMax, fit.intercept + fit.slope * Math.log(30000)))) - 8}
                  textAnchor="end"
                  fill={TREND}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.68rem",
                    fontWeight: 400,
                    fontStyle: "italic",
                  }}
                >
                  Trend
                </text>
              </>
            )}

            {/* axis titles */}
            <text
              x={m.l + iw / 2}
              y={H - 6}
              textAnchor="middle"
              fill={AXIS_TITLE}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: AXIS_TITLE_FONT_SIZE,
                fontWeight: AXIS_TITLE_WEIGHT,
              }}
            >
              Nominal GDP, log scale (Economic size) →
            </text>
            {/* Y-axis title: horizontal, at the top, left edge sharing the
                tick numbers' left edge (yLabelX). */}
            <text
              x={yLabelX}
              y={16}
              textAnchor="start"
              fill={AXIS_TITLE}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: AXIS_TITLE_FONT_SIZE,
                fontWeight: AXIS_TITLE_WEIGHT,
              }}
            >
              Adaptation need, % of GDP
            </text>

            {/* dots + labels (single colour) */}
            {(() => {
              const hoveredIso = hover?.row.iso ?? null;
              return d.data.map((r, i) => {
              const cx = X(r.gdpUSDm);
              const cy = Y(r.pctGDP);
              const dimmed = hoveredIso !== null && hoveredIso !== r.iso;

              const labelText = r.country + (r.imputed ? " *" : "");

              /* Prefer a label centred above the dot when there is vertical
                 room and no other dot sits where the label would land; else
                 fall back to the tuned side offset. Width/height are derived
                 from the label font so the collision test tracks the size.
                 Phone gets a smaller font than ClimateGapOpener's country
                 labels since full country names (not ISO codes) need to fit
                 the narrower stage without colliding. */
              const labelFont = isPhone ? 9 : 15;
              const charW = labelFont * 0.58;
              const lw = labelText.length * charW;
              const lh = labelFont + 2;
              const aboveBaseline = cy - rDot - (isPhone ? 6 : 7);
              const aboveTop = aboveBaseline - lh;
              const boxL = cx - lw / 2;
              const boxR = cx + lw / 2;
              const roomAbove =
                aboveTop > m.t &&
                !d.data.some((o) => {
                  if (o.iso === r.iso) return false;
                  const ox = X(o.gdpUSDm);
                  const oy = Y(o.pctGDP);
                  return (
                    ox > boxL - rDot &&
                    ox < boxR + rDot &&
                    oy > aboveTop - 2 &&
                    oy < cy - 2
                  );
                });

              let lx: number;
              let ly: number;
              let anchor: "start" | "middle" | "end";
              if (roomAbove) {
                lx = cx;
                ly = aboveBaseline;
                anchor = "middle";
              } else {
                const [odx, ody, a] = LABEL_OFFSET[r.iso] ?? [9, 0, "start"];
                lx = cx + odx;
                ly = cy + ody + 3.5;
                anchor = a;
              }

              return (
                <g
                  key={r.iso}
                  style={{
                    opacity: shown ? 1 : 0,
                    transform: shown ? "none" : "translateY(6px)",
                    transition: reduced
                      ? "none"
                      : `opacity ${ANIM}, transform ${ANIM}`,
                    transitionDelay: reduced ? "0ms" : `${Math.min(i * 45, 500)}ms`,
                  }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rDot}
                    fill={dimmed ? DOT_DIM : DOT}
                    fillOpacity={0.9}
                    stroke={dimmed ? DOT_DIM_EDGE : DOT_EDGE}
                    strokeWidth={1}
                    style={{ cursor: "pointer", transition: "fill 0.15s, stroke 0.15s" }}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor={anchor}
                    fontSize={labelFont}
                    fontWeight={400}
                    fill={TICK_TEXT}
                    style={{
                      fontFamily: "var(--font-sans)",
                      opacity: dimmed ? 0 : 1,
                      transition: "opacity 0.15s",
                      pointerEvents: "none",
                    }}
                  >
                    {labelText}
                  </text>
                  {/* Enlarged transparent hit area for easier hover/tap */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rDot + 6}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => showTip(r, cx, cy, false)}
                    onMouseLeave={hideTip}
                    onTouchStart={() => showTip(r, cx, cy, true)}
                  />
                </g>
              );
              });
            })()}
          </svg>
        )}
      </div>

      {/* Tooltip: placed on whichever side of the dot has room, with a caret
          pointing back to it. Rendered invisibly until measured. */}
      {hover && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: tip ? tip.left : hover.dotX,
            top: tip ? tip.top : hover.dotY,
            opacity: tip ? 1 : 0,
            transition: "opacity 0.12s ease-out",
          }}
        >
          <div
            ref={tipRef}
            className="relative rounded-lg bg-white/95 p-3 shadow-xl backdrop-blur-sm"
            style={{
              zIndex: 1,
              maxWidth: "min(300px, 80vw)",
              minWidth: 150,
              fontFamily: "var(--font-sans)",
              color: "var(--text-secondary, #404040)",
            }}
          >
            {/* Country: the tooltip's heading. */}
            <p
              style={{
                margin: 0,
                fontSize: "0.92rem",
                fontWeight: 700,
                lineHeight: 1.2,
                color: "var(--text-color, #0f172a)",
              }}
            >
              {hover.row.country}
            </p>

            {/* Adaptation need: the chart's core metric, as a complete
                sentence with just the figure colored, not badged. */}
            <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid #ecebf3" }}>
              <p style={{ margin: 0, fontSize: "0.78rem", lineHeight: 1.35, color: TICK_TEXT }}>
                Estimated annual adaptation need is{" "}
                <strong style={{ color: DOT, fontWeight: 700 }}>{hover.row.pctGDP}% of GDP</strong>.
              </p>
            </div>

            {/* Supporting figures: smaller and muted, subordinate to the
                headline stat above. */}
            <div style={{ marginTop: 7, fontSize: "0.74rem", lineHeight: "1.1rem", color: AXIS_TITLE }}>
              {hover.row.needUSDm != null && <p style={{ margin: 0 }}>{fmtGDP(hover.row.needUSDm)} a year</p>}
              <p style={{ margin: hover.row.needUSDm != null ? "1px 0 0" : 0 }}>
                Nominal GDP: {fmtGDP(hover.row.gdpUSDm)}
              </p>
            </div>

            {hover.row.imputed && (
              <p style={{ margin: "6px 0 0", fontSize: "0.7rem", fontStyle: "italic", color: AXIS_TITLE }}>
                Adaptation need is a model estimate.
              </p>
            )}
          </div>
          {/* Caret: a small square rotated 45°, straddling the box edge on the
              side that faces the dot. */}
          {tip && (
            <div
              style={{
                position: "absolute",
                left: tip.caret.left,
                top: tip.caret.top,
                width: CARET_SIZE,
                height: CARET_SIZE,
                background: "rgba(255, 255, 255, 0.95)",
                transform: "rotate(45deg)",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)",
                zIndex: 2,
              }}
            />
          )}
        </div>
      )}

      <figcaption
        className="mt-4 leading-snug chart-caption text-left"
        style={{
          maxWidth: CONTAINER_WIDTH,
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: 16,
          paddingRight: 16,
          marginBottom: "1rem",
        }}
      >
        <p style={{ margin: 0 }}>
          Note: Nauru&rsquo;s need (marked *) is a model estimate, as
          only one underlying study was available.
        </p>
        <p style={{ margin: "8px 0 16px" }}>
          Sources:{" "}
          <a
            href="https://www.imf.org/-/media/files/publications/wp/2026/english/wpiea2026083-source-pdf.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 text-[#707070] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            Climate Finance and Adaptation Needs in Pacific Island Countries, IMF Working Paper (Gonguet et al.,
            2026)
          </a>
          {"; nominal GDP from "}
          <a
            href="https://www.imf.org/en/Publications/WEO/weo-database/2019/October"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 text-[#707070] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            IMF World Economic Outlook (October 2019)
          </a>
          .
        </p>
      </figcaption>

      <div className="sr-only">
        <table>
          <caption>
            Annual climate-adaptation need as a percentage of GDP, and nominal
            GDP, by Pacific Island Country.
          </caption>
          <thead>
            <tr>
              <th scope="col">Country</th>
              <th scope="col">Adaptation need, % of GDP</th>
              <th scope="col">Nominal GDP, US$ million</th>
            </tr>
          </thead>
          <tbody>
            {d.data.map((r) => (
              <tr key={r.iso}>
                <td>{r.country}</td>
                <td>{r.pctGDP}%</td>
                <td>{r.gdpUSDm.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}