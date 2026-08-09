import type { Grade, SrsState } from '../types';

export const EASE_MIN = 1.3;
export const EASE_MAX = 2.8;
export const INTERVAL_MAX = 365;
export const EASE_DEFAULT = 2.5;

const MINUTE = 60_000;
const DAY = 86_400_000;
const LAPSE_DELAY = 10 * MINUTE;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function newCardState(now: Date): SrsState {
  return {
    due: now.toISOString(),
    interval: 0,
    ease: EASE_DEFAULT,
    reps: 0,
    lapses: 0,
    state: 'new',
  };
}

function nextEase(ease: number, grade: Grade): number {
  const delta = grade === 1 ? -0.2 : grade === 2 ? -0.15 : grade === 4 ? 0.15 : 0;
  return clamp(ease + delta, EASE_MIN, EASE_MAX);
}

/** Interval in days. Uses the post-grade ease so Easy compounds correctly. */
function nextInterval(current: number, ease: number, grade: Grade): number {
  if (grade === 1) return 0;
  if (grade === 2) return clamp(Math.max(1, Math.round(current * 1.2)), 0, INTERVAL_MAX);
  if (grade === 3) {
    return clamp(current === 0 ? 1 : Math.round(current * ease), 0, INTERVAL_MAX);
  }
  return clamp(current === 0 ? 3 : Math.round(current * ease * 1.3), 0, INTERVAL_MAX);
}

function nextState(current: SrsState['state'], grade: Grade): SrsState['state'] {
  if (grade === 1) return 'lapsed';
  if (grade === 2) return current === 'new' || current === 'lapsed' ? 'learning' : 'review';
  return 'review';
}

export function schedule(state: SrsState, grade: Grade, now: Date): SrsState {
  const ease = nextEase(state.ease, grade);
  const interval = nextInterval(state.interval, ease, grade);
  const dueAt = interval === 0 ? now.getTime() + LAPSE_DELAY : now.getTime() + interval * DAY;

  return {
    due: new Date(dueAt).toISOString(),
    interval,
    ease,
    reps: state.reps + 1,
    lapses: state.lapses + (grade === 1 ? 1 : 0),
    state: nextState(state.state, grade),
    lastGrade: grade,
    lastReviewed: now.toISOString(),
  };
}

export function isDue(state: SrsState, now: Date): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}
