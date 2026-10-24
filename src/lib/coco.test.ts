import { describe, expect, it } from 'vitest';
import { cocoSays } from './coco';
import { ANTENNA_RUNS, BODY_RUNS, COCO_H, COCO_W, faceRuns, type CocoMood } from '../components/coco/sprite';

describe('cocoSays', () => {
  it('offers the demo to someone with no sets yet', () => {
    const line = cocoSays({ kind: 'intake', hasSets: false });
    expect(line.actions.map(a => a.id)).toEqual(['demo']);
  });

  it('points a returning student at their library instead', () => {
    const line = cocoSays({ kind: 'intake', hasSets: true });
    expect(line.actions.map(a => a.id)).toEqual(['library']);
  });

  it('thinks while a set is being made', () => {
    const line = cocoSays({ kind: 'processing', status: 'generating_quiz' });
    expect(line.mood).toBe('thinking');
    expect(line.say).toMatch(/quiz/i);
  });

  it('counts due cards in the singular and plural', () => {
    const one = cocoSays({ kind: 'study', tab: 'cards', due: 1, mastery: 0, cards: 5 });
    const many = cocoSays({ kind: 'study', tab: 'cards', due: 6, mastery: 0, cards: 5 });
    expect(one.say).toContain('1 card is due');
    expect(many.say).toContain('6 cards are due');
  });

  it('never offers the tab you are already on', () => {
    for (const tab of ['notes', 'cards', 'quiz', 'tutor'] as const) {
      const line = cocoSays({ kind: 'study', tab, due: 0, mastery: 0, cards: 5 });
      expect(line.actions.map(a => a.id)).not.toContain(`tab:${tab}`);
      expect(line.actions).toHaveLength(3);
    }
  });

  it('celebrates a mostly mastered set', () => {
    const line = cocoSays({ kind: 'study', tab: 'notes', due: 0, mastery: 85, cards: 5 });
    expect(line.mood).toBe('happy');
    expect(line.say).toContain('85%');
  });
});

describe('Coco sprite', () => {
  const moods: CocoMood[] = ['idle', 'blink', 'happy', 'thinking', 'worried', 'sleepy'];

  it('stays inside its grid', () => {
    for (const run of [...BODY_RUNS, ...ANTENNA_RUNS, ...moods.flatMap(faceRuns)]) {
      expect(run.x).toBeGreaterThanOrEqual(0);
      expect(run.x + run.w).toBeLessThanOrEqual(COCO_W);
      expect(run.y).toBeGreaterThanOrEqual(0);
      expect(run.y).toBeLessThan(COCO_H);
    }
  });

  it('has a face for every mood, each different', () => {
    const faces = moods.map(m => JSON.stringify(faceRuns(m)));
    expect(new Set(faces).size).toBe(moods.length);
  });

  it('is symmetric left to right, catchlights aside', () => {
    // Only the outline is compared: the shading and the catchlights are lit
    // from the left on purpose.
    const cells = new Set<string>();
    for (const { x, y, w, paint } of BODY_RUNS) {
      if (paint !== 'line') continue;
      for (let i = 0; i < w; i++) cells.add(`${x + i},${y}`);
    }
    for (const cell of cells) {
      const [x, y] = cell.split(',').map(Number);
      expect(cells.has(`${COCO_W - 1 - x},${y}`)).toBe(true);
    }
  });
});
