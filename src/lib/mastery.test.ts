import { describe, it, expect } from 'vitest';
import { cardMastery, setMastery, inkVar, MATURE_INTERVAL_DAYS } from './mastery';
import type { Flashcard, SrsState } from '../types';

const state = (over: Partial<SrsState> = {}): SrsState => ({
  due: '2026-08-10T12:00:00.000Z',
  interval: 0,
  ease: 2.5,
  reps: 0,
  lapses: 0,
  state: 'new',
  ...over,
});

const card = (over: Partial<SrsState>): Flashcard => ({
  id: 'c',
  front: 'f',
  back: 'b',
  srs: state(over),
});

describe('cardMastery', () => {
  it('leaves a new card unmarked', () => {
    expect(cardMastery(state({ state: 'new' }))).toEqual({ ink: 'none', coverage: 0 });
  });

  it('marks a learning card in pink', () => {
    expect(cardMastery(state({ state: 'learning' }))).toEqual({ ink: 'pink', coverage: 0.33 });
  });

  it('marks a lapsed card in pink, same as learning', () => {
    expect(cardMastery(state({ state: 'lapsed' }))).toEqual({ ink: 'pink', coverage: 0.33 });
  });

  it('marks a young review card in yellow', () => {
    const m = cardMastery(state({ state: 'review', interval: MATURE_INTERVAL_DAYS - 1 }));
    expect(m).toEqual({ ink: 'yellow', coverage: 0.66 });
  });

  it('marks a card in green the day it reaches maturity', () => {
    const m = cardMastery(state({ state: 'review', interval: MATURE_INTERVAL_DAYS }));
    expect(m).toEqual({ ink: 'green', coverage: 1 });
  });
});

describe('setMastery', () => {
  it('returns zero for an empty set rather than NaN', () => {
    expect(setMastery([])).toBe(0);
  });

  it('averages coverage across cards', () => {
    const cards = [
      card({ state: 'new' }), // 0
      card({ state: 'review', interval: MATURE_INTERVAL_DAYS }), // 1
    ];
    expect(setMastery(cards)).toBeCloseTo(0.5, 5);
  });

  it('reports full mastery when every card is mature', () => {
    const cards = [
      card({ state: 'review', interval: 30 }),
      card({ state: 'review', interval: 90 }),
    ];
    expect(setMastery(cards)).toBe(1);
  });
});

describe('inkVar', () => {
  it('maps each ink to its CSS custom property', () => {
    expect(inkVar('pink')).toBe('var(--pink)');
    expect(inkVar('yellow')).toBe('var(--yellow)');
    expect(inkVar('green')).toBe('var(--green)');
  });

  it('renders an unmarked term as transparent, not as a color', () => {
    expect(inkVar('none')).toBe('transparent');
  });
});
