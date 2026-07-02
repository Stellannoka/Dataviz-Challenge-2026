"use client";

import { useEffect, useState } from "react";
import { useChartWidth } from "@/hooks/useChartWidth";
import { asset } from "@/lib/basePath";

interface RegionData {
  annualNeedUsdBn: number;
  commitmentUsdBn: number;
  disbursementUsdBn: number;
  commitmentCoveragePct: number;
  disbursementCoveragePct: number;
}

interface FinanceData {
  region: RegionData;
}

export default function FinanceGap() {
  const { ref, width } = useChartWidth();
  const [data, setData] = useState<FinanceData | null>(null);

  useEffect(() => {
    fetch(asset("/data/section5_finance.json"))
      .then((r) => r.json())
      .then((d: FinanceData) => setData(d))
      .catch((err) => console.error("Failed to load finance data:", err));
  }, []);

  // Orientation is decided by the *viewport*, not the measured container.
  const [isWideViewport, setIsWideViewport] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsWideViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const isSmall = width > 0 && width < 480;
  const isMedium = width >= 480 && width < 768;
  const isLarge = isWideViewport;

  // Dynamic font sizes
  const captionSize = isSmall ? "0.65rem" : isMedium ? "0.7rem" : "0.75rem";
  const labelSize = isSmall ? "0.6rem" : isMedium ? "0.65rem" : "0.7rem";
  const percentageSize = isSmall ? "1.3rem" : isMedium ? "1.5rem" : "1.6rem";

  // Thinner bar height
  const barHeight = isSmall ? 28 : isMedium ? 32 : 36;

  if (!data) {
    return <div ref={ref} className="h-[260px] w-full" />;
  }

  const { region } = data;
  const need = region.annualNeedUsdBn;
  const disbursed = region.disbursementUsdBn;
  const missing = Math.max(need - disbursed, 0);
  const fundedPct = region.disbursementCoveragePct;
  const unfundedPct = 100 - fundedPct;

  // ---- Vertical (large) geometry ----
  const VB_W = 560;
  const VB_H = 372;
  const BAR_X = 175;
  const BAR_W = 48; // Thinner bar
  const BAR_TOP = 40;
  const BAR_H = 310;
  const BAR_BOTTOM = BAR_TOP + BAR_H;
  const BAR_RIGHT = BAR_X + BAR_W;
  const fillH = BAR_H * (fundedPct / 100);
  const fillY = BAR_BOTTOM - fillH;
  const disbMid = BAR_BOTTOM - fillH / 2;
  const shortMid = (BAR_TOP + fillY) / 2;

  const INK = "#44566a";
  const OUTLINE = "#cbd5e1";
  const DIVIDER = "#cbd5e1";
  const HATCH = "#cbd5e1"; // grey strikes for the unmet (estimated) portion

  // ---- Use the project's actual primary color ----
  const PRIMARY_COLOR = "var(--primary, #5a8fb0)";
  const PRIMARY_DARK = "var(--primary-dark, #3f6e8c)";

  // shared hatch pattern def (diagonal grey strikes)
  const hatchDefs = (
    <defs>
      <pattern
        id="fg-hatch"
        width="7"
        height="7"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="7" stroke={HATCH} strokeWidth="1.5" />
      </pattern>
    </defs>
  );

  const caption = (
    <figcaption
      className="mt-5 chart-caption text-left"
      style={{
        fontSize: captionSize,
        color: "var(--text-secondary, #64748b)",
        lineHeight: 1.6,
      }}
    >
      The bar is the IMF&rsquo;s estimate of the Pacific&rsquo;s annualised future
      adaptation need (about ${need.toFixed(1)}&nbsp;billion a year, 2024 prices).
      The solid section is climate finance actually disbursed (2021&ndash;2023
      average, about ${disbursed.toFixed(1)}&nbsp;billion); the hatched section is the
      shortfall. Source:{" "}
      <a
        href="https://www.imf.org/-/media/files/publications/wp/2026/english/wpiea2026083-source-pdf.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-sky-700"
      >
        IMF Working Paper WP/26/83 (Gonguet et al., 2026)
      </a>
      .
    </figcaption>
  );

  return (
    <figure className="w-full">
      <div
        className="mx-auto w-full px-4"
        style={{ maxWidth: "640px", paddingLeft: "16px", paddingRight: "16px" }}
      >
        <div ref={ref} className="w-full">
          {isLarge ? (
            /* ----------------------- VERTICAL (large) ----------------------- */
            <div className="mx-auto w-full" style={{ maxWidth: 560 }}>
              <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                width="100%"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={`Vertical bar. The full bar is the $${need.toFixed(
                  1
                )}bn annual adaptation need; ${fundedPct}% (about $${disbursed.toFixed(
                  1
                )}bn) is disbursed and ${unfundedPct}% (about $${missing.toFixed(
                  1
                )}bn) is the shortfall.`}
              >
                <defs>
                  <marker id="fg-arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
                    <path
                      d="M0,0 L6,3 L0,6"
                      fill="none"
                      stroke={INK}
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </marker>
                  <pattern
                    id="fg-hatch"
                    width="7"
                    height="7"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <line x1="0" y1="0" x2="0" y2="7" stroke={HATCH} strokeWidth="1.5" />
                  </pattern>
                </defs>

                {/* Left: estimated need label */}
                <text x={150} y={160} textAnchor="end" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} fontSize={10} letterSpacing="0.5" fill={INK}>
                  ESTIMATED ANNUAL 
                </text>
                <text x={150} y={174} textAnchor="end" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} fontSize={10} letterSpacing="0.5" fill={INK}>
                  CLIMATE FINANCE NEEDS
                </text>
                <text x={150} y={208} textAnchor="end" style={{ fontFamily: "var(--font-serif, Georgia, serif)" }} fontSize={28} fontWeight={700} fill={INK}>
                  ${need.toFixed(1)}bn
                </text>
                <text x={150} y={226} textAnchor="end" fontSize={12} fill={INK}>
                  a year
                </text>

                {/* Dimension bracket */}
                <path
                  d={`M 170 ${BAR_TOP} L 165 ${BAR_TOP} Q 160 ${BAR_TOP} 160 ${BAR_TOP + 5} L 160 ${BAR_BOTTOM - 5} Q 160 ${BAR_BOTTOM} 165 ${BAR_BOTTOM} L 170 ${BAR_BOTTOM}`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={1.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Bar layering:
                    1) full bar filled with grey hatch = the estimated need (unmet shows through)
                    2) solid disbursed fill on top at the bottom
                    3) outer outline last so edges stay crisp */}
                <rect x={BAR_X} y={BAR_TOP} width={BAR_W} height={BAR_H} fill="url(#fg-hatch)" rx={2} />
                <rect x={BAR_X} y={fillY} width={BAR_W} height={fillH} fill={PRIMARY_COLOR} fillOpacity={0.82} rx={2} />
                <rect x={BAR_X} y={BAR_TOP} width={BAR_W} height={BAR_H} fill="none" stroke={OUTLINE} strokeWidth={1.5} rx={2} />
                <line x1={BAR_X} y1={fillY} x2={BAR_RIGHT} y2={fillY} stroke={DIVIDER} strokeWidth={1} />

                {/* Leader lines */}
                <path d={`M 320 150 C 290 150, 270 ${shortMid + 8}, ${BAR_RIGHT + 3} ${shortMid}`} fill="none" stroke={INK} strokeWidth={1} markerEnd="url(#fg-arrow)" />
                <path d={`M 320 316 C 290 316, 270 ${disbMid - 8}, ${BAR_RIGHT + 3} ${disbMid}`} fill="none" stroke={INK} strokeWidth={1} markerEnd="url(#fg-arrow)" />

                {/* Right labels: shortfall */}
                <text x={330} y={128} style={{ fontFamily: "var(--font-serif, Georgia, serif)" }} fontSize={14} fontWeight={700} fill={INK}>
                  Shortfall
                </text>
                <text x={330} y={160} style={{ fontFamily: "var(--font-serif, Georgia, serif)" }} fontSize={30} fontWeight={700} fill="var(--secondary, #dc2626)">
                  {unfundedPct}%
                </text>
                <text x={330} y={180} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} fontSize={13} fill={INK}>
                  ${missing.toFixed(1)}bn
                </text>

                {/* Right labels: disbursed */}
                <text x={330} y={290} style={{ fontFamily: "var(--font-serif, Georgia, serif)" }} fontSize={14} fontWeight={700} fill={INK}>
                 Annual Finance Received
                </text>
                <text x={330} y={322} style={{ fontFamily: "var(--font-serif, Georgia, serif)" }} fontSize={30} fontWeight={700} fill={PRIMARY_COLOR}>
                  {fundedPct}%
                </text>
                <text x={330} y={342} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} fontSize={13} fill={INK}>
                  ${disbursed.toFixed(1)}bn
                </text>
              </svg>
            </div>
          ) : (
            /* --------------------- HORIZONTAL (small / medium) --------------------- */
            <>
              <p className="mb-2 mt-5 font-mono uppercase tracking-wide" style={{ fontSize: labelSize, color: "var(--text-secondary, #64748b)" }}>
                Estimated adaptation need · ${need.toFixed(1)}bn a year
              </p>

              <div
                className="relative w-full overflow-hidden"
                style={{
                  height: barHeight,
                  border: `1px solid ${OUTLINE}`,
                  borderRadius: "3px",
                  // Grey diagonal hatch across the WHOLE bar = the full estimated need.
                  backgroundImage: `repeating-linear-gradient(45deg, ${HATCH} 0, ${HATCH} 1.5px, transparent 1.5px, transparent 7px)`,
                }}
                role="img"
                aria-label={`A single bar. The whole bar is the estimated need; ${fundedPct} percent is disbursed and ${unfundedPct} percent is the shortfall`}
              >
                {/* Disbursed portion: translucent blue laid OVER the hatch, so the
                    stripes read subtly through it — the bar is the estimate, and it
                    is only partly filled. */}
                <div
                  className="absolute top-0 left-0 flex h-full items-center"
                  style={{
                    width: `${fundedPct}%`,
                    backgroundColor: PRIMARY_COLOR,
                    opacity: 0.82,
                    minWidth: 2,
                  }}
                >
                  {!isSmall && fundedPct >= 18 && (
                    <div className="px-2 leading-tight">
                      <p className="font-serif font-bold text-white" style={{ fontSize: "0.7rem" }}>Disbursed</p>
                      <p className="font-mono font-bold text-white" style={{ fontSize: "0.6rem" }}>${disbursed.toFixed(1)}bn</p>
                    </div>
                  )}
                </div>

                {/* Shortfall label sits over the hatched (unfilled) portion */}
                <div
                  className="absolute top-0 flex h-full items-center justify-end"
                  style={{ left: `${fundedPct}%`, right: 0 }}
                >
                  <div className="px-2 text-right leading-tight">
                    <p className="font-serif font-bold" style={{ color: "var(--text-color, #0f172a)", fontSize: isSmall ? "0.65rem" : "0.7rem" }}>Shortfall</p>
                    <p className="font-mono font-bold" style={{ color: "var(--text-secondary, #64748b)", fontSize: isSmall ? "0.55rem" : "0.6rem" }}>${missing.toFixed(1)}bn</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="absolute top-0 h-full" style={{ left: `${fundedPct}%`, width: 1, backgroundColor: DIVIDER }} />
              </div>

              {(isSmall || fundedPct < 18) && (
                <p className="mt-1.5 font-mono" style={{ fontSize: isSmall ? "0.7rem" : "0.78rem", color: "var(--text-color, #0f172a)" }}>
                  Disbursed: <span className="font-bold" style={{ color: PRIMARY_COLOR }}>${disbursed.toFixed(1)}bn</span>
                </p>
              )}

              <div className="mt-3 flex">
                <div style={{ width: `${fundedPct}%` }}>
                  <p className="font-serif font-bold leading-none" style={{ color: PRIMARY_COLOR, fontSize: percentageSize }}>{fundedPct}%</p>
                  <p className="mt-1" style={{ fontSize: labelSize, color: "var(--text-secondary, #64748b)" }}>disbursed</p>
                </div>
                <div style={{ width: `${unfundedPct}%` }}>
                  <p className="font-serif font-bold leading-none" style={{ color: "var(--secondary, #dc2626)", fontSize: percentageSize }}>{unfundedPct}%</p>
                  <p className="mt-1" style={{ fontSize: labelSize, color: "var(--text-secondary, #64748b)" }}>shortfall</p>
                </div>
              </div>
            </>
          )}
        </div>

        {caption}
      </div>
    </figure>
  );
}