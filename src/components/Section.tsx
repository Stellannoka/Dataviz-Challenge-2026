import { ReactNode } from "react";

interface SectionProps {
  heading: string;
  standfirst?: string;
  children: ReactNode;
  id?: string;
}

export default function Section({
  heading,
  standfirst,
  children,
  id,
}: SectionProps) {
  return (
    <section id={id} className="mx-auto max-w-[1080px] px-6 py-10 md:py-12">
      {/* Heading + standfirst stay in the 720 text column */}
      <div className="mx-auto max-w-[720px]">
        <h2 className="font-serif font-bold text-slate-900 text-[clamp(1rem,0.95rem+0.5vw,1.3rem)] leading-[1.2]">
          {heading}
        </h2>

        {standfirst && (
          <p className="mt-3 text-slate-600 text-[clamp(1rem,0.95rem+0.4vw,1.2rem)] leading-[1.5]">
            {standfirst}
          </p>
        )}
      </div>

      {/* Children manage their own width: charts fill 1080, narrative wraps in Prose */}
      <div className="mt-8">{children}</div>
    </section>
  );
}