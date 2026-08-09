import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, DUR, EASE, STAGGER, prefersReducedMotion } from '../../lib/motion';
import type { ProcessingStatus } from '../../types';

const RULE_COUNT = 9;
/** Which rules get a highlighter sweep in beat two. */
const MARKED_RULES = [1, 4, 7];

const CAPTION: Record<string, string> = {
  analyzing: 'Reading your material',
  generating_flashcards: 'Pulling out what to remember',
  generating_quiz: 'Writing questions',
};

const STEP: Record<string, number> = {
  analyzing: 1,
  generating_flashcards: 2,
  generating_quiz: 3,
};

interface RitualProps {
  status: ProcessingStatus;
}

/**
 * The processing state as a sheet of paper being marked up: the page rules
 * itself while the material is read, takes highlighter as cards are pulled,
 * and gets numbered in the margin as questions are written.
 *
 * Each beat is driven by a real status transition, so the animation never
 * reports progress that has not happened.
 */
export default function Ritual({ status }: RitualProps) {
  const root = useRef<HTMLDivElement>(null);
  const step = STEP[status] ?? 1;

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set('[data-sheet], [data-rule], [data-mark], [data-numeral]', {
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
        });
        return;
      }

      const tl = gsap.timeline();

      // Beat one — the sheet arrives and rules itself.
      if (step === 1) {
        tl.from('[data-sheet]', {
          scaleY: 0.9,
          opacity: 0,
          duration: DUR.slow,
          ease: EASE.out,
        }).from(
          '[data-rule]',
          {
            scaleX: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.standard,
          },
          '-=0.25',
        );
      }

      // Beat two — highlighter sweeps the lines worth remembering.
      if (step === 2) {
        tl.to('[data-mark]', {
          scaleX: 1,
          duration: DUR.slow,
          ease: EASE.marker,
          stagger: STAGGER.dramatic,
        });
      }

      // Beat three — the margin gets numbered.
      if (step === 3) {
        tl.to('[data-mark]', { scaleX: 1, duration: 0 }).to('[data-numeral]', {
          opacity: 1,
          duration: DUR.quick,
          ease: EASE.out,
          stagger: STAGGER.standard,
        });
      }
    },
    { scope: root, dependencies: [step] },
  );

  return (
    <div ref={root} className="flex flex-col items-center py-14">
      <div
        data-sheet
        className="relative w-full max-w-md border border-[var(--rule)] bg-[var(--paper-2)] px-10 py-8"
      >
        {/* Margin rule, the way a notebook page carries one. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-7 w-px"
          style={{ background: 'var(--rule)' }}
        />

        <div className="space-y-[1.15rem]">
          {Array.from({ length: RULE_COUNT }, (_, i) => {
            const markIndex = MARKED_RULES.indexOf(i);
            return (
              <div key={i} className="relative flex items-center gap-3">
                <span
                  data-numeral
                  className="numeral w-3 shrink-0 text-2xs text-[var(--ink-3)] opacity-0"
                >
                  {markIndex >= 0 ? markIndex + 1 : ''}
                </span>

                <div className="relative flex-1">
                  {markIndex >= 0 && (
                    <span
                      data-mark
                      aria-hidden="true"
                      className="absolute -inset-y-[3px] left-0 right-0 origin-left"
                      style={{
                        background:
                          markIndex === 0
                            ? 'var(--pink-wash)'
                            : markIndex === 1
                              ? 'var(--yellow-wash)'
                              : 'var(--green-wash)',
                        transform: 'scaleX(0)',
                      }}
                    />
                  )}
                  <div
                    data-rule
                    className="relative h-px origin-left"
                    style={{
                      background: 'var(--rule)',
                      // Ragged right edge, like real handwriting.
                      width: `${[92, 78, 96, 61, 88, 94, 70, 90, 46][i]}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <span className="numeral text-2xs text-[var(--ink-3)]">
          {step} / 3
        </span>
        <span className="h-px w-8" style={{ background: 'var(--rule)' }} />
        <p
          className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink)]"
          role="status"
          aria-live="polite"
        >
          {CAPTION[status] ?? 'Working'}
        </p>
      </div>
    </div>
  );
}
