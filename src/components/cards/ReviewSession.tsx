import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { Check, Layers, RotateCw } from 'lucide-react';
import { gsap, DUR, EASE, shouldAnimate } from '../../lib/motion';
import { gradePreview, isDue } from '../../lib/srs';
import { cardMastery } from '../../lib/mastery';
import TickStrip, { type TickTone } from '../ui/TickStrip';
import type { Flashcard, Grade } from '../../types';

const GRADES: { grade: Grade; label: string; key: string; ink: string; tone: TickTone }[] = [
  { grade: 1, label: 'Again', key: '1', ink: 'var(--pink)', tone: 'pink' },
  { grade: 2, label: 'Hard', key: '2', ink: 'var(--yellow)', tone: 'yellow' },
  { grade: 3, label: 'Good', key: '3', ink: 'var(--green)', tone: 'green' },
  { grade: 4, label: 'Easy', key: '4', ink: 'var(--cyan)', tone: 'cyan' },
];

interface ReviewSessionProps {
  cards: Flashcard[];
  onGrade: (cardId: string, grade: Grade) => void;
  onBrowse: () => void;
}

function Done({
  heading,
  detail,
  onBrowse,
}: {
  heading: string;
  detail: string;
  onBrowse: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-[4px]"
          style={{ background: 'var(--green-wash)' }}
        >
          <Check size={22} strokeWidth={2.5} />
        </div>
        <p className="display mt-6 text-2xl">{heading}</p>
        <p className="numeral mt-2 text-[var(--ink-2)]">{detail}</p>
        <button
          onClick={onBrowse}
          className="mt-7 inline-flex items-center gap-2 rounded-[4px] border border-[var(--ink)] px-5 py-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--ink)] hover:text-[var(--paper)]"
        >
          <Layers size={14} />
          Browse the deck
        </button>
      </div>
    </div>
  );
}

