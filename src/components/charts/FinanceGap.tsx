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

const COVERED = "var(--primary, #7a9fd4)";
const UNCOVERED = "#e4e5e7";
const REF_LINE = "var(--primary-dark, #5c779f)";
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
const TICK_LABEL_WEIGHT = 300;

const TICK_FONT_SIZE = "0.88rem";
const AXIS_TITLE_FONT_SIZE = "0.72rem";

const OVERALL_BORDER_WIDTH = 1.5;
/* How far the Overall PIC outline sits outside the row's content box, so it
   frames the label and the bar without touching either. */
const OVERALL_BORDER_INSET_Y = 0;
const OVERALL_BORDER_INSET_X = 6;

/* Tiny visual gap between the covered and uncovered segments of a bar, so
   the two read as distinct pieces (reference: the stacked-gap treatment in
   the sample dark-mode chart). */
const SEGMENT_GAP_PX = 2;

/* Matches DisplacementChart's bars. */
const BAR_RADIUS = 1.5;

/* Breakpoints (viewport width, matching Tailwind's sm / lg thresholds) */
const TABLET_MIN_WIDTH = 640;
const DESKTOP_MIN_WIDTH = 1024;

type Breakpoint = "phone" | "tablet" | "desktop";

interface BreakpointTokens {
  BAR_HEIGHT: number;
  ROW_GAP: number;
  LABEL_FONT_SIZE: number;
  REFERENCE_FONT_SIZE: number;
  LEGEND_FONT_SIZE: string;
  LABEL_GAP: number;
  LABEL_COLUMN_MAX_PCT: number;
  SIDE_PADDING: number;
  TICK_STEP_PCT: number;
}

const TOKENS: Record<Breakpoint, BreakpointTokens> = {
  desktop: {
    BAR_HEIGHT: 22,
    ROW_GAP: 3,
    LABEL_FONT_SIZE: 16,
    REFERENCE_FONT_SIZE: 11,
    LEGEND_FONT_SIZE: "0.78rem",
    LABEL_GAP: 20,
    LABEL_COLUMN_MAX_PCT: 30,
    SIDE_PADDING: 24,
    TICK_STEP_PCT: 20,
  },
  tablet: {
    BAR_HEIGHT: 22,
    ROW_GAP: 3,
    LABEL_FONT_SIZE: 15,
    REFERENCE_FONT_SIZE: 10,
    LEGEND_FONT_SIZE: "0.78rem",
    LABEL_GAP: 14,
    LABEL_COLUMN_MAX_PCT: 45,
    SIDE_PADDING: 20,
    TICK_STEP_PCT: 20,
  },
  phone: {
    BAR_HEIGHT: 21,
    ROW_GAP: 2,
    LABEL_FONT_SIZE: 13.5,
    REFERENCE_FONT_SIZE: 8,
    LEGEND_FONT_SIZE: "0.72rem",
    LABEL_GAP: 8,
    LABEL_COLUMN_MAX_PCT: 60,
    SIDE_PADDING: 10,
    /* Fewer ticks: nine 0.88rem labels would collide on a narrow screen. */
    TICK_STEP_PCT: 40,
  },
};

/* Tooltip behaviour */
const TOOLTIP_GAP = 10;
const TOOLTIP_EDGE_MARGIN = 8;
const TOOLTIP_FALLBACK_VIEWPORT_WIDTH = 1200;
const TOOLTIP_FALLBACK_VIEWPORT_HEIGHT = 800;
const TOOLTIP_MIN_DISMISS_MS = 2000;
const TOOLTIP_MAX_DISMISS_MS = 8000;
const TOOLTIP_MS_PER_CHAR = 35;

/* Connector caret: a small rotated square straddling the tooltip box's
   edge, pointing back at the segment it describes (same treatment as the
   other charts' tooltips). */
const CARET_SIZE = 10;
const CARET_HALF = CARET_SIZE / 2;
const CARET_MARGIN = 12;

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

type BarSegmentType = "covered" | "uncovered" | "overflow";

