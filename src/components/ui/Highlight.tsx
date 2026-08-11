import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, DUR, EASE, shouldAnimate } from '../../lib/motion';
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
      if (!stroke.current || ink === 'none' || !shouldAnimate()) return;

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
          // Resting state is the finished stroke. GSAP animates from zero
          // when it can; if it never runs, the mark is still correct.
          transform: `scaleX(${coverage})`,
          zIndex: 0,
        }}
      />
      <span className="relative" style={{ zIndex: 1 }}>
        {children}
      </span>
    </span>
  );
}
