import ClimateGapOpener from "@/components/ClimateGapOpener";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import { Prose } from "@/components/Prose";
import { ChartBand } from "@/components/Container";
import VulnerabilityScatter from "@/components/charts/VulnerabilityScatter";
import DisasterMapScrolly from "@/components/charts/DisasterMapScrolly";
import LivelihoodsChart from "@/components/charts/LivelihoodsChart";
import FinanceGap from "@/components/charts/FinanceGap";
import GlossaryTerm from "@/components/Glossaryterm";

const narrative = "section-narrative";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <ClimateGapOpener />   {/* or <BracketOpener /> */}
      <Hero />

      {/* SECTION 1 — the gap */}
      <Section
        heading="High Vulnerability, Uneven Readiness"
      >
        <Prose>
          <p className="section-subtitle">
          For two decades, every Pacific Island Country has remained in the world's high-vulnerability half but readiness has varied far more.
          </p>
        </Prose>
        
        <ChartBand>
          <VulnerabilityScatter />
        </ChartBand>
        
        <Prose>
          <div className={narrative}>
            <p>
      In the ND-GAIN framework, vulnerability reflects exposure and sensitivity to climate hazards, while readiness measures a country's capacity to invest in and implement adaptation. When vulnerability continues to outpace readiness, climate shocks become harder to withstand and recover from.

            </p>
            <p>
           The consequences of that imbalance become most apparent when <GlossaryTerm term="disasters">disasters</GlossaryTerm> strike, first through the people affected and the livelihoods on which they depend.
            </p>
          </div>
        </Prose>
      </Section>

      {/* SECTION 2 — the map - WIDE */}
      <Section
        heading=""
        id="section-map"
        wide={true}
      >
        <DisasterMapScrolly />
        
        <div style={{ marginTop: "3rem" }} />

        <LivelihoodsChart />
        
        <Prose>
          <div className={narrative}>
            <p>
            The Marshall Islands recorded the starkest example, where livelihoods disrupted were equivalent to more than nine in ten people affected.
            </p>
            <p>
              Behind those figures are households whose farms, fisheries and businesses were disrupted, leaving recovery to depend not only on repairing damaged infrastructure, but also on restoring the means to earn a living. These impacts reflect not only the hazards countries face, but also how prepared they are to withstand and recover from them.
            </p>
          </div>
        </Prose>
      </Section>

      {/* BRIDGE */}
      <Section
        heading="Hazards cannot be chosen. Their impacts can be reduced."
      >
        <Prose>
          <div className={narrative}>
            <p>
          Pacific Island Countries cannot choose the climate hazards they face. Vanuatu cannot move beyond the cyclone belt, nor can Tuvalu raise its islands above rising seas. Nor can these countries choose their small populations or geographic isolation, both of which leave them with fewer resources to absorb and recover from climate shocks. What can change is their readiness to adapt to and recover from those hazards.
            </p>

            <p>
           Turning readiness into effective adaptation requires sustained investment in infrastructure, early warning systems and resilient institutions. Yet many Pacific Island Countries cannot finance those investments from domestic resources alone.
            </p>
            <p>
              Across the region, estimated <GlossaryTerm term="adaptation">adaptation</GlossaryTerm> needs average just over one-fifth of <GlossaryTerm term="gdp">GDP</GlossaryTerm> each year, and exceed one-third for some atoll nations. Meeting needs on that scale therefore depends heavily on international <GlossaryTerm term="climate finance">climate finance</GlossaryTerm>.
            </p>
          </div>
        </Prose>
      </Section>

      {/* SECTION 3 — the finance gap */}
      <Section
        heading="Adaptation Remains Underfunded"
      >
        <Prose>
          <div className={narrative}>
            <p>
         Despite its importance, adaptation finance reaching Pacific Island Countries falls far short of what is needed. Between 2021 and 2023, the region received an average of about USD 0.9 billion a year in adaptation finance. Estimated annual adaptation needs, however, are about USD 3.3 billion, meaning current finance would cover only around 26% of what is required.
            </p>
          </div>
        </Prose>
        
        <ChartBand>
          <FinanceGap />
        </ChartBand>
        
        <Prose>
          <div className={narrative}>
            <p>
           Without investment that better matches the scale of adaptation needs, strengthening resilience will remain difficult. However high a country's readiness becomes, it can only translate the finance that arrives into adaptation.
            </p>
            <p>
           Closing the gap between vulnerability and readiness will therefore require adaptation finance that better matches the scale of need, alongside the capacity to access and turn that investment into effective adaptation.
            </p>
          </div>
        </Prose>
      </Section>


    {/* METHODOLOGY */}
<div className="max-w-[640px] mx-auto px-4" style={{ marginBottom: "4rem" }}>
  <div className="border-t border-slate-200 mb-8" />
  
  {/* Tool */}
  <h4 style={{ 
    fontSize: "0.85rem", 
    fontWeight: 600, 
    fontFamily: "var(--font-sans)",
    color: "var(--text-color)",
    marginBottom: "0.5rem"
  }}>
    Tool
  </h4>
  <div className="section-subtitle" style={{ fontSize: "0.85rem" }}>
    <p style={{ marginBottom: "1.5rem" }}>
      This project was built with{" "}
      <a
        href="https://react.dev/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-sky-700"
        style={{ fontWeight: 500, color: "rgb(112, 112, 112)" }}
      >
        React
      </a>
      ,{" "}
      <a
        href="https://d3js.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-sky-700"
        style={{ fontWeight: 500, color: "rgb(112, 112, 112)" }}
      >
        D3.js
      </a>
      , and styled with{" "}
      <a
        href="https://tailwindcss.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-sky-700"
        style={{ fontWeight: 500, color: "rgb(112, 112, 112)" }}
      >
        Tailwind CSS
      </a>
      . Created as an entry for the{" "}
      <a
        href="https://pacificdatavizchallenge.org/#official-datasets--theme"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-sky-700"
        style={{ fontWeight: 500, color: "rgb(112, 112, 112)" }}
      >
        Pacific DataViz Challenge 2026
      </a>
      .
    </p>
  </div>

  {/* Source */}
  <h4 style={{ 
    fontSize: "0.85rem", 
    fontWeight: 600, 
    color: "rgb(44, 62, 80)",
    marginBottom: "0.25rem",
    fontFamily: "var(--font-sans)"
  }}>
    Sources
  </h4>
  <div className="section-subtitle" style={{ fontSize: "0.85rem" }}>
    <p style={{ marginBottom: "1.5rem" }}>
      The datasets used throughout the project are cited and linked in the caption of each visualisation.
    </p>
  </div>

  {/* Methodology */}
  <h4 style={{ 
    fontSize: "0.85rem", 
    fontWeight: 600, 
    color: "rgb(44, 62, 80)",
    marginBottom: "0.25rem",
    fontFamily: "var(--font-sans)"
  }}>
    Methodology
  </h4>
  <div className="section-subtitle" style={{ fontSize: "0.85rem" }}>
    <p style={{ marginBottom: 0 }}>
      Source code, data files and full methodology notes are available on{" "}
      <a
        href="https://github.com/stellannoka/Dataviz-Challenge-2026"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-sky-700"
        style={{ fontWeight: 500, color: "rgb(112, 112, 112)" }}
      >
        GitHub
      </a>
      .
    </p>
  </div>
</div>
    </main>
  );
}