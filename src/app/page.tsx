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
      In the ND-GAIN framework, higher readiness means countries are better positioned to translate investment into adaptation, but their adaptation needs remain high. Even where readiness has improved, it has not kept pace with the region's persistently high vulnerability, leaving a gap between the need to adapt and the capacity to do so.

            </p>
            <p>
           Although individual countries shift over time, this overall pattern remains remarkably consistent. Its consequences become most apparent when climate-related <GlossaryTerm term="disasters">disasters</GlossaryTerm> strike. with the impacts first felt by affected populations and the livelihoods on which they depend.
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
              Behind those figures are households whose farms, fisheries and businesses were disrupted, leaving recovery to depend not only on repairing damaged infrastructure, but also on restoring the means to earn a living.
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
          Pacific Island Countries cannot choose the climate hazards they face. Vanuatu cannot move beyond the cyclone belt, nor can Tuvalu raise its islands above rising seas. Nor can these countries choose their small populations or their distance from global markets, conditions that leave less room to absorb a shock than larger, more connected economies have. What can change is their readiness to adapt to and recover from those hazards.
            </p>

            <p>
            Strengthening infrastructure, expanding early warning systems and building resilient institutions can reduce the human and economic costs of climate-related disasters. Yet these measures require sustained investment that many Pacific Island Countries cannot finance from domestic resources alone.
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
              For Pacific Island Countries, international climate finance is essential to securing investment on the scale their adaptation needs require. An estimated $3.3 billion (25.2% of GDP) is needed annually to meet adaptation needs. Yet the adaptation finance reaching them falls well short: at current financing flows, it would meet only about one-quarter (26%) of the projected annual adaptation finance needs. That figure is a regional average, and the share of estimated needs met varies widely across countries.
            </p>
          </div>
        </Prose>
        
        <ChartBand>
          <FinanceGap />
        </ChartBand>
        
        <Prose>
          <div className={narrative}>
            <p>
              Without investment that better matches the scale of adaptation needs, strengthening readiness will remain difficult. However strong institutions become, they can only translate the finance that arrives into adaptation. Closing the finance gap is therefore essential if adaptation needs are to be met.
            </p>
          </div>
        </Prose>
      </Section>

      {/* CONCLUSION */}
      <div className="max-w-[640px] mx-auto px-4">
        <div className="border-t border-slate-200 mb-8" />
      </div>
      <Section heading="Conclusion">
        <Prose>
          <div className={narrative}>
            <p className={narrative} style={{ marginBottom: 0 }}>
            Climate hazards cannot always be prevented. But countries can strengthen their readiness to adapt. The investment needed to build that readiness, however, still falls far short of what is required.
            </p>
             <p className={narrative} style={{ marginBottom: 0 }}>
           That persistent investment gap carries a cost measured not in dollars alone, but in the people, livelihoods and communities it leaves most exposed.
            </p>
             <p className={narrative} style={{ marginBottom: 0 }}>
          Adaptation finance is therefore an urgent priority for Pacific Island Countries because it is essential to strengthening resilience, protecting livelihoods and reducing the impacts of climate change.
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
    color: "#2b3440",
    marginBottom: "0.25rem",
    fontFamily: "var(--font-sans)"
  }}>
    Tool
  </h4>
  <div className="section-subtitle" style={{ fontSize: "0.85rem" }}>
    <p style={{ marginBottom: "1.5rem" }}>
      This project was created as an entry for the{" "}
      <a
        href="https://pacificdatavizchallenge.org/#official-datasets--theme"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2 hover:text-sky-700"
      >
        Pacific DataViz Challenge 2026
      </a>
      . It was built with{" "}
      <a
        href="https://react.dev/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2 hover:text-sky-700"
      >
        React
      </a>
      ,{" "}
      <a
        href="https://d3js.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2 hover:text-sky-700"
      >
        D3.js
      </a>
      , and styled with Tailwind CSS.
    </p>
  </div>

  {/* Source */}
  <h4 style={{ 
    fontSize: "0.85rem", 
    fontWeight: 600, 
    color: "#2b3440",
    marginBottom: "0.25rem",
    fontFamily: "var(--font-sans)"
  }}>
    Source
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
    color: "#2b3440",
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
        className="font-semibold underline underline-offset-2 hover:text-sky-700"
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