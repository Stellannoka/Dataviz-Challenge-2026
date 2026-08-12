import ClimateGapOpener from "@/components/ClimateGapOpener";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import { Prose } from "@/components/Prose";
import { ChartBand } from "@/components/Container";
import VulnerabilityScatter from "@/components/charts/VulnerabilityScatter";
import DisasterMapScrolly from "@/components/charts/DisasterMapScrolly";
import Sealevelprojection from "@/components/charts/Sealevelprojection";
import FinanceGap from "@/components/charts/FinanceGap";
import AdaptationBurden from "@/components/charts/AdaptationBurden";
import GlossaryTerm from "@/components/Glossaryterm";


const narrative = "section-narrative";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <ClimateGapOpener />   {/* or <BracketOpener /> */}
      <Hero />

      {/* SECTION 1 — the gap */}
      <Section
        heading="Vulnerability Continues to Outpace Readiness"
      >
        <Prose>
          <p className="section-subtitle">
         Pacific Island Countries remain among the world's most vulnerable to climate change, while their capacity to translate investment into adaptation varies.
          </p>
        </Prose>
        
        <ChartBand>
          <VulnerabilityScatter />
        </ChartBand>
        
        <Prose>
          <div className={narrative}>
            <p>
      In the ND-GAIN framework, vulnerability reflects a country's exposure, sensitivity and capacity to adapt to climate hazards, while readiness reflects how well it can turn investment into effective <GlossaryTerm term="adaptation">adaptation</GlossaryTerm>. 
            </p>
            <p>
          While readiness has improved in some Pacific Island Countries, it has not been enough to offset their vulnerability. So even the more ready countries remain highly exposed and face large adaptation needs. The consequences of that become most visible when disasters strike.
            </p>
          </div>
        </Prose>
      </Section>

      {/* SECTION 2 — the map - WIDE */}
      <Section
        heading="The Human Impacts of Weather-Related Disasters"
        id="section-map"
        wide={true}
      >
        <Prose>
          <div className={narrative}>
            <p>
  Climate change is already affecting ecosystems, infrastructure, lives and livelihoods across the Pacific Island Countries. But these impacts are not felt evenly: their scale varies considerably from one country to the next, especially once differences in population are taken into account.
            </p>
          </div>
        </Prose>

        <DisasterMapScrolly />
        
        <div style={{ marginTop: "3rem" }} />

        <Prose>
          <div className={narrative}>
            <p>
      The scale of these impacts is not surprising given the region’s high exposure and sensitivity to climate change. 
            </p>
             <p>
   Yet the risks will intensify as the climate warms. Rising ocean temperatures and melting ice will drive further sea level rise across the region. Projections show that the rise will continue through the century, with the scale of change depending on location and future emissions.
            </p>
            
          </div>
        </Prose>

        <Sealevelprojection />

        <Prose>
          <div className={narrative}>
            <p>
      More than half of the Pacific Islands’ population lives within 500 metres of the coastline, where homes, infrastructure and livelihoods are closely tied to the sea. As sea levels rise, coastal flooding and storm surges can reach further inland, while erosion and saltwater intrusion threaten land and freshwater supplies.
            </p>
             <p>
     For communities already exposed to tropical cyclones and floods, these pressures could make displacement more frequent and recovery more difficult. The effects would extend to fishing, farming and other livelihoods that depend on the land and sea, placing further strain on communities already facing repeated climate-related shocks.
            </p>
            
          </div>
        </Prose>
      </Section>

      {/* BRIDGE */}
      <Section heading="Hazards cannot be chosen. Their impacts can be reduced.">
        <Prose>
          <div className={narrative}>
            <p>
            Pacific Island Countries cannot choose the hazards they face. Vanuatu cannot move beyond the cyclone belt, nor can Tuvalu raise its islands above rising seas. Their small size and geographic isolation also leave less room to absorb disruption and recover when disasters strike.
            </p>
             
            <p>
            What they can change is how prepared they are for what comes next, and that requires infrastructure that can withstand shocks, early warning systems that give people time to act, and stronger institutions capable of responding effectively.

            </p>
            <p>
             But these are investments that many Pacific Island Countries have limited room to make alone. Their economies are small, their revenue are bases narrow, and the sums involved are large. This is where international <GlossaryTerm term="climate action">climate action</GlossaryTerm> comes in, through the <GlossaryTerm term="climate finance">climate finance</GlossaryTerm> that flows from <GlossaryTerm term="industrialised countries">industrialised countries</GlossaryTerm> to countries on the front line of climate change.
            </p>
          </div>
        </Prose>
      </Section>

      {/* SECTION 3 — the finance gap */}
      <Section heading="Climate Financing Needs Remain Largely Unmet">
        <Prose>
          <div className={narrative}>
            <p> Pacific Island Countries are receiving only a fraction of the climate finance they need.
            </p>
              <p>
              Looking specifically at <GlossaryTerm term="adaptation finance">adaptation finance</GlossaryTerm>, Pacific Island Countries received an average of about US$0.9 billion a year between 2021 and 2023, against projected annual <GlossaryTerm term="adaptation needs">adaptation needs</GlossaryTerm> of about US$3.3 billion. At that level of financing, only around 26% of projected annual adaptation needs would be covered. Beyond that regional average, the gap varies considerably from one country to another.

            </p>
          </div>
        </Prose>

        <ChartBand>
          <FinanceGap />
        </ChartBand>

        <Prose>
          <div className={narrative}>
            <p>
            The gap is large in dollar terms, but far greater relative to the size of these economies. For Kiribati, one of the region's smallest economies, meeting its adaptation needs would cost about a third of everything the country produces in a year; a scale of investment difficult to meet from domestic resources alone.
            </p>
          </div>
        </Prose>

        <AdaptationBurden />

        <Prose>
          <div className={narrative}>
            <p>
       The challenge for Pacific Island Countries is not only the scale of climate vulnerability they face, but the limited resources available to prepare for it, with adaptation needs representing a substantial share of what their small economies produce each year.

            </p>
             <p>
        The cost of that gap is already being felt in the impacts of disasters on people, communities and economies.
            </p>
            <p>
      Yet the improvement in readiness in some countries shows that progress is possible. The task now is to sustain and extend it through continued investment in resilience that helps these countries prepare for hazards they cannot prevent and limit the disruption they cause.
            </p>
          </div>
        </Prose>
      </Section>


    {/* METHODOLOGY */}
