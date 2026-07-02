"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
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

function fmtShort(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
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
  const isTiny = width > 0 && width < 360;

  const chartMaxWidth = 640;
  const chartWidth = Math.min(width || chartMaxWidth, chartMaxWidth);

  const rows = useMemo(
    () => (data ? [...data.data].sort((a, b) => b.livelihoods - a.livelihoods) : []),
    [data]
  );

  const stackShortLabels = isTiny;

  /* Reduced country label font size to help "Marshall Islands" fit */
  const labelFont = isTiny ? 11 : isSmall ? 12 : isMedium ? 13 : 13.5;
  const valueFont = isTiny ? 12 : isSmall ? 14 : isMedium ? 16 : 17;
  const axisFont = isSmall ? 11 : isMedium ? 12 : 13;
  const captionColor = "#707070";
  const gridColor = "#f1f1f9";

  /* REDUCED bar height */
  const barH = isTiny ? 22 : isSmall ? 28 : 34;
  const stackedExtra = stackShortLabels ? labelFont + 4 : 0;
  const barGap = isSmall ? 8 : 10;
  const topPad = isSmall ? 12 : 16;
  const axisH = 30;
  const plotLeft = 16;
  const rightPad = 16;

  const valueW = isTiny ? 46 : isSmall ? 58 : 72;
  const innerW = Math.max(chartWidth - plotLeft - valueW - rightPad, 40);

  const niceMax = 200000;
  const x = scaleLinear().domain([0, niceMax]).range([0, innerW]);
  const minBarPx = 2.5;
  const barLen = (v: number) => Math.max(x(v), minBarPx);
  const ticks = isTiny
    ? [0, 100000, 200000]
    : [0, 50000, 100000, 150000, 200000];

  /* Adjust label width calculation with the new smaller font */
  const approxLabelW = (name: string) => {
    // Use a smaller multiplier for long country names
    const baseW = name.length * labelFont * 0.55;
    // For very long names (like "Marshall Islands"), reduce further
    if (name.length > 12) {
      return name.length * labelFont * 0.48;
    }
    return baseW;
  };

  const layout = useMemo(() => {
    let y = topPad;
    const out = rows.map((r) => {
      const len = barLen(r.livelihoods);
      // Use a smaller padding to help longer names fit
      const fitsInside = len >= approxLabelW(r.country) + 16;
      const isShort = !fitsInside;
      const stacked = isShort && stackShortLabels;
      const thisRowH = barH + (stacked ? stackedExtra : 0) + barGap;
      const rec = { r, len, fitsInside, isShort, stacked, y, barH };
      y += thisRowH;
      return rec;
    });
    return { rows: out, totalH: y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, innerW, barH, stackShortLabels, labelFont, stackedExtra, topPad, barGap]);

  const chartBottom = layout.totalH;
  const height = chartBottom + axisH;

  return (
    <figure
      className="w-full"
      style={{ maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}
    >
      <p
        className="mb-1 font-medium leading-snug"
        style={{
          fontSize: isSmall ? "0.95rem" : "1.05rem",
          color: "var(--text-color)",
          fontFamily: "var(--font-serif)",
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
       Beyond those directly affected, climate-related disasters also disrupted livelihoods across the Pacific Islands in 2020.
      </p>
      
      {/* Subtitle now uses the section-subtitle CSS class */}
      <p
        className="section-subtitle mb-3"
        style={{
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
        Number of people, by country
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
            aria-label={`Bar chart of people whose livelihoods were disrupted or destroyed by disasters in ${
              data?.year ?? 2020
            }, by Pacific country.`}
            style={{ display: "block", fontFamily: "var(--font-serif)" }}
          >
            {ticks.map((t) => {
              const tx = plotLeft + x(t);
              return (
                <g key={t}>
                  <line
                    x1={tx}
                    y1={topPad}
                    x2={tx}
                    y2={chartBottom}
                    stroke={gridColor}
                    strokeWidth={0.5}
                    opacity={0.5}
                  />
                  <text
                    x={tx}
                    y={chartBottom + 18}
                    textAnchor="middle"
                    fontSize={axisFont}
                    fill={captionColor}
                    fontWeight={400}
                  >
                    {t === 0 ? "0" : `${t / 1000}k`}
                  </text>
                </g>
              );
            })}

            {layout.rows.map(({ r, len, fitsInside, stacked, y, barH: bH }) => {
              // Further reduce font for very long country names
              let displayFontSize = labelFont;
              if (r.country.length > 12 && !fitsInside) {
                displayFontSize = isTiny ? 10 : isSmall ? 11 : 12;
              }
              
              return (
                <g key={r.iso}>
                  {/* bar */}
                  <rect
                    x={plotLeft}
                    y={y}
                    width={len}
                    height={bH}
                    rx={0}
                    fill="var(--primary)"
                  />

                  {fitsInside ? (
                    <>
                      {/* label inside (white) */}
                      <text
                        x={plotLeft + 12}
                        y={y + bH / 2}
                        textAnchor="start"
                        dominantBaseline="central"
                        fontSize={displayFontSize}
                        fill="#ffffff"
                        fontWeight={500}
                      >
                        {r.country}
                      </text>
                      {/* value at end of bar */}
                      <text
                        x={plotLeft + len + 10}
                        y={y + bH / 2}
                        textAnchor="start"
                        dominantBaseline="central"
                        fontSize={valueFont}
                        fontWeight={600}
                        fill={captionColor}
                        fillOpacity={0.9}
                      >
                        {fmtShort(r.livelihoods)}
                      </text>
                    </>
                  ) : stacked ? (
                    <>
                      {/* tiny screen: value right of the short bar, label BELOW */}
                      <text
                        x={plotLeft + len + 8}
                        y={y + bH / 2}
                        textAnchor="start"
                        dominantBaseline="central"
                        fontSize={valueFont}
                        fontWeight={600}
                        fill={captionColor}
                        fillOpacity={0.9}
                      >
                        {fmtShort(r.livelihoods)}
                      </text>
                      <text
                        x={plotLeft}
                        y={y + bH + labelFont - 1}
                        textAnchor="start"
                        fontSize={displayFontSize}
                        fill={captionColor}
                        fillOpacity={0.9}
                        fontWeight={500}
                      >
                        {r.country}
                      </text>
                    </>
                  ) : (
                    <>
                      {/* wider screens: short bar → label then value, both to the right */}
                      <text
                        x={plotLeft + len + 10}
                        y={y + bH / 2}
                        textAnchor="start"
                        dominantBaseline="central"
                        fontSize={displayFontSize}
                        fill={captionColor}
                        fillOpacity={0.9}
                        fontWeight={500}
                      >
                        {r.country}
                      </text>
                      <text
                        x={plotLeft + len + 10 + approxLabelW(r.country) + 10}
                        y={y + bH / 2}
                        textAnchor="start"
                        dominantBaseline="central"
                        fontSize={valueFont}
                        fontWeight={600}
                        fill={captionColor}
                        fillOpacity={0.9}
                      >
                        {fmtShort(r.livelihoods)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <figcaption
        className="mt-2 leading-snug chart-caption text-left"
        style={{
          maxWidth: "640px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
         <span className="font-medium">Note: </span> This covers the {data?.reportingCountries ?? 9} Pacific Island
        Countries that reported this measure for {data?.year ?? 2020}
        {data?.notReporting?.length ? `; ${data.notReporting.join(", ")} did not` : ""}. Source: {" "}
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