"use client";

import { useEffect, useRef, useState } from "react";

// Measures the width of a container element and updates on resize.
// This is how every chart stays responsive: it draws to whatever width
// its container actually is, and redraws when the window changes.
export function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const update = () => setWidth(el.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}