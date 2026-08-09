import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllSets,
  getSet,
  putSet,
  deleteSet,
  getMeta,
  putMeta,
  putBlob,
  getBlob,
  resetDb,
  DEFAULT_META,
  SCHEMA_VERSION,
} from './db';
import { ContentType, type StudySet } from '../types';

const makeSet = (over: Partial<StudySet> = {}): StudySet => ({
  id: 's1',
  title: 'Cellular Respiration',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  summary: '# Cellular Respiration',
  flashcards: [],
  quiz: [],
  quizAttempts: [],
  originalContent: null,
  contentType: ContentType.TEXT,
  chatHistory: [],
  images: [],
  tags: [],
  archived: false,
  ...over,
});

beforeEach(async () => {
  await resetDb();
});

describe('sets', () => {
  it('returns an empty library before anything is stored', async () => {
    expect(await getAllSets()).toEqual([]);
  });

  it('round-trips a set', async () => {
    const set = makeSet();
    await putSet(set);
    expect(await getSet('s1')).toEqual(set);
  });

  it('overwrites a set with the same id rather than duplicating it', async () => {
    await putSet(makeSet());
    await putSet(makeSet({ title: 'Renamed' }));
    const all = await getAllSets();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Renamed');
  });

  it('lists sets newest-updated first', async () => {
    await putSet(makeSet({ id: 'old', updatedAt: '2026-08-01T00:00:00.000Z' }));
    await putSet(makeSet({ id: 'new', updatedAt: '2026-08-09T00:00:00.000Z' }));
    expect((await getAllSets()).map(s => s.id)).toEqual(['new', 'old']);
  });

  it('deletes a set', async () => {
    await putSet(makeSet());
    await deleteSet('s1');
    expect(await getSet('s1')).toBeUndefined();
  });

  it("deletes the set's blobs along with it", async () => {
    const key = await putBlob(new Blob(['png bytes']));
    await putSet(makeSet({ images: [key] }));
    await deleteSet('s1');
    expect(await getBlob(key)).toBeUndefined();
  });

  it('resolves rather than throwing when deleting a set that is not there', async () => {
    await expect(deleteSet('missing')).resolves.toBeUndefined();
  });
});

describe('meta', () => {
  it('returns defaults before anything is written', async () => {
    expect(await getMeta()).toEqual({ ...DEFAULT_META, schemaVersion: SCHEMA_VERSION });
  });

  it('merges a patch over existing values instead of replacing them', async () => {
    await putMeta({ theme: 'dark' });
    await putMeta({ apiKey: 'k-123' });
    const meta = await getMeta();
    expect(meta.theme).toBe('dark');
    expect(meta.apiKey).toBe('k-123');
  });

  it('returns the merged result from putMeta', async () => {
    expect((await putMeta({ theme: 'dark' })).theme).toBe('dark');
  });
});

describe('blobs', () => {
  it('round-trips a blob under a generated key', async () => {
    const key = await putBlob(new Blob(['hello'], { type: 'text/plain' }));
    expect(typeof key).toBe('string');
    expect(await (await getBlob(key))!.text()).toBe('hello');
  });

  it('generates a distinct key per blob', async () => {
    const a = await putBlob(new Blob(['a']));
    const b = await putBlob(new Blob(['b']));
    expect(a).not.toBe(b);
  });
});
