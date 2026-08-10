"use client";

import { useEffect, useState, useRef } from "react";
import { asset } from "@/lib/basePath";

/* =====================================================================
   DisplacementChart — a 1:1 port of the approved HTML prototype.
   Simple bars, fixed label column, hazard-coloured fills, square corners
   (matching FinanceGap's bars). Per-100k only — no absolute/per-100k
   toggle.
   ===================================================================== */

type HazardKey = "cyclone" | "flood" | "landslide" | "other";

interface Row {
  iso: string;
  country: string;
  absolute: number;
  per100k: number;
  dominantHazard: HazardKey;
}
interface DisplacementData {
  year: number;
  absentLine?: string;
  data: Row[];
}

const HAZARD_COLOR: Record<HazardKey, string> = {
  cyclone: "#c76153" /* matches --accent-bubble, the Section 2 (disaster
    impact) accent used throughout the map */,
  flood: "#7C94AB" /* matches --primary — water reads naturally as the
    project's teal, and it keeps cyclone/flood clearly distinct */,
  landslide: "#7a6a58",
  other: "#c4a06a",
};
const HAZARD_LABEL: Record<HazardKey, string> = {
  cyclone: "Cyclone & storm",
  flood: "Flood",
  landslide: "Landslide",
  other: "Other",
};

/* Row height kept tight for easy comparison; bars a bit thicker than
   FinanceGap's BAR_HEIGHT (22) for more visual weight. */
const ROWH = 31;
const BAR_H = 25;
const LEGEND_SWATCH_RADIUS = 2;
/* Matches FinanceGap's bars. */
const BAR_RADIUS = 1.5;
const ANIM = "0.72s cubic-bezier(0.4, 0, 0.2, 1)";

const fmt = (n: number) => Math.round(n).toLocaleString();

export default function DisplacementChart() {
  const [data, setData] = useState<DisplacementData | null>(null);
  const [barW, setBarW] = useState(0);
  const [isPhone, setIsPhone] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(asset("/data/displacement_2020.json"))
      .then((r) => r.json())
      .then((d: DisplacementData) => setData(d))
      .catch((err) => console.error("Displacement load failed:", err));
  }, []);

  useEffect(() => {
    const update = () => setIsPhone(window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const node = barRef.current;
    if (!node) return;
    const ro = new ResizeObserver((es) => {
      for (const e of es) setBarW(e.contentRect.width);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [data]);

  const valueOf = (r: Row) => r.per100k;

  if (!data) {
    return (
      <div
        className="w-full animate-pulse rounded-lg bg-slate-100"
        style={{ height: 360 }}
      />
    );
  }

  const LABELW = isPhone ? 110 : 130;
  const rows = data.data;
  const ordered = [...rows].sort((a, b) => valueOf(b) - valueOf(a));
  const rank = new Map(ordered.map((r, i) => [r.iso, i]));
  const max = Math.max(...rows.map(valueOf)) * 1.04;
  const pct = (v: number) => (v / max) * 100;
  const hazardsPresent = (
    ["cyclone", "flood", "landslide", "other"] as HazardKey[]
  ).filter((h) => rows.some((r) => r.dominantHazard === h));

  const axisTitle = `Displacements per 100,000 residents, ${data.year}`;

  return (
    <figure className="w-full" style={{ margin: 0, background: "transparent" }}>
      {/* Title + subtitle */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
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
         Displacements varied widely between countries, even after accounting for population size.

        </p>
        <p
          className="section-subtitle"
          style={{
            marginTop: 0,
            marginBottom: 18,
          }}
        >
       Displacements triggered by weather-related disasters per 100,000 people, 2020
        </p>
      </div>

      {/* Chart — text-column width, simple bar chart */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "0 16px",
          fontFamily: "var(--font-sans)",
        }}
        role="img"
        aria-label={`${axisTitle}, by country, sorted from highest to lowest`}
      >
        {/* legend */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: "8px 16px",
            marginBottom: 14,
            fontSize: "0.75rem",
            color: "#707070",
            width: "100%",
          }}
        >
          {hazardsPresent.map((h) => (
            <span
              key={h}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: LEGEND_SWATCH_RADIUS,
                  background: HAZARD_COLOR[h],
                  display: "inline-block",
                }}
              />
              {HAZARD_LABEL[h]}
            </span>
          ))}
        </div>

        {/* rows */}
        <div style={{ position: "relative", height: rows.length * ROWH }}>
          {rows.map((r, idx) => {
            const v = valueOf(r);
            const ep = pct(v);
            const filled = (ep / 100) * barW;
            const est = (isPhone ? 10.5 : 12.5) * 4.6;
            const inside = barW > 0 && filled >= est + 16;
            return (
              <div
                key={r.iso}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: ROWH,
                  transform: `translateY(${(rank.get(r.iso) ?? 0) * ROWH}px)`,
                  transition: `transform ${ANIM}`,
                  display: "grid",
                  gridTemplateColumns: `${LABELW}px 1fr`,
                  columnGap: 20,
                  alignItems: "center",
                }}
              >
                {/* label */}
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      fontSize: isPhone ? "0.8rem" : "0.9rem",
                      fontWeight: r.country === "Vanuatu" ? 700 : 400,
                      color: "#404040",
                      lineHeight: 1.2,
                    }}
                  >
                    {r.country}
                  </span>
                </div>

                {/* bar */}
                <div
                  ref={idx === 0 ? barRef : undefined}
                  aria-label={`${r.country}: ${fmt(v)}`}
                  style={{ position: "relative", height: BAR_H, width: "100%" }}
                >
                  {/* fill */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.max(ep, 0.4)}%`,
                      background: HAZARD_COLOR[r.dominantHazard],
                      borderRadius: BAR_RADIUS,
                      boxSizing: "border-box",
                      border: "1px solid rgba(0, 0, 0, 0.12)",
                      transition: `width ${ANIM}`,
                    }}
                  />
                  {/* value */}
                  <span
                    style={{
                      position: "absolute",
                      left: inside ? "auto" : `calc(${ep}% + 6px)`,
                      right: inside ? `calc(${100 - ep}% + 8px)` : "auto",
                      top: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      fontSize: isPhone ? "0.72rem" : "0.78rem",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      color: inside ? "#fff" : "#404040",
                      transition: `left ${ANIM}, right ${ANIM}`,
                    }}
                  >
                    {fmt(v)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* caption */}
      <figcaption
        className="chart-caption text-left"
        style={{
          maxWidth: 640,
          marginLeft: "auto",
          marginRight: "auto",
          marginTop: 20,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >

        <p style={{ margin: "8px 0 16px" }}>
          Sources:{" "}
          <a
            href="https://www.internal-displacement.org/database/displacement-data/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
           Internal Displacement Monitoring Centre
          </a>
          {"; population from "}
          <a
            href="https://unstats.un.org/sdgs/dataportal"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
          >
            United Nations Statistics Division
          </a>
          .
        </p>
      </figcaption>

      {/* a11y table */}
      <div className="sr-only">
        <table>
          <caption>
            Internal displacements from weather-related disasters by Pacific
            Island Country, {data.year}.
          </caption>
          <thead>
            <tr>
              <th scope="col">Country</th>
              <th scope="col">Total displacements</th>
              <th scope="col">Per 100,000 residents</th>
              <th scope="col">Main hazard</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) => (
              <tr key={r.iso}>
                <td>{r.country}</td>
                <td>{fmt(r.absolute)}</td>
                <td>{fmt(r.per100k)}</td>
                <td>{HAZARD_LABEL[r.dominantHazard]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
