import { Container } from "./Container";
import GlossaryTerm from "./Glossaryterm";

export default function Hero() {
  return (
    <header
      className="pt-0 pb-6 md:pt-0"
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
          className="hero-subtitle"
          style={{
            fontSize: '0.7rem',
            fontWeight: 400,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--primary, #5a8fb0)',
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

        <p className="hero-subtitle">
          What climate disasters cost the Pacific Islands, and how the gap between vulnerability and readiness shapes those costs.
        </p>

        <div className="hero-byline mt-5">
          <p>
            By{" "}
            <a
              href="https://www.linkedin.com/in/stellamaris-nnoka-71aa4a239/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-sky-700 font-medium"
            >
              Stellamaris Nnoka
            </a>
          </p>
          <p className="hero-subtitle">August 25, 2026</p>
        </div>

        <div className="hero-narrative" style={{ marginTop: '3rem' }}>
          <p>
            Climate change is making <GlossaryTerm term="hazards">hazards</GlossaryTerm> such as floods, droughts, tropical cyclones and sea-level rise more frequent, and in many cases more intense. Yet the damage they cause depends not only on the hazards themselves, but also on how prepared countries are to withstand and recover from them.
          </p>
          <p>
           For many Pacific Island Countries, that preparedness has not kept pace. For more than two decades, every one of the twelve countries in the data has remained in the world's high-vulnerability half. <GlossaryTerm term="readiness">Readiness</GlossaryTerm> has varied, with some countries improving more than others. Yet none has escaped the region's persistently high climate <GlossaryTerm term="vulnerability">vulnerability</GlossaryTerm>. Together, those patterns have changed remarkably little over the past years.
          </p>
        </div>
      </Container>
    </header>
  );
}