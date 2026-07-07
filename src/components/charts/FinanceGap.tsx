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

  const isSmall = width > 0 && width < 480;
  const isMedium = width >= 480 && width < 768;

  const captionSize = isSmall ? "0.65rem" : isMedium ? "0.7rem" : "0.75rem";

  if (!data) {
    return <div ref={ref} className="h-[320px] w-full" />;
  }

  const { region } = data;
  const need = region.annualNeedUsdBn;
  const disbursed = region.disbursementUsdBn;
  const fundedPct = region.disbursementCoveragePct;
  const unfundedPct = 100 - fundedPct;

  // ---- palette ----
  const INK = "#44566a";
  const OUTLINE = "#cbd5e1";
  const NEED_FILL = "#e2e8f0";
  const NEED_STROKE = "#94a3b8";
  const PRIMARY_COLOR = "var(--primary, #5a8fb0)";
  const PRIMARY_DARK = "var(--primary-dark, #3f6e8c)";

  // ---- shared geometry (viewBox space) ----
  const VB_W = 620;
  const VB_H = 380;
  const BASE_Y = 300;
  const TOP_Y = 40;
  const FULL_H = BASE_Y - TOP_Y;
  const barW = 118;

  const needX = 96;
  const recvX = 288;
  const needCx = needX + barW / 2;
  const recvCx = recvX + barW / 2;

  const recvH = FULL_H * (fundedPct / 100);
  const recvY = BASE_Y - recvH;
  const needTopY = TOP_Y;
  const recvTopY = recvY;

  const subtitleStyle = {
    fontFamily: "var(--font-sans)",
    fontSize: 11,
    fill: INK,
  };

  return (
    <figure className="w-full">
      <div
        className="mx-auto w-full"
        style={{ maxWidth: "640px", paddingLeft: "16px", paddingRight: "16px", marginTop: isSmall ? "1.5rem" : "2.5rem" }}
      >
        <div ref={ref} className="w-full">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Two columns comparing the Pacific's projected annual adaptation financing need of about US$${need.toFixed(
              1
            )} billion with the estimated adaptation finance actually disbursed, about US$${disbursed.toFixed(
              1
            )} billion a year (2021-2023 average). Disbursed finance stands at roughly one quarter the height of the need, covering about ${fundedPct} percent of it and leaving about ${unfundedPct} percent unmet.`}
            style={{ display: "block", fontFamily: "var(--font-sans)" }}
          >
            <defs>
              <pattern
                id="fg-need-hatch"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke={NEED_STROKE} strokeWidth="1" opacity="0.5" />
              </pattern>
            </defs>

            <line x1={needX - 24} y1={BASE_Y} x2={recvX + barW + 12} y2={BASE_Y} stroke={OUTLINE} strokeWidth={1.5} />

            {/* NEEDED bar */}
            <rect x={needX} y={needTopY} width={barW} height={FULL_H} fill={NEED_FILL} />
            <rect x={needX} y={needTopY} width={barW} height={FULL_H} fill="url(#fg-need-hatch)" />
            <rect x={needX} y={needTopY} width={barW} height={FULL_H} fill="none" stroke={NEED_STROKE} strokeWidth={1.25} />
            
            <text x={needCx} y={needTopY - 16} textAnchor="middle" fontSize={24} fontWeight={700} fill={INK}>
              US${need.toFixed(1)}bn
            </text>
            
            <text x={needCx} y={BASE_Y + 22} textAnchor="middle" fontSize={13.5} fontWeight={700} fill={INK}>
              Projected annual need
            </text>
            
            <text 
              x={needCx} 
              y={BASE_Y + 42} 
              textAnchor="middle" 
              style={subtitleStyle}
            >
              PROJECTED ANNUAL
            </text>
            <text 
              x={needCx} 
              y={BASE_Y + 55} 
              textAnchor="middle" 
              style={subtitleStyle}
            >
              ADAPTATION FINANCING NEED
            </text>

            {/* RECEIVED bar */}
            <rect x={recvX} y={recvY} width={barW} height={recvH} fill={PRIMARY_COLOR} rx={0} />
            
            <text x={recvCx} y={recvY - 14} textAnchor="middle" fontSize={24} fontWeight={700} fill={PRIMARY_DARK}>
              US${disbursed.toFixed(1)}bn
            </text>
            
            <text x={recvCx} y={BASE_Y + 22} textAnchor="middle" fontSize={13.5} fontWeight={700} fill={INK}>
              Recent annual finance
            </text>
            
            <text 
              x={recvCx} 
              y={BASE_Y + 42} 
              textAnchor="middle" 
              style={subtitleStyle}
            >
              EST. ADAPTATION FINANCE
            </text>
            <text 
              x={recvCx} 
              y={BASE_Y + 55} 
              textAnchor="middle" 
              style={subtitleStyle}
            >
              DISBURSED, 2021&ndash;2023 AVG
            </text>

            {/* MEASUREMENT BRACKET */}
            {(() => {
              const gap = 25;
              const bx = recvX + barW + gap;
              const capLength = 10;
              const armTop = needTopY;
              const armBot = recvTopY;
              const mid = (armTop + armBot) / 2;
              return (
                <g>
                  <line x1={bx} y1={armTop} x2={bx} y2={armBot} stroke={INK} strokeWidth={1.35} opacity={0.75} />
                  <line x1={bx - capLength/2} y1={armTop} x2={bx + capLength/2} y2={armTop} stroke={INK} strokeWidth={1.35} opacity={0.75} />
                  <line x1={bx - capLength/2} y1={armBot} x2={bx + capLength/2} y2={armBot} stroke={INK} strokeWidth={1.35} opacity={0.75} />

                  <text x={bx + 18} y={mid - 12} textAnchor="start" fontSize={22} fontWeight={700} fill={INK}>
                    {unfundedPct}%
                  </text>
                  <text x={bx + 18} y={mid + 8} textAnchor="start" fontSize={11} fill={INK}>
                    remains unmet
                  </text>
                  <text x={bx + 18} y={mid + 24} textAnchor="start" fontSize={11} fill={INK}>
                    of projected annual need
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        <figcaption
          className="mt-4 chart-caption text-left"
          style={{
            fontSize: captionSize,
            color: "var(--text-secondary, #64748b)",
            lineHeight: 1.6,
          }}
        >
          Projected annual adaptation finance needs (IMF estimate, 2024 prices) compared with average annual adaptation finance disbursed to Pacific Island Countries (2021–2023). The comparison is a coverage ratio; at recent funding levels about {fundedPct}% of projected need would be met — not a same-year subtraction. Source:{" "}
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
      </div>
    </figure>
  );
}