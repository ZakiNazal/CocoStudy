import type { Folder, StudySet } from '../types';

/** A folder holds sets by reference, so an empty name would be unclickable. */
export const MAX_FOLDER_NAME = 60;

export function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_FOLDER_NAME);
}

function folderId(now: Date): string {
  const random = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);
  return `folder-${now.getTime()}-${random}`;
}

export interface AddFolderResult {
  folders: Folder[];
  /** The folder to reveal after the add — the new one, or the name clash. */
  folder: Folder | null;
}

/**
 * Adds a folder, or returns the existing one when the name is already taken.
 * Two folders called "Comp Arch" would be indistinguishable in the sidebar, so
 * the second attempt is treated as "go to that one" rather than an error.
 */
export function addFolder(folders: Folder[], name: string, now: Date): AddFolderResult {
  const clean = normalizeFolderName(name);
  if (!clean) return { folders, folder: null };

  const existing = folders.find(f => f.name.toLowerCase() === clean.toLowerCase());
  if (existing) return { folders, folder: existing };

  const folder: Folder = { id: folderId(now), name: clean, createdAt: now.toISOString() };
  return { folders: [...folders, folder], folder };
}

export function renameFolder(folders: Folder[], id: string, name: string): Folder[] {
  const clean = normalizeFolderName(name);
  if (!clean) return folders;
  return folders.map(f => (f.id === id ? { ...f, name: clean } : f));
}

export function removeFolder(folders: Folder[], id: string): Folder[] {
  return folders.filter(f => f.id !== id);
}

/** The sets a delete would orphan. They move back to Unfiled, never away. */
export function setsInFolder(sets: StudySet[], id: string): StudySet[] {
  return sets.filter(s => s.folderId === id);
}

export interface FolderGroup {
  /** `null` is the Unfiled group, which is always last and always present. */
  folder: Folder | null;
  sets: StudySet[];
}

/**
 * Buckets sets into their folders, in the order the folders were made, with
 * Unfiled at the bottom. A set pointing at a folder that no longer exists —
 * an import from another install, say — falls back to Unfiled rather than
 * disappearing from the library.
 */
export function groupSets(sets: StudySet[], folders: Folder[]): FolderGroup[] {
  const known = new Set(folders.map(f => f.id));
  const groups = folders.map(folder => ({
    folder,
    sets: sets.filter(s => s.folderId === folder.id),
  }));

  return [
    ...groups,
    {
      folder: null,
      sets: sets.filter(s => !s.folderId || !known.has(s.folderId)),
    },
  ];
}
