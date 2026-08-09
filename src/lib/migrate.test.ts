import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLegacyData, LEGACY_KEY } from './migrate';
import { getAllSets, getBlob, resetDb } from './db';

const NOW = new Date('2026-08-10T12:00:00.000Z');

const legacySet = (over: Record<string, unknown> = {}) => ({
  id: '1700000000000',
  title: 'Photosynthesis',
  createdAt: '2026-07-01T09:30:00.000Z',
  summary: '# Photosynthesis\n\nLight reactions.',
  flashcards: [
    { id: 'card-0', front: 'What is ATP?', back: 'Adenosine triphosphate.' },
    { id: 'card-1', front: 'Where?', back: 'Thylakoid membrane.' },
  ],
  quiz: [
    { id: 'q-0', question: 'Q', options: ['a', 'b'], correctAnswerIndex: 0, explanation: 'E' },
  ],
  originalContent: 'raw notes',
  contentType: 'TEXT',
  chatHistory: [{ role: 'user', text: 'hi' }],
  images: [],
  ...over,
});

/** 1x1 transparent PNG. */
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

beforeEach(async () => {
  await resetDb();
  localStorage.clear();
});

describe('migrateLegacyData', () => {
  it('skips when there is nothing to migrate', async () => {
    expect(await migrateLegacyData(NOW)).toEqual({ migrated: 0, skipped: true });
  });

  it('skips when the legacy value is an empty array', async () => {
    localStorage.setItem(LEGACY_KEY, '[]');
    expect(await migrateLegacyData(NOW)).toEqual({ migrated: 0, skipped: true });
  });

  it('migrates a legacy set into IndexedDB', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    expect(await migrateLegacyData(NOW)).toEqual({ migrated: 1, skipped: false });

    const [set] = await getAllSets();
    expect(set.id).toBe('1700000000000');
    expect(set.title).toBe('Photosynthesis');
    expect(set.summary).toContain('Photosynthesis');
    expect(set.quiz).toHaveLength(1);
    expect(set.chatHistory).toEqual([{ role: 'user', text: 'hi' }]);
  });

  it('seeds every card with fresh new-card scheduling state', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    await migrateLegacyData(NOW);

    const [set] = await getAllSets();
    expect(set.flashcards).toHaveLength(2);
    for (const card of set.flashcards) {
      expect(card.srs).toMatchObject({
        state: 'new',
        interval: 0,
        reps: 0,
        lapses: 0,
        ease: 2.5,
      });
      expect(card.srs.due).toBe(NOW.toISOString());
    }
  });

  it('adds the new set fields with safe defaults', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    await migrateLegacyData(NOW);

    const [set] = await getAllSets();
    expect(set.tags).toEqual([]);
    expect(set.archived).toBe(false);
    expect(set.quizAttempts).toEqual([]);
    expect(set.updatedAt).toBe(NOW.toISOString());
  });

  it('normalises a Date-serialised createdAt to an ISO string', async () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([legacySet({ createdAt: '2026-07-01T09:30:00.000Z' })]),
    );
    await migrateLegacyData(NOW);

    const [set] = await getAllSets();
    expect(typeof set.createdAt).toBe('string');
    expect(set.createdAt).toBe('2026-07-01T09:30:00.000Z');
  });

  it('falls back to now when createdAt is missing or unparseable', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet({ createdAt: 'not a date' })]));
    await migrateLegacyData(NOW);

    expect((await getAllSets())[0].createdAt).toBe(NOW.toISOString());
  });

  it('moves base64 images into the blob store and stores keys', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet({ images: [PNG] })]));
    await migrateLegacyData(NOW);

    const [set] = await getAllSets();
    expect(set.images).toHaveLength(1);
    expect(set.images[0]).not.toContain('base64');
    const blob = await getBlob(set.images[0]);
    expect(blob).toBeDefined();
    expect(blob!.type).toBe('image/png');
  });

  it('drops an unreadable image rather than failing the whole migration', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet({ images: ['not-a-data-uri'] })]));
    expect(await migrateLegacyData(NOW)).toEqual({ migrated: 1, skipped: false });
    expect((await getAllSets())[0].images).toEqual([]);
  });

  it('is idempotent — a second run does not duplicate anything', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    await migrateLegacyData(NOW);
    const second = await migrateLegacyData(NOW);

    expect(second).toEqual({ migrated: 0, skipped: true });
    expect(await getAllSets()).toHaveLength(1);
  });

  it('never deletes the legacy key', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    await migrateLegacyData(NOW);
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
  });

  it('reports an error and writes nothing when the payload is corrupt', async () => {
    localStorage.setItem(LEGACY_KEY, '{ not json');
    const result = await migrateLegacyData(NOW);

    expect(result.skipped).toBe(false);
    expect(result.migrated).toBe(0);
    expect(result.error).toBeTruthy();
    expect(await getAllSets()).toEqual([]);
  });
});
