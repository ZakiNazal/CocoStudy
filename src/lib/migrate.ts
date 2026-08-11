import { getAllSets, putBlob, putSet } from './db';
import { newCardState } from './srs';
import {
  ContentType,
  type ChatMessage,
  type Flashcard,
  type QuizQuestion,
  type StudySet,
} from '../types';

export const LEGACY_KEY = 'coco_study_sets';

export interface MigrationResult {
  migrated: number;
  skipped: boolean;
  error?: string;
}

function isoOr(fallback: string, value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallback;
}

function dataUriToBlob(uri: string): Blob | null {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(uri);
  if (!match) return null;
  try {
    const [, mime, b64] = match;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

async function migrateImages(images: unknown): Promise<string[]> {
  if (!Array.isArray(images)) return [];
  const keys: string[] = [];
  for (const entry of images) {
    if (typeof entry !== 'string') continue;
    const blob = dataUriToBlob(entry);
    if (!blob) continue;
    keys.push(await putBlob(blob));
  }
  return keys;
}

function migrateCards(cards: unknown, now: Date): Flashcard[] {
  if (!Array.isArray(cards)) return [];
  return cards
    .filter(
      (c): c is { id?: string; front?: string; back?: string } =>
        typeof c === 'object' && c !== null,
    )
    .map((c, i) => ({
      id: typeof c.id === 'string' ? c.id : `card-${i}-${now.getTime()}`,
      front: String(c.front ?? ''),
      back: String(c.back ?? ''),
      srs: newCardState(now),
    }));
}

function migrateQuiz(quiz: unknown, now: Date): QuizQuestion[] {
  if (!Array.isArray(quiz)) return [];
  return quiz
    .filter((q): q is Record<string, unknown> => typeof q === 'object' && q !== null)
    .map((q, i) => ({
      id: typeof q.id === 'string' ? q.id : `quiz-${i}-${now.getTime()}`,
      question: String(q.question ?? ''),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correctAnswerIndex: Number(q.correctAnswerIndex ?? 0),
      explanation: String(q.explanation ?? ''),
    }));
}

function migrateChat(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m): m is { role?: unknown; text?: unknown } => typeof m === 'object' && m !== null,
    )
    .map(m => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      text: String(m.text ?? ''),
    }));
}

function migrateContentType(value: unknown): ContentType {
  return value === 'AUDIO'
    ? ContentType.AUDIO
    : value === 'DOCUMENT'
      ? ContentType.DOCUMENT
      : ContentType.TEXT;
}

/**
 * Copies pre-IndexedDB data forward. Idempotent, and never deletes the
 * legacy localStorage key — it stays as a fallback copy.
 *
 * Concurrent callers share a single run. Without this, React StrictMode's
 * double-invoked effects (and a second open tab) both see an empty database
 * and each write their own copy of the images, orphaning blobs.
 */
export function migrateLegacyData(now: Date): Promise<MigrationResult> {
  if (!inFlight) {
    inFlight = runMigration(now).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

let inFlight: Promise<MigrationResult> | null = null;

async function runMigration(now: Date): Promise<MigrationResult> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return { migrated: 0, skipped: true };
  }
  if (!raw) return { migrated: 0, skipped: true };

  if ((await getAllSets()).length > 0) return { migrated: 0, skipped: true };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { migrated: 0, skipped: true };
    }

    const nowIso = now.toISOString();
    const migrated: StudySet[] = [];

    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue;
      const legacy = entry as Record<string, unknown>;

      migrated.push({
        id:
          typeof legacy.id === 'string'
            ? legacy.id
            : `set-${now.getTime()}-${migrated.length}`,
        title: String(legacy.title ?? 'Untitled Note'),
        createdAt: isoOr(nowIso, legacy.createdAt),
        updatedAt: nowIso,
        summary: String(legacy.summary ?? ''),
        flashcards: migrateCards(legacy.flashcards, now),
        quiz: migrateQuiz(legacy.quiz, now),
        quizAttempts: [],
        originalContent:
          typeof legacy.originalContent === 'string' ? legacy.originalContent : null,
        contentType: migrateContentType(legacy.contentType),
        chatHistory: migrateChat(legacy.chatHistory),
        images: await migrateImages(legacy.images),
        tags: [],
        archived: false,
        folderId: null,
      });
    }

    for (const set of migrated) await putSet(set);
    return { migrated: migrated.length, skipped: false };
  } catch (e) {
    return { migrated: 0, skipped: false, error: e instanceof Error ? e.message : String(e) };
  }
}
