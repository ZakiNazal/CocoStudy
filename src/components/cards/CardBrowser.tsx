import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Undo2 } from 'lucide-react';
import { cardMastery } from '../../lib/mastery';
import TickStrip, { type TickTone } from '../ui/TickStrip';
import type { Flashcard } from '../../types';

interface CardBrowserProps {
  cards: Flashcard[];
  onExit: () => void;
}

const INK_TONE: Record<string, TickTone> = {
  none: 'empty',
  pink: 'pink',
  yellow: 'yellow',
  green: 'green',
};

export default function CardBrowser({ cards, onExit }: CardBrowserProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[index];

  const step = (delta: number) => {
    setFlipped(false);
    setIndex(i => (i + delta + cards.length) % cards.length);
  };

  // Arrows page the deck, space turns the card over.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === ' ') {
        e.preventDefault();
        setFlipped(f => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  if (!card) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="display text-xl">This set has no cards.</p>
          <button
            onClick={onExit}
            className="mt-6 rounded-[4px] border border-[var(--ink)] px-5 py-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
          >
            Back to review
          </button>
        </div>
      </div>
    );
  }

  const ticks: TickTone[] = cards.map((c, i) =>
    i === index ? 'ink' : INK_TONE[cardMastery(c.srs).ink] ?? 'empty',
  );

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--rule)] bg-[var(--paper-2)] px-6 py-3 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-baseline justify-between gap-4">
            <span className="label">Deck</span>
            <span className="numeral text-2xs text-[var(--ink-3)]">
              {index + 1} / {cards.length}
            </span>
          </div>
          <TickStrip
            className="mt-2"
            ticks={ticks}
            summary={`Card ${index + 1} of ${cards.length}. Marks show how well each card is known.`}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-6 py-8 sm:px-10">
        <div className="mx-auto w-full max-w-2xl">
          <button
            onClick={() => setFlipped(f => !f)}
            aria-label={flipped ? 'Show the question' : 'Show the answer'}
            className="w-full text-left"
            style={{ perspective: '1600px' }}
          >
            <div
              className="relative min-h-[18rem] w-full transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'none',
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex flex-col justify-between overflow-y-auto rounded-[4px] border border-[var(--ink)] bg-[var(--paper-2)] p-8"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="label">Question</span>
                  {/* The whole card is the control, so this is the sign that it
                      turns, not a second thing to press. */}
                  <RotateCw aria-hidden="true" size={15} className="shrink-0 text-[var(--ink-3)]" />
                </div>
                <p className="display my-6 text-xl leading-tight sm:text-2xl">{card.front}</p>
                <span className="numeral text-2xs text-[var(--ink-3)]">
                  Click or press space to turn over
                </span>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 flex flex-col justify-between overflow-y-auto rounded-[4px] border border-[var(--ink)] bg-[var(--ink)] p-8"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="label" style={{ color: 'var(--ink-3)' }}>
                    Answer
                  </span>
                  <RotateCw
                    aria-hidden="true"
                    size={15}
                    className="shrink-0 rotate-180"
                    style={{ color: 'var(--ink-3)' }}
                  />
                </div>
                <p className="my-6 text-lg leading-snug text-[var(--paper)]">{card.back}</p>
                <span className="numeral text-2xs" style={{ color: 'var(--ink-3)' }}>
                  Click or press space to turn back
                </span>
              </div>
            </div>
          </button>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
            <button
              onClick={() => step(-1)}
              className="flex items-center gap-2 rounded-[4px] border border-[var(--rule)] px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              <ArrowLeft size={14} />
              Previous
            </button>

            <button
              onClick={onExit}
              className="flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
            >
              <Undo2 size={13} />
              Back to review
            </button>

            <button
              onClick={() => step(1)}
              className="flex items-center gap-2 rounded-[4px] border border-[var(--rule)] px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              Next
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
