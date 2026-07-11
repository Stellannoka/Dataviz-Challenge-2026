"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLog } from "d3-scale";
import { useChartWidth } from "@/hooks/useChartWidth";
import { CONTAINER_WIDTH } from "@/components/Container";
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

/* --------------------------------------------------------------- palette */
const AFFECTED_STROKE = "#9096a1"; // matches the affected value labels
const AFFECTED_TEXT = "#9096a1"; // lighter grey: secondary in the pair
const CONNECTOR = "var(--primary-light, #9cc0d8)";
const LIVELIHOODS_FILL = "var(--primary, #5a8fb0)";
const LIVELIHOODS_TEXT = "var(--primary-dark, #3f6e8c)";

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

  const chartMaxWidth = CONTAINER_WIDTH;
  const chartWidth = Math.min(width || chartMaxWidth, chartMaxWidth);

  /* Countries reporting both series, largest impacts first */
  const rows = useMemo(
    () =>
      data
        ? [...data.data]
            .filter((r) => r.livelihoods > 0 && (r.affected ?? 0) > 0)
            .sort((a, b) => (b.affected ?? 0) - (a.affected ?? 0))
        : [],
    [data]
  );

  /* type scale */
  const nameFont = isSmall ? 13.5 : isMedium ? 15 : 16;
  const valueFont = isSmall ? 10.5 : isMedium ? 11.5 : 12.5;
  const captionColor = "#707070";
  const gridColor = "#e9e9f1";

  /* layout — paired dots on a log axis */
  const stacked = isSmall;
  const rowH = stacked ? 58 : 56;
  const topPad = 14;
  const axisH = 48;
  const rightPad = 16;

  const gutterW = stacked ? 8 : isMedium ? 138 : 152;
  const plotLeft = gutterW + (stacked ? 0 : 12);
  const innerW = Math.max(chartWidth - plotLeft - rightPad, 60);

  const niceMax = 300000;
  const x = scaleLog().domain([1, niceMax]).range([0, innerW]).clamp(true);
  const ticks = [1, 10, 100, 1000, 10000, 100000];
  const tickLabel = (t: number) => (t >= 1000 ? `${t / 1000}k` : `${t}`);

  const dotR = isSmall ? 4.5 : 5;      // livelihoods (filled)
  const affR = dotR + 2;               // affected ring sits around it when pairs coincide

  const chartBottom = topPad + rows.length * rowH;
  const extraBottomPadding = 24;
  const height = chartBottom + axisH + extraBottomPadding;

  return (
    <figure
      className="w-full"
      style={{ maxWidth: CONTAINER_WIDTH, marginLeft: "auto", marginRight: "auto" }}
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
        In several countries, climate disasters disrupted livelihoods on
        nearly the same scale as they affected people
      </p>

      {/* Subtitle */}
      <p
        className="section-subtitle"
        style={{
          paddingLeft: "16px",
          paddingRight: "16px",
          marginBottom: "22px",
        }}
      >
        People directly affected, and people whose livelihoods were disrupted
        or destroyed by climate-related disasters, 2020, by country.
      </p>

      {/* Legend */}
      <div
        className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1"
        style={{
          paddingLeft: "16px",
          paddingRight: "16px",
          fontFamily: "var(--font-sans)",
          fontSize: isSmall ? "0.72rem" : "0.78rem",
          color: captionColor,
        }}
      >
        <span className="inline-flex items-center gap-1.5">
          <svg width={15} height={15} aria-hidden="true">
            <circle
              cx={7.5}
              cy={7.5}
              r={6}
              fill="#ffffff"
              stroke={AFFECTED_STROKE}
              strokeWidth={1.5}
            />
          </svg>
          People directly affected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width={14} height={14} aria-hidden="true">
            <circle cx={7} cy={7} r={5} fill={LIVELIHOODS_FILL} />
          </svg>
          Livelihoods disrupted
        </span>
      </div>

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
            aria-label={`Paired dot plot on a logarithmic scale comparing, for each Pacific Island Country in ${
              data?.year ?? 2020
            }, the number of people directly affected by disasters with the number whose livelihoods were disrupted or destroyed. In the Marshall Islands the two figures nearly coincide: 53,158 livelihoods disrupted against 56,718 people affected.`}
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
                  strokeOpacity={0.5}
                />
              );
            })}

            {/* rows */}
            {rows.map((r, i) => {
              const rowY = topPad + i * rowH;
              const liveX = plotLeft + x(r.livelihoods);
              const affX = plotLeft + x(r.affected ?? 1);
              const dotCY = stacked ? rowY + rowH - 22 : rowY + rowH / 2;

              const nearRightAff = affX + 34 > plotLeft + innerW;
              const nearRightLive = liveX + 34 > plotLeft + innerW;

              return (
                <g key={r.iso}>
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

                  {/* connector between the pair */}
                  <line
                    x1={liveX}
                    y1={dotCY}
                    x2={affX}
                    y2={dotCY}
                    stroke={CONNECTOR}
                    strokeWidth={2}
                    strokeOpacity={0.9}
                  />

                  {/* affected — hollow ring, value above; drawn beneath the
                      filled dot so coincident pairs read as a dot inside a ring */}
                  <circle
                    cx={affX}
                    cy={dotCY}
                    r={affR}
                    fill="#ffffff"
                    stroke={AFFECTED_STROKE}
                    strokeWidth={1.5}
                  />
                  <text
                    x={affX}
                    y={dotCY - affR - 5}
                    textAnchor={nearRightAff ? "end" : "middle"}
                    fontSize={valueFont}
                    fontWeight={500}
                    fill={AFFECTED_TEXT}
                  >
                    {fmtInt(r.affected ?? 0)}
                  </text>

                  {/* livelihoods — filled dot, value below */}
                  <circle
                    cx={liveX}
                    cy={dotCY}
                    r={dotR}
                    fill={LIVELIHOODS_FILL}
                  />
                  <text
                    x={liveX}
                    y={dotCY + dotR + 13}
                    textAnchor={nearRightLive ? "end" : "middle"}
                    fontSize={valueFont}
                    fontWeight={600}
                    fill={LIVELIHOODS_TEXT}
                  >
                    {fmtInt(r.livelihoods)}
                  </text>
                </g>
              );
            })}

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
            {/* axis title */}
            <text
              x={plotLeft + innerW / 2}
              y={chartBottom + 42}
              textAnchor="middle"
              className="chart-caption"
              fill={captionColor}
            >
              People (log scale)
            </text>
          </svg>
        )}
      </div>

      <figcaption
        className="mt-4 leading-snug chart-caption text-left"
        style={{
          maxWidth: CONTAINER_WIDTH,
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
        <span className="font-medium">Note: </span> A logarithmic scale is used
        so that countries with very different totals remain readable; exact
        figures are labelled. Covers the {data?.reportingCountries ?? 9} Pacific
        Island Countries that reported both measures for {data?.year ?? 2020}
        {data?.notReporting?.length
          ? `; ${data.notReporting.join(", ")} did not`
          : ""}
        . People directly affected are sourced from the{" "}
        <a
          href="https://stats.pacificdata.org/vis?lc=en&df[ds]=ds%3ASPC2&df[id]=DF_SDG_11&df[ag]=SPC&df[vs]=3.0&dq=A.VC_DSR_AFFCT.........&pd=,&to[TIME_PERIOD]=false&lb=bt"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-sky-700"
          style={{ color: captionColor }}
        >
          Pacific Community (SPC), Pacific Data Hub
        </a>
        ; livelihoods disrupted or destroyed are sourced from the{" "}
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

      {/* Accessible data payload */}
      {rows.length > 0 && (
        <div className="sr-only">
          <table>
            <caption>
              People directly affected by climate-related disasters and people
              whose livelihoods were disrupted or destroyed, by Pacific Island
              Country, {data?.year ?? 2020}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Country</th>
                <th scope="col">People directly affected</th>
                <th scope="col">Livelihoods disrupted or destroyed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`a11y-${r.iso}`}>
                  <td>{r.country}</td>
                  <td>{fmtInt(r.affected ?? 0)}</td>
                  <td>{fmtInt(r.livelihoods)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}