interface HoverState {
  x: number;
  y: number;
  content: string;
  /* The exact "<n>%" substring of `content` to badge with the covered-bar
     fill color. Only set for the filled (covered / overflow) segments. */
  highlight: string | null;
  country: string;
  type: BarSegmentType;
  /* Rendered width (px) of the hovered segment, used to decide whether a
     filled bar is "long" enough to flip the tooltip above it instead of
     beside it. */
  barWidth: number;
  isTouch: boolean;
}

/* A filled (covered / overflow) segment long enough to clear the tooltip's
   own width opens the tooltip above it instead of to the right — otherwise
   the tooltip sits well past the end of a short bar, disconnected from it,
   while a long bar already gives the tooltip somewhere to sit that keeps
   the whole bar visible alongside it for comparison. Uncovered segments
   prefer above, regardless of length. This is only a *preference*: if the
   preferred side doesn't actually have room (e.g. the topmost row has
   nothing above it), computeTooltipPosition below falls back to whichever
   side does, rather than clamping into a neighbouring row's bar. */
const LONG_BAR_THRESHOLD_PX = 180;

type TooltipPlacement = "right" | "left" | "top" | "bottom";

function preferredPlacementFor(type: BarSegmentType, barWidth: number): "right" | "top" {
  if (type === "uncovered") return "top";
  return barWidth >= LONG_BAR_THRESHOLD_PX ? "top" : "right";
}

function computeTooltipPosition(
  hover: HoverState,
  measuredWidth: number,
  measuredHeight: number
): { left: number; top: number; caretLeft: number; caretTop: number; placement: TooltipPlacement } {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : TOOLTIP_FALLBACK_VIEWPORT_WIDTH;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : TOOLTIP_FALLBACK_VIEWPORT_HEIGHT;

  const spaceRight = viewportWidth - hover.x;
  const spaceLeft = hover.x;
  const spaceAbove = hover.y;
  const spaceBelow = viewportHeight - hover.y;
  const fitsHorizontally = (space: number) => space >= measuredWidth + TOOLTIP_GAP;
  const fitsVertically = (space: number) => space >= measuredHeight + TOOLTIP_GAP;

  const preferred = preferredPlacementFor(hover.type, hover.barWidth);

  /* Try the preferred side first, then the opposite side (still along the
     same axis — e.g. a bar with no room above still reads best below it,
     not off to the side), then perpendicular sides, before finally just
     taking the preferred side and letting it clamp to the viewport edge. */
  let placement: TooltipPlacement;
  if (preferred === "right") {
    placement = fitsHorizontally(spaceRight)
      ? "right"
      : fitsHorizontally(spaceLeft)
      ? "left"
      : fitsVertically(spaceBelow)
      ? "bottom"
      : fitsVertically(spaceAbove)
      ? "top"
      : "right";
  } else {
    placement = fitsVertically(spaceAbove)
      ? "top"
      : fitsVertically(spaceBelow)
      ? "bottom"
      : fitsHorizontally(spaceRight)
      ? "right"
      : fitsHorizontally(spaceLeft)
      ? "left"
      : "bottom";
  }

  let left: number;
  let top: number;

  if (placement === "right") {
    left = hover.x + TOOLTIP_GAP;
    top = hover.y - measuredHeight / 2;
  } else if (placement === "left") {
    left = hover.x - measuredWidth - TOOLTIP_GAP;
    top = hover.y - measuredHeight / 2;
  } else if (placement === "top") {
    left = hover.x - measuredWidth / 2;
    top = hover.y - measuredHeight - TOOLTIP_GAP;
  } else {
    left = hover.x - measuredWidth / 2;
    top = hover.y + TOOLTIP_GAP;
  }

  left = Math.min(Math.max(left, TOOLTIP_EDGE_MARGIN), viewportWidth - measuredWidth - TOOLTIP_EDGE_MARGIN);
  top = Math.min(Math.max(top, TOOLTIP_EDGE_MARGIN), viewportHeight - measuredHeight - TOOLTIP_EDGE_MARGIN);

  /* Caret position, relative to the box: kept pointing at the true hover
     x/y (clamped clear of the corners) even when edge-clamping has pulled
     the box away from being centred on it. Sits on whichever edge faces
     the bar for the chosen placement. */
  let caretLeft: number;
  let caretTop: number;
  if (placement === "right") {
    caretLeft = -CARET_HALF;
    caretTop = Math.min(Math.max(hover.y - top, CARET_MARGIN), measuredHeight - CARET_MARGIN) - CARET_HALF;
  } else if (placement === "left") {
    caretLeft = measuredWidth - CARET_HALF;
    caretTop = Math.min(Math.max(hover.y - top, CARET_MARGIN), measuredHeight - CARET_MARGIN) - CARET_HALF;
  } else if (placement === "top") {
    caretTop = measuredHeight - CARET_HALF;
    caretLeft = Math.min(Math.max(hover.x - left, CARET_MARGIN), measuredWidth - CARET_MARGIN) - CARET_HALF;
  } else {
    caretTop = -CARET_HALF;
    caretLeft = Math.min(Math.max(hover.x - left, CARET_MARGIN), measuredWidth - CARET_MARGIN) - CARET_HALF;
  }

  return { left, top, caretLeft, caretTop, placement };
}

