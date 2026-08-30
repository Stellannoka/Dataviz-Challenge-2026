"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /* The two context pathways can be brought forward: hover to highlight,
     tap to lock that highlight so it survives the pointer leaving (the only
     way to hold one on touch), tap the same line again to clear it. Locks
     accumulate rather than replace, so both context pathways can be held on
     at once and compared against the selected one. */
  const [hoveredOther, setHoveredOther] = useState<string | null>(null);
  const [lockedOthers, setLockedOthers] = useState<string[]>([]);
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

  /* ---- place-menu placement ------------------------------------------
     The menu hangs off an inline word inside a wrapping sentence, so its
     anchor can sit anywhere across the line — including hard against the
     right edge on a phone. Left unchecked, a fixed-width panel anchored
     there overflows the viewport and widens the whole document, which is
     what drags every other element sideways. So the panel's width is
     capped to the viewport and its left edge is clamped into view, then
     expressed as an offset from the anchor (it stays absolutely
     positioned, so it still scrolls with the sentence it belongs to). */
  const MENU_MAX_WIDTH = 260;
  const MENU_VIEWPORT_MARGIN = 12;
  const [menuOffset, setMenuOffset] = useState(0);
  const [menuWidth, setMenuWidth] = useState(MENU_MAX_WIDTH);

  const positionMenu = useCallback(() => {
    const el = selRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(MENU_MAX_WIDTH, vw - MENU_VIEWPORT_MARGIN * 2);
    const clampedLeft = Math.min(
      Math.max(MENU_VIEWPORT_MARGIN, r.left),
      vw - MENU_VIEWPORT_MARGIN - width
    );
    setMenuWidth(width);
    setMenuOffset(clampedLeft - r.left);
  }, []);

  /* Re-clamp while the menu is open: rotating a phone or resizing moves the
     anchor, and a stale offset would put the panel back off-screen. */
  useEffect(() => {
    if (!menuOpen) return;
    const onResize = () => positionMenu();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [menuOpen, positionMenu]);

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

  const isSmall = w < 480;
  const H = isSmall ? 336 : 386;
  /* Margins shrink on phone the same way VulnerabilityScatter's do — fixed
     desktop-sized margins eat a much bigger share of a ~340px-wide phone
     screen, compressing the actual plot into the middle and leaving the
     reclaimed edge space looking like dead air next to the chart. */
  const mL = isSmall ? 34 : 50;
  const mR = isSmall ? 30 : 56;
  const mT = isSmall ? 34 : 44;
  const mB = isSmall ? 46 : 56;
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

  /* The 17th-83rd percentile ribbon for any pathway: the p83 edge left to
     right, then the p17 edge back again. Takes the scenario as an argument
     so a highlighted context pathway can draw its own band, not just the
     selected one. */
  const band = (sc: string) => {
    let d = set[sc as keyof ScenarioSet].p83
      .map((v, i) => `${i ? "L" : "M"}${X(years[i]).toFixed(1)},${Y(v).toFixed(1)}`)
      .join(" ");
    const lo = set[sc as keyof ScenarioSet].p17;
    for (let i = N - 1; i >= 0; i--) d += ` L${X(years[i]).toFixed(1)},${Y(lo[i]).toFixed(1)}`;
    return d + " Z";
  };

  const sel = set[scenario as keyof ScenarioSet];
  const others = data.order.filter((s) => s !== scenario);

  /* Whether a context pathway is currently brought forward. A lock and a
     hover are independent: holding one line locked does not stop the other
     from lighting up under the pointer, so a locked line can be compared
     against its neighbour instead of the lock swallowing every hover.
     Both are available whichever pathway is selected, but both are cleared
     when the selection changes (see the scenario buttons) so each new pick
     starts from just the selected line. */
  const isOtherActive = (s: string) =>
    lockedOthers.includes(s) || s === hoveredOther;

  /* Tap toggles this line's own lock and leaves any other lock alone, so
     tapping both context pathways holds both on rather than the second tap
     stealing the highlight from the first. */
  const toggleOtherLock = (s: string) =>
    setLockedOthers((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );

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
      fontWeight: 550,
      color: "var(--text-color)",
      fontFamily: "var(--font-serif)",
    }}
  >
    As the climate warms, sea level in{" "}
    <span
      ref={selRef}
      onMouseEnter={() => { clearCloseTimer(); positionMenu(); setMenuOpen(true); }}
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
        onClick={() => {
          /* Measure before opening: on touch there is no hover pass to have
             done it already. */
          positionMenu();
          setMenuOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        className="underline underline-offset-2 decoration-[var(--primary,#6d8499)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
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
            /* Clamped into the viewport rather than pinned to the anchor —
               see positionMenu. */
            left: menuOffset,
            width: menuWidth,
            boxSizing: "border-box",
            marginTop: 4,
            zIndex: 20,
            listStyle: "none",
            padding: "4px 0",
            background: "rgba(255, 255, 255, 0.95)",
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


        {/* pathway selector — segmented control: reads unmistakably as
            "pick one of these", the three options are visibly mutually
            exclusive as a single grouped control, and it's the most
            compact option (matters on phone). */}
        <div style={{ textAlign: "center", marginTop: 36, marginBottom: 6 }}>
          <div
            style={{
              fontSize: "0.86rem",
              fontWeight: 350,
              color: "var(--text-color)",
              marginBottom: "0.6rem",
              fontFamily: "var(--font-sans)",
            }}
          >
            Emissions scenario
          </div>
          <div
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: isSmall ? 3 : 1,
              rowGap: isSmall ? 4 : 1,
              maxWidth: "100%",
              borderRadius: 5,
              background: "rgba(249, 249, 249, 0.5)",
              padding: "0 2px",
              fontFamily: "var(--font-sans)",
            }}
          >
            {data.order.map((s) => {
              const on = s === scenario;
              const hovered = s === hoveredScenario;
              const label = isSmall ? SCENARIO_LABELS[s] ?? s : `${SCENARIO_LABELS[s] ?? s} emissions`;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setScenario(s);
                    /* Picking a pathway is a fresh start: drop every held
                       highlight so the chart returns to just the selected
                       line against its two grey context pathways. */
                    setLockedOthers([]);
                    setHoveredOther(null);
                  }}
                  onMouseEnter={() => setHoveredScenario(s)}
                  onMouseLeave={() => setHoveredScenario(null)}
                  onFocus={() => setHoveredScenario(s)}
                  onBlur={() => setHoveredScenario(null)}
                  aria-pressed={on}
                  aria-label={`${SCENARIO_LABELS[s] ?? s} emissions, ${SSP_LABELS[s] ?? s}`}
                  style={{
                    position: "relative",
                    border: "none",
                    borderRadius: 5,
                    background: on ? data.colors[s] : "transparent",
                    /* Hovering an unselected option previews its identity by
                       taking that pathway's own colour — the same colour the
                       line and its 2100 figure carry when highlighted. */
                    color: on ? "#ffffff" : hovered ? data.colors[s] : "#707070",
                    padding: isSmall ? (on ? "4px 8px" : "4px 9px") : on ? "5px 11px" : "5px 13px",
                    fontSize: isSmall ? "0.72rem" : on ? "0.78rem" : hovered ? "0.8rem" : "0.78rem",
                    fontWeight: on ? 700 : 300,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "background-color 150ms ease, color 150ms ease, font-size 150ms ease, padding 150ms ease",
                  }}
                >
                  {hovered && !isSmall && (
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
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* chart */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px" }}>
      <div ref={wrapRef} style={{ position: "relative", fontFamily: "var(--font-sans)" }}>
        <svg
          ref={svgRef}
          width={w}
          height={H}
          role="img"
          aria-label={`Projected sea level rise for ${place} under ${scenario.toLowerCase()} emissions, 2020 to 2100.`}
          style={{ display: "block", overflow: "visible" }}
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

          {/* faint other pathways — context only, just a 2100 dot. Neutral
              grey and appreciably thinner than the selected median (2.6),
              so the selected pathway reads as the subject and these two as
              background reference. The two greys differ only enough to tell
              them apart from each other. */}
          {others.map((s, oi) => {
            const p = set[s as keyof ScenarioSet].p50;
            const isOn = isOtherActive(s);
            /* Highlighting reveals the pathway's own colour — which is also
               what identifies it, since that colour is what the line would
               carry if it were selected. Thickness still stays under the
               selected median's 2.6, so bringing a context pathway forward
               never makes it outrank the chosen one. */
            const otherColor = isOn
              ? data.colors[s]
              : oi === 0
              ? "#a3a8b0"
              : "#c8ccd2";
            return (
              <g key={s}>
                {/* Likely range, shown only while this pathway is brought
                    forward. Fainter than the selected band's 0.15 so the
                    two never read as equals when they overlap. */}
                {isOn && (
                  <path d={band(s)} fill={data.colors[s]} fillOpacity={0.1} />
                )}
                <path
                  d={line(p)}
                  fill="none"
                  stroke={otherColor}
                  strokeWidth={isOn ? 1.9 : 1}
                  style={{ transition: "stroke 0.15s ease, stroke-width 0.15s ease" }}
                />
                <circle
                  cx={X(y1)}
                  cy={Y(p[N - 1])}
                  r={isOn ? 3.2 : 2.5}
                  fill={otherColor}
                  style={{ transition: "fill 0.15s ease, r 0.15s ease" }}
                />
                {/* Invisible fat stroke: a 1px line is far too thin to point
                    at, so this carries the hover/tap instead. It sits above
                    the visible line but below the selected pathway, which is
                    drawn after it. */}
                <path
                  d={line(p)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  strokeLinecap="round"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredOther(s)}
                  onMouseLeave={() => setHoveredOther(null)}
                  onClick={() => toggleOtherLock(s)}
                />
              </g>
            );
          })}

          {/* selected band + median */}
          <path d={band(scenario)} fill={color} fillOpacity={0.15} />
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

          {/* Year-scrub hit area for the SELECTED median, drawn last so it
              sits above everything — including the milestone dots, which
              would otherwise swallow the pointer where they cross the line
              and break the scrub. Scoping the scrub here (rather than to the
              whole svg, where it used to live) is what keeps the year
              tooltip from following the cursor over empty chart space. */}
          <path
            d={line(sel.p50)}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            strokeLinecap="round"
            style={{ cursor: "crosshair" }}
            onPointerMove={(e) => handleMove(e.clientX)}
            onPointerLeave={() => setHoverYear(null)}
          />
        </svg>

        {/* dynamic milestone callouts — hidden for whichever year is being
            hovered, so the hover tooltip can show that same figure with
            more detail instead of the two overlapping. */}
        {CALLOUT_YEARS.map((yr) => {
          const i = years.indexOf(yr);
          if (i < 0 || hoverYear === yr) return null;
          const px = X(yr);
          const py = Y(sel.p50[i]);
          /* The 2100 endpoint sits closer to its dot than the earlier
             milestones; 19px is the smallest gap that still clears the
             3.5px-radius dot without the text box overlapping it. */
          const offset = yr === 2100 ? 19 : 22;
          return (
            <div key={yr} style={{ position: "absolute", left: px, top: py - offset, transform: "translateX(-50%)", pointerEvents: "none", textAlign: "center" }}>
              <div style={{ color, fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {fmt(sel.p50[i])}
              </div>
            </div>
          );
        })}

        {/* 2100 figure for the two non-selected pathways, muted by default.
            It takes the pathway's own colour when highlighted, so the figure
            and the line it belongs to change together. */}
        {others.map((s) => {
          const p = set[s as keyof ScenarioSet].p50;
          const px = X(y1);
          const py = Y(p[N - 1]);
          const isOn = isOtherActive(s);
          return (
            <div key={s} style={{ position: "absolute", left: px, top: py - 16, transform: "translateX(-50%)", pointerEvents: "none", textAlign: "center" }}>
              <div style={{ color: isOn ? data.colors[s] : "#9096a1", fontWeight: isOn ? 700 : 350, fontSize: "0.66rem", whiteSpace: "nowrap", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", transition: "color 0.15s ease" }}>
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
                percentile range: {Math.round(sel.p17[hi])}–{Math.round(sel.p83[hi])} cm
              </div>
            </div>
          );
        })()}
      </div>
      </div>

      {/* caption */}
      <figcaption className="chart-caption text-left" style={{ maxWidth: 640, margin: "18px auto 0", paddingLeft: 16, paddingRight: 16 }}>
        <p style={{ margin: "8px 0 8px" }}>
          Note: Shared Socioeconomic Pathways (SSPs) represent different future greenhouse gas emissions levels: SSP1-2.6 (lower), SSP2-4.5 (intermediate) and SSP5-8.5 (higher). Shaded areas show the 17th–83rd percentile projection range.
        </p>
        <p style={{ margin: "0 0 16px" }}>
          Source:{" "}
          <a
            href="https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-[var(--primary,#6d8499)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
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