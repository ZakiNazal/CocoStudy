import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Minus, Plus, Sparkles, X } from 'lucide-react';
import { CARD_COUNTS, MAX_CARDS, MIN_CARDS, clampCardCount } from '../../lib/review';
import type { Flashcard } from '../../types';

interface CardCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Flashcard[];
  count: number;
  onCountChange: (count: number) => void;
  onGenerate: (count: number) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export default function CardCustomizeModal({
  isOpen,
  onClose,
  cards,
  count,
  onCountChange,
  onGenerate,
  isGenerating,
  error,
}: CardCustomizeModalProps) {
  const [draft, setDraft] = useState(count);

  useEffect(() => {
    if (isOpen) setDraft(count);
  }, [isOpen, count]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  // Every card carries its own schedule, so a new deck starts from nothing.
  const studied = cards.filter(c => c.srs.state !== 'new').length;

  const set = (next: number) => setDraft(clampCardCount(next));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Choose how many flashcards"
    >
      <button
        aria-label="Close"
        onClick={() => !isGenerating && onClose()}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-xs"
      />

      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)] p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="display text-xl font-bold">Rebuild the deck</h2>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              New cards are written from this set's notes.
            </p>
          </div>
          <button
            onClick={() => !isGenerating && onClose()}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] text-[var(--ink-3)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-6">
          <span className="label">How many cards</span>

          <div className="mt-2.5 flex flex-wrap gap-2">
            {CARD_COUNTS.map(n => (
              <button
                key={n}
                onClick={() => set(n)}
                aria-pressed={draft === n}
                className={`numeral h-10 w-12 rounded-[4px] border text-sm font-semibold transition-colors ${
                  draft === n
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-[var(--rule)] text-[var(--ink-2)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-1 rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] p-0.5">
            <button
              onClick={() => set(draft - 1)}
              disabled={draft <= MIN_CARDS}
              aria-label="One fewer card"
              className="flex h-9 w-9 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] disabled:opacity-30"
            >
              <Minus size={15} />
            </button>
            <span className="numeral flex-1 text-center text-sm font-bold">{draft} cards</span>
            <button
              onClick={() => set(draft + 1)}
              disabled={draft >= MAX_CARDS}
              aria-label="One more card"
              className="flex h-9 w-9 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] disabled:opacity-30"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/*
          * Rebuilding writes new cards with new ids, so intervals and ease
          * recorded against the old ones go with them. Said before the button
          * is pressed rather than explained after.
          */}
        {studied > 0 && (
          <p
            className="mt-5 flex items-start gap-2 rounded-[4px] border px-3 py-2.5 text-xs leading-relaxed"
            style={{ borderColor: 'var(--yellow)', background: 'var(--yellow-wash)' }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              This replaces all {cards.length} cards. The review progress on{' '}
              <strong>
                {studied} card{studied === 1 ? '' : 's'}
              </strong>{' '}
              is lost, and the new deck starts from scratch.
            </span>
          </p>
        )}

        {error && (
          <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-4 py-2.5 font-mono text-2xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onCountChange(draft);
              void onGenerate(draft);
            }}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent)] px-5 py-2.5 font-mono text-2xs font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[var(--accent-strong)] active:scale-[0.98] disabled:opacity-60"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isGenerating ? 'Writing cards' : `Write ${draft} cards`}
          </button>
        </div>
      </div>
    </div>
  );
}