function getTooltipDismissDelay(content: string): number {
  return Math.min(TOOLTIP_MAX_DISMISS_MS, Math.max(TOOLTIP_MIN_DISMISS_MS, content.length * TOOLTIP_MS_PER_CHAR));
}

/* -------------------------------------------------------------- component */

export default function FinanceGap() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const tokens = TOKENS[breakpoint];

  /* Entrance animation: bars grow in from zero width, covered/overflow
     segments first, then the uncovered segments follow after (each
     growing left-to-right from its own left edge, since width is what's
     animating). Skipped for reduced-motion users, who get the final
     state directly. */
  const [shown, setShown] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    /* Keyed off `data`, not just mount: the bars don't exist in the DOM
       until data has loaded, so the flip has to happen on a frame after
       that first render (not before), or there's no "from zero width"
       frame for the transition to animate away from. */
    if (!data) return;
    if (reducedMotion) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [data, reducedMotion]);

  const COVERED_ANIM_MS = 700;
  const UNCOVERED_ANIM_MS = 600;

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

  /* ------------------------------------------------------------- tooltip */

  const getTooltipContent = useCallback(
    (
      country: string,
      coverage: number,
      type: BarSegmentType
    ): { text: string; highlight: string | null } => {
      if (type === "uncovered") {
        const uncovered = Math.max(0, FULL_COVERAGE_PCT - coverage);
        return {
          text: `${uncovered}% of ${country}'s projected annual adaptation need remains uncovered at the level of finance disbursed in 2021–2023.`,
          highlight: null,
        };
      }
      if (type === "overflow") {
        const over = Math.round(coverage - FULL_COVERAGE_PCT);
        const highlight = `${over}%`;
        const base = `Finance disbursed in 2021–2023 exceeded ${country}'s projected annual adaptation need by ${highlight}.`;
        const text =
          country === "Tuvalu"
            ? `Tuvalu's adaptation finance in 2021–2023 was ${highlight} above its projected annual need. The apparent surplus, however, reflects large, irregular disbursements rather than a steady flow of finance each year.`
            : base;
        return { text, highlight };
      }
      const highlight = `${coverage}%`;
      return {
        text: `Average annual adaptation finance disbursed in 2021–2023 equals ${highlight} of ${country}'s projected annual adaptation need.`,
        highlight,
      };
    },
    []
  );

  const handleInteraction = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent,
      country: string,
      coverage: number,
      type: BarSegmentType
    ) => {
      const isTouch = !("clientX" in e);
      const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
      /* Anchor the connector to the true vertical centre of the bar row
         rather than wherever the cursor happened to enter — the entry
         point varies with approach angle, which was pulling the caret off
         the bar's middle. */
      const rect = e.currentTarget.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const { text, highlight } = getTooltipContent(country, coverage, type);
      setHover({ x: clientX, y: centerY, content: text, highlight, country, type, barWidth: rect.width, isTouch });
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
    /* Mouse-triggered tooltips are dismissed by onMouseLeave; touch has no
       equivalent "leave" gesture, so those still need a timed dismiss. */
    if (!hover || !hover.isTouch) return;
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

  return (
    <figure className="w-full" style={{ margin: 0, background: "transparent" }}>
      {/* Title and narrative, left aligned with the project's text column */}
      <div className="mx-auto w-full" style={{ maxWidth: CONTAINER_WIDTH, paddingLeft: 16, paddingRight: 16 }}>
        <p
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
     Most Pacific Island nations receive less than half the financing needed for climate adaptation.
        </p>
        <p className="section-subtitle" style={{ marginBottom: 8 }}>
          Average annual adaptation finance disbursed in 2021–2023 relative to annual adaptation need (2024 prices).
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
        {/* Rows */}
        {rows.map((r, index) => {
          const isOver = r.coveragePct > FULL_COVERAGE_PCT;
          const gridRow = `${index + 1}`;
          const coveredPct = Math.min(r.coveragePct, FULL_COVERAGE_PCT);
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
                  tiny gap, so the break still reads as a clean cut even with
                  rounded corners. */}
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
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: BAR_RADIUS,
                    borderBottomRightRadius: BAR_RADIUS,
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
                    borderTopLeftRadius: BAR_RADIUS,
                    borderBottomLeftRadius: BAR_RADIUS,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
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
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: BAR_RADIUS,
                    borderBottomRightRadius: BAR_RADIUS,
                  }}
                />
              )}

              {/* Reveal mask: a plain cover that shrinks from the right,
                  uncovering the bar left-to-right. Left/right-position
                  transitions like this are far more consistently animated
                  across mobile browsers than clip-path transitions, which
                  is why the bars weren't reliably animating on phones. */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: shown ? "100%" : "0%",
                  top: 0,
                  bottom: 0,
                  right: 0,
                  backgroundColor: "#ffffff",
                  transition: `left ${COVERED_ANIM_MS + UNCOVERED_ANIM_MS}ms cubic-bezier(0.4,0,0.2,1)`,
                  pointerEvents: "none",
                }}
              />
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
          Share of adaptation needs met (%)
        </div>
      </div>

      {/* Tooltip: rendered invisibly first so its real size can be measured,
          shown once positioned */}
      {hover && (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-50 bg-white/85 p-3 shadow-xl transition-opacity duration-75"
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
          {/* Connector: rotated square straddling the edge facing the bar
              segment — the box's left edge when it opens to the right,
              its bottom edge when it opens above. */}
          {tooltipPosition && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: tooltipPosition.caretLeft,
                top: tooltipPosition.caretTop,
                width: CARET_SIZE,
                height: CARET_SIZE,
                background: "rgba(255, 255, 255, 0.95)",
                transform: "rotate(45deg)",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)",
              }}
            />
          )}
          <p className="whitespace-pre-line" style={{ margin: 0 }}>
            {(() => {
              const idx = hover.highlight ? hover.content.indexOf(hover.highlight) : -1;
              if (idx === -1 || !hover.highlight) return hover.content;
              const before = hover.content.slice(0, idx);
              const after = hover.content.slice(idx + hover.highlight.length);
              return (
                <>
                  {before}
                  <span
                    style={{
                      background: COVERED,
                      color: "#ffffff",
                      fontWeight: 600,
                      borderRadius: 4,
                      padding: "1px 6px",
                    }}
                  >
                    {hover.highlight}
                  </span>
                  {after}
                </>
              );
            })()}
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
        <p style={{ margin: 0, marginTop: breakpoint === "phone" ? "6px" : "10px" }}>
          Source: Figures are based on{" "}
          <a
            href="https://www.imf.org/-/media/files/publications/wp/2026/english/wpiea2026083-source-pdf.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-[var(--primary,#6d8499)] text-[#707070] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
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