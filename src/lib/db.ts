import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppMeta, StudySet } from '../types';

export const SCHEMA_VERSION = 1;
const DB_NAME = 'cocostudy';
const META_KEY = 'app';

interface CocoDB extends DBSchema {
  sets: { key: string; value: StudySet };
  meta: { key: string; value: AppMeta };
  blobs: { key: string; value: Blob };
}

export const DEFAULT_META: AppMeta = {
  schemaVersion: SCHEMA_VERSION,
  theme: 'system',
  apiKey: null,
  streak: { current: 0, longest: 0, lastStudiedDay: null },
  focus: { totalMs: 0, sessions: 0, durationMin: 25 },
};

let dbPromise: Promise<IDBPDatabase<CocoDB>> | null = null;

function db(): Promise<IDBPDatabase<CocoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CocoDB>(DB_NAME, SCHEMA_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('sets')) {
          database.createObjectStore('sets', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('meta')) {
          database.createObjectStore('meta');
        }
        if (!database.objectStoreNames.contains('blobs')) {
          database.createObjectStore('blobs');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllSets(): Promise<StudySet[]> {
  const all = await (await db()).getAll('sets');
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSet(id: string): Promise<StudySet | undefined> {
  return (await db()).get('sets', id);
}

export async function putSet(set: StudySet): Promise<void> {
  await (await db()).put('sets', set);
}

export async function deleteSet(id: string): Promise<void> {
  const database = await db();
  const set = await database.get('sets', id);
  if (set) {
    await Promise.all(set.images.map(key => database.delete('blobs', key)));
  }
  await database.delete('sets', id);
}

export async function getMeta(): Promise<AppMeta> {
  const stored = await (await db()).get('meta', META_KEY);
  return { ...DEFAULT_META, ...stored, schemaVersion: SCHEMA_VERSION };
}

export async function putMeta(patch: Partial<AppMeta>): Promise<AppMeta> {
  const merged = { ...(await getMeta()), ...patch };
  await (await db()).put('meta', merged, META_KEY);
  return merged;
}

function blobKey(): string {
  const random =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `blob-${random}-${Date.now()}`;
}

export async function putBlob(blob: Blob): Promise<string> {
  const key = blobKey();
  await (await db()).put('blobs', blob, key);
  return key;
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  return (await db()).get('blobs', key);
}

export async function countBlobs(): Promise<number> {
  return (await db()).count('blobs');
}

export async function getBlobUrl(key: string): Promise<string | undefined> {
  const blob = await getBlob(key);
  return blob ? URL.createObjectURL(blob) : undefined;
}

/** Clears every store. Backs "wipe all data" in Settings and test isolation. */
export async function resetDb(): Promise<void> {
  const database = await db();
  await Promise.all([
    database.clear('sets'),
    database.clear('meta'),
    database.clear('blobs'),
  ]);
}
