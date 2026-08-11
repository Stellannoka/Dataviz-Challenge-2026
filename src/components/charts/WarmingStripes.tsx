"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { asset } from "@/lib/basePath";

/* =====================================================================
   WarmingStripes: observed sea surface temperature anomalies as annual
   warming stripes, one row per year, 1850 to 2025. Cooler than the
   long-term average reads blue, warmer reads red.

   Interaction (borrowed from the inline-word selector pattern): the
   country name lives inside the sentence above the chart. Clicking it
   opens the list of the twelve countries; picking one repaints the
   strip and updates the trend readout. Regional average exists in the
   data but is deliberately kept out of the picker, so the chart always
   speaks about one country's own record.
   ===================================================================== */

interface CountrySeries {
  iso: string;
  country: string;
  trendPerDecade: number;
  values: (number | null)[];
}
interface StripData {
  meta: {
    source: string;
    sourceUrl: string;
    baselineNote: string;
  };
  years: number[];
  valueRange: [number, number];
  regional: { trendPerDecade: number; values: (number | null)[] };
  countries: CountrySeries[];
}

/* Diverging blue to paper to red, centred at 0, built from the
   project's own --primary-vivid (blue) and --secondary (red) so the
   scale reads as this site's colors rather than a generic palette. */
const STOPS: [number, [number, number, number]][] = [
  [-2.0, [20, 55, 85]],
  [-1.0, [46, 111, 163]],
  [-0.4, [150, 190, 215]],
  [0.0, [240, 239, 232]],
  [0.4, [240, 200, 200]],
  [1.0, [224, 122, 122]],
  [1.6, [150, 50, 50]],
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function toHex(c: number[]) {
  return (
    "#" +
    c.map((v) => ("0" + Math.round(v).toString(16)).slice(-2)).join("")
  );
}
function stripeColor(v: number | null): string {
  if (v == null) return "#e7e6e1";
  if (v <= STOPS[0][0]) return toHex(STOPS[0][1]);
  if (v >= STOPS[STOPS.length - 1][0]) return toHex(STOPS[STOPS.length - 1][1]);
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [x0, c0] = STOPS[i];
    const [x1, c1] = STOPS[i + 1];
    if (v >= x0 && v <= x1) {
      const t = (v - x0) / (x1 - x0);
      return toHex([
        lerp(c0[0], c1[0], t),
        lerp(c0[1], c1[1], t),
        lerp(c0[2], c1[2], t),
      ]);
    }
  }
  return "#f7f7f7";
}

const fmtAnom = (v: number | null) =>
  v == null ? "no data" : (v >= 0 ? "+" : "") + v.toFixed(1) + "\u00B0C";
const fmtTrend = (v: number) =>
  (v >= 0 ? "+" : "") + v.toFixed(2) + "\u00B0C";

/* Which country the chart opens on. */
const DEFAULT_COUNTRY = "Fiji";