<div className="max-w-[640px] mx-auto px-4" style={{ marginBottom: "4rem" }}>
  <div className="border-t border-slate-200 mb-8" />

  {/* About */}
  <h4 style={{
    fontSize: "0.85rem",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    color: "var(--text-color)",
    marginBottom: "0.5rem"
  }}>
    About
  </h4>
  <div className="section-subtitle" style={{ fontSize: "0.85rem" }}>
    <p style={{ marginBottom: "1.5rem" }}>
      Created by{" "}
      <a
        href="https://www.linkedin.com/in/stellamaris-nnoka-71aa4a239/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-[rgb(112,112,112)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
        style={{ fontWeight: 500 }}
      >
        Stella Chinyere Nnoka
      </a>{" "}
      for the{" "}
      <a
        href="https://pacificdatavizchallenge.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-[rgb(112,112,112)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
        style={{ fontWeight: 500 }}
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
    Data Sources
  </h4>
  <div className="section-subtitle" style={{ fontSize: "0.85rem" }}>
    <p style={{ marginBottom: "1.5rem" }}>
      The datasets used throughout the project are cited and linked in the caption of each visualisation.
    </p>
  </div>

  {/* Tool */}
  <h4 style={{
    fontSize: "0.85rem",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    color: "var(--text-color)",
    marginBottom: "0.5rem"
  }}>
    Tools
  </h4>
  <div className="section-subtitle" style={{ fontSize: "0.85rem" }}>
    <p style={{ marginBottom: "1.5rem" }}>
      Built with{" "}
      <a
        href="https://react.dev/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-[rgb(112,112,112)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
        style={{ fontWeight: 500 }}
      >
        React
      </a>
      ,{" "}
      <a
        href="https://d3js.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-[rgb(112,112,112)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
        style={{ fontWeight: 500 }}
      >
        D3.js
      </a>
      , and styled with{" "}
      <a
        href="https://tailwindcss.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-[rgb(112,112,112)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
        style={{ fontWeight: 500 }}
      >
        Tailwind CSS
      </a>
      .
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
        className="underline underline-offset-2 text-[rgb(112,112,112)] transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
        style={{ fontWeight: 500 }}
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