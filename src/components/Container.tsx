import { ReactNode } from "react";

/* ======================================================================
   Container / ChartBand: the two layout primitives every section is
   built from. Container is the ONE text-column definition (640px max,
   centered, px-4 so text never touches the screen edge) — every
   narrative paragraph, heading and chart caption in the piece measures
   against this same width, which is what keeps the whole article reading
   as one consistent column. ChartBand is Container's wider counterpart:
   charts need more horizontal room than prose to stay legible, so it
   gives them up to 920px while relying on each chart to carry its own
   16px gutter internally (matching Container's px-4) rather than doubling
   the padding here.
   ====================================================================== */
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