import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAllSets,
  getBlob,
  getBlobsByKey,
  getMeta,
  putBlobAt,
  putMeta,
  putSet,
  resetDb,
} from './db';
import { blobToBase64, buildExport, imageKeys } from './export';
import { base64ToBlob, mergeFolders, parseBackup } from './backup';
import { buildDemoSet } from './demo';

/**
 * The whole loop against a real store: write a set with an illustration,
 * export it, wipe everything, restore, and check the picture comes back
 * under the key its set still points at. This is the part the pure parser
 * cannot prove.
 */

const NOW = new Date('2026-08-20T09:00:00.000Z');
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

beforeEach(async () => {
  await resetDb();
});

async function exportEverything(): Promise<string> {
  const sets = await getAllSets();
  const meta = await getMeta();
  const blobs = await getBlobsByKey(imageKeys(sets));
  const encoded: Record<string, string> = {};
  for (const [key, blob] of Object.entries(blobs)) encoded[key] = await blobToBase64(blob);
  return JSON.stringify(buildExport(sets, meta, NOW, encoded));
}

describe('export then restore', () => {
  it('brings a generated illustration back with its set', async () => {
    const key = 'blob-illustration-1';
    await putBlobAt(key, base64ToBlob(PNG_BASE64));
    await putSet({ ...buildDemoSet(NOW), id: 'set-1', images: [key] });

    const file = await exportEverything();
    await resetDb();
    expect(await getAllSets()).toHaveLength(0);
    expect(await getBlob(key)).toBeUndefined();

    const parsed = parseBackup(file, NOW);
    for (const [k, data] of Object.entries(parsed.blobs)) await putBlobAt(k, base64ToBlob(data));
    for (const set of parsed.sets) await putSet(set);

    const restored = await getAllSets();
    expect(restored).toHaveLength(1);
    expect(restored[0].images).toEqual([key]);

    const blob = await getBlob(key);
    expect(blob).toBeDefined();
    // The bytes survived the base64 trip, not just the reference.
    expect(await blobToBase64(blob!)).toBe(PNG_BASE64);
  });

  it('leaves sets made after the backup alone', async () => {
    await putSet({ ...buildDemoSet(NOW), id: 'old' });
    const file = await exportEverything();

    await putSet({ ...buildDemoSet(NOW), id: 'made-later' });

    const parsed = parseBackup(file, NOW);
    for (const set of parsed.sets) await putSet(set);

    const ids = (await getAllSets()).map(s => s.id).sort();
    expect(ids).toEqual(['made-later', 'old']);
  });

  it('restores folders without dropping the ones already here', async () => {
    await putMeta({ folders: [{ id: 'f-local', name: 'Local', createdAt: NOW.toISOString() }] });
    await putSet({ ...buildDemoSet(NOW), id: 'set-1', folderId: 'f-backup' });
    await putMeta({
      folders: [
        { id: 'f-local', name: 'Local', createdAt: NOW.toISOString() },
        { id: 'f-backup', name: 'From backup', createdAt: NOW.toISOString() },
      ],
    });

    const file = await exportEverything();
    await putMeta({ folders: [{ id: 'f-local', name: 'Local', createdAt: NOW.toISOString() }] });

    const parsed = parseBackup(file, NOW);
    const meta = await getMeta();
    await putMeta({ folders: mergeFolders(meta.folders ?? [], parsed.folders) });

    const ids = (await getMeta()).folders.map(f => f.id).sort();
    expect(ids).toEqual(['f-backup', 'f-local']);
  });

  it('does not carry the API key into the file', async () => {
    await putMeta({ apiKey: 'AIza-secret-value' });
    await putSet(buildDemoSet(NOW));

    expect(await exportEverything()).not.toContain('AIza-secret-value');
  });
});
