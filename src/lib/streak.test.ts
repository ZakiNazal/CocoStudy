import { describe, it, expect } from 'vitest';
import { bumpStreak, dayKey } from './streak';
import type { AppMeta } from '../types';

const streak = (over: Partial<AppMeta['streak']> = {}): AppMeta['streak'] => ({
  current: 0,
  longest: 0,
  lastStudiedDay: null,
  ...over,
});

describe('dayKey', () => {
  it('reduces a timestamp to a local calendar day', () => {
    expect(dayKey(new Date(2026, 7, 10, 23, 59))).toBe('2026-08-10');
  });

  it('treats two times on the same day as the same key', () => {
    expect(dayKey(new Date(2026, 7, 10, 0, 1))).toBe(dayKey(new Date(2026, 7, 10, 23, 59)));
  });
});

describe('bumpStreak', () => {
  it('starts a streak on the first ever review', () => {
    const next = bumpStreak(streak(), new Date(2026, 7, 10));
    expect(next).toEqual({ current: 1, longest: 1, lastStudiedDay: '2026-08-10' });
  });

  it('does not advance twice in the same day', () => {
    const first = bumpStreak(streak(), new Date(2026, 7, 10, 9));
    const second = bumpStreak(first, new Date(2026, 7, 10, 21));
    expect(second).toEqual(first);
  });

  it('extends the streak when studying on consecutive days', () => {
    const day1 = bumpStreak(streak(), new Date(2026, 7, 10));
    const day2 = bumpStreak(day1, new Date(2026, 7, 11));
    expect(day2.current).toBe(2);
    expect(day2.longest).toBe(2);
  });

  it('resets to one after a missed day', () => {
    const previous = streak({ current: 9, longest: 9, lastStudiedDay: '2026-08-08' });
    const next = bumpStreak(previous, new Date(2026, 7, 10));
    expect(next.current).toBe(1);
  });

  it('keeps the longest streak after a reset', () => {
    const previous = streak({ current: 9, longest: 9, lastStudiedDay: '2026-08-08' });
    expect(bumpStreak(previous, new Date(2026, 7, 10)).longest).toBe(9);
  });

  it('crosses a month boundary without resetting', () => {
    const previous = streak({ current: 3, longest: 3, lastStudiedDay: '2026-07-31' });
    expect(bumpStreak(previous, new Date(2026, 7, 1)).current).toBe(4);
  });

  it('does not mutate the input', () => {
    const previous = streak({ current: 2, longest: 5, lastStudiedDay: '2026-08-09' });
    const snapshot = { ...previous };
    bumpStreak(previous, new Date(2026, 7, 10));
    expect(previous).toEqual(snapshot);
  });
});
