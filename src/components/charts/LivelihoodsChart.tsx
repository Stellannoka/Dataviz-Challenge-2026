"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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

interface ChartRow extends Row {
  share: number;
  small: boolean;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

/* --------------------------------------------------------------- palette
   WARM family. The bar is the whole (people affected); the filled portion is
   the part (livelihoods disrupted or destroyed), counted from within it. The
   unfilled track uses the SAME grey the finance chart uses for its uncovered
   portion. Blue is reserved for finance. */
const TRACK_FILL = "#e2e8f0";                        // matches FinanceGap UNCOVERED
const SHARE_FILL = "var(--accent-bubble, #e0793a)";  // livelihoods portion
const SHARE_TEXT = "var(--accent, #b45309)";
const REF_LINE = "var(--accent-dark, #92400e)";

/* Text tokens mirrored from FinanceGap AS RENDERED: the finance chart's
   country labels resolve to --text-secondary (rgb(64,64,64)), dark, so the
   names here use the same token. The count line beneath each name is the
   lighter grey, as a secondary line. */
const NAME_TEXT = "var(--text-secondary, #404040)"; // country labels (matches finance render)
const COUNT_TEXT = "#9096a1";        // count line beneath the name
const TICK_TEXT = "#404040";         // tick labels
const CAPTION_COLOR = "#707070";     // axis title
const GRID_COLOR = "#e9e9f1";
const TICK_RULE = "#9096a1";

/* A share resting on very few affected people is volatile: one small event
   can push it near 100%. Bars below this affected count are shown lighter
   and marked with an asterisk on the value label. */
const SMALL_BASE = 2500;

/* Shared font tokens (mirror FinanceGap) */
const TICK_FONT_SIZE = "0.88rem";
const AXIS_TITLE_FONT_SIZE = "0.72rem";
const TICK_LABEL_WEIGHT = 300;
const REGULAR_LABEL_WEIGHT = 400;
const VALUE_LABEL_WEIGHT = 600;

/* Value label placement inside a bar — same mechanism as FinanceGap: the bar
   area is measured with a ResizeObserver and the label goes inside only when
   it actually fits in pixels at the current width. */
const VALUE_LABEL_INSET = 8;
const VALUE_LABEL_OUTSIDE_GAP = 6;
/* "97%*" is wider than finance's "148%"; 3.4em covers the asterisk case. */
const VALUE_LABEL_WIDTH_EM = 3.4;

/* Breakpoints — viewport width, matching FinanceGap (Tailwind sm / lg). */
const TABLET_MIN_WIDTH = 640;
const DESKTOP_MIN_WIDTH = 1024;

type Breakpoint = "phone" | "tablet" | "desktop";

interface BreakpointTokens {
  BAR_HEIGHT: number;
  ROW_GAP: number;
  LABEL_FONT_SIZE: number;
  COUNT_FONT_SIZE: number;
  VALUE_FONT_SIZE: number;
  LABEL_GAP: number;
  LABEL_COLUMN_MAX_PCT: number;
  SIDE_PADDING: number;
  TICK_STEP_PCT: number;
}

/* Bar geometry and layout mirror FinanceGap: same bar heights, same side
   padding, same label-column caps, same viewport breakpoints. Row gap is a
   touch wider than finance because each label is two lines. */
const TOKENS: Record<Breakpoint, BreakpointTokens> = {
  desktop: {
    BAR_HEIGHT: 22,
    ROW_GAP: 12,
    LABEL_FONT_SIZE: 16,
    COUNT_FONT_SIZE: 11,
    VALUE_FONT_SIZE: 12.5,
    LABEL_GAP: 20,
    LABEL_COLUMN_MAX_PCT: 30,
    SIDE_PADDING: 24,
    TICK_STEP_PCT: 20,
  },
  tablet: {
    BAR_HEIGHT: 22,
    ROW_GAP: 11,
    LABEL_FONT_SIZE: 15,
    COUNT_FONT_SIZE: 10.5,
    VALUE_FONT_SIZE: 11.5,
    LABEL_GAP: 14,
    LABEL_COLUMN_MAX_PCT: 45,
    SIDE_PADDING: 20,
    TICK_STEP_PCT: 20,
  },
  phone: {
    BAR_HEIGHT: 21,
    ROW_GAP: 9,
    LABEL_FONT_SIZE: 13.5,
    COUNT_FONT_SIZE: 9.5,
    VALUE_FONT_SIZE: 10.5,
    LABEL_GAP: 8,
    LABEL_COLUMN_MAX_PCT: 60,
    SIDE_PADDING: 10,
    TICK_STEP_PCT: 50,
  },
};

/* The chart extends beyond the 640px text column, like FinanceGap, but
   FinanceGap's rendered width is bounded by its page wrapper (~1000px), not
   the viewport. This cap reproduces that bound so the two charts render at
   the same width wherever they're mounted. If the finance chart's wrapper
   uses a different max width, set this to match it. */
const CHART_MAX_WIDTH = 900;

function getBreakpoint(vw: number): Breakpoint {
  if (vw < TABLET_MIN_WIDTH) return "phone";
  if (vw < DESKTOP_MIN_WIDTH) return "tablet";
  return "desktop";
}

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("phone");
  useEffect(() => {
    const update = () => setBp(getBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

export default function LivelihoodsChart() {
  const [data, setData] = useState<LivelihoodsData | null>(null);
  const [barAreaWidth, setBarAreaWidth] = useState(0);
  const barAreaRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const tokens = TOKENS[breakpoint];

  useEffect(() => {
    fetch(asset("/data/livelihoods_2020.json"))
      .then((r) => r.json())
      .then((d: LivelihoodsData) => setData(d))
      .catch((err) => console.error("Livelihoods load failed:", err));
  }, []);

  /* Measured bar-area width, used only to decide whether a value label fits
     inside its bar (FinanceGap's approach). If 0 before first measurement,
     labels sit outside, which is always legible. */
  useEffect(() => {
    const node = barAreaRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setBarAreaWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [data]);

  /* Rows reporting both series, ordered by share (depth of impact). */
  const rows = useMemo<ChartRow[]>(() => {
    if (!data) return [];
    return [...data.data]
      .filter((r) => r.livelihoods > 0 && (r.affected ?? 0) > 0)
      .map((r) => ({
        ...r,
        share: r.livelihoods / (r.affected ?? 1),
        small: (r.affected ?? 0) < SMALL_BASE,
      }))
      .sort((a, b) => b.share - a.share);
  }, [data]);

  /* Average share across the reporting countries (prefer dataset totals). */
  const avgShare = useMemo(() => {
    if (!data) return null;
    if (data.totals && data.totals.affected > 0) {
      return data.totals.livelihoods / data.totals.affected;
    }
    const aff = rows.reduce((s, r) => s + (r.affected ?? 0), 0);
    const liv = rows.reduce((s, r) => s + r.livelihoods, 0);
    return aff > 0 ? liv / aff : null;
  }, [data, rows]);

  /* The axis runs past 100 so the full-share track ends short of the bar
     area's right edge — the same proportions the finance chart gets from its
     148% axis max — and so the 100% tick label never sits on the viewport
     edge (which was clipping on phones). */
  const AXIS_END = 112;
  const pct = useCallback((v: number) => (v / AXIS_END) * 100, []);
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = 0; v <= 100; v += tokens.TICK_STEP_PCT) out.push(v);
    return out;
  }, [tokens.TICK_STEP_PCT]);

  if (!data) {
    return <div className="w-full animate-pulse rounded-lg bg-slate-100" style={{ height: "360px" }} />;
  }

  const rowCount = rows.length;
  /* Grid rows: 1 = axis title, 2 = tick labels (above the bars),
     3..rowCount+2 = bars, rowCount+3 = the avg label row at the bottom. */
  const firstBarRow = 3;
  const gridSpanBars = `${firstBarRow} / ${firstBarRow + rowCount}`;
  const avgLabelRow = firstBarRow + rowCount;
  const reportingN = rows.length;

  return (
    <figure className="w-full" style={{ margin: 0, background: "transparent" }}>
      {/* Title + subtitle, aligned with the text column */}
      <div className="mx-auto w-full" style={{ maxWidth: CONTAINER_WIDTH, paddingLeft: 16, paddingRight: 16 }}>
        <p
          className="leading-snug"
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text-color)",
            fontFamily: "var(--font-serif)",
            marginTop: "16px",
            marginBottom: "12px",
          }}
        >
          Of the people these disasters reached, most lost the thing they live on
        </p>
        <p className="section-subtitle" style={{ marginBottom: "22px" }}>
          Share of people directly affected whose livelihoods were disrupted or
          destroyed by disasters, 2020, by country.
        </p>
      </div>

