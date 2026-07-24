"use client";

import { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import { CONTAINER_WIDTH } from "@/components/Container";
import { asset } from "@/lib/basePath";

/* ------------------------------------------------------------------ types */

interface RegionData {
  annualNeedUsdBn: number;
  disbursementUsdBn: number;
  disbursementCoveragePct: number;
}

interface CountryCoverage {
  country: string;
  iso: string;
  coveragePct: number;
}

interface FinanceData {
  region: RegionData;
  countriesDisbursementCoverage: CountryCoverage[];
}

/* A rendered row is either one of the fetched countries or the synthetic
   "Overall PIC" row built from `region`. `isOverall` is local to rendering. */
interface Row extends CountryCoverage {
  isOverall?: boolean;
}

const OVERALL_ROW_ISO = "OVERALL";
const OVERALL_ROW_LABEL = "Overall PIC";

/* ---------------------------------------------------------- architecture

   The chart is plain HTML and CSS, not one big SVG. Each bar is a
   percentage-width div inside a CSS grid; the label column is sized by the
   browser via fit-content. Because every width is a percentage of whatever
   container the chart gets, the chart can never render "the desktop drawing,
   scaled down". Text stays at its real font size at every screen width.
   --------------------------------------------------------------------- */

const FULL_COVERAGE_PCT = 100;

/* --------------------------------------------------------------- palette */

const COVERED = "var(--primary, #5a8fb0)";
const UNCOVERED = "#e2e8f0";
const GRID_COLOR = "#e9e9f1";
const REF_LINE = "var(--primary-dark, #3f6e8c)";
const LABEL_TEXT = "var(--text-secondary, #9096a1)";
/* Tick labels sit at the same colour the caption text renders at
   (.chart-caption resolves to rgb(64,64,64), the same value as
   --text-secondary). CAPTION_COLOR is the lighter grey used for the caption's
   links and the axis title. */
const TICK_TEXT = "var(--text-secondary, #404040)";
const TICK_RULE = "#9096a1";
const CAPTION_COLOR = "#707070";
const OVERALL_BORDER_COLOR = "var(--text-secondary, #404040)";

/* Same white diagonal hatch the legend swatch uses, as a CSS gradient. */
const HATCH_IMAGE =
  "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.7) 2px, rgba(255,255,255,0.7) 4px)";

/* ------------------------------------------------------------ typography

   Sizes, weights and colours below mirror the project's other charts:
   country labels at nameFont / 400 / --text-secondary, tick labels at
   0.88rem / 300 / #9096a1, axis title and caption at .chart-caption
   (0.72rem / 300), legend at 0.72-0.78rem / #707070. The chart title uses
   --font-serif at 1.05rem, deliberately below .section-title's 1.4rem so
   the section header keeps its place in the hierarchy.
   --------------------------------------------------------------------- */

const REGULAR_LABEL_WEIGHT = 400;
const BOLD_LABEL_WEIGHT = 600;
const VALUE_LABEL_WEIGHT = 600;
const TICK_LABEL_WEIGHT = 300;

const TICK_FONT_SIZE = "0.88rem";
const AXIS_TITLE_FONT_SIZE = "0.72rem";

const OVERALL_BORDER_WIDTH = 1.5;
/* How far the Overall PIC outline sits outside the row's content box, so it
   frames the label and the bar without touching either. */
const OVERALL_BORDER_INSET_Y = 5;
const OVERALL_BORDER_INSET_X = 6;

/* Value label placement inside a bar */
const VALUE_LABEL_INSET = 8; // gap from the bar's left edge
const VALUE_LABEL_OUTSIDE_GAP = 6; // gap when the bar is too short to hold it
/* Width of a "148%" style label, as a multiple of its font size. Used only
   to choose inside vs. outside placement; being slightly off just moves a
   label out of a bar it would have fitted, it never breaks the layout. */
const VALUE_LABEL_WIDTH_EM = 2.8;

/* Tiny visual gap between the covered and uncovered segments of a bar, so
   the two read as distinct pieces (reference: the stacked-gap treatment in
   the sample dark-mode chart). Square corners are required for this to read
   as a clean break rather than two rounded pills. */
const SEGMENT_GAP_PX = 2;

/* Breakpoints (viewport width, matching Tailwind's sm / lg thresholds) */
const TABLET_MIN_WIDTH = 640;
const DESKTOP_MIN_WIDTH = 1024;

type Breakpoint = "phone" | "tablet" | "desktop";

interface BreakpointTokens {
  BAR_HEIGHT: number;
  ROW_GAP: number;
  LABEL_FONT_SIZE: number;
  VALUE_FONT_SIZE: number;
  REFERENCE_FONT_SIZE: number;
  LEGEND_FONT_SIZE: string;
  LABEL_GAP: number;
  LABEL_COLUMN_MAX_PCT: number;
  SIDE_PADDING: number;
  GRID_OPACITY: number;
  TICK_STEP_PCT: number;
}

const TOKENS: Record<Breakpoint, BreakpointTokens> = {
  desktop: {
    BAR_HEIGHT: 22,
    ROW_GAP: 11,
    LABEL_FONT_SIZE: 16,
    VALUE_FONT_SIZE: 12.5,
    REFERENCE_FONT_SIZE: 11,
    LEGEND_FONT_SIZE: "0.78rem",
    LABEL_GAP: 20,
    LABEL_COLUMN_MAX_PCT: 30,
    SIDE_PADDING: 24,
    GRID_OPACITY: 0.5,
    TICK_STEP_PCT: 20,
  },
  tablet: {
    BAR_HEIGHT: 22,
    ROW_GAP: 10,
    LABEL_FONT_SIZE: 15,
    VALUE_FONT_SIZE: 11.5,
    REFERENCE_FONT_SIZE: 10,
    LEGEND_FONT_SIZE: "0.78rem",
    LABEL_GAP: 14,
    LABEL_COLUMN_MAX_PCT: 45,
    SIDE_PADDING: 20,
    GRID_OPACITY: 0.5,
    TICK_STEP_PCT: 20,
  },
  phone: {
    BAR_HEIGHT: 21,
    ROW_GAP: 8,
    LABEL_FONT_SIZE: 13.5,
    VALUE_FONT_SIZE: 10.5,
    REFERENCE_FONT_SIZE: 8,
    LEGEND_FONT_SIZE: "0.72rem",
    LABEL_GAP: 8,
    LABEL_COLUMN_MAX_PCT: 60,
    SIDE_PADDING: 10,
    GRID_OPACITY: 0.5,
    /* Fewer ticks: nine 0.88rem labels would collide on a narrow screen. */
    TICK_STEP_PCT: 40,
  },
};

/* Tooltip behaviour (unchanged) */
const TOOLTIP_GAP = 10;
const TOOLTIP_EDGE_MARGIN = 8;
const TOOLTIP_FALLBACK_VIEWPORT_WIDTH = 1200;
const TOOLTIP_FALLBACK_VIEWPORT_HEIGHT = 800;
const TOOLTIP_MIN_DISMISS_MS = 2000;
const TOOLTIP_MAX_DISMISS_MS = 8000;
const TOOLTIP_MS_PER_CHAR = 35;

/* ------------------------------------------------------- breakpoint hook */

function getBreakpoint(viewportWidth: number): Breakpoint {
  if (viewportWidth < TABLET_MIN_WIDTH) return "phone";
  if (viewportWidth < DESKTOP_MIN_WIDTH) return "tablet";
  return "desktop";
}

function useBreakpoint(): Breakpoint {
  /* Phone-first default: if JS is slow to hydrate, small screens (the common
     case for a wrong first guess) already look right. */
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("phone");

  useEffect(() => {
    const update = () => setBreakpoint(getBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return breakpoint;
}

/* ---------------------------------------------------------------- tooltip */

type Placement = "left" | "right" | "top" | "bottom";

interface HoverState {
  x: number;
  y: number;
  content: string;
  country: string;
}

function computeTooltipPosition(
  hover: HoverState,
  measuredWidth: number,
  measuredHeight: number
): { left: number; top: number } {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : TOOLTIP_FALLBACK_VIEWPORT_WIDTH;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : TOOLTIP_FALLBACK_VIEWPORT_HEIGHT;

  const spaceRight = viewportWidth - hover.x;
  const spaceLeft = hover.x;
  const spaceBelow = viewportHeight - hover.y;
  const spaceAbove = hover.y;

  let placement: Placement;
  if (spaceRight >= measuredWidth + TOOLTIP_GAP) placement = "right";
  else if (spaceLeft >= measuredWidth + TOOLTIP_GAP) placement = "left";
  else if (spaceBelow >= measuredHeight + TOOLTIP_GAP) placement = "bottom";
  else if (spaceAbove >= measuredHeight + TOOLTIP_GAP) placement = "top";
  else placement = "right";

  let left: number;
  let top: number;

  if (placement === "right") {
    left = hover.x + TOOLTIP_GAP;
    top = hover.y - measuredHeight / 2;
  } else if (placement === "left") {
    left = hover.x - measuredWidth - TOOLTIP_GAP;
    top = hover.y - measuredHeight / 2;
  } else if (placement === "bottom") {
    left = hover.x - measuredWidth / 2;
    top = hover.y + TOOLTIP_GAP;
  } else {
    left = hover.x - measuredWidth / 2;
    top = hover.y - measuredHeight - TOOLTIP_GAP;
  }

  left = Math.min(Math.max(left, TOOLTIP_EDGE_MARGIN), viewportWidth - measuredWidth - TOOLTIP_EDGE_MARGIN);
  top = Math.min(Math.max(top, TOOLTIP_EDGE_MARGIN), viewportHeight - measuredHeight - TOOLTIP_EDGE_MARGIN);

  return { left, top };
}

function getTooltipDismissDelay(content: string): number {
  return Math.min(TOOLTIP_MAX_DISMISS_MS, Math.max(TOOLTIP_MIN_DISMISS_MS, content.length * TOOLTIP_MS_PER_CHAR));
}

/* -------------------------------------------------------------- component */

export default function FinanceGap() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);
  const [barAreaWidth, setBarAreaWidth] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const barAreaRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const tokens = TOKENS[breakpoint];

  /* ------------------------------------------------------- data fetching */

  useEffect(() => {
    fetch(asset("/data/section5_finance.json"))
      .then((r) => r.json())
      .then((d: FinanceData) => setData(d))
      .catch((err) => console.error("Failed to load finance data:", err));
  }, []);

  /* All rows sorted small to big, Overall PIC included in the ranking. */
  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const overallRow: Row = {
      country: OVERALL_ROW_LABEL,
      iso: OVERALL_ROW_ISO,
      coveragePct: data.region.disbursementCoveragePct,
      isOverall: true,
    };
    return [overallRow, ...data.countriesDisbursementCoverage].sort((a, b) => a.coveragePct - b.coveragePct);
  }, [data]);

  /* The axis stops at the largest value rather than rounding up to the next
     tick. Rounding up left a wide empty strip past the last bar and pushed
     the 100% reference line into the middle of the chart. */
  const axisMax = useMemo(
    () => (rows.length > 0 ? Math.max(FULL_COVERAGE_PCT, ...rows.map((r) => r.coveragePct)) : FULL_COVERAGE_PCT),
    [rows]
  );

  const ticks = useMemo(() => {
    const values: number[] = [];
    for (let value = 0; value <= axisMax; value += tokens.TICK_STEP_PCT) values.push(value);
    return values;
  }, [axisMax, tokens.TICK_STEP_PCT]);

  /* Converts a coverage value into a CSS percentage of the bar area. */
  const pct = useCallback((value: number) => (value / axisMax) * 100, [axisMax]);

  /* The bar area's rendered width, used only to decide whether a value label
     fits inside its bar. If this is 0 (before the first measurement) labels
     sit outside, which is always legible: the layout itself never depends
     on this number. */
  useEffect(() => {
    const node = barAreaRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setBarAreaWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [rows.length]);

  /* ------------------------------------------------------------- tooltip */

  const getTooltipContent = useCallback(
    (country: string, coverage: number, type: "covered" | "uncovered" | "overflow"): string => {
      if (country === "Tuvalu") {
        return "Tuvalu's 148% reflects large, lump-sum financing rather than steady annual flows: three World Bank grants for adaptation-related transportation projects, committed in 2021–2023, together equal roughly Tuvalu's entire GDP. The source paper cautions this should not be read as overfinancing, since the 2021–2023 average may not represent the flows Tuvalu receives in future years.";
      }
      if (type === "uncovered") {
        const uncovered = Math.max(0, FULL_COVERAGE_PCT - coverage);
        return `${uncovered}% needs not covered in ${country}`;
      }
      return `${coverage}% needs covered in ${country}`;
    },
    []
  );

  const handleInteraction = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent,
      country: string,
      coverage: number,
      type: "covered" | "uncovered" | "overflow"
    ) => {
      const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
      const clientY = "clientY" in e ? e.clientY : e.touches[0].clientY;
      setHover({ x: clientX, y: clientY, content: getTooltipContent(country, coverage, type), country });
    },
    [getTooltipContent]
  );

  const handleLeave = useCallback(() => setHover(null), []);

  useLayoutEffect(() => {
    if (!hover) {
      setTooltipSize(null);
      return;
    }
    const node = tooltipRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setTooltipSize({ width: rect.width, height: rect.height });
  }, [hover]);

  const tooltipPosition = useMemo(
    () => (hover && tooltipSize ? computeTooltipPosition(hover, tooltipSize.width, tooltipSize.height) : null),
    [hover, tooltipSize]
  );

  useEffect(() => {
    if (!hover) return;
    const timeoutId = window.setTimeout(() => setHover(null), getTooltipDismissDelay(hover.content));
    return () => window.clearTimeout(timeoutId);
  }, [hover]);

  useEffect(() => {
    if (!hover) return;
    const dismiss = () => setHover(null);
    window.addEventListener("scroll", dismiss, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", dismiss, { capture: true });
  }, [hover]);

  /* ------------------------------------------------------- loading state */

  if (!data) {
    return <div className="w-full animate-pulse rounded-lg bg-slate-100" style={{ height: "400px" }} />;
  }

  /* -------------------------------------------------------------- render */

  const rowCount = rows.length;
  const referenceLeft = `${pct(FULL_COVERAGE_PCT)}%`;
  const gridSpanBars = `1 / ${rowCount + 1}`;
  const estimatedValueLabelWidth = tokens.VALUE_FONT_SIZE * VALUE_LABEL_WIDTH_EM;

  return (
    <figure className="w-full" style={{ margin: 0, background: "transparent" }}>
      {/* Title and narrative, left aligned with the project's text column */}
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
          At current funding levels, most projected annual adaptation needs would remain unfunded.
        </p>

        <p className="section-subtitle" style={{ marginBottom: "8px" }}>
          The share of estimated adaptation needs met by current finance varies widely across countries, but remains
          only a fraction of what is required for most.
        </p>
        <p
          style={{
            marginTop: 0,
            marginBottom: "22px",
            fontSize: "0.7rem",
            color: "var(--text-secondary, #404040)",
            lineHeight: "1.4rem",
            textAlign: "center",
            fontStyle: "italic",
            fontWeight: 300,
          }}
        >
          {breakpoint === "phone" ? "Tap a bar for details." : "Hover over a bar for details."}
        </p>

        {/* Legend */}
        <div
          className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1"
          style={{ fontFamily: "var(--font-sans)", fontSize: tokens.LEGEND_FONT_SIZE, color: CAPTION_COLOR }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span style={{ width: 13, height: 13, borderRadius: 2, backgroundColor: COVERED }} />
            Needs covered
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span style={{ width: 13, height: 13, borderRadius: 2, backgroundColor: UNCOVERED }} />
            Needs not covered
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              style={{
                width: 13,
                height: 13,
                borderRadius: 2,
                backgroundColor: COVERED,
                backgroundImage: HATCH_IMAGE,
              }}
            />
            Over 100% covered
          </span>
        </div>
      </div>

      {/* Chart: a CSS grid. Column 1 is the label column, sized by the
          browser (fit-content, capped per breakpoint). Column 2 is the bar
          area; every width inside it is a percentage, so the chart reflows
          at any container width with no layout JS. */}
      <div
        className="w-full select-none"
        role="img"
        aria-label="Adaptation finance coverage, sorted from lowest to highest, including the overall Pacific Island Countries figure"
        style={{
          display: "grid",
          gridTemplateColumns: `fit-content(${tokens.LABEL_COLUMN_MAX_PCT}%) 1fr`,
          columnGap: tokens.LABEL_GAP,
          rowGap: tokens.ROW_GAP,
          padding: `0 ${tokens.SIDE_PADDING}px`,
          fontFamily: "var(--font-sans)",
          background: "transparent",
        }}
      >
        {/* Grid lines, behind the bars. Also the element measured for the
            value-label fit check. */}
        <div
          ref={barAreaRef}
          style={{ gridColumn: 2, gridRow: gridSpanBars, position: "relative", pointerEvents: "none" }}
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <div
              key={`grid-${tick}`}
              style={{
                position: "absolute",
                left: `${pct(tick)}%`,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: GRID_COLOR,
                opacity: tokens.GRID_OPACITY,
              }}
            />
          ))}
        </div>

        {/* Rows */}
        {rows.map((r, index) => {
          const isOver = r.coveragePct > FULL_COVERAGE_PCT;
          const gridRow = `${index + 1}`;
          const coveredPct = Math.min(r.coveragePct, FULL_COVERAGE_PCT);
          const coveredPx = (pct(coveredPct) / 100) * barAreaWidth;
          const valueFitsInside = barAreaWidth > 0 && coveredPx >= estimatedValueLabelWidth + VALUE_LABEL_INSET * 2;
          const valueText = `${Math.round(r.coveragePct)}%`;
          /* The uncovered segment starts after a tiny gap when there is a
             covered segment before it, so the two read as distinct pieces. */
          const hasCovered = r.coveragePct > 0;
          const uncoveredLeft = hasCovered
            ? `calc(${pct(coveredPct)}% + ${SEGMENT_GAP_PX}px)`
            : "0";
          const uncoveredWidth = hasCovered
            ? `calc(${pct(FULL_COVERAGE_PCT) - pct(coveredPct)}% - ${SEGMENT_GAP_PX}px)`
            : `${pct(FULL_COVERAGE_PCT)}%`;

          return [
            <div
              key={`label-${r.iso}`}
              style={{
                gridColumn: 1,
                gridRow,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: r.isOverall ? "stretch" : "center",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  fontSize: tokens.LABEL_FONT_SIZE,
                  fontWeight: isOver ? BOLD_LABEL_WEIGHT : REGULAR_LABEL_WEIGHT,
                  color: LABEL_TEXT,
                  /* Overall PIC carries the left half of its own outline, so
                     the border starts exactly where the name starts rather
                     than at the label column's edge. The negative right
                     margin carries the box across the column gap to meet the
                     bar half, and the matching right padding keeps the text
                     itself right-aligned with every other label. */
                  ...(r.isOverall
                    ? {
                        marginTop: -OVERALL_BORDER_INSET_Y,
                        marginBottom: -OVERALL_BORDER_INSET_Y,
                        marginRight: -tokens.LABEL_GAP,
                        paddingRight: tokens.LABEL_GAP,
                        paddingLeft: OVERALL_BORDER_INSET_X,
                        borderTop: `${OVERALL_BORDER_WIDTH}px solid ${OVERALL_BORDER_COLOR}`,
                        borderBottom: `${OVERALL_BORDER_WIDTH}px solid ${OVERALL_BORDER_COLOR}`,
                        borderLeft: `${OVERALL_BORDER_WIDTH}px solid ${OVERALL_BORDER_COLOR}`,
                        borderTopLeftRadius: 2,
                        borderBottomLeftRadius: 2,
                      }
                    : null),
                }}
              >
                {r.country}
              </span>
            </div>,

            <div
              key={`track-${r.iso}`}
              role="img"
              aria-label={`${r.country}: ${r.coveragePct}% coverage`}
              style={{ gridColumn: 2, gridRow, position: "relative", height: tokens.BAR_HEIGHT }}
            >
              {/* Uncovered segment: starts after the covered segment plus a
                  tiny gap. Square corners so the break reads as a clean cut. */}
              {coveredPct < FULL_COVERAGE_PCT && (
                <div
                  className="cursor-pointer transition duration-150 ease-in-out hover:opacity-100 hover:ring-1 hover:ring-slate-300"
                  onMouseEnter={(e) => handleInteraction(e, r.country, r.coveragePct, "uncovered")}
                  onTouchStart={(e) => handleInteraction(e, r.country, r.coveragePct, "uncovered")}
                  onMouseLeave={handleLeave}
                  style={{
                    position: "absolute",
                    left: uncoveredLeft,
                    top: 0,
                    bottom: 0,
                    width: uncoveredWidth,
                    backgroundColor: UNCOVERED,
                  }}
                />
              )}

              {/* Covered portion */}
              {r.coveragePct > 0 && (
                <div
                  className="cursor-pointer transition duration-150 ease-in-out hover:opacity-100 hover:ring-1 hover:ring-slate-300"
                  onMouseEnter={(e) => handleInteraction(e, r.country, r.coveragePct, "covered")}
                  onTouchStart={(e) => handleInteraction(e, r.country, r.coveragePct, "covered")}
                  onMouseLeave={handleLeave}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct(coveredPct)}%`,
                    backgroundColor: COVERED,
                  }}
                />
              )}

              {/* Over-100% portion, hatched, after the same tiny gap */}
              {isOver && (
                <div
                  className="cursor-pointer transition duration-150 ease-in-out hover:opacity-100 hover:ring-1 hover:ring-slate-300"
                  onMouseEnter={(e) => handleInteraction(e, r.country, r.coveragePct, "overflow")}
                  onTouchStart={(e) => handleInteraction(e, r.country, r.coveragePct, "overflow")}
                  onMouseLeave={handleLeave}
                  style={{
                    position: "absolute",
                    left: `calc(${pct(FULL_COVERAGE_PCT)}% + ${SEGMENT_GAP_PX}px)`,
                    top: 0,
                    bottom: 0,
                    width: `calc(${pct(r.coveragePct - FULL_COVERAGE_PCT)}% - ${SEGMENT_GAP_PX}px)`,
                    backgroundColor: COVERED,
                    backgroundImage: HATCH_IMAGE,
                  }}
                />
              )}

              {/* Share of needs met: inside the filled bar when it fits,
                  just past its end when the bar is too short to hold it. */}
              <span
                style={{
                  position: "absolute",
                  left: valueFitsInside
                    ? VALUE_LABEL_INSET
                    : `calc(${pct(coveredPct)}% + ${SEGMENT_GAP_PX + VALUE_LABEL_OUTSIDE_GAP}px)`,
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  fontSize: tokens.VALUE_FONT_SIZE,
                  fontWeight: VALUE_LABEL_WEIGHT,
                  color: valueFitsInside ? "#ffffff" : LABEL_TEXT,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {valueText}
              </span>
            </div>,

            /* Overall PIC: the bar half of the outline. It carries the top,
               bottom and right edges and stops exactly at the 100% line. */
            r.isOverall ? (
              <div
                key={`overall-bar-${r.iso}`}
                style={{
                  gridColumn: 2,
                  gridRow,
                  width: `${pct(FULL_COVERAGE_PCT)}%`,
                  boxSizing: "border-box",
                  marginTop: -OVERALL_BORDER_INSET_Y,
                  marginBottom: -OVERALL_BORDER_INSET_Y,
                  borderTop: `${OVERALL_BORDER_WIDTH}px solid ${OVERALL_BORDER_COLOR}`,
                  borderBottom: `${OVERALL_BORDER_WIDTH}px solid ${OVERALL_BORDER_COLOR}`,
                  borderRight: `${OVERALL_BORDER_WIDTH}px solid ${OVERALL_BORDER_COLOR}`,
                  borderTopRightRadius: 2,
                  borderBottomRightRadius: 2,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            ) : null,
          ];
        })}

        {/* 100% reference line with its vertical label, above the bars */}
        <div
          style={{ gridColumn: 2, gridRow: gridSpanBars, position: "relative", pointerEvents: "none", zIndex: 2 }}
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              left: `calc(${referenceLeft} - 1px)`,
              top: 0,
              bottom: 0,
              width: 0,
              borderLeft: `2px dashed ${REF_LINE}`,
              opacity: 0.8,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `calc(${referenceLeft} + 5px)`,
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: tokens.REFERENCE_FONT_SIZE,
                fontWeight: BOLD_LABEL_WEIGHT,
                color: REF_LINE,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              Needs completely covered
            </span>
          </div>
        </div>

        {/* X axis */}
        <div style={{ gridColumn: 2, gridRow: rowCount + 1, position: "relative", height: 30 }} aria-hidden="true">
          {ticks.map((tick) => (
            <div
              key={`tick-${tick}`}
              style={{
                position: "absolute",
                left: `${pct(tick)}%`,
                top: 0,
                transform: "translateX(-50%)",
                textAlign: "center",
              }}
            >
              <div style={{ width: 1, height: 5, backgroundColor: TICK_RULE, opacity: 0.6, margin: "0 auto" }} />
              <div
                style={{
                  fontSize: TICK_FONT_SIZE,
                  fontWeight: TICK_LABEL_WEIGHT,
                  color: TICK_TEXT,
                  marginTop: 3,
                  whiteSpace: "nowrap",
                }}
              >
                {tick}%
              </div>
            </div>
          ))}
        </div>

        {/* Axis title */}
        <div
          style={{
            gridColumn: 2,
            gridRow: rowCount + 2,
            textAlign: "center",
            fontSize: AXIS_TITLE_FONT_SIZE,
            fontWeight: TICK_LABEL_WEIGHT,
            color: CAPTION_COLOR,
            lineHeight: "1.3rem",
          }}
          aria-hidden="true"
        >
          Share of needs covered (%)
        </div>
      </div>

      {/* Tooltip: rendered invisibly first so its real size can be measured,
          shown once positioned */}
      {hover && (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm transition-opacity duration-75"
          style={{
            left: tooltipPosition ? tooltipPosition.left : hover.x,
            top: tooltipPosition ? tooltipPosition.top : hover.y,
            opacity: tooltipPosition ? 1 : 0,
            maxWidth: "min(340px, 80vw)",
            minWidth: "200px",
            fontFamily: "var(--font-sans)",
            fontSize: "0.78rem",
            fontWeight: 400,
            lineHeight: "1.15rem",
            color: "var(--text-secondary, #404040)",
          }}
        >
          <p className="whitespace-pre-line" style={{ margin: 0 }}>
            {hover.content}
          </p>
        </div>
      )}

      {/* Caption, left aligned with the project's text column */}
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
          Note: Coverage is the ratio of estimated annual adaptation finance disbursed (2021–2023 average) to
          projected annual adaptation need (2024 prices), by country.
        </p>
        <p style={{ margin: 0, marginTop: breakpoint === "phone" ? "6px" : "10px" }}>
          Sources:{" "}
          <a
            href="https://www.imf.org/-/media/files/publications/wp/2026/english/wpiea2026083-source-pdf.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-sky-700"
            style={{ color: CAPTION_COLOR }}
          >
            Climate Finance and Adaptation Needs in Pacific Island Countries, IMF Working Paper (Gonguet et al.,
            2026)
          </a>
          .
        </p>
      </figcaption>

      {/* Accessible data payload */}
      <div className="sr-only">
        <table>
          <caption>
            Adaptation finance coverage, 2021–2023 average, sorted from lowest to highest, including the overall
            Pacific Island Countries figure.
          </caption>
          <thead>
            <tr>
              <th scope="col">Country</th>
              <th scope="col">Coverage percentage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`a11y-${r.iso}`}>
                <td>{r.country}</td>
                <td>{r.coveragePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}