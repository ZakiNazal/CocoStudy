export enum ContentType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
}

export type Grade = 1 | 2 | 3 | 4;

export type MasteryState = 'new' | 'learning' | 'review' | 'lapsed';

export interface SrsState {
  /** ISO 8601 timestamp when this card is next due. */
  due: string;
  /** Days until the next review. 0 means intraday. */
  interval: number;
  /** Difficulty multiplier, clamped to [EASE_MIN, EASE_MAX]. */
  ease: number;
  reps: number;
  lapses: number;
  state: MasteryState;
  lastGrade?: Grade;
  lastReviewed?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  /** Term in the notes this card teaches. Drives the highlighter. */
  term?: string;
  srs: SrsState;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  takenAt: string;
  answers: number[];
  score: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/** A shelf in the library. Sets point at one; folders never nest. */
export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface StudySet {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  originalContent: string | null;
  contentType: ContentType;
  chatHistory: ChatMessage[];
  /** Keys into the blobs store, not base64 data. */
  images: string[];
  tags: string[];
  archived: boolean;
  /** The folder this set sits in. `null` is Unfiled. */
  folderId: string | null;
}

export interface AppMeta {
  schemaVersion: number;
  theme: 'light' | 'dark';
  apiKey: string | null;
  streak: { current: number; longest: number; lastStudiedDay: string | null };
  focus: { totalMs: number; sessions: number; durationMin: number };
  /** Library shelves, in the order they were made. */
  folders: Folder[];
}

export type ProcessingStatus =
  | 'idle'
  | 'analyzing'
  | 'generating_flashcards'
  | 'generating_quiz'
  | 'complete'
  | 'error';
