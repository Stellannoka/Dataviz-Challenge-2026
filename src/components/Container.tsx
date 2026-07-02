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
export function ChartBand({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full flex justify-center px-4 ${className}`}>
      <div className="w-full" style={{ maxWidth: 920 }}>
        {children}
      </div>
    </div>
  );
}