      {/* Chart grid — same full-width architecture as FinanceGap: two columns
          (labels | bars), the label column sized by the browser via
          fit-content, every bar width a percentage. The chart may extend
          beyond the 640px text column, exactly as the finance chart does. */}
      <div
        className="w-full select-none"
        role="img"
        aria-label="Share of people directly affected whose livelihoods were disrupted or destroyed, by country, 2020, sorted from highest to lowest share"
        style={{
          display: "grid",
          gridTemplateColumns: `fit-content(${tokens.LABEL_COLUMN_MAX_PCT}%) 1fr`,
          columnGap: tokens.LABEL_GAP,
          rowGap: tokens.ROW_GAP,
          padding: `0 ${tokens.SIDE_PADDING}px`,
          maxWidth: CHART_MAX_WIDTH,
          marginLeft: "auto",
          marginRight: "auto",
          fontFamily: "var(--font-sans)",
          background: "transparent",
        }}
      >
        {/* Axis title — top, sentence case, FinanceGap tokens */}
        <div
          style={{
            gridColumn: 2,
            gridRow: 1,
            textAlign: "left",
            fontSize: AXIS_TITLE_FONT_SIZE,
            fontWeight: TICK_LABEL_WEIGHT,
            color: CAPTION_COLOR,
            lineHeight: "1.3rem",
          }}
          aria-hidden="true"
        >
          Share whose livelihoods were disrupted or destroyed (%)
        </div>