export default function ReviewSession({ cards, onGrade, onBrowse }: ReviewSessionProps) {
  const now = new Date();

  /**
   * The queue is captured once per session. Grading rewrites a card's due
   * date, so recomputing from props mid-session would drop cards out from
   * under the user as they answer them.
   */
  const [queue] = useState<string[]>(() =>
    cards.filter(c => isDue(c.srs, now)).map(c => c.id),
  );
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [marks, setMarks] = useState<TickTone[]>([]);

  const stage = useRef<HTMLDivElement>(null);
  const answer = useRef<HTMLDivElement>(null);

  const currentId = queue[position];
  const card = cards.find(c => c.id === currentId);
  const done = position >= queue.length;

  const grade = useCallback(
    (value: Grade) => {
      if (!card || !revealed) return;
      onGrade(card.id, value);
      setMarks(m => [...m, GRADES.find(g => g.grade === value)!.tone]);
      setRevealed(false);
      setPosition(p => p + 1);
    },
    [card, revealed, onGrade],
  );

  /*
   * Space reveals and 1–4 grade. Enter is deliberately not bound: it is the
   * key that activates whatever button has focus, and swallowing it here made
   * the rest of the page unusable from the keyboard.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === ' ') {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      const match = GRADES.find(g => g.key === e.key);
      if (match) {
        e.preventDefault();
        grade(match.grade);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [grade]);

  useGSAP(
    () => {
      if (!shouldAnimate()) return;
      gsap.from('[data-card]', { opacity: 0, y: 14, duration: DUR.base, ease: EASE.out });
    },
    { scope: stage, dependencies: [position] },
  );

  /*
   * The answer is struck onto the card with the marker ease — the app's own
   * highlighter gesture, used at the one moment recall actually happens. The
   * wipe is a mask that ends fully open, so if the tween is skipped the text
   * is simply there.
   */
  useGSAP(
    () => {
      if (!revealed || !shouldAnimate()) return;
      gsap.fromTo(
        answer.current,
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: DUR.slow, ease: EASE.marker },
      );
    },
    { dependencies: [revealed, position] },
  );

  if (queue.length === 0) {
    return (
      <Done
        heading="Nothing due right now."
        detail="Come back when a card comes up, or look through the deck."
        onBrowse={onBrowse}
      />
    );
  }

  if (done || !card) {
    return (
      <Done
        heading="Session done."
        detail={`${marks.length} ${marks.length === 1 ? 'card' : 'cards'} reviewed`}
        onBrowse={onBrowse}
      />
    );
  }

  const preview = gradePreview(card.srs, now);
  const mark = cardMastery(card.srs);

  const ticks: TickTone[] = queue.map((_, i) =>
    i < marks.length ? marks[i] : i === position ? 'current' : 'empty',
  );

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--rule)] bg-[var(--paper-2)] px-4 py-3 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-baseline justify-between gap-4">
            <span className="label">Review</span>
            <div className="flex items-baseline gap-3">
              <span className="numeral text-2xs text-[var(--ink-3)]">
                {position + 1} / {queue.length}
              </span>
              <button
                onClick={onBrowse}
                className="-my-2 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
              >
                Browse
              </button>
            </div>
          </div>
          <TickStrip
            className="mt-2"
            ticks={ticks}
            summary={`Card ${position + 1} of ${queue.length} in this review.`}
          />
        </div>
      </div>

      <div
        ref={stage}
        className="pb-safe [--pb-base:2rem] flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 pt-8 sm:px-10"
      >
        <div className="mx-auto w-full max-w-2xl">
          <div
            data-card
            className="rounded-[4px] border border-[var(--ink)] bg-[var(--paper-2)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--rule)] px-6 py-2">
              <span className="label">{revealed ? 'Answer' : 'Question'}</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2 w-4"
                    style={{
                      background:
                        mark.ink === 'none' ? 'var(--paper-3)' : `var(--${mark.ink})`,
                    }}
                  />
                  <span className="numeral text-2xs text-[var(--ink-3)]">{card.srs.state}</span>
                </span>

                {/* The corner the thumb already reaches for, and the one control
                    that works whichever way round the card is. */}
                <button
                  onClick={() => setRevealed(r => !r)}
                  aria-label={revealed ? 'Turn the card back to the question' : 'Turn the card over'}
                  title={revealed ? 'Turn back' : 'Turn over'}
                  className="-my-2 -mr-2 flex h-9 w-9 items-center justify-center rounded-[4px] text-[var(--ink-3)] transition-colors duration-150 hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                >
                  <RotateCw
                    size={15}
                    className={`transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      revealed ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </span>
            </div>

            <div className="px-5 py-9 sm:px-10 sm:py-12">
              <p className="display text-2xl leading-tight sm:text-3xl">{card.front}</p>

              {revealed ? (
                <div className="mt-8 border-t border-[var(--rule)] pt-6">
                  <span className="label">Answer</span>
                  <div ref={answer}>
                    <p className="mt-2 text-lg leading-relaxed text-[var(--ink)]">{card.back}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setRevealed(true)}
                  className="mt-10 flex min-h-12 w-full items-center justify-center gap-3 rounded-[4px] border border-[var(--rule)] py-3.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors duration-150 hover:border-[var(--ink)] hover:text-[var(--ink)]"
                >
                  Show answer
                  <kbd className="numeral rounded-[2px] border border-[var(--rule)] px-1.5 py-0.5 text-[0.65rem]">
                    Space
                  </kbd>
                </button>
              )}
            </div>
          </div>

          {revealed && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRADES.map(({ grade: value, label, key, ink }) => (
                  <button
                    key={value}
                    onClick={() => grade(value)}
                    className="group flex flex-col items-center gap-1 rounded-[4px] border border-[var(--rule)] py-3 transition-[border-color,transform] duration-150 hover:border-[var(--ink)] active:scale-[0.97]"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1 w-8 transition-[height] duration-150 group-hover:h-2"
                      style={{ background: ink }}
                    />
                    <span className="mt-1 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink)]">
                      {label}
                    </span>
                    <span className="numeral text-2xs text-[var(--ink-3)]">{preview[value]}</span>
                    <kbd className="numeral hidden text-[0.6rem] text-[var(--ink-3)] sm:block">{key}</kbd>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-center text-xs text-[var(--ink-3)]">
                Grade honestly. A card you nearly missed is not an Easy.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
