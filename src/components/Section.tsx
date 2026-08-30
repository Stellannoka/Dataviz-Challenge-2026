import { ReactNode } from "react";

/* ======================================================================
   Section: the shared wrapper every major section of the article uses.
   Renders an optional serif heading and an optional standfirst (both
   confined to the 640px text column), then hands off to `children` for
   the section's actual content. `wide` lets a section's content (e.g. a
   full-bleed scrollytelling map) break out to the full viewport width
   instead of being capped at the text column — the heading/standfirst
   stay column-width regardless, since only `children`'s wrapper reads
   the `wide` flag.
   ====================================================================== */
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