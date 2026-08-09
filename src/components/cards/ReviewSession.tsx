import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { Check } from 'lucide-react';
import { gsap, DUR, EASE, shouldAnimate } from '../../lib/motion';
import { gradePreview, isDue } from '../../lib/srs';
import { cardMastery } from '../../lib/mastery';
import type { Flashcard, Grade } from '../../types';

const GRADES: { grade: Grade; label: string; key: string; ink: string }[] = [
  { grade: 1, label: 'Again', key: '1', ink: 'var(--pink)' },
  { grade: 2, label: 'Hard', key: '2', ink: 'var(--yellow)' },
  { grade: 3, label: 'Good', key: '3', ink: 'var(--green)' },
  { grade: 4, label: 'Easy', key: '4', ink: 'var(--cyan)' },
];

interface ReviewSessionProps {
  cards: Flashcard[];
  onGrade: (cardId: string, grade: Grade) => void;
  onBrowse: () => void;
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
  const [graded, setGraded] = useState(0);

  const stage = useRef<HTMLDivElement>(null);

  const currentId = queue[position];
  const card = cards.find(c => c.id === currentId);
  const done = position >= queue.length;

  const grade = useCallback(
    (value: Grade) => {
      if (!card || !revealed) return;
      onGrade(card.id, value);
      setGraded(n => n + 1);
      setRevealed(false);
      setPosition(p => p + 1);
    },
    [card, revealed, onGrade],
  );

  // Keyboard: space reveals, 1–4 grade.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      if (e.key === ' ' || e.key === 'Enter') {
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
      gsap.from('[data-card]', { opacity: 0, y: 12, duration: DUR.base, ease: EASE.out });
    },
    { scope: stage, dependencies: [position] },
  );

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center"
          style={{ background: 'var(--green-wash)' }}
        >
          <Check size={22} strokeWidth={2.5} />
        </div>
        <p className="display mt-6 text-xl">Nothing due right now.</p>
        <p className="mt-2 text-[var(--ink-2)]">
          Come back when a card comes up for review, or look through the deck.
        </p>
        <button
          onClick={onBrowse}
          className="mt-6 border border-[var(--ink)] px-5 py-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink)] transition-[background-color,color] hover:bg-[var(--ink)] hover:text-[var(--paper)]"
        >
          Browse the deck
        </button>
      </div>
    );
  }

  if (done || !card) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center"
          style={{ background: 'var(--green-wash)' }}
        >
          <Check size={22} strokeWidth={2.5} />
        </div>
        <p className="display mt-6 text-xl">Session done.</p>
        <p className="numeral mt-2 text-[var(--ink-2)]">
          {graded} {graded === 1 ? 'card' : 'cards'} reviewed
        </p>
        <button
          onClick={onBrowse}
          className="mt-6 border border-[var(--ink)] px-5 py-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink)] transition-[background-color,color] hover:bg-[var(--ink)] hover:text-[var(--paper)]"
        >
          Browse the deck
        </button>
      </div>
    );
  }

  const preview = gradePreview(card.srs, now);
  const mark = cardMastery(card.srs);

  return (
    <div ref={stage} className="mx-auto max-w-2xl px-6 py-8">
      {/* Progress */}
      <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2">
        <span className="label">Review</span>
        <div className="flex items-center gap-3">
          <span className="numeral text-xs text-[var(--ink-2)]">
            {position + 1} / {queue.length}
          </span>
          <button
            onClick={onBrowse}
            className="font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            Browse
          </button>
        </div>
      </div>

      <div className="mt-1 h-[3px] w-full" style={{ background: 'var(--paper-3)' }}>
        <div
          className="h-full transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: `${(position / queue.length) * 100}%`,
            background: 'var(--ink)',
          }}
        />
      </div>

      {/* Card */}
      <div data-card className="mt-8 border border-[var(--rule)] bg-[var(--paper-2)]">
        <div className="flex items-center justify-between border-b border-[var(--rule)] px-6 py-2">
          <span className="label">Question</span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-4"
              style={{
                background: mark.ink === 'none' ? 'var(--paper-3)' : `var(--${mark.ink})`,
              }}
            />
            <span className="numeral text-2xs text-[var(--ink-3)]">
              {card.srs.state}
            </span>
          </span>
        </div>

        <div className="px-6 py-10 sm:px-10">
          <p className="display text-xl leading-tight sm:text-2xl">{card.front}</p>

          {revealed ? (
            <div className="mt-8 border-t border-[var(--rule)] pt-6">
              <span className="label">Answer</span>
              <p className="mt-2 text-[var(--ink-2)]">{card.back}</p>
            </div>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="mt-8 flex w-full items-center justify-center gap-3 border border-[var(--rule)] py-3 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              Show answer
              <kbd className="numeral border border-[var(--rule)] px-1.5 py-0.5 text-[0.65rem]">
                Space
              </kbd>
            </button>
          )}
        </div>
      </div>

      {/* Grading */}
      {revealed && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map(({ grade: value, label, key, ink }) => (
              <button
                key={value}
                onClick={() => grade(value)}
                className="group flex flex-col items-center gap-1 border border-[var(--rule)] py-3 transition-[border-color,transform] duration-150 hover:border-[var(--ink)] active:scale-[0.97]"
              >
                <span
                  aria-hidden="true"
                  className="h-1 w-8 transition-[height] duration-150 group-hover:h-1.5"
                  style={{ background: ink }}
                />
                <span className="mt-1 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink)]">
                  {label}
                </span>
                <span className="numeral text-2xs text-[var(--ink-3)]">
                  {preview[value]}
                </span>
                <kbd className="numeral text-[0.6rem] text-[var(--ink-3)]">{key}</kbd>
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-[var(--ink-3)]">
            Grade honestly. A card you nearly missed is not an Easy.
          </p>
        </>
      )}
    </div>
  );
}