        {/* Tick labels — above the bars */}
        <div style={{ gridColumn: 2, gridRow: 2, position: "relative", height: 24 }} aria-hidden="true">
          {ticks.map((t) => (
            <div
              key={`tick-${t}`}
              style={{
                position: "absolute",
                left: `${pct(t)}%`,
                bottom: 0,
                transform: "translateX(-50%)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: TICK_FONT_SIZE,
                  fontWeight: TICK_LABEL_WEIGHT,
                  color: TICK_TEXT,
                  marginBottom: 3,
                  whiteSpace: "nowrap",
                }}
              >
                {t}%
              </div>
              <div style={{ width: 1, height: 5, backgroundColor: TICK_RULE, opacity: 0.6, margin: "0 auto" }} />
            </div>
          ))}
        </div>

        {/* gridlines behind the bars; also the element measured for the
            value-label fit check, exactly as FinanceGap does */}
        <div
          ref={barAreaRef}
          style={{ gridColumn: 2, gridRow: gridSpanBars, position: "relative", pointerEvents: "none" }}
          aria-hidden="true"
        >
          {ticks.map((t) => (
            <div
              key={`grid-${t}`}
              style={{
                position: "absolute",
                left: `${pct(t)}%`,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: GRID_COLOR,
                opacity: 0.5,
              }}
            />
          ))}
        </div>

        {/* rows */}
        {rows.map((r, index) => {
          const gridRow = `${firstBarRow + index}`;
          const sharePct = r.share * 100;
          const filledPx = (sharePct / 100) * barAreaWidth;
          const estimatedValueLabelWidth = tokens.VALUE_FONT_SIZE * VALUE_LABEL_WIDTH_EM;
          const valueInside =
            barAreaWidth > 0 && filledPx >= estimatedValueLabelWidth + VALUE_LABEL_INSET * 2;
          const valueText = `${Math.round(sharePct)}%${r.small ? "*" : ""}`;

          return [
            /* label: country name with its counts on a second line beneath,
               right-aligned, like the reference layout */
            <div
              key={`label-${r.iso}`}
              style={{
                gridColumn: 1,
                gridRow,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  whiteSpace: "nowrap",
                  fontSize: tokens.LABEL_FONT_SIZE,
                  fontWeight: REGULAR_LABEL_WEIGHT,
                  color: NAME_TEXT,
                  lineHeight: 1.25,
                }}
              >
                {r.country}
              </span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  fontSize: tokens.COUNT_FONT_SIZE,
                  fontWeight: REGULAR_LABEL_WEIGHT,
                  color: COUNT_TEXT,
                  lineHeight: 1.3,
                }}
              >
                {fmtInt(r.livelihoods)} / {fmtInt(r.affected ?? 0)}
              </span>
            </div>,

            /* bar: fixed finance-height track, vertically centred against the
               two-line label */
            <div
              key={`trackcell-${r.iso}`}
              style={{
                gridColumn: 2,
                gridRow,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                role="img"
                aria-label={`${r.country}: ${Math.round(sharePct)}% of those affected lost livelihoods`}
                style={{ position: "relative", height: tokens.BAR_HEIGHT, width: "100%" }}
              >
                {/* track = everyone affected (100 on the axis scale) */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct(100)}%`,
                    backgroundColor: TRACK_FILL,
                    borderRadius: 2,
                  }}
                />
                {/* fill = livelihoods share */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct(sharePct)}%`,
                    backgroundColor: SHARE_FILL,
                    opacity: r.small ? 0.55 : 1,
                    borderRadius: 2,
                  }}
                />
                {/* share % label; * marks a small base */}
                <span
                  style={{
                    position: "absolute",
                    left: valueInside
                      ? VALUE_LABEL_INSET
                      : `calc(${pct(sharePct)}% + ${VALUE_LABEL_OUTSIDE_GAP}px)`,
                    top: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    fontSize: tokens.VALUE_FONT_SIZE,
                    fontWeight: VALUE_LABEL_WEIGHT,
                    color: valueInside ? (r.small ? SHARE_TEXT : "#ffffff") : SHARE_TEXT,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  {valueText}
                </span>
              </div>
            </div>,
          ];
        })}

