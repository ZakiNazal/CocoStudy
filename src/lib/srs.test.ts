import { describe, it, expect } from 'vitest';
import {
  newCardState,
  schedule,
  isDue,
  formatInterval,
  gradePreview,
  EASE_MIN,
  EASE_MAX,
  INTERVAL_MAX,
} from './srs';
import type { SrsState } from '../types';

const NOW = new Date('2026-08-10T12:00:00.000Z');
const DAY = 86_400_000;

const reviewCard = (over: Partial<SrsState> = {}): SrsState => ({
  due: NOW.toISOString(),
  interval: 10,
  ease: 2.5,
  reps: 4,
  lapses: 0,
  state: 'review',
  ...over,
});

describe('newCardState', () => {
  it('starts due immediately with a neutral ease', () => {
    const s = newCardState(NOW);
    expect(s).toMatchObject({ interval: 0, ease: 2.5, reps: 0, lapses: 0, state: 'new' });
    expect(s.due).toBe(NOW.toISOString());
  });
});

describe('schedule — Again (1)', () => {
  it('lapses the card, zeroes the interval, and re-queues it in 10 minutes', () => {
    const next = schedule(reviewCard(), 1, NOW);
    expect(next.state).toBe('lapsed');
    expect(next.interval).toBe(0);
    expect(next.lapses).toBe(1);
    expect(new Date(next.due).getTime()).toBe(NOW.getTime() + 10 * 60_000);
  });

  it('drops ease by 0.20', () => {
    expect(schedule(reviewCard({ ease: 2.5 }), 1, NOW).ease).toBeCloseTo(2.3, 5);
  });

  it('never drops ease below the floor', () => {
    expect(schedule(reviewCard({ ease: 1.35 }), 1, NOW).ease).toBe(EASE_MIN);
  });
});

describe('schedule — Hard (2)', () => {
  it('grows the interval by 1.2 and drops ease by 0.15', () => {
    const next = schedule(reviewCard({ interval: 10, ease: 2.5 }), 2, NOW);
    expect(next.interval).toBe(12);
    expect(next.ease).toBeCloseTo(2.35, 5);
  });

  it('gives a new card a one-day interval rather than zero', () => {
    const next = schedule(newCardState(NOW), 2, NOW);
    expect(next.interval).toBe(1);
    expect(next.state).toBe('learning');
  });

  it('returns a lapsed card to learning, not straight to review', () => {
    expect(schedule(reviewCard({ state: 'lapsed', interval: 0 }), 2, NOW).state).toBe('learning');
  });
});

describe('schedule — Good (3)', () => {
  it('multiplies the interval by ease and leaves ease alone', () => {
    const next = schedule(reviewCard({ interval: 10, ease: 2.5 }), 3, NOW);
    expect(next.interval).toBe(25);
    expect(next.ease).toBe(2.5);
  });

  it('graduates a new card to review with a one-day interval', () => {
    const next = schedule(newCardState(NOW), 3, NOW);
    expect(next.state).toBe('review');
    expect(next.interval).toBe(1);
    expect(new Date(next.due).getTime()).toBe(NOW.getTime() + DAY);
  });
});

describe('schedule — Easy (4)', () => {
  it('multiplies by ease and 1.3, and raises ease by 0.15', () => {
    const next = schedule(reviewCard({ interval: 10, ease: 2.5 }), 4, NOW);
    expect(next.ease).toBeCloseTo(2.65, 5);
    expect(next.interval).toBe(34); // round(10 * 2.65 * 1.3) === round(34.45)
  });

  it('graduates a new card straight to a three-day interval', () => {
    const next = schedule(newCardState(NOW), 4, NOW);
    expect(next.state).toBe('review');
    expect(next.interval).toBe(3);
  });

  it('never raises ease above the ceiling', () => {
    expect(schedule(reviewCard({ ease: 2.75 }), 4, NOW).ease).toBe(EASE_MAX);
  });
});

describe('schedule — invariants', () => {
  it('caps the interval at one year', () => {
    const next = schedule(reviewCard({ interval: 300, ease: 2.5 }), 4, NOW);
    expect(next.interval).toBe(INTERVAL_MAX);
  });

  it('increments reps and records the grade and review time on every grade', () => {
    for (const g of [1, 2, 3, 4] as const) {
      const next = schedule(reviewCard({ reps: 7 }), g, NOW);
      expect(next.reps).toBe(8);
      expect(next.lastGrade).toBe(g);
      expect(next.lastReviewed).toBe(NOW.toISOString());
    }
  });

  it('does not mutate the input state', () => {
    const input = reviewCard();
    const snapshot = JSON.parse(JSON.stringify(input));
    schedule(input, 1, NOW);
    expect(input).toEqual(snapshot);
  });
});

describe('formatInterval', () => {
  it('shows an intraday card as minutes, not zero days', () => {
    expect(formatInterval(0)).toBe('10m');
  });

  it('shows days below a month', () => {
    expect(formatInterval(1)).toBe('1d');
    expect(formatInterval(29)).toBe('29d');
  });

  it('switches to months at thirty days', () => {
    expect(formatInterval(30)).toBe('1mo');
    expect(formatInterval(90)).toBe('3mo');
  });

  it('switches to years at a full year', () => {
    expect(formatInterval(365)).toBe('1.0y');
  });
});

describe('gradePreview', () => {
  it('tells the user what each grade would cost them', () => {
    const preview = gradePreview(reviewCard({ interval: 10, ease: 2.5 }), NOW);
    // Easy lands at 34 days, which reads as a month on a grade button.
    expect(preview).toEqual({ 1: '10m', 2: '12d', 3: '25d', 4: '1mo' });
  });

  it('previews a new card without scheduling it', () => {
    const card = newCardState(NOW);
    const preview = gradePreview(card, NOW);
    expect(preview[3]).toBe('1d');
    expect(preview[4]).toBe('3d');
    // The preview must not have mutated the card.
    expect(card.reps).toBe(0);
  });
});

describe('isDue', () => {
  it('is true when the due time has passed', () => {
    expect(isDue(reviewCard({ due: new Date(NOW.getTime() - 1000).toISOString() }), NOW)).toBe(true);
  });

  it('is true at exactly the due time', () => {
    expect(isDue(reviewCard({ due: NOW.toISOString() }), NOW)).toBe(true);
  });

  it('is false when the due time is in the future', () => {
    expect(isDue(reviewCard({ due: new Date(NOW.getTime() + 1000).toISOString() }), NOW)).toBe(false);
  });
});
