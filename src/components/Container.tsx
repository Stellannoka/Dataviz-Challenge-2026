import { ReactNode } from "react";

// The ONE text-column definition, used for every textual element on the page.
// 640px max, centered, px-4 so text never touches the screen edge.
export const CONTAINER_WIDTH = 640;

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 ${className}`}
      style={{ maxWidth: CONTAINER_WIDTH }}
    >
      {children}
    </div>
  );
}

// Full-width band for charts that break out of the text column.
// Centers its child and gives it room; the chart measures its own width.
// NOTE: no horizontal padding here — every chart inside a ChartBand carries
// its own 16px internal gutter (matching Container's px-4), so padding at
// this level would double the gutter on phones and push chart titles and
// captions 16px right of the narrative text column.
export function ChartBand({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full flex justify-center ${className}`}>
      <div className="w-full" style={{ maxWidth: 920 }}>
        {children}
      </div>
    </div>
  );
}