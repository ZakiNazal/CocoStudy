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

export function setMastery(cards: Flashcard[]): number {
  if (cards.length === 0) return 0;
  const total = cards.reduce((sum, c) => sum + cardMastery(c.srs).coverage, 0);
  return total / cards.length;
}

export function inkVar(ink: Ink): string {
  return ink === 'none' ? 'transparent' : `var(--${ink})`;
}
