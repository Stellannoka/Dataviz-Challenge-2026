import { Container } from "./Container";
import GlossaryTerm from "./Glossaryterm";

export default function Hero() {
  return (
    <header
      className="pt-0 pb-6 md:pt-0 md:pb-10"
      style={{
        /* Overlap release: the Hero slides up over the cold open's fading
           final beat instead of arriving after a blank frame. The negative
           margin controls how early it intrudes; -55vh leaves the final
           message roughly half its beat to be read before the title rises. */
        position: "relative",
        zIndex: 10,
        marginTop: "-55vh",
        background: "var(--surface, #ffffff)",
      }}
    >
      <Container>
        <p
          className="section-subtitle"
          style={{
            fontSize: '0.7rem',
            fontWeight: 400,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--primary, #7a9fd4)',
            textAlign: 'center',
            marginBottom: '0.5rem',
            paddingTop: '2.5rem',
          }}
        >
          Climate Change
        </p>
        <h1 className="hero-title">
          The Cost of the Gap
        </h1>

        <p className="section-subtitle" style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.9rem' }}>
          What climate-related hazards cost Pacific Island nations, and how the gap between vulnerability and readiness shapes those impacts.
        </p>

        <div className="hero-byline mt-5">
          <p>
            By{" "}
            <a
              href="https://www.linkedin.com/in/stellamaris-nnoka-71aa4a239/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 font-medium transition-colors duration-150 hover:bg-[#6d8499] hover:text-[#ffffff] hover:no-underline active:bg-[#6d8499] active:text-[#ffffff] active:no-underline"
            >
              Stella Chinyere Nnoka
            </a>
          </p>
          <p className="section-subtitle" style={{ fontSize: '0.86rem' }}>August 2026</p>
        </div>

        <div className="section-narrative" style={{ marginTop: '3rem' }}>
          <p>
           Climate change is increasing the frequency and severity of extreme weather events globally. However, countries do not experience the same level of risk, nor do they have the same capacity to cope with and adapt to its impacts.
          </p>
          <p>
       
Pacific Island nations are among the countries facing the greatest climate risks, yet have limited adaptive capacities. Although <GlossaryTerm term="readiness">readiness</GlossaryTerm> has improved across the region, they still rank among the world’s most vulnerable countries. Even Tuvalu, the region’s most ready country, ranks among the world’s 15 most vulnerable.
          </p>
        </div>
      </Container>
    </header>
  );
}