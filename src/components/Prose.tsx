import { ReactNode } from "react";
import { Container } from "./Container";

// All narrative text uses the single Container with updated typography
export function Prose({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Container className={className}>{children}</Container>;
}