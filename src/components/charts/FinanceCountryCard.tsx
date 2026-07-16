"use client";

interface Props {
  country: string;
  needPctGdp: number;
  coveragePct: number | null;
  regionCoveragePct: number;
  isSmall: boolean;
}

/* The chart, filtered to one country. Deliberately carries no card chrome and
   no close control: the selector in the caption above is the only way in or
   out, so the panel reads as the chart changing rather than as an overlay.
   Coverage above 100% (Tuvalu) is drawn as an overflow segment past the need
   marker rather than clipped. */
export default function FinanceCountryCard({
  country,
  needPctGdp,
  coveragePct,
  regionCoveragePct,
  isSmall,
}: Props) {
  const cov = coveragePct;
  const over = cov !== null && cov > 100;

  /* Track spans max(100, coverage) units so any overflow stays visible. */
  const units = cov !== null ? Math.max(100, cov) : 100;
  const needAt = (100 / units) * 100;
  const fillTo = cov !== null ? (Math.min(cov, 100) / units) * 100 : 0;
  const overTo = cov !== null && over ? (cov / units) * 100 : needAt;

  const INK = "#2b3440";
  const MUT = "#707070";

  return (
    <div
      aria-label={`Adaptation finance for ${country}`}
      style={{ width: "100%", fontFamily: "var(--font-sans)" }}
    >
      {/* the measured quantity */}
      <div
        style={{
          background: "#fcfbf8",
          border: "1px solid #f0ede6",
          borderRadius: 6,
          padding: isSmall ? "14px 14px 12px" : "18px 20px 16px",
          marginBottom: 18,
        }}
      >
        <p
          style={{
            fontSize: "0.64rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: MUT,
            margin: 0,
          }}
        >
          Finance received against estimated need
        </p>

        {cov === null ? (
          <p style={{ fontSize: "0.8rem", color: MUT, margin: "14px 0 0" }}>
            No disbursement estimate reported.
          </p>
        ) : (
          <>
            <div style={{ position: "relative", margin: "26px 0 0" }}>
              <div
                style={{
                  position: "relative",
                  height: 30,
                  background: "#eef1f4",
                  border: "1px solid #cfd6dd",
                  borderRadius: 3,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${fillTo}%`,
                    background: "var(--primary, #5a8fb0)",
                    borderRadius: "2px 0 0 2px",
                  }}
                />
                {over && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${needAt}%`,
                      width: `${overTo - needAt}%`,
                      top: -3,
                      bottom: -3,
                      background:
                        "repeating-linear-gradient(45deg,#7bbf9e,#7bbf9e 4px,#93cdb1 4px,#93cdb1 8px)",
                      border: "1px solid #5aa583",
                      borderRadius: "0 3px 3px 0",
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    left: `${needAt}%`,
                    top: -8,
                    bottom: -8,
                    width: 2,
                    background: INK,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: -16,
                      right: over ? "auto" : 0,
                      left: over ? 5 : "auto",
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      color: INK,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ESTIMATED NEED
                  </span>
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: isSmall ? "0.78rem" : "0.85rem",
                color: INK,
                margin: "16px 0 0",
                lineHeight: 1.5,
              }}
            >
              {over ? (
                <>
                  Current finance flows <strong>exceeds</strong> {country}&rsquo;s
                  estimated annual need ({cov}% coverage).
                </>
              ) : (
                <>
                  Current finance flows will cover about <strong>{cov}%</strong> of{" "}
                  {country}&rsquo;s estimated annual need, leaving{" "}
                  <strong>{100 - cov}%</strong> unmet.
                </>
              )}
            </p>
          </>
        )}
      </div>

      {/* the supporting figures */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isSmall ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: "14px 20px",
          fontSize: isSmall ? "0.78rem" : "0.85rem",
          color: INK,
        }}
      >
        <div>
          <span style={{ color: MUT }}>Annual need</span>
          <br />
          <strong>{needPctGdp}% of GDP</strong>
        </div>
        <div>
          <span style={{ color: MUT }}>Finance coverage</span>
          <br />
          <strong>{cov === null ? "Not reported" : `${cov}%`}</strong>
        </div>
        <div>
          <span style={{ color: MUT }}>Across the twelve countries</span>
          <br />
          <strong>{regionCoveragePct}%</strong>
        </div>
      </div>

      {over && (
        <p
          style={{
            background: "#fdf6e9",
            borderLeft: "3px solid #b45309",
            padding: "10px 12px",
            fontSize: "0.78rem",
            lineHeight: 1.5,
            margin: "18px 0 0",
            color: INK,
          }}
        >
          This reflects large, lump-sum financing rather than steady annual
          flows: three World Bank grants for adaptation-related transportation
          projects, committed in 2021&ndash;2023, together equal roughly{" "}
          {country}&rsquo;s entire GDP. The IMF working paper cautions this
          should not be read as overfinancing, since the 2021&ndash;2023
          average may not represent the flows {country} receives in future
          years.
        </p>
      )}
    </div>
  );
}