import { describe, expect, it } from 'vitest';
import {
  addFolder,
  groupSets,
  normalizeFolderName,
  removeFolder,
  renameFolder,
  setsInFolder,
  MAX_FOLDER_NAME,
} from './folders';
import { ContentType, type Folder, type StudySet } from '../types';

const NOW = new Date('2026-08-11T10:00:00.000Z');

function set(id: string, folderId: string | null = null): StudySet {
  return {
    id,
    title: id,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    summary: '',
    flashcards: [],
    quiz: [],
    quizAttempts: [],
    originalContent: null,
    contentType: ContentType.TEXT,
    chatHistory: [],
    images: [],
    tags: [],
    archived: false,
    folderId,
  };
}

function folders(...names: string[]): Folder[] {
  return names.map((name, i) => ({
    id: `folder-${i}`,
    name,
    createdAt: NOW.toISOString(),
  }));
}

describe('normalizeFolderName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeFolderName('  Comp   Arch \n')).toBe('Comp Arch');
  });

  it('caps the length so a name cannot break the rail', () => {
    expect(normalizeFolderName('x'.repeat(200))).toHaveLength(MAX_FOLDER_NAME);
  });
});

describe('addFolder', () => {
  it('adds a folder and hands back the one it made', () => {
    const { folders: next, folder } = addFolder([], 'Semester 2', NOW);
    expect(next).toHaveLength(1);
    expect(folder?.name).toBe('Semester 2');
    expect(next[0].id).toBe(folder?.id);
  });

  it('ignores an empty name', () => {
    const existing = folders('Physics');
    const { folders: next, folder } = addFolder(existing, '   ', NOW);
    expect(next).toBe(existing);
    expect(folder).toBeNull();
  });

  it('returns the existing folder when the name is already taken', () => {
    const existing = folders('Physics');
    const { folders: next, folder } = addFolder(existing, 'physics', NOW);
    expect(next).toHaveLength(1);
    expect(folder?.id).toBe(existing[0].id);
  });

  it('keeps the order folders were made in', () => {
    const a = addFolder([], 'First', NOW).folders;
    const b = addFolder(a, 'Second', NOW).folders;
    expect(b.map(f => f.name)).toEqual(['First', 'Second']);
  });
});

describe('renameFolder', () => {
  it('renames only the folder named', () => {
    const next = renameFolder(folders('Physics', 'Maths'), 'folder-0', ' Applied Physics ');
    expect(next.map(f => f.name)).toEqual(['Applied Physics', 'Maths']);
  });

  it('refuses to blank a name', () => {
    const existing = folders('Physics');
    expect(renameFolder(existing, 'folder-0', '  ')).toBe(existing);
  });
});

describe('removeFolder', () => {
  it('drops the folder', () => {
    expect(removeFolder(folders('A', 'B'), 'folder-0').map(f => f.name)).toEqual(['B']);
  });
});

describe('setsInFolder', () => {
  it('finds the sets a delete would strand', () => {
    const sets = [set('a', 'folder-0'), set('b'), set('c', 'folder-0')];
    expect(setsInFolder(sets, 'folder-0').map(s => s.id)).toEqual(['a', 'c']);
  });
});

describe('groupSets', () => {
  it('buckets sets under their folder, with Unfiled last', () => {
    const groups = groupSets(
      [set('a', 'folder-0'), set('b'), set('c', 'folder-1')],
      folders('Physics', 'Maths'),
    );

    expect(groups.map(g => g.folder?.name ?? 'Unfiled')).toEqual(['Physics', 'Maths', 'Unfiled']);
    expect(groups[0].sets.map(s => s.id)).toEqual(['a']);
    expect(groups[1].sets.map(s => s.id)).toEqual(['c']);
    expect(groups[2].sets.map(s => s.id)).toEqual(['b']);
  });

  it('always offers the Unfiled shelf, even when empty', () => {
    const groups = groupSets([set('a', 'folder-0')], folders('Physics'));
    expect(groups).toHaveLength(2);
    expect(groups[1].folder).toBeNull();
    expect(groups[1].sets).toEqual([]);
  });

  it('shows a set whose folder is gone rather than losing it', () => {
    const groups = groupSets([set('a', 'folder-deleted')], folders('Physics'));
    expect(groups[1].sets.map(s => s.id)).toEqual(['a']);
  });

  it('lists every set exactly once', () => {
    const sets = [set('a', 'folder-0'), set('b'), set('c', 'folder-1'), set('d', 'nope')];
    const seen = groupSets(sets, folders('Physics', 'Maths')).flatMap(g => g.sets.map(s => s.id));
    expect(seen.sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
