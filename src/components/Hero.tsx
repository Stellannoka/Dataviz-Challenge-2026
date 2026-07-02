import { Container } from "./Container";

export default function Hero() {
  return (
    <header className="pt-20 pb-6 md:pt-28">
      <Container>
        <h1 className="hero-title">
          The Cost of the Gap
        </h1>

        <p className="hero-subtitle">
         
What climate disasters cost the Pacific Islands, and how the gap between climate risk and preparedness shapes those costs.
        </p>

        <div className="hero-byline mt-5">
          <p>
            By{" "}
            <a
              href="https://www.linkedin.com/in/stellamaris-nnoka-71aa4a239/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-sky-700"
            >
              Stellamaris Nnoka
            </a>
          </p>
          <p className="hero-subtitle">August 25, 2026</p>
        </div>

        <div className="hero-narrative mt-8">
          <p>
    Climate change is making hazards such as floods, droughts, tropical cyclones and sea-level rise more frequent and more severe. Yet their consequences depend as much on a country's readiness as on its exposure.
          </p>
          <p>
           For many Pacific Island Countries, that readiness has failed to keep pace with the climate risks they face. For more than two decades, many have ranked among the world's most climate-vulnerable while remaining among the least ready to adapt. The gap between climate risk and readiness has barely shifted.
          </p>
          
        </div>
      </Container>
    </header>
  );
}