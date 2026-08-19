import { ContentType, type AppMeta, type Folder, type SrsState, type StudySet } from '../types';
import { newCardState } from './srs';

/**
 * Reading a backup file back in.
 *
 * The file is untrusted: a person picks it from disk, and it may be an export
 * from an older version, someone else's JSON, or a truncated download. So
 * everything here validates before it decides, and the whole payload is judged
 * before a single record is written — a restore that half-succeeds leaves a
 * library in a state nobody asked for.
 *
 * Parsing is separated from writing so the judgement can be tested without a
 * database.
 */

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export interface ParsedBackup {
  sets: StudySet[];
  folders: Folder[];
  /** Base64 by key, already narrowed to images the sets actually reference. */
  blobs: Record<string, string>;
  exportedAt: string | null;
  /** Keys a set pointed at that the file did not carry. */
  missingImages: number;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function iso(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

/**
 * A schedule is only kept if it carries the numbers the scheduler reads. A
 * half-written one would survive a cast and then produce NaN intervals, which
 * is worse than starting the card over.
 */
function toSrs(raw: unknown, now: Date): SrsState {
  if (!isObject(raw)) return newCardState(now);

  const { due, interval, ease, reps, lapses, state } = raw;
  const usable =
    typeof due === 'string' &&
    !Number.isNaN(Date.parse(due)) &&
    Number.isFinite(interval) &&
    Number.isFinite(ease) &&
    Number.isFinite(reps) &&
    Number.isFinite(lapses) &&
    (state === 'new' || state === 'learning' || state === 'review' || state === 'lapsed');

  return usable ? (raw as unknown as SrsState) : newCardState(now);
}

/**
 * A set is rebuilt field by field rather than trusted wholesale, so a file
 * missing a key cannot produce a set that crashes a view later. Anything
 * unrecognisable is dropped, not guessed at.
 */
function toSet(raw: unknown, now: string): StudySet | null {
  if (!isObject(raw)) return null;

  const id = str(raw.id);
  const summary = str(raw.summary);
  if (!id || !summary) return null;

  const cards = Array.isArray(raw.flashcards) ? raw.flashcards : [];
  const startedAt = new Date(now);

  return {
    id,
    title: str(raw.title, 'Untitled set'),
    createdAt: iso(raw.createdAt, now),
    updatedAt: iso(raw.updatedAt, now),
    summary,
    flashcards: cards.filter(isObject).map((c, i) => ({
      id: str(c.id) || `card-${i}-${Date.parse(now)}`,
      front: str(c.front),
      back: str(c.back),
      term: str(c.term) || undefined,
      // A card with no usable schedule is a new card, not a broken one.
      srs: toSrs(c.srs, startedAt),
    })),
    quiz: Array.isArray(raw.quiz) ? (raw.quiz as StudySet['quiz']) : [],
    quizAttempts: Array.isArray(raw.quizAttempts)
      ? (raw.quizAttempts as StudySet['quizAttempts'])
      : [],
    originalContent: typeof raw.originalContent === 'string' ? raw.originalContent : null,
    contentType:
      raw.contentType === ContentType.AUDIO || raw.contentType === ContentType.DOCUMENT
        ? raw.contentType
        : ContentType.TEXT,
    chatHistory: Array.isArray(raw.chatHistory) ? (raw.chatHistory as StudySet['chatHistory']) : [],
    images: Array.isArray(raw.images) ? raw.images.filter((k): k is string => typeof k === 'string') : [],
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    archived: raw.archived === true,
    folderId: typeof raw.folderId === 'string' ? raw.folderId : null,
  };
}

export function parseBackup(text: string, now = new Date()): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not valid JSON. Pick the .json file CocoStudy exported.');
  }

  if (!isObject(raw)) {
    throw new BackupError("That file does not look like a CocoStudy backup.");
  }
  if (raw.app !== 'cocostudy') {
    throw new BackupError(
      "That file was not exported by CocoStudy. Look for one named like cocostudy-2026-08-19.json.",
    );
  }
  if (!Array.isArray(raw.sets)) {
    throw new BackupError('That backup has no study sets in it.');
  }

  const nowIso = now.toISOString();
  const sets = raw.sets.map(s => toSet(s, nowIso)).filter((s): s is StudySet => s !== null);
  if (sets.length === 0) {
    throw new BackupError('That backup has no study sets that could be read.');
  }

  const rawBlobs = isObject(raw.blobs) ? raw.blobs : {};
  const blobs: Record<string, string> = {};
  let missingImages = 0;

  for (const set of sets) {
    // A key with no image behind it would render as a permanent gap, so the
    // reference is dropped and counted. Backups written before images were
    // included land here, which is the point.
    set.images = set.images.filter(key => {
      const data = rawBlobs[key];
      if (typeof data === 'string' && data.length > 0) {
        blobs[key] = data;
        return true;
      }
      missingImages += 1;
      return false;
    });
  }

  const meta = isObject(raw.meta) ? (raw.meta as Partial<AppMeta>) : {};
  const folders = Array.isArray(meta.folders)
    ? meta.folders.filter(
        (f): f is Folder => isObject(f) && typeof f.id === 'string' && typeof f.name === 'string',
      )
    : [];

  return {
    sets,
    folders,
    blobs,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
    missingImages,
  };
}

/** Base64 back to a Blob, for writing restored images into storage. */
export function base64ToBlob(data: string, type = 'image/png'): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export interface MergeResult {
  added: number;
  replaced: number;
}

/**
 * What a restore does to the library it lands in.
 *
 * Merge, not replace: importing a backup should never quietly delete a set
 * made since it was written. A set already present by id is overwritten,
 * because someone restoring a backup is asking for the version in the file.
 */
export function planMerge(existing: StudySet[], incoming: StudySet[]): MergeResult {
  const have = new Set(existing.map(s => s.id));
  let added = 0;
  let replaced = 0;
  for (const set of incoming) {
    if (have.has(set.id)) replaced += 1;
    else added += 1;
  }
  return { added, replaced };
}

/** Folders union by id, keeping the ones already here on a clash. */
export function mergeFolders(existing: Folder[], incoming: Folder[]): Folder[] {
  const byId = new Map(incoming.map(f => [f.id, f]));
  for (const folder of existing) byId.set(folder.id, folder);
  return [...byId.values()];
}
