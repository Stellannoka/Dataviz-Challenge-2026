import { ReactNode } from "react";

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
    <section id={id} className="py-4 md:py-7">
      {(hasHeading || standfirst) && (
        <div className="mx-auto w-full px-4" style={{ maxWidth: 640 }}>
          {hasHeading && (
            <p
              className="section-title"
              style={{
                width: "100%",
                textAlign: "left",
                overflowWrap: "normal",
                wordBreak: "normal",
              }}
            >
              {heading}
            </p>
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
        </div>
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