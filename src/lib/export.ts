import { SCHEMA_VERSION } from './db';
import type { AppMeta, StudySet } from '../types';

export interface ExportPayload {
  app: 'cocostudy';
  schemaVersion: number;
  exportedAt: string;
  /** Meta minus the API key — an export is a file people email to themselves. */
  meta: Omit<AppMeta, 'apiKey'>;
  sets: StudySet[];
}

export function buildExport(sets: StudySet[], meta: AppMeta, now: Date): ExportPayload {
  const { apiKey: _apiKey, ...safeMeta } = meta;
  return {
    app: 'cocostudy',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    meta: safeMeta,
    sets,
  };
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
