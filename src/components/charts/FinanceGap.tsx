"use client";

import { useEffect, useRef, useState } from "react";
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
  const figureRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<FinanceData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch(asset("/data/section5_finance.json"))
      .then((r) => r.json())
      .then((d: FinanceData) => setData(d))
      .catch((err) => console.error("Failed to load finance data:", err));
  }, []);

  /* One-time rise animation when the chart scrolls into view.
     Respects prefers-reduced-motion by showing the final state directly. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const el = figureRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data]);

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

  // ---- shared geometry (viewBox space), matching the Option A prototype ----
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

  /* Fade-in for the disbursed value and bracket, after the bar has risen */
  const revealStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transition: "opacity 0.5s ease 0.55s",
  };

  return (
    <figure ref={figureRef} className="w-full">
      <div
        className="mx-auto w-full"
        style={{ maxWidth: "640px", paddingLeft: "16px", paddingRight: "16px", marginTop: isSmall ? "1.25rem" : "1.75rem" }}
      >
        {/* Measure line: the section heading and subtitle above carry the
            editorial claim, so the chart states only what is plotted. */}
        <p className="section-subtitle" style={{ marginBottom: "18px" }}>
          Projected annual adaptation financing need and recent annual
          adaptation finance disbursed, Pacific Island Countries, US$ billion.
        </p>

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

            <text x={needCx} y={BASE_Y + 42} textAnchor="middle" style={subtitleStyle}>
              IMF ESTIMATE, 2024 PRICES
            </text>

            {/* RECEIVED bar — rises once when scrolled into view */}
            <rect
              x={recvX}
              y={visible ? recvY : BASE_Y}
              width={barW}
              height={visible ? recvH : 0}
              fill={PRIMARY_COLOR}
              style={{ transition: "y 0.7s ease-out, height 0.7s ease-out" }}
            />

            <text
              x={recvCx}
              y={recvY - 16}
              textAnchor="middle"
              fontSize={24}
              fontWeight={700}
              fill={PRIMARY_DARK}
              style={revealStyle}
            >
              US${disbursed.toFixed(1)}bn
            </text>

            <text x={recvCx} y={BASE_Y + 22} textAnchor="middle" fontSize={13.5} fontWeight={700} fill={INK}>
              Recent annual finance
            </text>

            <text x={recvCx} y={BASE_Y + 42} textAnchor="middle" style={subtitleStyle}>
              DISBURSED, 2021&ndash;2023 AVERAGE
            </text>

            {/* MEASUREMENT BRACKET — matches the Option A prototype */}
            {(() => {
              const bx = recvX + barW + 22;
              const armTop = needTopY;
              const armBot = recvTopY;
              const mid = (armTop + armBot) / 2;
              return (
                <g style={revealStyle}>
                  <path
                    d={`M ${bx} ${armTop} h 10 V ${armBot} h -10`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={1.5}
                  />
                  <line x1={bx + 10} y1={mid} x2={bx + 24} y2={mid} stroke={INK} strokeWidth={1.5} />
                  <text x={bx + 32} y={mid - 12} textAnchor="start" fontSize={14} fontWeight={700} fill={INK}>
                    {unfundedPct}% of projected need
                  </text>
                  <text x={bx + 32} y={mid + 6} textAnchor="start" fontSize={14} fontWeight={700} fill={INK}>
                    remains unmet
                  </text>
                  <text x={bx + 32} y={mid + 26} textAnchor="start" fontSize={11.5} fill="#707070">
                    at recent funding levels
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
          <span className="font-medium">Note: </span>The comparison is a
          coverage ratio rather than a same-year subtraction; at recent funding
          levels about {fundedPct}% of projected need would be met. Source:{" "}
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