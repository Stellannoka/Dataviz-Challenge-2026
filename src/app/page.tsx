import Hero from "@/components/Hero";
import Section from "@/components/Section";
import { Prose } from "@/components/Prose";
import ChartPlaceholder from "@/components/ChartPlaceholder";
import DisasterMapScrolly from "@/components/charts/DisasterMapScrolly";
import EconomicLoss from "@/components/charts/EconomicLoss";
import VulnerabilityScatter from "@/components/charts/VulnerabilityScatter";
import FinanceGap from "@/components/charts/FinanceGap";


export default function Home() {
  // Shared styling for narrative blocks
  const narrativeClass =
    "mt-8 space-y-5 text-slate-700 text-[clamp(0.9rem,0.85rem+0.35vw,1rem)] leading-[1.65]";

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Hero />

      {/* SECTION 1 */}
      <Section heading="The Costs Are Measured in Lives and Livelihoods" id="section-map">
  {/* Movement A: the scrollytelling map (full width, manages its own scroll) */}
  <DisasterMapScrolly />

  {/* Transition into the economic movement */}
  <Prose>
    <div className={narrativeClass}>
      <p>
        The lives upended are only half the story. The same storms strike
        economies far too small to absorb them — and the bill lands in a single
        year.
      </p>
    </div>
  </Prose>

  {/* Movement B: economic loss as % of GDP (continuation) */}
  <EconomicLoss />

  {/* Closing narrative for the section */}
  <Prose>
    <div className={narrativeClass}>
      <p>
        The two tolls fall on different nations. Papua New Guinea saw the most
        people affected, yet its economy — the region&rsquo;s largest — barely
        registered the loss. For Vanuatu and Fiji, a single cyclone erased a
        tenth of everything the country produced in a year. In the Pacific, the
        human cost and the economic cost are not the same story, and they are
        rarely borne by the same place.
      </p>
    </div>
  </Prose>
</Section>


 {/* SECTION 2 */}
      <Section heading="A Persistent Gap Between Risk and Readiness" id="section-gap">
        <VulnerabilityScatter />
        <Prose>
          <div className={narrativeClass}>
            <p>
              Vulnerability measures how severely climate change is likely to affect a country's essential systems, including food, water, health, habitat and infrastructure. It reflects not only exposure to climate risks, but also how sensitive those systems are and how well they can adapt. Readiness captures something different: a country's ability to attract investment and translate it into effective adaptation through strong institutions, governance and economic capacity. High vulnerability means greater climate risk. Low readiness means fewer tools to respond.
            </p>
            <p>
             Papua New Guinea sits furthest into the high-vulnerability, low-readiness quadrant, making it one of the countries most exposed to climate impacts while having the least capacity to translate resources into adaptation. The Federated States of Micronesia and Vanuatu occupy a similar position, combining elevated climate risks with relatively weak adaptive capacity. More broadly, most Pacific nations lie above the global median for vulnerability and below it for readiness, leaving them more exposed to climate-related harm than the typical country and less equipped to respond.
            </p>
            <p>
            Two decades of data show little change in that overall pattern. Readiness has improved, but largely in line with global progress. Vulnerability, meanwhile, has remained persistently high. Despite incremental gains, the region remains disproportionately exposed to climate impacts and comparatively constrained in its ability to adapt.
           </p>
          </div>
        </Prose>
      </Section>

     

      {/* SECTION 3 — The Money to Prepare Is Promised, Not Delivered */}
      <Section heading="The Money to Prepare Is Promised, Not Delivered" id="section-finance">
        <FinanceGap />
        <Prose>
          <div className={narrativeClass}>
            <p>
              Readiness is, in the end, about turning resources into protection — and for that, the resources have to arrive. They largely do not. The Pacific needs about $3.3 billion a year to adapt to a climate it did little to change. Donors have pledged roughly a third of that. But a pledge is not a payment; when the money is tracked from promise to delivery, only about a quarter of the need is actually disbursed — leaving a shortfall of nearly $2.4 billion every year.
            </p>
           
            <p>
              This is a failure of plumbing, not just pledges. Multilateral
              funds—the primary channel for the most vulnerable nations—disburse
              more slowly than bilateral aid, stalled by complex approval
              processes and the limited administrative capacity of small island
              states. The resilience gap is, at its core, a financing gap: the
              means to close it exist on paper, but rarely in the places they are
              needed.
            </p>
          </div>
        </Prose>
      </Section>

    {/* Conclusion */}
<Prose 
className="my-16 pb-8"> {/* Reduced pb from default */}
  {/* The faint divider line */}
  <div className="mb-12 border-t border-slate-200" />
  
  <div className={narrativeClass}>
    <p>
      The data point to a persistent gap between climate risk and adaptive capacity
      across the Pacific. Vulnerability remains high, readiness has improved only
      gradually, and adaptation finance has yet to close the distance between them.
    </p>

    <p>
      As climate impacts intensify, the region&rsquo;s ability to adapt will depend
      increasingly on whether investment can be translated into protection.
      Closing the adaptation gap is no longer a matter of identifying the need.
      It is a matter of matching that need with sustained and effective financing.
    </p>
  </div>
</Prose>
 </main>
  );
}