import { describe, expect, it } from 'vitest';
import { buildExport, exportFilename } from './export';
import { DEFAULT_META, SCHEMA_VERSION } from './db';
import { buildDemoSet } from './demo';

const NOW = new Date('2026-08-10T09:30:00.000Z');

describe('buildExport', () => {
  it('never includes the API key', () => {
    const payload = buildExport([], { ...DEFAULT_META, apiKey: 'AIza-secret' }, NOW);
    expect(JSON.stringify(payload)).not.toContain('AIza-secret');
    expect('apiKey' in payload.meta).toBe(false);
  });

  it('keeps the rest of meta and every set', () => {
    const set = buildDemoSet(NOW);
    const payload = buildExport([set], { ...DEFAULT_META, theme: 'dark' }, NOW);

    expect(payload.meta.theme).toBe('dark');
    expect(payload.meta.streak).toEqual(DEFAULT_META.streak);
    expect(payload.sets).toHaveLength(1);
    expect(payload.sets[0].flashcards).toEqual(set.flashcards);
  });

  it('stamps the schema version and export time', () => {
    const payload = buildExport([], DEFAULT_META, NOW);
    expect(payload.schemaVersion).toBe(SCHEMA_VERSION);
    expect(payload.exportedAt).toBe(NOW.toISOString());
  });
});

describe('exportFilename', () => {
  it('names the file by day', () => {
    expect(exportFilename(NOW)).toBe('cocostudy-2026-08-10.json');
  });
});
