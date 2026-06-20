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

interface CountryCoverage {
  country: string;
  iso: string;
  coveragePct: number;
}

interface FinanceData {
  region: RegionData;
  countriesDisbursementCoverage: CountryCoverage[];
}

// Most infrastructure-vulnerable nations
const MOST_VULNERABLE = new Set(["MHL", "SLB", "FSM"]);

export default function FinanceGap() {
  const { ref, width } = useChartWidth();
  const [data, setData] = useState<FinanceData | null>(null);

  useEffect(() => {
    fetch(asset("/data/section5_finance.json"))
      .then((r) => r.json())
      .then((d: FinanceData) => setData(d))
      .catch((err) => console.error("Failed to load finance data:", err));
  }, []);

  const isSmall = width < 480;

  if (!data) {
    return <div ref={ref} className="h-[400px] w-full" />;
  }

  const { region, countriesDisbursementCoverage } = data;

  // Funnel — colour fades dark blue → blue → light as the money shrinks
  const funnel = [
    {
      label: "What the region needs each year",
      sublabel: "Estimated annual adaptation need",
      valueLabel: `$${region.annualNeedUsdBn.toFixed(1)}bn`,
      pct: 100,
      color: "#3f6e8c",
    },
    {
      label: "What donors have promised",
      sublabel: "Committed — pledged at signing",
      valueLabel: `$${region.commitmentUsdBn.toFixed(1)}bn`,
      pct: region.commitmentCoveragePct,
      color: "#5a8fb0",
    },
    {
      label: "What has actually arrived",
      sublabel: "Disbursed — money truly paid out",
      valueLabel: `$${region.disbursementUsdBn.toFixed(1)}bn`,
      pct: region.disbursementCoveragePct,
      color: "#9cc0d8",
    },
  ];

  const sorted = [...countriesDisbursementCoverage].sort(
    (a, b) => a.coveragePct - b.coveragePct
  );
  const maxPct = 100;

  return (
    <figure className="mx-auto w-full max-w-[720px]">
      <figcaption className="mb-1 text-[var(--caption)] text-[clamp(0.7rem,0.68rem+0.15vw,0.8rem)] font-medium leading-snug">
        For every dollar the Pacific needs to adapt, only about a quarter is ever
        paid out
      </figcaption>

      <div ref={ref} className="w-full">
        {/* ---- MOVEMENT 1: the region funnel ---- */}
        <div className="space-y-2.5">
          {funnel.map((step) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="relative h-9 flex-1">
                <div
                  className="flex h-full items-center rounded-md px-3 transition-all"
                  style={{
                    width: `${step.pct}%`,
                    minWidth: 92,
                    backgroundColor: step.color,
                  }}
                >
                  <span className="font-serif text-sm font-bold text-white">
                    {step.valueLabel}
                  </span>
                </div>
              </div>
              <div className="w-[44%] shrink-0">
                <p className="text-[clamp(0.8rem,0.78rem+0.15vw,0.9rem)] font-semibold text-slate-700 leading-tight">
                  {step.label}
                </p>
                <p className="text-[var(--caption)] text-[clamp(0.7rem,0.68rem+0.1vw,0.76rem)] leading-tight">
                  {step.sublabel}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Gap callout */}
        <p className="mt-4 text-slate-600 text-[clamp(0.85rem,0.8rem+0.2vw,0.95rem)] leading-snug">
          Nearly three-quarters of the region&rsquo;s annual adaptation need —
          about{" "}
          <span className="font-semibold text-slate-900">
            ${(region.annualNeedUsdBn - region.disbursementUsdBn).toFixed(1)} billion
            every year
          </span>{" "}
          — never arrives.
        </p>

        <div className="my-10" />

        {/* ---- MOVEMENT 2: per-country coverage ---- */}
        <p className="mb-4 text-[clamp(0.8rem,0.78rem+0.15vw,0.9rem)] font-semibold text-slate-700">
          And the share that arrives is smallest where exposure is greatest
        </p>

        <div className="space-y-1.5">
          {sorted.map((c) => {
            const isException = c.coveragePct > 100;
            const isVuln = MOST_VULNERABLE.has(c.iso);
            const barPct = Math.min(c.coveragePct, maxPct);
            return (
              <div key={c.iso} className="flex items-center gap-2">
                <div
                  className="shrink-0 text-right text-[clamp(0.7rem,0.68rem+0.12vw,0.82rem)]"
                  style={{ width: isSmall ? 40 : 132 }}
                >
                  <span className={isVuln ? "font-semibold text-slate-900" : "text-slate-600"}>
                    {isSmall ? c.iso : c.country}
                  </span>
                </div>
                <div className="relative h-5 flex-1">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${barPct}%`,
                      minWidth: 28,
                      backgroundColor: isException
                        ? "#cbd5e1"
                        : isVuln
                        ? "#e0916a"
                        : "#94a3b8",
                    }}
                  />
                  <span
                    className="absolute top-1/2 -translate-y-1/2 pl-1.5 text-[11px] font-semibold"
                    style={{
                      left: `${barPct}%`,
                      color: isException ? "#64748b" : "#334155",
                    }}
                  >
                    {c.coveragePct}%
                    {isException && !isSmall && (
                      <span className="ml-1 font-normal text-slate-400">(one-off grants)</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#e0916a" }} />
            Most infrastructure-vulnerable
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#94a3b8" }} />
            Other Pacific nations
          </span>
        </div>
      </div>

      {/* Caption */}
      <figcaption className="mt-5 mx-auto max-w-[720px] text-[var(--caption)] text-[clamp(0.7rem,0.68rem+0.1vw,0.78rem)] leading-snug">
        Coverage is the share of each nation&rsquo;s annual adaptation need met by
        climate finance actually disbursed (2021&ndash;2023 average against
        annualised future need). Tuvalu exceeds 100% on the strength of three
        one-off World Bank transport grants and is not a sustained level. Source:{" "}
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
    </figure>
  );
}