export default function WarmingStripes() {
  const [data, setData] = useState<StripData | null>(null);
  const [selected, setSelected] = useState<string>(DEFAULT_COUNTRY);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  const stripRef = useRef<SVGSVGElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(asset("/data/sst_anomalies.json"))
      .then((r) => r.json())
      .then((d: StripData) => setData(d))
      .catch((err) => console.error("SST load failed:", err));
  }, []);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const current = useMemo(
    () => data?.countries.find((c) => c.country === selected) ?? null,
    [data, selected]
  );

  if (!data || !current) {
    return (
      <div
        className="w-full animate-pulse rounded-lg bg-slate-100"
        style={{ height: 320 }}
      />
    );
  }

  const years = data.years;
  const N = years.length;
  const isSmall = width > 0 && width < 480;
  const isMedium = width >= 480 && width < 768;
  const stripH = isSmall ? 160 : isMedium ? 195 : 230;

  const handleMove = (clientX: number) => {
    const el = stripRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const i = Math.min(N - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * N)));
    setHoverIdx(i);
  };

  // year ticks: fewer on narrow phones so labels do not crowd
  const tickStep = isSmall ? 50 : 25;
  const ticks: number[] = [];
  for (let y = 1850; y <= 2025; y += tickStep) ticks.push(y);
  if (ticks[ticks.length - 1] !== 2025) ticks.push(2025);

  // legend: numbered gradient spanning the true data range, zero marked
  const [vmin, vmax] = data.valueRange;
  const zeroPct = ((0 - vmin) / (vmax - vmin)) * 100;
  const legendStops: string[] = [];
  for (let i = 0; i <= 48; i++) {
    legendStops.push(stripeColor(vmin + ((vmax - vmin) * i) / 48));
  }
  const endLabel = (v: number) => (v > 0 ? "+" : "") + v.toFixed(1);

  return (
    <figure className="w-full" style={{ margin: 0, background: "transparent" }}>
      {/* Title with inline country selector + subtitle */}
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
          The ocean around{" "}
          <span
            ref={selectorRef}
            onMouseLeave={() => setMenuOpen(false)}
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              style={{
                font: "inherit",
                color: "var(--text-color)",
                fontWeight: 700,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                whiteSpace: "nowrap",
              }}
            >
              {current.country}
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  fontSize: "0.65em",
                  marginLeft: 5,
                  transform: menuOpen ? "rotate(180deg)" : "none",
                  transition: "transform 150ms ease",
                }}
              >
                &#9660;
              </span>
            </button>
            {menuOpen && (
              <ul
                role="listbox"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  zIndex: 20,
                  listStyle: "none",
                  padding: "4px 0",
                  margin: 0,
                  minWidth: 240,
                  maxHeight: 260,
                  overflowY: "auto",
                  background: "#ffffff",
                  border: "1px solid #e2e2dc",
                  borderRadius: 8,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 400,
                }}
              >
                {data.countries.map((c) => {
                  const on = c.country === selected;
                  const isHovered = c.country === hoveredCountry;
                  return (
                    <li key={c.iso} role="option" aria-selected={on}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(c.country);
                          setMenuOpen(false);
                          setHoverIdx(null);
                        }}
                        onMouseEnter={() => setHoveredCountry(c.country)}
                        onMouseLeave={() => setHoveredCountry(null)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "6px 14px",
                          border: "none",
                          background: isHovered ? "#e7ecf3" : on ? "#f1f4f8" : "transparent",
                          color: "#404040",
                          cursor: "pointer",
                          fontSize: "1rem",
                          fontWeight: isHovered ? 700 : 400,
                          textAlign: "left",
                        }}
                      >
                        {c.country}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </span>{" "}
          has grown steadily warmer.
        </p>
        <p className="section-subtitle" style={{ marginBottom: 24 }}>
          Mean sea surface temperature anomalies relative to the 1971-2000
          climatological baseline.
        </p>
      </div>

      {/* Chart */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "0 16px",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* hover readout */}
        <div
          style={{
            height: 20,
            marginBottom: 8,
            fontSize: "0.78rem",
            color: "#707070",
            fontVariantNumeric: "tabular-nums",
            textAlign: "center",
          }}
        >
          {hoverIdx != null ? (
            <span>
              <b style={{ color: "#404040" }}>{years[hoverIdx]}</b>{" "}
              {fmtAnom(current.values[hoverIdx])}
            </span>
          ) : (
            <span>Hover a stripe to read its year.</span>
          )}
        </div>

        {/* stripes */}
        <svg
          ref={stripRef}
          viewBox={`0 0 ${N} ${stripH}`}
          preserveAspectRatio="none"
          width="100%"
          height={stripH}
          role="img"
          aria-label={`Annual sea surface temperature anomaly for ${current.country}, 1850 to 2025. Cooler than average in blue, warmer in red.`}
          style={{ display: "block", cursor: "crosshair" }}
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerLeave={() => setHoverIdx(null)}
        >
          {current.values.map((v, i) => (
            <rect
              key={years[i]}
              x={i}
              y={0}
              width={1.02}
              height={stripH}
              fill={stripeColor(v)}
            />
          ))}
          {hoverIdx != null && (
            <rect
              x={hoverIdx}
              y={0}
              width={1.02}
              height={stripH}
              fill="none"
              stroke="#1f2430"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* year axis */}
        <div style={{ position: "relative", height: 18, marginTop: 4 }}>
          {ticks.map((y) => {
            const left = ((y - years[0]) / (N - 1)) * 100;
            const anchor =
              y === years[0] ? "0%" : y >= 2025 ? "100%" : "-50%";
            return (
              <span
                key={y}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  transform: `translateX(${anchor})`,
                  fontSize: "0.68rem",
                  color: "#9096a1",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {y}
              </span>
            );
          })}
        </div>

        {/* legend: numbered gradient with zero marked at the white point */}
        <div style={{ maxWidth: 340, marginTop: 20 }}>
          <div style={{ position: "relative", height: 12 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 2,
                background: `linear-gradient(to right, ${legendStops.join(",")})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${zeroPct}%`,
                top: -3,
                bottom: -3,
                width: 1,
                background: "#3a3f47",
              }}
            />
          </div>
          <div
            style={{
              position: "relative",
              height: 16,
              marginTop: 5,
              fontSize: "0.72rem",
              color: "#707070",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ position: "absolute", left: 0 }}>{endLabel(vmin)}</span>
            <span
              style={{
                position: "absolute",
                left: `${zeroPct}%`,
                transform: "translateX(-50%)",
                color: "#404040",
              }}
            >
              0{"\u00B0"}C
            </span>
            <span style={{ position: "absolute", right: 0 }}>{endLabel(vmax)}</span>
          </div>
        </div>
      </div>

      {/* caption */}
      <figcaption
        className="chart-caption text-left"
        style={{
          maxWidth: 640,
          marginLeft: "auto",
          marginRight: "auto",
          marginTop: 24,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <p style={{ margin: "0 0 16px" }}>
          Sources:{" "}
          <a
            href={data.meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            Pacific Data Hub, Pacific Community (SPC)
          </a>
          .
        </p>
      </figcaption>

      {/* a11y table */}
      <div className="sr-only">
        <table>
          <caption>
            Sea surface temperature warming by Pacific Island Country: trend per
            decade since 1982, and anomaly in 1850 and 2025.
          </caption>
          <thead>
            <tr>
              <th scope="col">Country</th>
              <th scope="col">Trend per decade (degrees C)</th>
              <th scope="col">1850 anomaly</th>
              <th scope="col">2025 anomaly</th>
            </tr>
          </thead>
          <tbody>
            {data.countries.map((c) => (
              <tr key={c.iso}>
                <td>{c.country}</td>
                <td>{fmtTrend(c.trendPerDecade)}</td>
                <td>{fmtAnom(c.values[0])}</td>
                <td>{fmtAnom(c.values[N - 1])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}