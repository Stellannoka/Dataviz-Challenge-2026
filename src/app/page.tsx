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
         Pacific Island nations remain among the world's most vulnerable to climate change, while their capacity to translate investment into adaptation varies.
          </p>
        </Prose>
        
        <ChartBand>
          <VulnerabilityScatter />
        </ChartBand>
        
        <Prose>
          <div className={narrative}>
            <p>
     
        The greater the <GlossaryTerm term="vulnerability">vulnerability</GlossaryTerm> of a country, the greater the need for <GlossaryTerm term="adaptation">adaptation</GlossaryTerm> and the urgency to act. For Pacific Island nations, the combination of elevated climate risk and limited capacity to cope and adapt poses significant challenges, even where readiness has improved.
            </p>
            <p>
       With such limited adaptive capacity, the impacts of  <GlossaryTerm term="hazards"> climate-related hazards</GlossaryTerm> can extend well beyond the immediate event, disrupting livelihoods, displacing people from their homes and leaving communities to recover long after. 
            </p>
          </div>
        </Prose>
      </Section>

      {/* SECTION 2 — the map - WIDE */}
      <Section
        heading="The Human Impacts of Climate-Related Hazards"
        id="section-map"
        wide={true}
      >
        <DisasterMapScrolly />
        
        <div style={{ marginTop: "3rem" }} />

        <Prose>
          <div className={narrative}>
            <p>
      The magnitude of these impacts indicates the high exposure and sensitivity of the Pacific Island nations to climate hazards. Those risks are likely to grow as climate change drives continued sea-level rise.
            </p>
            
          </div>
        </Prose>

        <Sealevelprojection />

        <Prose>
          <div className={narrative}>
            <p>
      <a
        href="https://public.wmo.int/news/media-centre/ocean-heat-and-sea-level-rise-threaten-communities-south-west-pacific"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
      >
        Over half of the Pacific Islands’ population lives within 500 metres of the coast
      </a>
      , placing communities, infrastructure and livelihoods within reach of a rising sea.
            </p>
             <p>
   With sea level projected to rise by about 85 cm by 2100 under a high-emissions scenario, coastal flooding, storm surges and other similar climate-related hazards could intensify. These changes could further worsen the impacts on people and livelihoods across the region.
            </p>
            
          </div>
        </Prose>
      </Section>

      {/* BRIDGE */}
      <Section heading="Climate Hazards cannot be chosen. Their impacts can be reduced.">
        <Prose>
          <div className={narrative}>
            <p>
            Pacific Island nations cannot choose the hazards they face. Vanuatu cannot move beyond the cyclone belt, nor can Tuvalu raise its islands above rising seas. Their small size and geographic isolation also limit their ability to absorb disruption and recover when <GlossaryTerm term="disaters"> disasters</GlossaryTerm> strike.
            </p>
             
            <p>
           What they can change is how well they prepare for what comes next, and that requires infrastructure that can withstand shocks, early warning systems that give people time to act, and stronger institutions capable of responding effectively.

            </p>
            <p>
             But these nations have limited room to make these investments on their own. Their economies are small, revenue bases are narrow, and the sums involved are large. This is where <GlossaryTerm term="climate action">climate action</GlossaryTerm> comes in: through <GlossaryTerm term="climate finance">climate finance</GlossaryTerm> that flows from <GlossaryTerm term="industrialised countries">industrialised countries</GlossaryTerm> to climate-vulnerable countries on the front line of climate change.
            </p>
          </div>
        </Prose>
      </Section>

      {/* SECTION 3 — the finance gap */}
      <Section heading="Pacific Island Nations Aren’t Getting the Climate Finance They Need">
        <Prose>
          <div className={narrative}>
              <p>
              Between 2021 and 2023, Pacific Island Countries received an average of about US$0.9 billion a year in <GlossaryTerm term="adaptation finance">adaptation finance</GlossaryTerm>, against projected annual needs of about US$3.3 billion. At this level, current finance flow would cover only around 26% of projected needs, leaving most of the required investment unmet. The size of the gap also varies considerably across countries.
            </p>
          </div>
        </Prose>

        <ChartBand>
          <FinanceGap />
        </ChartBand>

        <Prose>
          <div className={narrative}>
            <p>
           The gap is large in dollar terms, but even larger relative to the size of these economies. For Kiribati, one of the region’s smallest economies, meeting its adaptation needs would require investment equivalent to about a third of everything the country produces in a year; a scale difficult to meet from domestic resources alone.
            </p>
          </div>
        </Prose>

        <AdaptationBurden />

        <Prose>
          <div className={narrative}>
            <p>
       The challenge for Pacific Island Countries is not only the scale of the climate risks they face, but also the limited resources available to to prepare for and reduce their impacts.
            </p>
             <p>
        The cost of that gap is already being felt in the impacts of disasters on people, communities and economies.
            </p>
            <p>
      Yet the improvement in readiness in some countries shows that progress is possible. The task now is to match that progress with investment at the scale their vulnerability demands, so that stronger conditions for adaptation can translate into greater protection from hazards they cannot prevent.
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