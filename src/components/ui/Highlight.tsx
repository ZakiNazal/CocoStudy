import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, DUR, EASE, prefersReducedMotion } from '../../lib/motion';
import type { Ink } from '../../lib/mastery';

const WASH: Record<Ink, string> = {
  none: 'transparent',
  pink: 'var(--pink-wash)',
  yellow: 'var(--yellow-wash)',
  green: 'var(--green-wash)',
};

interface HighlightProps {
  ink: Ink;
  /** 0–1. How far across the term the marker travelled. */
  coverage: number;
  children: React.ReactNode;
  /** Delay before the stroke draws, for staggered reveals. */
  delay?: number;
  className?: string;
}

/**
 * A highlighter stroke behind text. Ink and coverage come from review data,
 * so the mark is a readout of recall, not decoration.
 *
 * The stroke is a separate layer behind the text rather than a background on
 * the text itself, so it can animate its width without reflowing the line.
 */
export default function Highlight({
  ink,
  coverage,
  children,
  delay = 0,
  className = '',
}: HighlightProps) {
  const root = useRef<HTMLSpanElement>(null);
  const stroke = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!stroke.current || ink === 'none') return;

      if (prefersReducedMotion()) {
        gsap.set(stroke.current, { scaleX: coverage });
        return;
      }

      gsap.fromTo(
        stroke.current,
        { scaleX: 0 },
        { scaleX: coverage, duration: DUR.slow, ease: EASE.marker, delay },
      );
    },
    { scope: root, dependencies: [ink, coverage, delay] },
  );

  return (
    <span ref={root} className={`relative inline ${className}`}>
      <span
        ref={stroke}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 origin-left"
        style={{
          background: WASH[ink],
          // Sit low and slightly proud of the text, the way a marker lands.
          top: '0.18em',
          bottom: '-0.06em',
          transform: 'scaleX(0)',
          zIndex: 0,
        }}
      />
      <span className="relative" style={{ zIndex: 1 }}>
        {children}
      </span>
    </span>
  );
}
