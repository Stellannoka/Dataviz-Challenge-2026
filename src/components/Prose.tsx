import { ReactNode } from "react";
import { Container } from "./Container";

/* ======================================================================
   Prose: a thin semantic alias over Container for narrative/body text
   blocks specifically (as opposed to charts, which use ChartBand). Exists
   so call sites at the page level read as "this is narrative copy" while
   sharing Container's single text-column definition — no separate width
   or padding logic of its own.
   ====================================================================== */
export function Prose({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Container className={className}>{children}</Container>;
}