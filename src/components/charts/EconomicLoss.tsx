"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { useChartWidth } from "@/hooks/useChartWidth";
import { asset } from "@/lib/basePath";

interface WorstEvent {
  country: string;
  year: number;
  lossUsdM: number;
  lossPctGdp: number;
  note: string;
}
interface EconData {
  worstByCountry: WorstEvent[];
}

// The biggest economic blows — highlighted
const HIGHLIGHT = new Set(["Vanuatu", "Fiji"]);

// Clean event names from the note field
const EVENT: Record<string, string> = {
  Vanuatu: "Cyclone Pam, 2015",
  Fiji: "Cyclone Winston, 2016",
  "Micronesia (Fed. States)": "2016",
  "Micronesia of": "2016",
  Micronesia: "2016",
  Tonga: "Cyclone Ian, 2014",
  "Marshall Islands": "2007",
  Palau: "Typhoon Bopha, 2012",
  Samoa: "Cyclone Winston, 2016",
  "Solomon Islands": "Flash floods, 2014",
  Kiribati: "2014",
  "Papua New Guinea": "2016",
};

// Display-name cleanup (also fixes the "Micronesia of" data typo)
const SHORT: Record<string, string> = {
  "Micronesia (Fed. States)": "Micronesia",
  "Micronesia of": "Micronesia",
  "Papua New Guinea": "Papua New Guinea",
  "Marshall Islands": "Marshall Is.",
  "Solomon Islands": "Solomon Is.",
};

export default function EconomicLoss() {
  const { ref, width } = useChartWidth();
  const [data, setData] = useState<EconData | null>(null);

  useEffect(() => {
    fetch(asset("/data/econloss_gdp.json"))
      .then((r) => r.json())
      .then((d: EconData) => setData(d))
      .catch((e) => console.error("Econ loss load failed:", e));
  }, []);

  const isSmall = width < 480;

  const rows = useMemo(() => {
    if (!data) return [];
    return [...data.worstByCountry].sort((a, b) => b.lossPctGdp - a.lossPctGdp);
  }, [data]);

  const rowH = isSmall ? 34 : 38;
  const labelW = isSmall ? 96 : 150;
  const valueW = 52;
  const margin = { top: 10, right: 8, bottom: 36, left: 8 };
  const innerW = Math.max(width - margin.left - margin.right - labelW - valueW, 0);
  const chartH = rows.length * rowH + margin.top + margin.bottom;

  const maxPct = useMemo(
    () => (rows.length ? Math.ceil(Math.max(...rows.map((r) => r.lossPctGdp))) : 12),
    [rows]
  );
  const x = scaleLinear().domain([0, maxPct]).range([0, innerW]);
  const gridTicks = useMemo(() => {
    const step = maxPct <= 6 ? 1 : 2;
    const ticks: number[] = [];
    for (let t = 0; t <= maxPct; t += step) ticks.push(t);
    return ticks;
  }, [maxPct]);

  return (
    <figure className="mx-auto w-full max-w-[720px]">
      <figcaption className="mb-1 text-[var(--caption)] text-[clamp(0.7rem,0.68rem+0.15vw,0.8rem)] font-medium leading-snug">
        The economic blow: worst single disaster as a share of national GDP
      </figcaption>

      <div ref={ref} className="w-full" style={{ minHeight: 360 }}>
        {width > 0 && data && rows.length > 0 && (
          <svg
            width={width}
            height={chartH}
            role="img"
            aria-label="Lollipop chart of each nation's worst single disaster measured as a percentage of GDP"
          >
            {/* Gridlines + axis */}
            <g transform={`translate(${margin.left + labelW},${margin.top})`}>
              {gridTicks.map((t) => (
                <g key={t}>
                  <line
                    x1={x(t)}
                    y1={0}
                    x2={x(t)}
                    y2={rows.length * rowH}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                  />
                  <text
                    x={x(t)}
                    y={rows.length * rowH + 16}
                    textAnchor="middle"
                    fontSize={isSmall ? 9 : 11}
                    className="fill-slate-400"
                  >
                    {t}%
                  </text>
                </g>
              ))}
              <text
                x={innerW / 2}
                y={rows.length * rowH + 32}
                textAnchor="middle"
                fontSize={isSmall ? 10 : 12}
                fontWeight={600}
                className="fill-slate-600"
              >
                Loss in a single year, as % of GDP
              </text>
            </g>

            {/* Rows */}
            {rows.map((r, i) => {
              const y = margin.top + i * rowH + rowH / 2;
              const cx = margin.left + labelW + x(r.lossPctGdp);
              const baseX = margin.left + labelW;
              const hi = HIGHLIGHT.has(r.country);
              const color = hi ? "#e0916a" : "#5a8fb0";
              const name = SHORT[r.country] ?? r.country;
              return (
                <g key={r.country}>
                  {/* country name */}
                  <text
                    x={margin.left + labelW - 10}
                    y={y}
                    dy="0.32em"
                    textAnchor="end"
                    fontSize={isSmall ? 10 : 12}
                    fontWeight={hi ? 700 : 500}
                    className="fill-slate-700"
                  >
                    {name}
                  </text>
                  {/* stem */}
                  <line
                    x1={baseX}
                    y1={y}
                    x2={cx}
                    y2={y}
                    stroke={color}
                    strokeWidth={hi ? 2.5 : 1.5}
                    opacity={hi ? 1 : 0.6}
                  />
                  {/* dot */}
                  <circle
                    cx={cx}
                    cy={y}
                    r={hi ? (isSmall ? 6 : 7) : isSmall ? 4.5 : 5.5}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                  {/* value */}
                  <text
                    x={cx + (hi ? 11 : 9)}
                    y={y - (isSmall ? 0 : 1)}
                    dy={isSmall ? "0.32em" : "0"}
                    textAnchor="start"
                    fontSize={isSmall ? 10 : 12}
                    fontWeight={700}
                    fill={hi ? "#b45309" : "#475569"}
                  >
                    {r.lossPctGdp.toFixed(1)}%
                  </text>
                  {/* event name (desktop only) */}
                  {!isSmall && EVENT[r.country] && (
                    <text
                      x={cx + 11}
                      y={y + 11}
                      textAnchor="start"
                      fontSize={10}
                      className="fill-slate-400"
                    >
                      {EVENT[r.country]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <figcaption className="mt-3 text-[var(--caption)] text-[clamp(0.7rem,0.68rem+0.1vw,0.78rem)] leading-snug">
        Each nation&rsquo;s single worst year of disaster loss, as a share of that
        year&rsquo;s GDP. A small economy can lose a tenth of its output to one
        storm &mdash; a shock no large economy ever faces. Loss figures from{" "}
        <a
          href="https://pacificdata.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-sky-700"
        >
          SPC Pacific Data Hub
        </a>{" "}
        (SDG 11.5.2); GDP from World Bank; the percentage is our calculation.
      </figcaption>
    </figure>
  );
}