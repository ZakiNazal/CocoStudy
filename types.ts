export enum ContentType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO'
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface StudySet {
  id: string;
  title: string;
  createdAt: Date;
  summary: string; // Markdown content
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  originalContent: string | null; // Text content or Transcript
  contentType: ContentType;
  chatHistory?: ChatMessage[];
}

export type ProcessingStatus = 'idle' | 'analyzing' | 'generating_flashcards' | 'generating_quiz' | 'complete' | 'error';
