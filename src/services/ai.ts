import { GoogleGenAI } from '@google/genai';
import { newCardState } from '../lib/srs';
import { getMeta } from '../lib/db';
import type { ExtractedInput } from '../lib/extract';
import type { ChatMessage, Flashcard, QuizQuestion } from '../types';
import {
  SUMMARY_PROMPT,
  flashcardPrompt,
  quizPrompt,
  tutorSystemInstruction,
  imagePrompt,
} from './prompts';

const MODEL = 'gemini-2.5-flash';

export class MissingApiKeyError extends Error {
  constructor() {
    super('Add your Gemini API key in Settings to generate study sets.');
    this.name = 'MissingApiKeyError';
  }
}

export type AiErrorKind = 'invalid-key' | 'rate-limit' | 'network' | 'unknown';

export class AiError extends Error {
  constructor(
    public readonly kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

let client: GoogleGenAI | null = null;
let cachedKey: string | null = null;

/** Called by useSettings whenever the stored key changes. */
export function setApiKey(key: string | null): void {
  cachedKey = key;
  client = null;
}

async function resolveKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const meta = await getMeta();
  const key = meta.apiKey ?? import.meta.env.VITE_GEMINI_API_KEY ?? null;
  if (!key) throw new MissingApiKeyError();
  cachedKey = key;
  return key;
}

async function ai(): Promise<GoogleGenAI> {
  const key = await resolveKey();
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

function toAiError(e: unknown): AiError {
  const message = e instanceof Error ? e.message : String(e);
  const lower = message.toLowerCase();

  if (
    lower.includes('api key') ||
    lower.includes('permission') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    client = null;
    cachedKey = null;
    return new AiError('invalid-key', 'That Gemini API key was rejected. Check it in Settings.');
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate')) {
    return new AiError(
      'rate-limit',
      'Gemini is rate-limiting this key. Wait a minute and try again.',
    );
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('offline')) {
    return new AiError('network', 'Could not reach Gemini. Check your connection.');
  }
  return new AiError('unknown', message);
}

/** Rethrows our own error types untouched, wraps anything else. */
function rethrow(e: unknown): never {
  throw e instanceof AiError || e instanceof MissingApiKeyError ? e : toAiError(e);
}

export async function generateSummary(input: ExtractedInput): Promise<string> {
  try {
    const parts =
      input.kind === 'text'
        ? [{ text: input.text }, { text: SUMMARY_PROMPT }]
        : [
            { inlineData: { data: input.data, mimeType: input.mimeType } },
            { text: SUMMARY_PROMPT },
          ];

    const response = await (await ai()).models.generateContent({
      model: MODEL,
      contents: { parts },
    });

    const text = response.text?.trim();
    if (!text) throw new AiError('unknown', 'Gemini returned an empty study guide.');
    return text;
  } catch (e) {
    rethrow(e);
  }
}

export async function generateFlashcards(summary: string): Promise<Flashcard[]> {
  try {
    const response = await (await ai()).models.generateContent({
      model: MODEL,
      contents: flashcardPrompt(summary),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' },
              term: { type: 'string' },
            },
            required: ['front', 'back'],
          },
        },
      },
    });

    if (!response.text) return [];
    const now = new Date();
    const parsed = JSON.parse(response.text) as {
      front: string;
      back: string;
      term?: string;
    }[];

    return parsed.map((card, i) => ({
      id: `card-${i}-${now.getTime()}`,
      front: card.front,
      back: card.back,
      term: card.term?.trim() || undefined,
      srs: newCardState(now),
    }));
  } catch (e) {
    rethrow(e);
  }
}

export async function generateQuiz(summary: string): Promise<QuizQuestion[]> {
  try {
    const response = await (await ai()).models.generateContent({
      model: MODEL,
      contents: quizPrompt(summary),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correctAnswerIndex: { type: 'integer' },
              explanation: { type: 'string' },
            },
            required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
          },
        },
      },
    });

    if (!response.text) return [];
    const now = Date.now();
    const parsed = JSON.parse(response.text) as Omit<QuizQuestion, 'id'>[];
    return parsed.map((q, i) => ({ ...q, id: `quiz-${i}-${now}` }));
  } catch (e) {
    rethrow(e);
  }
}

export async function chatWithContext(
  message: string,
  context: string,
  history: ChatMessage[],
): Promise<string> {
  try {
    const chat = (await ai()).chats.create({
      model: MODEL,
      config: { systemInstruction: tutorSystemInstruction(context) },
      history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    });
    const result = await chat.sendMessage({ message });
    return result.text ?? "I couldn't generate a response.";
  } catch (e) {
    rethrow(e);
  }
}

export async function generateStudyImage(topic: string): Promise<Blob | null> {
  try {
    const response = await (await ai()).models.generateContent({
      model: MODEL,
      contents: { parts: [{ text: imagePrompt(topic) }] },
      config: { imageConfig: { aspectRatio: '16:9' } },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const binary = atob(part.inlineData.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: part.inlineData.mimeType ?? 'image/png' });
      }
    }
    return null;
  } catch (e) {
    rethrow(e);
  }
}
