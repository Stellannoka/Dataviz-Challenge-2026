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
          What climate disasters cost Pacific Islands countries, and how the gap between vulnerability and readiness shapes those costs.
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
            Climate change is making <GlossaryTerm term="hazards">hazards</GlossaryTerm> such as floods, droughts, tropical cyclones and sea-level rise more frequent and, in many cases, more intense. As these hazards place growing pressure on communities and economies, the consequences of <GlossaryTerm term="disasters">disasters</GlossaryTerm> depends in part on a country's capacity to adapt and recover.
          </p>
          <p>
           For many Pacific Island Countries, readiness has improved over time, but not enough to keep pace with the scale of vulnerability they face. For more than two decades, they have remained among the world's most vulnerable to climate change. Even Tuvalu, the region's most ready country, ranks among the world's 20 most vulnerable.
          </p>
        </div>
      </Container>
    </header>
  );
}