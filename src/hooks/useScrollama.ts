"use client";

import { useEffect, useRef, useState } from "react";
import scrollama from "scrollama";

interface UseScrollamaOptions {
  offset?: number | string;
  stepSelector?: string;
}

export function useScrollama({
  offset = 0.6,
  stepSelector = "[data-step]",
}: UseScrollamaOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState<number>(-1);

  useEffect(() => {
    if (!containerRef.current) return;

    const scroller = scrollama();

    // Convert safely to string (this satisfies Scrollama's DecimalType typing)
    const safeOffset =
      typeof offset === "number" ? String(offset) : offset;

    scroller
      .setup({
        step: `#${containerRef.current.id} ${stepSelector}`,
        offset: safeOffset as any,
      })
      .onStepEnter((response: { index: number }) => {
        setActiveStep(response.index);
      });

    const handleResize = () => scroller.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      scroller.destroy();
    };
  }, [offset, stepSelector]);

  return { containerRef, activeStep };
}