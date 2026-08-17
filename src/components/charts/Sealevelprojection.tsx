"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { asset } from "@/lib/basePath";

/* =====================================================================
   SeaLevelProjection: projected sea level rise for the Pacific Island
   Countries, from IPCC AR6. The reader picks an emissions pathway
   (Lower, Middle, Higher) and a place (the Pacific as a whole, or one
   country); the median line is drawn with its 17 to 83 likely range as
   a shaded band, the other pathways stay faint for comparison, and
   dynamic callouts mark the value at 2050 and 2100.

   Integrity notes baked into the design:
   - Every country uses the same AR6 gridded regional projection, so
     differences reflect climate, not one tide gauge's local subsidence.
   - The headline is the median with a labelled likely range, not the
     worst-case percentile. The band already contains the 83rd.
   - The caption states the baseline and that local land subsidence can
     add to the regional figure shown here.
   ===================================================================== */

type Band = { p17: number[]; p50: number[]; p83: number[] };
type ScenarioSet = { Lower: Band; Middle: Band; Higher: Band };
interface SLRData {
  unit: string;
  baseline: string;
  years: number[];
  source: string;
  colors: Record<string, string>;
  order: string[];
  regional: ScenarioSet;
  countries: Record<string, ScenarioSet>;
}

const REGIONAL = "the Pacific Islands";
const DEFAULT_PLACE = REGIONAL; // honest default: the regional line
const DEFAULT_SCENARIO = "Higher";
const CALLOUT_YEARS = [2020, 2040, 2060, 2080, 2100];

/* Reader-friendly label for each pathway ("Middle" -> "Intermediate", to
   match IPCC terminology), and the underlying SSP scenario each maps to,
   revealed on hover so the technical detail is available without cluttering
   the headline-level pathway names. */
const SCENARIO_LABELS: Record<string, string> = {
  Lower: "Lower",
  Middle: "Intermediate",
  Higher: "Higher",
};
const SSP_LABELS: Record<string, string> = {
  Lower: "SSP1-2.6",
  Middle: "SSP2-4.5",
  Higher: "SSP5-8.5",
};

const fmt = (v: number) => (v >= 0 ? "+" : "") + Math.round(v) + " cm";

