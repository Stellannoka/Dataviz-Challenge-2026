# The Cost of the Gap

Entry for the [Pacific Dataviz Challenge 2026](https://pacificdatavizchallenge.org/) by [Stellamaris Nnoka](https://www.linkedin.com/in/stellamaris-nnoka-71aa4a239/).

**Live:** https://stellannoka.github.io/Dataviz-Challenge-2026/

## The story

For more than two decades, every Pacific Island Country in this story has sat in the world's high-vulnerability half, while readiness to adapt has varied far more. This scrollytelling piece follows the gap between the two through three questions:

1. **Does the gap exist?** A global scatter of ND-GAIN vulnerability against readiness, 2004 to 2023, shows all twelve Pacific Island Countries in the high-vulnerability half in every year, while readiness separates them.
2. **What does the gap cost?** A scrollytelling map of the people directly affected by climate-related disasters in 2020, in absolute terms and per 100,000 population, followed by a paired dot plot of livelihoods disrupted against people affected.
3. **Why does it persist?** Projected annual adaptation finance needs compared with the adaptation finance actually disbursed. At recent funding levels, about 26% of projected need would be met.

## Data sources

| Data | Source |
| --- | --- |
| Climate vulnerability and readiness scores, 2004 to 2023 | [ND-GAIN Country Index](https://gain.nd.edu/our-work/country-index/), Notre Dame Global Adaptation Initiative |
| People directly affected by disasters, 2020 | [Pacific Data Hub (SPC)](https://stats.pacificdata.org/), dataset DF_SDG_11, indicator VC_DSR_AFFCT |
| People directly affected per 100,000 population, 2020 | [UNSD SDG Indicators Database](https://unstats.un.org/sdgs/dataportal), indicator 11.5.1 (VC_DSR_DAFF) |
| Livelihoods disrupted or destroyed, 2020 | [UNSD SDG Indicators Database](https://unstats.un.org/sdgs/dataportal), series VC_DSR_PDLN |
| Adaptation finance needs and disbursements | [IMF Working Paper WP/26/83](https://www.imf.org/en/publications/wp/issues/2026/04/23/climate-finance-and-adaptation-needs-in-pacific-island-countries-575342), Gonguet et al. (2026) |

Cleaned inputs live in `public/data/`. Each visualisation cites and links its sources in its caption.

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
  components/     hero, opener, prose and layout primitives, glossary tooltips
  components/charts/
    VulnerabilityScatter.tsx   ND-GAIN scatter with quadrants, search and year scrub
    DisasterMapScrolly.tsx     scrollytelling map, raw counts then per-100k
    LivelihoodsChart.tsx       paired dot plot, affected vs livelihoods
    FinanceGap.tsx             projected need vs disbursed finance
  hooks/          responsive width and scroll helpers
  lib/            base path and shared types
public/data/      cleaned datasets (JSON and source spreadsheets)
```
