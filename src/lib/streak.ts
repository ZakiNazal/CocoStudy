import type { AppMeta } from '../types';

type Streak = AppMeta['streak'];

/**
 * A calendar day in the user's own timezone. Streaks are a human notion of
 * "did I study today", so this deliberately uses local time rather than UTC.
 */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function previousDayKey(date: Date): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return dayKey(yesterday);
}

/** Records a day of study. Idempotent within a single day. */
export function bumpStreak(streak: Streak, now: Date): Streak {
  const today = dayKey(now);
  if (streak.lastStudiedDay === today) return streak;

  const continuing = streak.lastStudiedDay === previousDayKey(now);
  const current = continuing ? streak.current + 1 : 1;

  return {
    current,
    longest: Math.max(streak.longest, current),
    lastStudiedDay: today,
  };
}
