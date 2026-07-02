import { ReactNode } from "react";
import { Container } from "./Container";

interface SectionProps {
  heading: string;
  standfirst?: string;
  children: ReactNode;
  id?: string;
  wide?: boolean;
}

export default function Section({
  heading,
  standfirst,
  children,
  id,
  wide = false,
}: SectionProps) {
  const hasHeading = heading.trim().length > 0;

  return (
    <section id={id} className="py-6 md:py-10">
      {(hasHeading || standfirst) && (
        <Container>
          {hasHeading && (
            <h2
              className="font-serif text-slate-900"
              style={{
                fontSize: "1.2rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
                width: "100%",
                maxWidth: "640px",
                textAlign: "left",
              }}
            >
              {heading}
            </h2>
          )}
          {standfirst && (
            <p
              className="font-serif"
              style={{
                fontSize: "0.86rem",
                fontWeight: 300,
                color: "#707070",
                marginBottom: 0,
                lineHeight: "1.2rem",
                maxWidth: "640px",
                textAlign: "left",
              }}
            >
              {standfirst}
            </p>
          )}
        </Container>
      )}
      <div
        className={hasHeading || standfirst ? "mt-4" : ""}
        style={wide ? { maxWidth: "100%", padding: "0" } : {}}
      >
        {children}
      </div>
    </section>
  );
}