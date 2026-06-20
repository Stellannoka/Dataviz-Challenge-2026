import { ReactNode } from "react";

export function Prose({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-[720px] ${className}`}>{children}</div>
  );
}