import { SCHEMA_VERSION } from './db';
import type { AppMeta, StudySet } from '../types';

export interface ExportPayload {
  app: 'cocostudy';
  schemaVersion: number;
  exportedAt: string;
  /** Meta minus the API key — an export is a file people email to themselves. */
  meta: Omit<AppMeta, 'apiKey'>;
  sets: StudySet[];
  /**
   * The generated illustrations, base64 by the key their set refers to them
   * by. A set's `images` are keys into a separate store, so a backup without
   * this carried names for pictures it did not contain.
   */
  blobs: Record<string, string>;
}

export function buildExport(
  sets: StudySet[],
  meta: AppMeta,
  now: Date,
  blobs: Record<string, string> = {},
): ExportPayload {
  const { apiKey: _apiKey, ...safeMeta } = meta;
  return {
    app: 'cocostudy',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    meta: safeMeta,
    sets,
    blobs,
  };
}

/** Every image key the given sets point at, deduplicated. */
export function imageKeys(sets: StudySet[]): string[] {
  return [...new Set(sets.flatMap(set => set.images ?? []))];
}

/**
 * A Blob as bare base64.
 *
 * Read through `arrayBuffer` rather than a FileReader so it runs anywhere a
 * Blob does, and fed to `btoa` in chunks — spreading a whole image into
 * `String.fromCharCode` exceeds the argument limit somewhere around a
 * megabyte, which is a size these illustrations reach easily.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** `cocostudy-2026-08-10.json` — sortable, and stable within a day. */
export function exportFilename(now: Date): string {
  return `cocostudy-${now.toISOString().slice(0, 10)}.json`;
}

/** Triggers a browser download of `payload`. Revokes the object URL after. */
export function downloadJson(payload: unknown, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
