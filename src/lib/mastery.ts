import type { Flashcard, SrsState } from '../types';

export type Ink = 'none' | 'pink' | 'yellow' | 'green';

export interface MasteryMark {
  ink: Ink;
  /** 0–1. Drives highlighter stroke length and set-level progress. */
  coverage: number;
}

/** Days of interval at which a card counts as mastered. */
export const MATURE_INTERVAL_DAYS = 21;

const UNMARKED: MasteryMark = { ink: 'none', coverage: 0 };
const LEARNING: MasteryMark = { ink: 'pink', coverage: 0.33 };
const REVIEWING: MasteryMark = { ink: 'yellow', coverage: 0.66 };
const MASTERED: MasteryMark = { ink: 'green', coverage: 1 };

export function cardMastery(srs: SrsState): MasteryMark {
  if (srs.state === 'new') return UNMARKED;
  if (srs.state === 'learning' || srs.state === 'lapsed') return LEARNING;
  return srs.interval >= MATURE_INTERVAL_DAYS ? MASTERED : REVIEWING;
}

/**
 * The share of a set that is actually mastered, 0–1.
 *
 * This used to average `coverage` across the deck, which counted a card being
 * learned as a third mastered and one in review as two thirds. A deck of ten
 * with three mature cards reported 56% under a label reading "Mastered", and
 * sat next to a bar whose green segment was plainly 30%. Two numbers for one
 * thing, and the encouraging one was wrong.
 *
 * It counts mature cards now, so the figure is the width of the green segment
 * and the word above it is true. Progress short of mastery is not lost — that
 * is what the pink and yellow in the bar are for.
 */
export function setMastery(cards: Flashcard[]): number {
  if (cards.length === 0) return 0;
  const mastered = cards.filter(c => cardMastery(c.srs).ink === 'green').length;
  return mastered / cards.length;
}

export function inkVar(ink: Ink): string {
  return ink === 'none' ? 'transparent' : `var(--${ink})`;
}
