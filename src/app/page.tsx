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
         Compared with countries around the world, several Pacific Island Countries occupy the quadrant where high vulnerability coincides with limited readiness and a high urgency to adapt. Others are comparatively more ready to adapt, which in the ND-GAIN framework means they are better positioned to translate investment into adaptation, but their climate risks and adaptation needs remain high.
            </p>
            <p>
           Although individual countries shift over time, this broader pattern changes remarkably little, and its consequences become clear when climate-related <GlossaryTerm term="disasters">disasters</GlossaryTerm> strike. The impacts are first seen in the people affected, and in the livelihoods they depend on.
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
            In some Pacific Island Countries, the scale of livelihood disruption approached the number of people directly affected by disasters. The Marshall Islands recorded the starkest example, where livelihoods disrupted were equivalent to more than nine in ten people affected.
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
            Pacific Island Countries cannot choose the climate hazards they face. Vanuatu cannot move beyond the cyclone belt, nor can Tuvalu raise its islands above rising seas. What can change is their readiness to adapt to and recover from those hazards.
            </p>
            <p>
             Strengthening infrastructure, expanding early warning systems and building resilient institutions can reduce the human and economic costs of climate-related disasters. But building that readiness requires sustained investment.
            </p>
            <p>
              For many Pacific Island Countries, the investment needed to strengthen readiness is beyond what domestic resources alone can support. Across the region, estimated <GlossaryTerm term="adaptation">adaptation</GlossaryTerm> needs average just over one-fifth of <GlossaryTerm term="gdp">GDP</GlossaryTerm> each year, and exceed one-third for some atoll nations. Meeting needs on that scale therefore depends heavily on international <GlossaryTerm term="climate finance">climate finance</GlossaryTerm>.
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
              Under the <GlossaryTerm term="paris agreement">Paris Agreement</GlossaryTerm>, developed countries committed to provide climate finance for adaptation in developing countries. For Pacific Island Countries, that commitment is the main route to investment on the scale their needs require. Yet the adaptation finance reaching them falls well short: at recent funding levels, it would meet only about one-quarter (26%) of projected annual adaptation finance needs. That figure is a regional average, and the share of estimated needs met varies widely across countries.
            </p>
          </div>
        </Prose>
        
        <ChartBand>
          <FinanceGap />
        </ChartBand>
        
        <Prose>
          <div className={narrative}>
            <p>
              Without investment that better matches the scale of adaptation needs, strengthening readiness will remain difficult. And readiness, however high, can only convert the finance that arrives. What stands between adaptation needs and adaptation itself is the shortfall between the finance needed and the finance delivered.
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
             Climate hazards cannot always be prevented. But countries can strengthen their readiness to adapt, and the investment needed to do so still falls far short of what is required.
            </p>
             <p className={narrative} style={{ marginBottom: 0 }}>
             That is the gap, and its cost is measured not in dollars alone, but in the people, livelihoods and communities it leaves most exposed.
            </p>
          </div>
        </Prose>
      </Section>

      {/* METHODOLOGY */}
<div className="max-w-[640px] mx-auto px-4">
  <div className="border-t border-slate-200 mb-8" />
</div>
<Section heading="Methodology">
  <Prose>
    <div className="section-subtitle" style={{ fontSize: "0.85rem" }}>
      <p style={{ marginBottom: "0.75rem" }}>
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
      <p style={{ marginBottom: "0.75rem" }}>
        It brings together multiple datasets to examine climate vulnerability, disaster impacts and resilience across Pacific Island Countries. Where appropriate, indicators are presented both as absolute values and population-adjusted measures to support meaningful comparisons between countries of different sizes.
      </p>
      <p style={{ marginBottom: "0.75rem" }}>
        The datasets used throughout the project are cited and linked in the caption of each visualisation.
      </p>
      <p style={{ marginBottom: 0 }}>
        Written and built by Stellamaris Nnoka. Source code, data files and full methodology notes are available on{" "}
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
  </Prose>
</Section>
    </main>
  );
}