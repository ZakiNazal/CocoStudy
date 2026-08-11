import { cardMastery, type Ink } from '../../lib/mastery';
import type { Flashcard } from '../../types';

/** Order matters: the bar reads left-to-right as progress toward mastery. */
const INK_ORDER: Ink[] = ['none', 'pink', 'yellow', 'green'];

const WASH: Record<Ink, string> = {
  none: 'var(--paper-3)',
  pink: 'var(--pink)',
  yellow: 'var(--yellow)',
  green: 'var(--green)',
};

interface MasteryBarProps {
  cards: Flashcard[];
  /** Bar height in px. */
  height?: number;
  className?: string;
}

/**
 * Renders a set's cards as a stacked band of highlighter ink. Unmarked
 * (never studied) reads as bare paper; pink is being learned; yellow is in
 * review; green is mastered.
 */
export default function MasteryBar({ cards, height = 4, className = '' }: MasteryBarProps) {
  const counts: Record<Ink, number> = { none: 0, pink: 0, yellow: 0, green: 0 };
  for (const card of cards) counts[cardMastery(card.srs).ink] += 1;

  const total = cards.length;
  const label =
    total === 0
      ? 'No cards yet'
      : `${counts.green} of ${total} cards mastered, ${counts.yellow} in review, ${counts.pink} being learned`;

  return (
    <div
      className={`flex w-full overflow-hidden ${className}`}
      style={{ height }}
      role="img"
      aria-label={label}
    >
      {total === 0 ? (
        <div className="w-full" style={{ background: 'var(--paper-3)' }} />
      ) : (
        INK_ORDER.filter(ink => counts[ink] > 0).map(ink => (
          <div
            key={ink}
            style={{
              background: WASH[ink],
              width: `${(counts[ink] / total) * 100}%`,
            }}
          />
        ))
      )}
    </div>
  );
}