        {/* average reference line spanning the bars; label at the BOTTOM of
            the line, horizontal, like the reference layout */}
        {avgShare != null && (
          <>
            <div
              style={{
                gridColumn: 2,
                gridRow: `${firstBarRow} / ${avgLabelRow + 1}`,
                position: "relative",
                pointerEvents: "none",
                zIndex: 2,
              }}
              aria-hidden="true"
            >
              {/* line runs through the bars and down to its label */}
              <div
                style={{
                  position: "absolute",
                  left: `calc(${pct(avgShare * 100)}% - 1px)`,
                  top: 0,
                  bottom: 16,
                  width: 0,
                  borderLeft: `2px dashed ${REF_LINE}`,
                  opacity: 0.85,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: `${pct(avgShare * 100)}%`,
                  bottom: 0,
                  transform: "translateX(-50%)",
                  fontSize: tokens.VALUE_FONT_SIZE,
                  fontWeight: 700,
                  color: REF_LINE,
                  whiteSpace: "nowrap",
                }}
              >
                {`avg ${Math.round(avgShare * 100)}%`}
              </span>
            </div>
            <div
              style={{ gridColumn: 2, gridRow: avgLabelRow, height: 20 }}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {/* Caption */}
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
        <p style={{ margin: 0 }}>
          Note: The figures beneath each country are livelihoods disrupted /
          people affected. Shares marked * rest on fewer than {fmtInt(SMALL_BASE)}{" "}
          affected people and are shown lighter. Covers the {reportingN} Pacific
          Island Countries that reported both measures for {data.year ?? 2020}.
        </p>
        <p style={{ margin: 0, marginTop: breakpoint === "phone" ? "6px" : "10px" }}>
          Sources: {" "}
          <a
            href="https://stats.pacificdata.org/vis?lc=en&df[ds]=ds%3ASPC2&df[id]=DF_SDG_11&df[ag]=SPC&df[vs]=3.0&dq=A.VC_DSR_AFFCT.........&pd=,&to[TIME_PERIOD]=false&lb=bt"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-sky-700"
            style={{ color: CAPTION_COLOR }}
          >
            Pacific Data Hub. Stat Explorer
          </a>
          {"; "}
          <a
            href="https://unstats.un.org/sdgs/dataportal"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-sky-700"
            style={{ color: CAPTION_COLOR }}
          >
            United Nations Statistics Division
          </a>
          .
        </p>
      </figcaption>

      {/* Accessible data payload */}
      {rows.length > 0 && (
        <div className="sr-only">
          <table>
            <caption>
              People directly affected by disasters, people whose livelihoods
              were disrupted or destroyed, and the resulting share, by Pacific
              Island Country, {data.year ?? 2020}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Country</th>
                <th scope="col">People directly affected</th>
                <th scope="col">Livelihoods disrupted or destroyed</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`a11y-${r.iso}`}>
                  <td>{r.country}</td>
                  <td>{fmtInt(r.affected ?? 0)}</td>
                  <td>{fmtInt(r.livelihoods)}</td>
                  <td>{Math.round(r.share * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}