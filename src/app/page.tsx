import ClimateGapOpener from "@/components/ClimateGapOpener";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import { Prose } from "@/components/Prose";
import { ChartBand } from "@/components/Container";
import VulnerabilityScatter from "@/components/charts/VulnerabilityScatter";
import DisasterMapScrolly from "@/components/charts/DisasterMapScrolly";
import LivelihoodsChart from "@/components/charts/LivelihoodsChart";
import FinanceGap from "@/components/charts/FinanceGap";

const narrative = "section-narrative";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <ClimateGapOpener />   {/* or <BracketOpener /> */}
      <Hero />

      {/* SECTION 1 — the gap */}
      <Section
        heading="Most at Risk, Least Prepared"
      >
        <Prose>
          <p className="section-subtitle">
           Over the years, many Pacific Island Countries have ranked among the world's most climate-vulnerable and least ready to adapt.
          </p>
        </Prose>
        
        <ChartBand>
          <VulnerabilityScatter />
        </ChartBand>
        
        <Prose>
          <div className={narrative}>
            <p>
            Measured against every country in the world, Pacific Island Countries are consistently among the most climate-vulnerable. Although readiness differs between countries, improvements have not kept pace with the level of risk they face.
            </p>
            <p>
             Move through the years and the pattern changes remarkably little. Despite shifts elsewhere, many Pacific Island Countries remain concentrated where vulnerability is high and readiness comparatively low. The consequences of that persistent gap are visible in the people affected and the livelihoods disrupted each time climate-related hazards strike.
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
        
        {/* Add space between the map's caption and the next narrative */}
        <div style={{ marginTop: "3rem" }}>
          <Prose>
            <div className={narrative}>
            </div>
          </Prose>
        </div>
        
        <LivelihoodsChart />
        
        <Prose>
          <div className={narrative}>
            <p>
             For several Pacific Island Countries, the number of livelihoods disrupted was nearly as high as the number of people affected by disasters. 
            </p>
            <p>
              Behind those figures are households whose farms, fisheries, businesses and other sources of income were disrupted, leaving recovery to depend not only on repairing damaged infrastructure, but also on restoring the means to earn a living.
            </p>
          </div>
        </Prose>
      </Section>

      {/* BRIDGE */}
      <Section
        heading="Hazards can't be prevented. Their impact can."
      >
        <Prose>
          <div className={narrative}>
            <p>
            Climate hazards cannot always be prevented, but their impacts can be reduced. Pacific Island Countries cannot choose the hazards they face. Vanuatu cannot move beyond the cyclone belt, nor can Tuvalu lift its islands above rising seas.
            </p>
            <p>
             What can change is their readiness. Investments in stronger infrastructure, early warning systems and resilient institutions can reduce the human and economic costs of climate-related disasters.
            </p>
            <p>
             Yet many Pacific Island Countries cannot finance these investments alone. Closing the gap between climate risk and readiness therefore depends heavily on international climate finance.
            </p>
          </div>
        </Prose>
      </Section>

      {/* SECTION 3 — the finance gap */}
      <Section
        heading="Readiness Remains Underfunded"
      >
        <Prose>
          <p className="section-subtitle">
            Only about one quarter of estimated annual climate finance needs is currently met
          </p>
        </Prose>
        
        <ChartBand>
          <FinanceGap />
        </ChartBand>
        
        <Prose>
          <div className={narrative}>
            <p>
              Readiness cannot improve without investment. Yet the finance reaching Pacific Island Countries falls far short of what is needed to strengthen resilience, reduce disaster risks and prepare for a changing climate.
            </p>
            <p>
              This shortfall helps explain why the gap between vulnerability and readiness has proved so persistent. As climate risks continue to grow faster than investment, many Pacific Island Countries remain trapped in the same position: among the world's most vulnerable, yet still insufficiently prepared.
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
            <p>
              The Pacific Island Countries are already living with the consequences of the gap between climate vulnerability and readiness. Those consequences are measured in the people affected, the livelihoods disrupted and the limited capacity to prepare for the next disaste
            </p>
            <p>
             Climate hazards cannot be prevented. But the scale of their impact is not inevitable. Whether that gap narrows will depend on whether the investment needed to build resilience arrives before the next disaster strikes.
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
              This project was built with React, D3.js, and Tailwind CSS as an interactive scrollytelling experience.
            </p>
            <p style={{ marginBottom: "0.75rem" }}>
              It brings together multiple datasets to examine disaster impacts and resilience across Pacific Island countries. Where appropriate, indicators are presented both as absolute values and population-adjusted measures to support meaningful comparisons between countries of different sizes.
            </p>
            <p style={{ marginBottom: 0 }}>
              The datasets used throughout the project are cited and linked in the caption of each visualisation.
            </p>
          </div>
        </Prose>
      </Section>
    </main>
  );
}