export default function SeaLevelProjection() {
  const [data, setData] = useState<SLRData | null>(null);
  const [place, setPlace] = useState<string>(DEFAULT_PLACE);
  const [scenario, setScenario] = useState<string>(DEFAULT_SCENARIO);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [w, setW] = useState(640);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const selRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    fetch(asset("/data/slr_projection.json"))
      .then((r) => r.json())
      .then((d: SLRData) => setData(d))
      .catch((e) => console.error("SLR load failed:", e));
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      if (cw) setW(Math.max(300, cw));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [data]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => clearCloseTimer, []);

  const set = useMemo<ScenarioSet | null>(() => {
    if (!data) return null;
    return place === REGIONAL ? data.regional : data.countries[place];
  }, [data, place]);

  if (!data || !set) {
    return <div className="w-full animate-pulse rounded-lg bg-slate-100" style={{ height: 360 }} />;
  }

  const years = data.years;
  const N = years.length;
  const y0 = years[0];
  const y1 = years[N - 1];
  const color = data.colors[scenario];

  const H = w < 480 ? 336 : 386;
  const mL = 50;
  const mR = 56;
  const mT = 44;
  const mB = 56;
  const yMax = 110;

  /* Domain starts a bit before the first tick (2020), so the first x-axis
     label sits with a gap to the right of the y-axis instead of flush
     against it — mirrors AdaptationBurden, whose log domain (from 30)
     starts well before its first drawn tick (100). */
  const domainStart = y0 - 6;
  const domainSpan = y1 - domainStart;
  const X = (yr: number) => mL + ((yr - domainStart) / domainSpan) * (w - mL - mR);
  const Y = (v: number) => H - mB + (v / yMax) * (mT - (H - mB));

  const line = (arr: number[]) =>
    arr.map((v, i) => `${i ? "L" : "M"}${X(years[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");

  const band = () => {
    let d = set[scenario as keyof ScenarioSet].p83
      .map((v, i) => `${i ? "L" : "M"}${X(years[i]).toFixed(1)},${Y(v).toFixed(1)}`)
      .join(" ");
    const lo = set[scenario as keyof ScenarioSet].p17;
    for (let i = N - 1; i >= 0; i--) d += ` L${X(years[i]).toFixed(1)},${Y(lo[i]).toFixed(1)}`;
    return d + " Z";
  };

  const sel = set[scenario as keyof ScenarioSet];
  const others = data.order.filter((s) => s !== scenario);

  const handleMove = (clientX: number) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const yr = Math.round((domainStart + ((clientX - r.left) / r.width * w - mL) / (w - mL - mR) * domainSpan) / 10) * 10;
    if (yr < y0 || yr > y1) return;
    setHoverYear(yr);
  };

  const gridV = [0, 25, 50, 75, 100];
  const xTicks = [2020, 2040, 2060, 2080, 2100];
  const places = [REGIONAL, ...Object.keys(data.countries).sort()];

  return (
    <figure className="w-full" style={{ margin: 0 }}>
      
    {/* headline with inline place selector */}
<div
  style={{
    maxWidth: 640,
    margin: "0 auto",
    paddingLeft: 16,
    paddingRight: 16,
  }}
>
  <div
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
    As the climate warms, sea level in{" "}
    <span
      ref={selRef}
      onMouseEnter={() => { clearCloseTimer(); setMenuOpen(true); }}
      onMouseLeave={() => {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => setMenuOpen(false), 200);
      }}
      style={{
        position: "relative",
        display: "inline-block",
      }}
    >
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        className="underline underline-offset-2 transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
        style={{
          font: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          lineHeight: "inherit",
          fontFamily: "inherit",
          color: "inherit",
          background: "transparent",
          border: "none",
          padding: "1px 6px",
          margin: 0,
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          verticalAlign: "baseline",
        }}
      >
        {place}

        <span
          aria-hidden="true"
          style={{
            width: "0.38em",
            height: "0.38em",
            borderRight: "1.5px solid currentColor",
            borderBottom: "1.5px solid currentColor",
            transform: menuOpen
              ? "rotate(-135deg)"
              : "rotate(45deg)",
            transition: "transform 0.15s ease",
            marginTop: menuOpen ? "0.15em" : "-0.15em",
            flexShrink: 0,
          }}
        />
      </button>

      {menuOpen && (
        <ul
          role="listbox"
          className="shadow-lg"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            zIndex: 20,
            listStyle: "none",
            padding: "4px 0",
            minWidth: 260,
            background: "rgba(255, 255, 255, 0.85)",
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
          }}
        >
          {places.map((p) => {
            const isHovered = p === hoveredPlace;
            return (
              <li
                key={p}
                role="option"
                aria-selected={p === place}
              >
                <button
                  type="button"
                  onClick={() => {
                    clearCloseTimer();
                    setPlace(p);
                    setMenuOpen(false);
                    setHoverYear(null);
                  }}
                  onMouseEnter={() => setHoveredPlace(p)}
                  onMouseLeave={() => setHoveredPlace(null)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 14px",
                    border: "none",
                    background: isHovered ? "#e7ecf3" : p === place ? "#f1f4f8" : "transparent",
                    color: isHovered ? "#20242e" : "#9096a1",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: isHovered ? 700 : 400,
                  }}
                >
                  {p}
                </button>
              </li>
            );
          })}
        </ul>
      )}
        </span>
    {" "}
    is projected to rise substantially through the century.
  </div>

  <p
    className="section-subtitle"
    style={{
      marginTop: 0,
      marginBottom: 16
    }}
  >
    Projected change in sea level relative to the 1995–2014 average.
  </p>

        {/* pathway selector — plain editorial text, not a button group */}
        <div style={{ textAlign: "center", marginTop: 36, marginBottom: 6 }}>
          <div
            style={{
              fontSize: "0.86rem",
              fontWeight: 350,
              color: "var(--text-color)",
              marginBottom: "1rem",
              fontFamily: "var(--font-sans)",
            }}
          >
            Emissions scenario
          </div>
          <div style={{ display: "inline-flex", gap: 28, fontFamily: "var(--font-sans)" }}>
            {data.order.map((s) => {
              const on = s === scenario;
              const hovered = s === hoveredScenario;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScenario(s)}
                  onMouseEnter={() => setHoveredScenario(s)}
                  onMouseLeave={() => setHoveredScenario(null)}
                  onFocus={() => setHoveredScenario(s)}
                  onBlur={() => setHoveredScenario(null)}
                  aria-label={`${SCENARIO_LABELS[s] ?? s} emissions, ${SSP_LABELS[s] ?? s}`}
                  style={{
                    position: "relative",
                    background: "transparent",
                    border: "none",
                    padding: "0 0 3px",
                    cursor: "pointer",
                    fontSize: on ? "0.9rem" : "0.78rem",
                    fontWeight: on || hovered ? 700 : 300,
                    color: on ? data.colors[s] : hovered ? "#40454f" : "#9096a1",
                    whiteSpace: "nowrap",
                  }}
                >
                  {hovered && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginBottom: 6,
                        padding: "2px 7px",
                        background: "rgba(32, 36, 46, 0.72)",
                        color: "#ffffff",
                        fontSize: "0.66rem",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontWeight: 500,
                        borderRadius: 4,
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        zIndex: 5,
                      }}
                    >
                      {SSP_LABELS[s] ?? s}
                    </span>
                  )}
                  {SCENARIO_LABELS[s] ?? s} emissions
                  {on && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 2,
                        borderRadius: 1,
                        background: data.colors[s],
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* chart */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
      <div ref={wrapRef} style={{ position: "relative", fontFamily: "var(--font-sans)" }}>
        <svg
          ref={svgRef}
          width="100%"
          height={H}
          viewBox={`0 0 ${w} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Projected sea level rise for ${place} under ${scenario.toLowerCase()} emissions, 2020 to 2100.`}
          style={{ display: "block", cursor: "crosshair", overflow: "visible" }}
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerLeave={() => setHoverYear(null)}
        >
          {gridV.map((v) => (
            <g key={v}>
              <line x1={mL} x2={w - mR} y1={Y(v)} y2={Y(v)} stroke="#eceae4" strokeWidth={0.6} strokeOpacity={0.6} />
              <text
                x={mL - 6}
                y={Y(v) + 3}
                textAnchor="end"
                fill="#404040"
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", fontWeight: 300 }}
              >
                {v}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text
              key={t}
              x={X(t)}
              y={H - mB + 22}
              textAnchor="middle"
              fill="#404040"
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", fontWeight: 300 }}
            >
              {t}
            </text>
          ))}

          {/* axis titles */}
          <text
            x={mL + (w - mL - mR) / 2}
            y={H - 8}
            textAnchor="middle"
            fill="#707070"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 300 }}
          >
            Year →
          </text>
          <text
            x={14}
            y={(mT + (H - mB)) / 2}
            textAnchor="middle"
            transform={`rotate(-90, 14, ${(mT + (H - mB)) / 2})`}
            fill="#707070"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 300 }}
          >
            Change in sea level (cm)
          </text>

          {/* faint other pathways — context only, just a 2100 dot */}
          {others.map((s, oi) => {
            const p = set[s as keyof ScenarioSet].p50;
            const otherColor = oi === 0 ? "#9ca3af" : "#c7c5be";
            return (
              <g key={s}>
                <path d={line(p)} fill="none" stroke={otherColor} strokeWidth={1.4} />
                <circle cx={X(y1)} cy={Y(p[N - 1])} r={3} fill={otherColor} />
              </g>
            );
          })}

          {/* selected band + median */}
          <path d={band()} fill={color} fillOpacity={0.15} />
          <path d={line(sel.p50)} fill="none" stroke={color} strokeWidth={2.6} />

          {/* milestone dots + dashed guides down to the axis */}
          {CALLOUT_YEARS.map((yr) => {
            const i = years.indexOf(yr);
            if (i < 0) return null;
            const px = X(yr);
            const py = Y(sel.p50[i]);
            return (
              <g key={yr}>
                <line x1={px} x2={px} y1={py} y2={H - mB} stroke={color} strokeOpacity={0.35} strokeDasharray="2 3" strokeWidth={1} />
                <circle cx={px} cy={py} r={3.5} fill={color} />
              </g>
            );
          })}

          {/* hover marker */}
          {hoverYear != null && (
            <g>
              <line x1={X(hoverYear)} x2={X(hoverYear)} y1={mT} y2={H - mB} stroke="#b6b3ab" strokeDasharray="3 3" />
              <circle cx={X(hoverYear)} cy={Y(sel.p50[years.indexOf(hoverYear)])} r={3.5} fill={color} />
            </g>
          )}
        </svg>

        {/* dynamic milestone callouts — hidden for whichever year is being
            hovered, so the hover tooltip can show that same figure with
            more detail instead of the two overlapping. */}
        {CALLOUT_YEARS.map((yr) => {
          const i = years.indexOf(yr);
          if (i < 0 || hoverYear === yr) return null;
          const px = X(yr);
          const py = Y(sel.p50[i]);
          return (
            <div key={yr} style={{ position: "absolute", left: px, top: py - 22, transform: "translateX(-50%)", pointerEvents: "none", textAlign: "center" }}>
              <div style={{ color, fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {fmt(sel.p50[i])}
              </div>
            </div>
          );
        })}

        {/* 2100 figure for the two non-selected pathways, muted by default */}
        {others.map((s) => {
          const p = set[s as keyof ScenarioSet].p50;
          const px = X(y1);
          const py = Y(p[N - 1]);
          return (
            <div key={s} style={{ position: "absolute", left: px, top: py - 22, transform: "translateX(-50%)", pointerEvents: "none", textAlign: "center" }}>
              <div style={{ color: "#9096a1", fontWeight: 350, fontSize: "0.66rem", whiteSpace: "nowrap", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {fmt(p[N - 1])}
              </div>
            </div>
          );
        })}

        {/* hover tooltip: year + median + likely range, anchored to the
            hovered point on the selected line. Replaces the plain milestone
            figure while it's showing, so nothing overlaps. */}
        {hoverYear != null && (() => {
          const hi = years.indexOf(hoverYear);
          const hpx = X(hoverYear);
          const hpy = Y(sel.p50[hi]);
          return (
            <div
              style={{
                position: "absolute",
                left: hpx,
                top: hpy,
                transform: "translate(-50%, -100%) translateY(-10px)",
                pointerEvents: "none",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.85)",
                padding: "6px 10px",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.16)",
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  color: "#20242e",
                  fontWeight: 700,
                  fontSize: "0.74rem",
                  fontVariantNumeric: "tabular-nums",
                  paddingBottom: 4,
                  marginBottom: 4,
                  borderBottom: "1px solid #e5e5e5",
                }}
              >
                {hoverYear}
              </div>
              <div style={{ color, fontWeight: 700, fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                {fmt(sel.p50[hi])}
              </div>
              <div style={{ color: "#9096a1", fontSize: "0.66rem", fontVariantNumeric: "tabular-nums" }}>
                likely range: {Math.round(sel.p17[hi])} - {Math.round(sel.p83[hi])} cm
              </div>
            </div>
          );
        })()}
      </div>
      </div>

      {/* caption */}
      <figcaption className="chart-caption text-left" style={{ maxWidth: 640, margin: "18px auto 0", paddingLeft: 16, paddingRight: 16 }}>
        <p style={{ margin: "8px 0 8px" }}>
          Note: Shared Socioeconomic Pathways (SSPs) represent different future greenhouse gas emissions levels: SSP1-2.6 (low), SSP2-4.5 (intermediate) and SSP5-8.5 (high). Shaded areas show the 17th–83rd percentile projection range.
        </p>
        <p style={{ margin: "0 0 16px" }}>
          Source:{" "}
          <a
            href="https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            IPCC AR6 Working Group I, via the NASA Sea Level Projection Tool
          </a>
          .
        </p>
      </figcaption>

      {/* a11y table */}
      <div className="sr-only">
        <table>
          <caption>Projected sea level rise (cm above the 1995 to 2014 average), median, by place and pathway, at 2050 and 2100.</caption>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Pathway</th>
              <th scope="col">2050</th>
              <th scope="col">2100</th>
            </tr>
          </thead>
          <tbody>
            {[REGIONAL, ...Object.keys(data.countries).sort()].map((pl) => {
              const s = pl === REGIONAL ? data.regional : data.countries[pl];
              const i2050 = years.indexOf(2050);
              const i2100 = years.indexOf(2100);
              return data.order.map((sc) => (
                <tr key={pl + sc}>
                  <td>{pl}</td>
                  <td>{sc} emissions</td>
                  <td>{fmt(s[sc as keyof ScenarioSet].p50[i2050])}</td>
                  <td>{fmt(s[sc as keyof ScenarioSet].p50[i2100])}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </figure>
  );
}