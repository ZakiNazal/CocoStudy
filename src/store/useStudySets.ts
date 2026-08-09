import { useCallback, useEffect, useState } from 'react';
import { deleteSet, getAllSets, putSet } from '../lib/db';
import { migrateLegacyData } from '../lib/migrate';
import { extractFromFile, extractFromText, type ExtractResult } from '../lib/extract';
import { generateFlashcards, generateQuiz, generateSummary } from '../services/ai';
import type { ProcessingStatus, StudySet } from '../types';

function titleFrom(markdown: string): string {
  return /^# (.*)$/m.exec(markdown)?.[1]?.trim() || 'Study Note';
}

export function useStudySets() {
  const [sets, setSets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await migrateLegacyData(new Date());
      if (result.error) setError(`Could not import your old notes: ${result.error}`);
      setSets(await getAllSets());
      setLoading(false);
    })();
  }, []);

  const create = useCallback(async (extracted: ExtractResult): Promise<StudySet | null> => {
    setError(null);
    setStatus('analyzing');
    try {
      const summary = await generateSummary(extracted.input);

      setStatus('generating_flashcards');
      const flashcards = await generateFlashcards(summary);

      setStatus('generating_quiz');
      const quiz = await generateQuiz(summary);

      const now = new Date().toISOString();
      const set: StudySet = {
        id: `set-${Date.now()}`,
        title: titleFrom(summary),
        createdAt: now,
        updatedAt: now,
        summary,
        flashcards,
        quiz,
        quizAttempts: [],
        originalContent: extracted.originalText,
        contentType: extracted.contentType,
        chatHistory: [],
        images: [],
        tags: [],
        archived: false,
      };

      await putSet(set);
      setSets(await getAllSets());
      setStatus('complete');
      return set;
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Something went wrong generating this set.');
      return null;
    }
  }, []);

  const createFromFile = useCallback(
    async (file: File) => {
      try {
        return await create(await extractFromFile(file));
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Could not read that file.');
        return null;
      }
    },
    [create],
  );

  const createFromText = useCallback((text: string) => create(extractFromText(text)), [create]);

  const updateSet = useCallback(async (set: StudySet) => {
    const next = { ...set, updatedAt: new Date().toISOString() };
    await putSet(next);
    setSets(current => current.map(s => (s.id === next.id ? next : s)));
  }, []);

  const removeSet = useCallback(async (id: string) => {
    await deleteSet(id);
    setSets(current => current.filter(s => s.id !== id));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    sets,
    loading,
    status,
    error,
    createFromFile,
    createFromText,
    updateSet,
    removeSet,
    clearError,
  };
}
