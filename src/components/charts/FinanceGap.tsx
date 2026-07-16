"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChartWidth } from "@/hooks/useChartWidth";
import { asset } from "@/lib/basePath";
import FinanceCountryCard from "./FinanceCountryCard";

interface RegionData {
  annualNeedUsdBn: number;
  commitmentUsdBn: number;
  disbursementUsdBn: number;
  commitmentCoveragePct: number;
  disbursementCoveragePct: number;
}
interface CountryNeed {
  country: string;
  iso: string;
  needPctGdp: number;
  atoll: boolean;
}
interface CountryCoverage {
  country: string;
  iso: string;
  coveragePct: number;
}
interface FinanceData {
  region: RegionData;
  needsByCountryPctGdp: CountryNeed[];
  countriesDisbursementCoverage: CountryCoverage[];
}

export default function FinanceGap() {
  const { ref, width } = useChartWidth();
  const [data, setData] = useState<FinanceData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => setMounted(true), []);

  const picMatch = useMemo(() => {
    if (!selectedIso || !data) return null;
    const need = data.needsByCountryPctGdp.find((c) => c.iso === selectedIso);
    if (!need) return null;
    const cov = data.countriesDisbursementCoverage.find(
      (c) => c.iso === need.iso
    );
    return { ...need, coveragePct: cov?.coveragePct ?? null };
  }, [selectedIso, data]);

  /* Countries ordered by need, so the dropdown itself carries information */
  const chips = useMemo(
    () =>
      data
        ? [...data.needsByCountryPctGdp].sort(
            (a, b) => b.needPctGdp - a.needPctGdp
          )
        : [],
    [data]
  );

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

  /* ---- geometry (viewBox space) ----
     Phones use a narrower viewBox so the same type sizes render larger
     relative to the chart, and the shortfall note sits below the bars
     rather than in a right-hand margin there is no room for. */
  const VB_W = isSmall ? 360 : 620;
  const VB_H = isSmall ? 400 : 380;
  const BASE_Y = isSmall ? 286 : 300;
  const TOP_Y = 40;
  const FULL_H = BASE_Y - TOP_Y;
  const barW = isSmall ? 96 : 118;

  const needX = isSmall ? 44 : 96;
  const recvX = isSmall ? 196 : 288;
  const needCx = needX + barW / 2;
  const recvCx = recvX + barW / 2;

  const recvH = FULL_H * (fundedPct / 100);
  const recvY = BASE_Y - recvH;
  const needTopY = TOP_Y;
  const recvTopY = recvY;

  const subtitleStyle = {
    fontFamily: "var(--font-sans)",
    fontSize: isSmall ? 9.5 : 11,
    fill: INK,
  };
  const valueSize = isSmall ? 20 : 24;
  const barLabelSize = isSmall ? 12 : 13.5;
  const noteSize = isSmall ? 12.5 : 14;

  return (
    <figure className="w-full">
      <div
        className="mx-auto w-full"
        style={{ maxWidth: "640px", paddingLeft: "16px", paddingRight: "16px", marginTop: isSmall ? "1.25rem" : "1.75rem" }}
      >
        {/* Measure line, with the country selector set inside it: the caption
            names what is plotted, and the dropdown changes what that is. */}
        <div
          className="section-subtitle"
          style={{ lineHeight: "1.9rem", marginBottom: "18px" }}
        >
          {picMatch
            ? "Adaptation finance received against estimated annual need, "
            : "Projected annual adaptation financing need and recent annual adaptation finance disbursed, "}
          <span
            ref={menuRef}
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-label="Choose the twelve countries combined, or a single country"
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                whiteSpace: "nowrap",
                verticalAlign: "middle",
                fontFamily: "var(--font-sans)",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "var(--primary-dark, #3f6e8c)",
                background: "#f2f7fa",
                border: "1.5px solid var(--primary, #5a8fb0)",
                borderRadius: 6,
                padding: "2px 8px 2px 10px",
                lineHeight: 1.6,
                boxShadow: menuOpen
                  ? "0 0 0 3px rgba(90,143,176,0.18)"
                  : "none",
                transition: "box-shadow 0.15s ease, background-color 0.15s ease",
              }}
            >
              {picMatch ? picMatch.country : "Overall PIC"}
              <svg
                aria-hidden="true"
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  flexShrink: 0,
                  transform: menuOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.18s ease",
                }}
              >
                <path d="M2 4.5 L6 8.5 L10 4.5" />
              </svg>
            </button>

            {menuOpen && (
              <ul
                role="listbox"
                aria-label="Countries"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "calc(100% + 4px)",
                  zIndex: 30,
                  listStyle: "none",
                  margin: 0,
                  padding: "4px 0",
                  minWidth: "100%",
                  width: "max-content",
                  maxWidth: 240,
                  maxHeight: 168,
                  overflowY: "auto",
                  background: "#ffffff",
                  border: "1px solid var(--faint, #e9e9f1)",
                  borderRadius: 6,
                  boxShadow: "0 6px 18px rgba(43,52,64,0.12)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.8rem",
                }}
              >
                {[
                  { iso: null as string | null, country: "Overall PIC" },
                  ...chips.map((c) => ({ iso: c.iso as string | null, country: c.country })),
                ].map((c) => {
                  const on = selectedIso === c.iso;
                  return (
                    <li
                      key={c.iso ?? "all"}
                      role="option"
                      aria-selected={on}
                      onClick={() => {
                        setSelectedIso(c.iso);
                        setMenuOpen(false);
                      }}
                      className="cursor-pointer px-3 py-1.5 hover:bg-slate-100"
                      style={{
                        color: "#2b3440",
                        fontWeight: on ? 600 : 400,
                        background: on ? "#f2f7fa" : undefined,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.country}
                    </li>
                  );
                })}
              </ul>
            )}
          </span>
          {picMatch ? "." : ", US$ billion."}
        </div>

        {picMatch && (
          <FinanceCountryCard
            country={picMatch.country}
            needPctGdp={picMatch.needPctGdp}
            coveragePct={picMatch.coveragePct}
            regionCoveragePct={region.disbursementCoveragePct}
            isSmall={isSmall}
          />
        )}

        <div ref={ref} className="w-full" hidden={picMatch !== null}>
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Two columns comparing the Pacific's projected annual adaptation financing need of about US$${need.toFixed(
              1
            )} billion with the estimated adaptation finance actually disbursed, about US$${disbursed.toFixed(
              1
            )} billion a year (2021-2023 average). Estimated disbursed finance stands at roughly one quarter the height of the need, covering about ${fundedPct} percent of it and leaving about ${unfundedPct} percent unmet.`}
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

            <text x={needCx} y={needTopY - 16} textAnchor="middle" fontSize={valueSize} fontWeight={700} fill={INK}>
              US${need.toFixed(1)}bn
            </text>

            <text x={needCx} y={BASE_Y + 22} textAnchor="middle" fontSize={barLabelSize} fontWeight={700} fill={INK}>
              Projected annual need
            </text>

            <text x={needCx} y={BASE_Y + 42} textAnchor="middle" style={subtitleStyle}>
              IMF ESTIMATE, 2024 PRICES
            </text>

            {/* RECEIVED bar */}
            <rect x={recvX} y={recvY} width={barW} height={recvH} fill={PRIMARY_COLOR} />

            <text
              x={recvCx}
              y={recvY - 16}
              textAnchor="middle"
              fontSize={valueSize}
              fontWeight={700}
              fill={PRIMARY_DARK}
            >
              US${disbursed.toFixed(1)}bn
            </text>

            <text x={recvCx} y={BASE_Y + 22} textAnchor="middle" fontSize={barLabelSize} fontWeight={700} fill={INK}>
              Current annual finance
            </text>

            <text x={recvCx} y={BASE_Y + 42} textAnchor="middle" style={subtitleStyle}>
              EST. DISBURSEMENTS, 2021&ndash;2023 AVERAGE
            </text>

            {/* SHORTFALL ANNOTATION */}
            {(() => {
              const armTop = needTopY;
              const armBot = recvTopY;
              const mid = (armTop + armBot) / 2;

              if (isSmall) {
                return (
                  <g>
                    <path
                      d={`M ${recvCx} ${armTop + 6} v ${armBot - armTop - 14}`}
                      stroke={INK}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      fill="none"
                      opacity={0.5}
                    />
                    <text
                      x={VB_W / 2}
                      y={BASE_Y + 74}
                      textAnchor="middle"
                      fontSize={noteSize}
                      fontWeight={700}
                      fill={INK}
                    >
                      {unfundedPct}% of projected need
                    </text>
                    <text
                      x={VB_W / 2}
                      y={BASE_Y + 92}
                      textAnchor="middle"
                      fontSize={noteSize}
                      fontWeight={700}
                      fill={INK}
                    >
                      will remain unmet
                    </text>
                    <text
                      x={VB_W / 2}
                      y={BASE_Y + 110}
                      textAnchor="middle"
                      fontSize={10.5}
                      fill="#707070"
                    >
                      at current funding levels
                    </text>
                  </g>
                );
              }

              const bx = recvX + barW + 22;
              return (
                <g>
                  <path
                    d={`M ${bx} ${armTop} h 10 V ${armBot} h -10`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={1.5}
                  />
                  <line x1={bx + 10} y1={mid} x2={bx + 24} y2={mid} stroke={INK} strokeWidth={1.5} />
                  <text x={bx + 32} y={mid - 12} textAnchor="start" fontSize={noteSize} fontWeight={700} fill={INK}>
                    {unfundedPct}% of projected need
                  </text>
                  <text x={bx + 32} y={mid + 6} textAnchor="start" fontSize={noteSize} fontWeight={700} fill={INK}>
                    will remain unmet
                  </text>
                  <text x={bx + 32} y={mid + 26} textAnchor="start" fontSize={11.5} fill="#707070">
                    at current funding levels
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
          <p style={{ margin: 0 }}>
            <span className="font-medium">Note: </span>The comparison is a
            coverage ratio rather than a same-year subtraction, and disbursed
            amounts are estimates; at recent funding levels about {fundedPct}%
            of projected need would be met.
          </p>
          <p style={{ margin: 0, marginTop: isSmall ? "6px" : "10px" }}>
            <span className="font-medium">Sources: </span>
            <a
              href="https://www.imf.org/-/media/files/publications/wp/2026/english/wpiea2026083-source-pdf.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-sky-700"
            >
              IMF Working Paper WP/26/83 (Gonguet et al., 2026)
            </a>
            .
          </p>
        </figcaption>

      </div>
    </figure>
  );
}