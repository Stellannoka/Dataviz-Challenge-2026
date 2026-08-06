# The Cost of the Gap

Entry for the [Pacific Dataviz Challenge 2026](https://pacificdatavizchallenge.org/) by [Stellamaris Nnoka](https://www.linkedin.com/in/stellamaris-nnoka-71aa4a239/).

**Live:** https://stellannoka.github.io/Dataviz-Challenge-2026/

## The story

For more than two decades, every Pacific Island Country in this story has sat in the world's high-vulnerability half, while readiness to adapt has varied far more. This scrollytelling piece follows the gap between the two through three questions:

1. **Does the gap exist?** A global scatter of ND-GAIN vulnerability against readiness, 2004 to 2023, shows all twelve Pacific Island Countries in the high-vulnerability half in every year, while readiness separates them.
2. **What does the gap cost?** A scrollytelling map of the people directly affected by climate-related disasters in 2020, in absolute terms and per 100,000 population, followed by a bar chart of internal displacements by dominant hazard, toggling between the same two framings.
3. **Why does it persist?** Projected annual adaptation finance needs compared with the adaptation finance actually disbursed — at recent funding levels, about 26% of projected need would be met — followed by that same need expressed as a share of GDP, showing the smallest economies carrying the largest relative burden.

## Data sources

| Data | Source |
| --- | --- |
| Climate vulnerability and readiness scores, 2004 to 2023 | [ND-GAIN Country Index](https://gain.nd.edu/our-work/country-index/), Notre Dame Global Adaptation Initiative |
| People directly affected by disasters, 2020 | [Pacific Data Hub (SPC)](https://stats.pacificdata.org/), dataset DF_SDG_11, indicator VC_DSR_AFFCT |
| People directly affected per 100,000 population, 2020 | [UNSD SDG Indicators Database](https://unstats.un.org/sdgs/dataportal), indicator 11.5.1 (VC_DSR_DAFF) |
| Internal displacements by hazard, 2020 | [Internal Displacement Monitoring Centre](https://www.internal-displacement.org/database/displacement-data/); population from [UNSD SDG Indicators Database](https://unstats.un.org/sdgs/dataportal) |
| Adaptation finance needs and disbursements, and need as a share of GDP | [IMF Working Paper WP/26/83](https://www.imf.org/en/publications/wp/issues/2026/04/23/climate-finance-and-adaptation-needs-in-pacific-island-countries-575342), Gonguet et al. (2026); GDP from [IMF World Economic Outlook](https://www.imf.org/en/Publications/WEO/weo-database/2019/October) (October 2019) |

Cleaned inputs live in `public/data/`. Each visualisation cites and links its sources in its caption.

## Methodology

### Data challenges

**Direct disaster economic loss (SDG 11.5.2) was examined and excluded.** The Pacific Data Hub series covers only three of the twelve Pacific Island Countries for 2020 (Fiji, Papua New Guinea, Kiribati), mixes plain USD and USD-millions units within the same series, and carries no figure for Vanuatu, where Cyclone Harold caused the year's largest impacts. A regional total built from that coverage would understate losses to the point of misleading, so the piece quantifies the cost of disasters in people affected and displaced rather than dollars.

**Affected-per-100,000 rates can exceed 100,000.** The Marshall Islands recorded 132,810 people affected per 100,000 population in 2020, because people affected by more than one disaster in the same year are counted for each event. The map caption states this rather than smoothing it away.

**Displacement data has partial coverage.** The IDMC series has a comparable 2020 record for seven of the twelve Pacific Island Countries; Marshall Islands, Kiribati, Micronesia, Palau and Nauru have none. This limitation is not yet surfaced in the chart's caption — the underlying dataset carries a note naming the absent countries, but the component doesn't currently render it.

**The finance comparison is a coverage ratio.** Projected annual need (IMF estimate, 2024 prices) and recent annual disbursements (2021 to 2023 average) come from different reference periods, so the chart presents coverage of need rather than a same-year subtraction, and its caption says so.

**The finance figures carry the source's own caveats.** The IMF working paper synthesizes needs estimates from studies that differ in sectoral coverage, methodology and time horizons, and notes that disbursement data is limited, so the disbursed amounts are estimates. Its needs estimates also exclude long-term challenges such as potential large-scale relocation, which means the coverage ratio shown in Section 3 is, if anything, conservative. The piece uses the disbursement-basis ratio, measuring finance delivered rather than finance pledged; the paper also reports a higher commitment-basis ratio.

### Analytical choices

Quadrant boundaries in the vulnerability scatter are the global medians of each year's scores, recomputed per year, so a country's quadrant reflects its position relative to the world at that time. Editorial claims are bounded by what the charted data shows: associations are described as associations, and the conclusion is a verdict on the evidence rather than a call to action.

## Stack

Next.js 16 (static export), React 19, TypeScript, Tailwind CSS v4, and D3 (scales and geo only; all rendering is hand-written SVG in React). Deployed to GitHub Pages with a base path applied via `src/lib/basePath.ts`.

## Running locally

```bash
npm ci
npm run dev
```

The site is served under the `/Dataviz-Challenge-2026` base path in development and production, so open http://localhost:3000/Dataviz-Challenge-2026/.

To produce the static export:

```bash
npm run build
```

The output is written to `out/`.

## Structure

```
src/
  app/            page composition, layout, global styles
  components/     hero, prose and layout primitives, glossary tooltips
    ClimateGapOpener.tsx       cold-open scroll animation, world scatter -> Pacific highlight
  components/charts/
    VulnerabilityScatter.tsx   ND-GAIN scatter with quadrants, search and year scrub
    DisasterMapScrolly.tsx     scrollytelling map, raw counts then per-100k
    DisplacementChart.tsx      displacements by hazard, per-100k / absolute toggle
    FinanceGap.tsx             projected need vs disbursed finance
    AdaptationBurden.tsx       adaptation need as a share of GDP vs economic size
  hooks/          responsive width and scroll helpers
  lib/            base path and shared types
public/data/      cleaned datasets (JSON and source spreadsheets)
```
