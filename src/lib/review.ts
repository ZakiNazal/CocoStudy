import { isDue } from './srs';
import type { Flashcard } from '../types';

/**
 * What a run through the deck is for.
 *
 * `review` is the scheduled work: only cards that have come due, and every
 * answer moves the card's schedule.
 *
 * `practice` is going through them again because you want to. It takes the
 * whole deck regardless of when anything is next due, and deliberately does
 * not reschedule: the intervals are the thing the app is actually for, and
 * five answers to the same card inside a minute would flatten them. Nothing is
 * lost by practising, and nothing is gained by gaming it.
 */
export type SessionMode = 'review' | 'practice';

export function buildQueue(cards: Flashcard[], mode: SessionMode, now: Date): string[] {
  const chosen = mode === 'practice' ? cards : cards.filter(c => isDue(c.srs, now));
  return chosen.map(c => c.id);
}

/** Whether answers in this mode are written back to the schedule. */
export function reschedules(mode: SessionMode): boolean {
  return mode === 'review';
}

/** The deck sizes offered when regenerating. */
export const CARD_COUNTS = [6, 8, 10, 12, 16, 20] as const;

export const MIN_CARDS = 4;
export const MAX_CARDS = 24;

export function clampCardCount(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(MAX_CARDS, Math.max(MIN_CARDS, Math.round(value)));
}

/**
 * How much review history a regeneration would throw away.
 *
 * Replacing a deck writes new cards with new ids, so every interval, ease and
 * lapse recorded against the old ones goes with them. The count is shown
 * before the button is pressed rather than explained afterwards.
 */
export function progressAtRisk(cards: Flashcard[]): number {
  return cards.filter(c => c.srs.state !== 'new').length;
}
