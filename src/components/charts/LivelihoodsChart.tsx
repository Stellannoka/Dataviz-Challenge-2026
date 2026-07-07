"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLog } from "d3-scale";
import { useChartWidth } from "@/hooks/useChartWidth";
import { asset } from "@/lib/basePath";

/* ------------------------------------------------------------------ types */
interface Row {
  country: string;
  iso: string;
  affected?: number;
  livelihoods: number;
  livelihoodShare?: number;
}
interface LivelihoodsData {
  year: number;
  reportingCountries: number;
  notReporting: string[];
  totals?: { affected: number; livelihoods: number };
  data: Row[];
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

export default function LivelihoodsChart() {
  const { ref, width } = useChartWidth();
  const [data, setData] = useState<LivelihoodsData | null>(null);

  useEffect(() => {
    fetch(asset("/data/livelihoods_2020.json"))
      .then((r) => r.json())
      .then((d: LivelihoodsData) => setData(d))
      .catch((err) => console.error("Livelihoods load failed:", err));
  }, []);

  const isSmall = width > 0 && width < 480;
  const isMedium = width >= 480 && width < 768;

  const chartMaxWidth = 640;
  const chartWidth = Math.min(width || chartMaxWidth, chartMaxWidth);

  const rows = useMemo(
    () =>
      data
        ? [...data.data]
            .filter((r) => r.livelihoods > 0)
            .sort((a, b) => b.livelihoods - a.livelihoods)
        : [],
    [data]
  );

  /* type scale */
  const nameFont = isSmall ? 13.5 : isMedium ? 15 : 16;
  const valueFont = isSmall ? 11 : isMedium ? 12 : 13;
  const captionColor = "#707070";
  const gridColor = "#e9e9f1";

  /* layout — dot plot on a log axis */
  const stacked = isSmall;
  const rowH = stacked ? 52 : 44;
  const topPad = 14;
  const axisH = 48;
  const rightPad = 16;

  const gutterW = stacked ? 8 : isMedium ? 138 : 152;
  const plotLeft = gutterW + (stacked ? 0 : 12);
  const innerW = Math.max(chartWidth - plotLeft - rightPad, 60);

  const niceMax = 200000;
  const x = scaleLog().domain([1, niceMax]).range([0, innerW]).clamp(true);
  const ticks = [1, 10, 100, 1000, 10000, 100000];
  const tickLabel = (t: number) =>
    t >= 1000 ? `${t / 1000}k` : `${t}`;

  const dotR = isSmall ? 5 : 5.5;

  const chartBottom = topPad + rows.length * rowH;
  const extraBottomPadding = 24;
  const height = chartBottom + axisH + extraBottomPadding;

  return (
    <figure
      className="w-full"
      style={{ maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}
    >
      {/* Title */}
      <p
        className="font-medium leading-snug"
        style={{
          fontSize: isSmall ? "0.95rem" : "1.05rem",
          color: "var(--text-color)",
          fontFamily: "var(--font-serif)",
          paddingLeft: "16px",
          paddingRight: "16px",
          marginBottom: "12px",
        }}
      >
        Beyond those directly affected, climate-related disasters also disrupted
        livelihoods across the Pacific Islands in 2020.
      </p>

      {/* Subtitle */}
      <p
        className="section-subtitle mb-4"
        style={{
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
        People whose livelihoods were disrupted or destroyed, by country
      </p>

      <div
        ref={ref}
        className="relative w-full"
        style={{ paddingLeft: "16px", paddingRight: "16px" }}
      >
        {chartWidth > 0 && rows.length > 0 && (
          <svg
            width={chartWidth}
            height={height}
            viewBox={`0 0 ${chartWidth} ${height}`}
            role="img"
            aria-label={`Dot plot on a logarithmic scale of people whose livelihoods were disrupted or destroyed by disasters in ${
              data?.year ?? 2020
            }, by Pacific Island Country. Ranges from Kiribati (3) to Fiji (about 183,000).`}
            style={{ display: "block", fontFamily: "var(--font-sans)" }}
          >
            {/* vertical gridlines at each power of ten */}
            {ticks.map((t) => {
              const tx = plotLeft + x(t);
              return (
                <line
                  key={`grid-${t}`}
                  x1={tx}
                  y1={topPad}
                  x2={tx}
                  y2={chartBottom}
                  stroke={gridColor}
                  strokeWidth={1}
                  strokeOpacity={0.25}
                />
              );
            })}

            {/* rows */}
            {rows.map((r, i) => {
              const rowY = topPad + i * rowH;
              const dotX = plotLeft + x(r.livelihoods);
              const dotCY = stacked ? rowY + rowH - 14 : rowY + rowH / 2;

              return (
                <g key={r.iso}>
                  {/* leader line from baseline to the dot (the lollipop stem) */}
                  <line
                    x1={plotLeft}
                    y1={dotCY}
                    x2={dotX}
                    y2={dotCY}
                    stroke="var(--primary)"
                    strokeOpacity={0.75}
                    strokeWidth={1.5}
                  />

                  {/* country name */}
                  {stacked ? (
                    <text
                      x={plotLeft}
                      y={rowY + 13}
                      textAnchor="start"
                      fontSize={nameFont}
                      fontWeight={600}
                      fill="var(--text-secondary, #9096a1)"
                    >
                      {r.country}
                    </text>
                  ) : (
                    <text
                      x={gutterW}
                      y={dotCY}
                      textAnchor="end"
                      dominantBaseline="central"
                      fontSize={nameFont}
                      fontWeight={500}
                      fill="var(--text-secondary, #9096a1)"
                    >
                      {r.country}
                    </text>
                  )}

                  {/* the dot */}
                  <circle
                    cx={dotX}
                    cy={dotCY}
                    r={dotR}
                    fill="var(--primary)"
                  />

                  {/* value label — above the stem */}
                  {(() => {
                    const nearRight = dotX + 30 > plotLeft + innerW;
                    return (
                      <text
                        x={dotX}
                        y={dotCY - dotR - 4}
                        textAnchor={nearRight ? "end" : "middle"}
                        fontSize={valueFont}
                        fontWeight={600}
                        fill={captionColor}
                      >
                        {fmtInt(r.livelihoods)}
                      </text>
                    );
                  })()}
                </g>
              );
            })}

            {/* axis line */}
            <line
              x1={plotLeft}
              y1={chartBottom}
              x2={plotLeft + innerW}
              y2={chartBottom}
              stroke={gridColor}
              strokeWidth={1}
              strokeOpacity={0.4}
            />
            {/* tick labels */}
            {ticks.map((t) => {
              const tx = plotLeft + x(t);
              return (
                <text
                  key={`tick-${t}`}
                  x={tx}
                  y={chartBottom + 18}
                  textAnchor="middle"
                  fontSize="0.88rem"
                  fill="#9096a1"
                >
                  {tickLabel(t)}
                </text>
              );
            })}
            {/* axis title — with added space below ticks */}
            <text
              x={plotLeft + innerW / 2}
              y={chartBottom + 42}
              textAnchor="middle"
              className="chart-caption"
              fill={captionColor}
            >
              Number of livelihood affected (log scale)
            </text>
          </svg>
        )}
      </div>

      <figcaption
        className="mt-4 leading-snug chart-caption text-left"
        style={{
          maxWidth: "640px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
        <span className="font-medium">Note: </span> A logarithmic scale is used
        so that countries with very different totals remain readable; exact
        figures are labelled. Covers the {data?.reportingCountries ?? 9} Pacific
        Island Countries that reported this measure for {data?.year ?? 2020}
        {data?.notReporting?.length
          ? `; ${data.notReporting.join(", ")} did not`
          : ""}
        . Source:{" "}
        <a
          href="https://unstats.un.org/sdgs/dataportal"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-sky-700"
          style={{ color: captionColor }}
        >
          United Nations Statistics Division
        </a>
        .
      </figcaption>
    </figure>
  );
}