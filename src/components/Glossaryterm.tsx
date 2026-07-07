'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const definitions: Record<string, string> = {
  vulnerability:
    "Vulnerability measures a country's exposure, sensitivity and adaptive capacity to climate-related hazards.",
  readiness:
    "Readiness measures a country's ability to translate investments into effective adaptation through economic, governance and social capacity.",
  adaptation:
    "Adaptation is the process of adjusting policies, systems and infrastructure to reduce harm from climate impacts and build long-term resilience.",
  hazards:
    "Climate-related hazards are extreme weather events and slow-onset changes, such as cyclones, floods, droughts and sea-level rise, driven or intensified by climate change.",
  disasters:
    "Disasters occur when climate-related hazards overwhelm a community's ability to cope, resulting in widespread damage, displacement or loss of life.",
  gdp:
    "Gross Domestic Product is the total value of goods and services produced by a country in a given year, used as a measure of economic size.",
  'climate finance':
    "Climate finance refers to international funding directed toward helping countries reduce emissions and adapt to climate impacts.",
};

interface GlossaryTermProps {
  term: keyof typeof definitions;
  children: React.ReactNode;
}

export default function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const [nudge, setNudge] = useState(0);

  /* Close when clicking outside */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open]);

  /* Position tooltip: above/below + horizontal nudge to stay in viewport */
  const positionTooltip = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const tooltipWidth = 260;
    const margin = 12;

    /* Vertical: above if enough room, else below */
    setPosition(rect.top > 140 ? 'above' : 'below');

    /* Horizontal: nudge so tooltip doesn't overflow viewport edges */
    const center = rect.left + rect.width / 2;
    const halfTip = tooltipWidth / 2;
    if (center - halfTip < margin) {
      setNudge(margin - (center - halfTip));
    } else if (center + halfTip > window.innerWidth - margin) {
      setNudge(window.innerWidth - margin - (center + halfTip));
    } else {
      setNudge(0);
    }
  }, []);

  const handleToggle = () => {
    if (!open) positionTooltip();
    setOpen((prev) => !prev);
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: `translateX(calc(-50% + ${nudge}px))`,
    background: '#ffffff',
    color: '#1e293b',
    border: '1px solid #e2e8f0',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '0.82rem',
    lineHeight: 1.45,
    width: '260px',
    maxWidth: '88vw',
    zIndex: 50,
    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
    textAlign: 'left',
    pointerEvents: 'none',
    ...(position === 'above'
      ? { bottom: '100%', marginBottom: '8px' }
      : { top: '100%', marginTop: '8px' }),
  };

  return (
    <span
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline' }}
      className="glossary-term"
      onMouseEnter={() => {
        positionTooltip();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        onClick={handleToggle}
        style={{
          borderBottom: '1.5px dashed currentColor',
          cursor: 'help',
          paddingBottom: '1px',
        }}
      >
        {children}
      </span>
      {open && <span ref={tooltipRef} style={tooltipStyle}>{definitions[term]}</span>}
    </span>
  );
}