import { describe, expect, it } from 'vitest';
import { BackupError, mergeFolders, parseBackup, planMerge } from './backup';
import { buildExport, imageKeys } from './export';
import { DEFAULT_META } from './db';
import { buildDemoSet } from './demo';
import { ContentType, type StudySet } from '../types';

const NOW = new Date('2026-08-20T09:00:00.000Z');

function file(payload: unknown): string {
  return JSON.stringify(payload);
}

/** The shape a real export produces, so the round trip is tested end to end. */
function realExport(sets: StudySet[], blobs: Record<string, string> = {}) {
  return buildExport(sets, DEFAULT_META, NOW, blobs);
}

describe('a backup round trip', () => {
  it('brings back every set it wrote', () => {
    const demo = buildDemoSet(NOW);
    const parsed = parseBackup(file(realExport([demo])), NOW);

    expect(parsed.sets).toHaveLength(1);
    expect(parsed.sets[0].id).toBe(demo.id);
    expect(parsed.sets[0].title).toBe(demo.title);
    expect(parsed.sets[0].flashcards).toHaveLength(demo.flashcards.length);
    expect(parsed.sets[0].summary).toBe(demo.summary);
  });

  it('carries illustrations across, keyed as the set refers to them', () => {
    const set = { ...buildDemoSet(NOW), images: ['blob-a', 'blob-b'] };
    const parsed = parseBackup(
      file(realExport([set], { 'blob-a': 'AAAA', 'blob-b': 'BBBB' })),
      NOW,
    );

    expect(parsed.sets[0].images).toEqual(['blob-a', 'blob-b']);
    expect(parsed.blobs).toEqual({ 'blob-a': 'AAAA', 'blob-b': 'BBBB' });
    expect(parsed.missingImages).toBe(0);
  });

  it('never writes the API key into the file', () => {
    const payload = realExport([buildDemoSet(NOW)]);
    expect(file(payload)).not.toContain('apiKey');
  });

  it('collects the image keys an export needs to fetch', () => {
    const a = { ...buildDemoSet(NOW), id: 'a', images: ['k1', 'k2'] };
    const b = { ...buildDemoSet(NOW), id: 'b', images: ['k2', 'k3'] };
    expect(imageKeys([a, b]).sort()).toEqual(['k1', 'k2', 'k3']);
  });
});

describe('backups written before images were included', () => {
  // The bug this whole change fixes: sets carried keys, the file carried no
  // pictures. Those references are dropped rather than left to render as gaps.
  it('drops image references the file cannot satisfy, and says how many', () => {
    const set = { ...buildDemoSet(NOW), images: ['gone-1', 'gone-2'] };
    const legacy = { ...realExport([set]), blobs: undefined };

    const parsed = parseBackup(file(legacy), NOW);
    expect(parsed.sets[0].images).toEqual([]);
    expect(parsed.missingImages).toBe(2);
  });
});

describe('rejecting files that are not backups', () => {
  it('refuses malformed JSON', () => {
    expect(() => parseBackup('{ not json', NOW)).toThrow(BackupError);
  });

  it('refuses another app’s export', () => {
    expect(() => parseBackup(file({ app: 'anki', sets: [] }), NOW)).toThrow(/not exported by/i);
  });

  it('refuses a backup with no readable sets', () => {
    expect(() => parseBackup(file({ app: 'cocostudy', sets: [] }), NOW)).toThrow(BackupError);
    // Entries missing an id or a summary are not sets.
    expect(() => parseBackup(file({ app: 'cocostudy', sets: [{ title: 'x' }] }), NOW)).toThrow(
      BackupError,
    );
  });

  it('explains itself in every refusal', () => {
    for (const bad of ['nope', file({ app: 'anki', sets: [] }), file({ app: 'cocostudy' })]) {
      expect(() => parseBackup(bad, NOW)).toThrow(/CocoStudy|JSON|study sets/i);
    }
  });
});

describe('repairing what it can', () => {
  it('fills in the fields a hand-edited file left out', () => {
    const parsed = parseBackup(
      file({ app: 'cocostudy', sets: [{ id: 's1', summary: '# Notes' }] }),
      NOW,
    );
    const set = parsed.sets[0];

    expect(set.title).toBe('Untitled set');
    expect(set.contentType).toBe(ContentType.TEXT);
    expect(set.flashcards).toEqual([]);
    expect(set.images).toEqual([]);
    expect(set.folderId).toBeNull();
    expect(set.archived).toBe(false);
    expect(() => new Date(set.createdAt).toISOString()).not.toThrow();
  });

  it('gives a card with no schedule a new one instead of dropping it', () => {
    const parsed = parseBackup(
      file({
        app: 'cocostudy',
        sets: [{ id: 's1', summary: '#', flashcards: [{ front: 'Q', back: 'A' }] }],
      }),
      NOW,
    );
    expect(parsed.sets[0].flashcards[0].srs.reps).toBe(0);
    expect(parsed.sets[0].flashcards[0].id).toBeTruthy();
  });

  it('replaces an unparseable date rather than storing NaN', () => {
    const parsed = parseBackup(
      file({ app: 'cocostudy', sets: [{ id: 's1', summary: '#', createdAt: 'last tuesday' }] }),
      NOW,
    );
    expect(parsed.sets[0].createdAt).toBe(NOW.toISOString());
  });
});

describe('merging into an existing library', () => {
  const here = [{ ...buildDemoSet(NOW), id: 'keep' }, { ...buildDemoSet(NOW), id: 'shared' }];

  it('counts what lands and what is overwritten', () => {
    const incoming = [{ ...buildDemoSet(NOW), id: 'shared' }, { ...buildDemoSet(NOW), id: 'new' }];
    expect(planMerge(here, incoming)).toEqual({ added: 1, replaced: 1 });
  });

  it('never plans to remove a set that is only here', () => {
    // Restoring an old backup must not delete work done since it was written.
    const plan = planMerge(here, [{ ...buildDemoSet(NOW), id: 'new' }]);
    expect(plan).toEqual({ added: 1, replaced: 0 });
  });

  it('unions folders and keeps the local name on a clash', () => {
    const mine = [{ id: 'f1', name: 'Mine', createdAt: NOW.toISOString() }];
    const theirs = [
      { id: 'f1', name: 'Theirs', createdAt: NOW.toISOString() },
      { id: 'f2', name: 'Extra', createdAt: NOW.toISOString() },
    ];
    const merged = mergeFolders(mine, theirs);

    expect(merged).toHaveLength(2);
    expect(merged.find(f => f.id === 'f1')?.name).toBe('Mine');
    expect(merged.find(f => f.id === 'f2')?.name).toBe('Extra');
  });
});
