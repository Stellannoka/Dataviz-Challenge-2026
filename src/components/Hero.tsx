import { Container } from "./Container";
import GlossaryTerm from "./Glossaryterm";

export default function Hero() {
  return (
    <header className="pt-0 pb-6 md:pt-0">
      <Container>
        <p
          style={{
            fontSize: '0.7rem',
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary, #707070)',
            textAlign: 'center',
            marginBottom: '0.5rem',
          }}
        >
          Climate Change
        </p>
        <h1 className="hero-title">
          The Cost of the Gap
        </h1>

        <p className="hero-subtitle" style={{ fontSize: '1rem' }}>
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

        {/* GLOSSARY CUE — centered under the date */}
        <p
          style={{
            fontSize: '0.88rem',
            fontFamily: 'var(--font-sans)',
            fontStyle: 'italic',
            fontWeight: 400,
            color: 'var(--text-secondary, #707070)',
            opacity: 0.7,
            textAlign: 'center',
            marginTop: '1rem',
            marginBottom: 0,
          }}
        >
          <span className="glossary-cue-hover" style={{ display: 'none' }}>
            Hover over{' '}
            <span style={{ borderBottom: '1.5px dashed currentColor', paddingBottom: '1px' }}>
              dashed-underlined
            </span>{' '}
            terms for definitions.
          </span>
          <span className="glossary-cue-tap">
            Tap{' '}
            <span style={{ borderBottom: '1.5px dashed currentColor', paddingBottom: '1px' }}>
              dashed-underlined
            </span>{' '}
            terms for definitions.
          </span>
        </p>

        <style>{`
          .glossary-cue-hover { display: none !important; }
          .glossary-cue-tap { display: inline !important; }
          @media (min-width: 768px) {
            .glossary-cue-hover { display: inline !important; }
            .glossary-cue-tap { display: none !important; }
          }
        `}</style>

        <div className="hero-narrative" style={{ marginTop: '3rem' }}>
          <p>
            Climate change is making <GlossaryTerm term="hazards">hazards</GlossaryTerm> such as floods, droughts, tropical cyclones and sea-level rise more frequent, and in many cases more intense. Yet the damage they cause depends not only on the hazards themselves, but also on how prepared countries are to withstand and recover from them.
          </p>
          <p>
            For many Pacific Islands, that preparedness has not kept pace. For more than two decades, every one of the twelve  countries in the data has sat in the world's high-vulnerability half, most ranking among the most climate-vulnerable nations anywhere. <GlossaryTerm term="readiness">Readiness</GlossaryTerm> is more uneven. Several remain among the least ready to adapt, while others have improved over time. Yet none has escaped the region's consistently high <GlossaryTerm term="vulnerability">vulnerability</GlossaryTerm>. That imbalance between vulnerability and readiness has changed remarkably little over the past years.
          </p>
        </div>
      </Container>
    </header>
  );
}