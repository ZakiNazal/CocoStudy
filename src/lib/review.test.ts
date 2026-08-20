import { describe, expect, it } from 'vitest';
import {
  CARD_COUNTS,
  MAX_CARDS,
  MIN_CARDS,
  buildQueue,
  clampCardCount,
  progressAtRisk,
  reschedules,
} from './review';
import { newCardState } from './srs';
import type { Flashcard, SrsState } from '../types';

const NOW = new Date('2026-08-20T12:00:00.000Z');
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

function card(id: string, srs: Partial<SrsState> = {}): Flashcard {
  return {
    id,
    front: id,
    back: id,
    srs: { ...newCardState(NOW), ...srs },
  };
}

describe('buildQueue', () => {
  const deck = [
    card('due-now', { due: days(-1), state: 'review', interval: 5 }),
    card('due-exactly', { due: NOW.toISOString(), state: 'review', interval: 5 }),
    card('not-due', { due: days(9), state: 'review', interval: 30 }),
    card('fresh'),
  ];

  it('takes only what has come due for a scheduled review', () => {
    // A new card is due immediately, which is what makes a fresh set studiable.
    expect(buildQueue(deck, 'review', NOW)).toEqual(['due-now', 'due-exactly', 'fresh']);
  });

  it('takes the whole deck for practice, due or not', () => {
    expect(buildQueue(deck, 'practice', NOW)).toEqual([
      'due-now',
      'due-exactly',
      'not-due',
      'fresh',
    ]);
  });

  it('gives practice something to do when nothing is due', () => {
    const settled = [card('a', { due: days(30), state: 'review', interval: 30 })];
    expect(buildQueue(settled, 'review', NOW)).toEqual([]);
    expect(buildQueue(settled, 'practice', NOW)).toEqual(['a']);
  });

  it('returns nothing for an empty deck in either mode', () => {
    expect(buildQueue([], 'review', NOW)).toEqual([]);
    expect(buildQueue([], 'practice', NOW)).toEqual([]);
  });
});

describe('reschedules', () => {
  /*
   * The rule that keeps practice from being a way to inflate intervals: only
   * the scheduled run writes back.
   */
  it('is true for a review and false for practice', () => {
    expect(reschedules('review')).toBe(true);
    expect(reschedules('practice')).toBe(false);
  });
});

describe('clampCardCount', () => {
  it('keeps a sensible number as it is', () => {
    for (const n of CARD_COUNTS) expect(clampCardCount(n)).toBe(n);
  });

  it('pulls anything outside the range back to its edge', () => {
    expect(clampCardCount(1)).toBe(MIN_CARDS);
    expect(clampCardCount(500)).toBe(MAX_CARDS);
  });

  it('rounds a fraction and refuses nonsense rather than passing it on', () => {
    expect(clampCardCount(10.4)).toBe(10);
    expect(clampCardCount(Number.NaN)).toBe(10);
    expect(clampCardCount(Number.POSITIVE_INFINITY)).toBe(10);
  });
});

describe('progressAtRisk', () => {
  it('counts every card that has been answered at least once', () => {
    const deck = [
      card('a', { state: 'review', interval: 12 }),
      card('b', { state: 'learning', interval: 1 }),
      card('c', { state: 'lapsed', interval: 0 }),
      card('d'),
    ];
    expect(progressAtRisk(deck)).toBe(3);
  });

  it('is zero for a deck nobody has studied, so no warning is shown', () => {
    expect(progressAtRisk([card('a'), card('b')])).toBe(0);
    expect(progressAtRisk([])).toBe(0);
  });
});
