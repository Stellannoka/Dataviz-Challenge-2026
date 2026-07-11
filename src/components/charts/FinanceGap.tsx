"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChartWidth } from "@/hooks/useChartWidth";
import { CONTAINER_WIDTH } from "@/components/Container";
import { asset } from "@/lib/basePath";

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
  const figureRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<FinanceData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Section-scoped search bar: appears while the finance section is on
     screen, disappears once it scrolls past. Mirrors the scatter's bar. */
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setOverlayVisible(true);
      return;
    }
    const el = figureRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setOverlayVisible(entries.some((e) => e.isIntersecting)),
      { threshold: 0, rootMargin: "0px 0px -60% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data]);

  const picMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !data) return null;
    const need = data.needsByCountryPctGdp.find((c) =>
      c.country.toLowerCase().includes(q)
    );
    if (!need) return null;
    const cov = data.countriesDisbursementCoverage.find(
      (c) => c.iso === need.iso
    );
    return { ...need, coveragePct: cov?.coveragePct ?? null };
  }, [query, data]);

  const suggestions = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...data.needsByCountryPctGdp]
      .filter((c) => c.country.toLowerCase().includes(q))
      .sort((a, b) => {
        const as = a.country.toLowerCase().startsWith(q) ? 0 : 1;
        const bs = b.country.toLowerCase().startsWith(q) ? 0 : 1;
        return as - bs || a.country.localeCompare(b.country);
      })
      .slice(0, 3);
  }, [query, data]);

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

  return (
    <figure ref={figureRef} className="w-full">
      {mounted &&
        data &&
        createPortal(
          <div
            role="search"
            aria-label="Look up a Pacific Island Country's adaptation finance figures"
            style={{
              position: "fixed",
              top: `calc(env(safe-area-inset-top, 0px) + ${isSmall ? 36 : 12}px)`,
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(92vw, 340px)",
              zIndex: 40,
              opacity: overlayVisible ? 1 : 0,
              pointerEvents: overlayVisible ? "auto" : "none",
              transition: "opacity 0.25s ease",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                width={isSmall ? 13 : 15}
                height={isSmall ? 13 : 15}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx={11} cy={11} r={7} />
                <line x1={21} y1={21} x2={16.2} y2={16.2} />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setListOpen(true);
                }}
                onFocus={() => setListOpen(true)}
                onBlur={() => setListOpen(false)}
                placeholder="Search a Pacific Island Country"
                className="w-full rounded-md bg-white py-1 pl-8 pr-8 text-slate-700 shadow-md outline-none"
                style={{
                  fontSize: isSmall ? "0.72rem" : "0.8rem",
                  border: "1.5px solid var(--primary, #5a8fb0)",
                }}
                aria-label="Search a Pacific Island Country"
                autoComplete="off"
                aria-expanded={listOpen}
                role="combobox"
                aria-controls="pic-suggestions"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  style={{ cursor: "pointer", fontSize: "0.9rem" }}
                >
                  ✕
                </button>
              )}
            </div>
            {listOpen && suggestions.length > 0 && (
              <ul
                id="pic-suggestions"
                role="listbox"
                className="mt-1 max-h-56 overflow-auto rounded-md bg-white shadow-md"
                style={{
                  listStyle: "none",
                  margin: "4px 0 0",
                  padding: "4px 0",
                  border: "1px solid var(--faint, #e9e9f1)",
                  fontSize: isSmall ? "0.72rem" : "0.8rem",
                }}
              >
                {suggestions.map((c) => (
                  <li
                    key={c.iso}
                    role="option"
                    aria-selected={picMatch?.iso === c.iso}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQuery(c.country);
                      setListOpen(false);
                    }}
                    className="cursor-pointer px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                  >
                    {c.country}
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body
        )}
      <div
        className="mx-auto w-full"
        style={{ maxWidth: "640px", paddingLeft: "16px", paddingRight: "16px", marginTop: 0 }}
      >
        {/* Measure line: the section heading above carries the editorial
            claim, so the chart states only what is plotted. */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.76rem",
            color: "var(--text-secondary, #707070)",
            opacity: 0.85,
            lineHeight: 1.4,
            marginBottom: "12px",
          }}
        >
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
            <rect x={recvX} y={recvY} width={barW} height={recvH} fill={PRIMARY_COLOR} />

            <text
              x={recvCx}
              y={recvY - 16}
              textAnchor="middle"
              fontSize={24}
              fontWeight={700}
              fill={PRIMARY_DARK}
            >
              US${disbursed.toFixed(1)}bn
            </text>

            <text x={recvCx} y={BASE_Y + 22} textAnchor="middle" fontSize={13.5} fontWeight={700} fill={INK}>
              Recent annual finance
            </text>

            <text x={recvCx} y={BASE_Y + 42} textAnchor="middle" style={subtitleStyle}>
              EST. DISBURSEMENTS, 2021&ndash;2023 AVERAGE
            </text>

            {/* MEASUREMENT BRACKET — matches the Option A prototype */}
            {(() => {
              const bx = recvX + barW + 22;
              const armTop = needTopY;
              const armBot = recvTopY;
              const mid = (armTop + armBot) / 2;
              return (
                <g>
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
      </div>

      <figcaption
        className="mt-4 chart-caption text-left mx-auto w-full px-4"
        style={{
          /* Same geometry as Container: the one text-column definition. */
          maxWidth: CONTAINER_WIDTH,
          fontSize: captionSize,
          color: "var(--text-secondary, #64748b)",
          lineHeight: 1.6,
        }}
      >
          <span className="font-medium">Note: </span>The comparison is a
          coverage ratio rather than a same-year subtraction, and disbursed
          amounts are estimates; at recent funding levels about {fundedPct}% of
          projected need would be met. Source:{" "}
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

      {picMatch && (
        <p
          style={{
            /* Inset by the column's 16px side padding so the callout's
               left border sits exactly where the narrative text starts. */
            maxWidth: CONTAINER_WIDTH - 32,
            margin: "14px auto 0",
            padding: "10px 12px",
            fontFamily: "var(--font-serif)",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            background: "#fdf6e9",
            borderLeft: "3px solid #b45309",
          }}
        >
          For <strong>{picMatch.country}</strong>, projected adaptation needs
          equal <strong>{picMatch.needPctGdp}%</strong> of GDP each year.
          {picMatch.coveragePct !== null && (
            <>
              {" "}
              Recent finance covers about{" "}
              <strong>{picMatch.coveragePct}%</strong> of its estimated need.
            </>
          )}
        </p>
      )}
    </figure>
  );
}