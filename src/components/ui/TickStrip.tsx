/**
 * One mark per item in a session — the shape of the work at a glance.
 *
 * This is the progress language for both the review queue and the quiz. It
 * replaces a percentage bar on purpose: a bar says how far along you are, a
 * strip of marks says which items went which way, which is the thing a
 * learner actually wants to know. Colours are the recall inks, never
 * decorative.
 */

export type TickTone = 'empty' | 'current' | 'pink' | 'yellow' | 'green' | 'cyan' | 'ink';

const FILL: Record<TickTone, string> = {
  empty: 'var(--paper-3)',
  current: 'var(--ink-3)',
  pink: 'var(--pink)',
  yellow: 'var(--yellow)',
  green: 'var(--green)',
  cyan: 'var(--cyan)',
  ink: 'var(--ink)',
};

interface TickStripProps {
  ticks: TickTone[];
  /** Sentence describing the same state for anyone not seeing the marks. */
  summary: string;
  className?: string;
}

export default function TickStrip({ ticks, summary, className = '' }: TickStripProps) {
  return (
    <div className={className}>
      <div aria-hidden="true" className="flex gap-[2px]">
        {ticks.map((tone, i) => (
          <span
            key={i}
            className={`h-[5px] flex-1 transition-[background-color] duration-200 ${
              tone === 'current' ? 'h-[7px] -mt-[2px]' : ''
            }`}
            style={{ background: FILL[tone] }}
          />
        ))}
      </div>
      <span className="sr-only">{summary}</span>
    </div>
  );
}
