import { useEffect, useState } from 'react';
import { Check, FileText, HelpCircle, ListChecks, Loader2, Minus, Plus, Sparkles, X } from 'lucide-react';
import type { QuestionType, QuizOptions } from '../../types';

interface QuizCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: QuizOptions;
  onOptionsChange: (options: QuizOptions) => void;
  onGenerate: (options: QuizOptions) => Promise<void>;
  isGenerating: boolean;
  hasExistingQuiz: boolean;
}

const PRESET_COUNTS = [3, 5, 10, 15, 20];

export default function QuizCustomizeModal({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  onGenerate,
  isGenerating,
  hasExistingQuiz,
}: QuizCustomizeModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(
    options.types.length > 0 ? options.types : ['mcq'],
  );
  const [count, setCount] = useState<number>(options.count || 5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTypes(options.types.length > 0 ? options.types : ['mcq']);
      setCount(options.count || 5);
      setError(null);
    }
  }, [isOpen, options]);

  if (!isOpen) return null;

  const toggleType = (type: QuestionType) => {
    setError(null);
    let next: QuestionType[];
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) {
        setError('Select at least one question type for your quiz.');
        return;
      }
      next = selectedTypes.filter(t => t !== type);
    } else {
      next = [...selectedTypes, type];
    }
    setSelectedTypes(next);
    onOptionsChange({ types: next, count });
  };

  const updateCount = (newCount: number) => {
    const clamped = Math.max(1, Math.min(20, newCount));
    setCount(clamped);
    onOptionsChange({ types: selectedTypes, count: clamped });
  };

  const handleStart = async () => {
    if (selectedTypes.length === 0) {
      setError('Please select at least one question type.');
      return;
    }
    const currentOptions: QuizOptions = { types: selectedTypes, count };
    onOptionsChange(currentOptions);
    await onGenerate(currentOptions);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!isGenerating && hasExistingQuiz) onClose();
        }}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Container */}
      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)] p-6 text-[var(--ink)] shadow-xl transition-all sm:max-h-[calc(100dvh-3rem)] sm:p-8 dark:bg-[var(--paper-2)]">
        {/* Close Button if user can dismiss */}
        {hasExistingQuiz && !isGenerating && (
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
          >
            <X size={18} />
          </button>
        )}

        {/* Masthead */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--accent)]/10 px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
            <Sparkles size={11} />
            Quiz Setup
          </span>
        </div>

        <h2 id="quiz-modal-title" className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
          Customize Your Quiz
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Choose question types and length. You can combine all three or focus on just one.
        </p>

        {/* Error message */}
        {error && (
          <div className="mt-3 rounded-[4px] border border-[var(--pink)] bg-[var(--pink-wash)] px-3 py-2 text-xs text-[var(--ink)]">
            {error}
          </div>
        )}

        {/* Question Type Selection */}
        <div className="mt-6">
          <label className="block font-mono text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">
            Question Types
          </label>

          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {/* Multiple Choice */}
            <button
              type="button"
              onClick={() => toggleType('mcq')}
              className={`flex flex-col justify-between rounded-[6px] border p-3.5 text-left transition-all ${
                selectedTypes.includes('mcq')
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]'
                  : 'border-[var(--rule)] bg-[var(--paper)]/50 hover:border-[var(--ink-3)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <ListChecks
                  size={18}
                  className={selectedTypes.includes('mcq') ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'}
                />
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${
                    selectedTypes.includes('mcq')
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--rule)] bg-[var(--paper-2)] dark:bg-[var(--paper)]'
                  }`}
                >
                  {selectedTypes.includes('mcq') && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
              <div className="mt-3">
                <p className="font-bold text-xs text-[var(--ink)]">Multiple Choice</p>
                <p className="mt-0.5 text-2xs text-[var(--ink-3)]">4 options, 1 answer</p>
              </div>
            </button>

            {/* True / False */}
            <button
              type="button"
              onClick={() => toggleType('true_false')}
              className={`flex flex-col justify-between rounded-[6px] border p-3.5 text-left transition-all ${
                selectedTypes.includes('true_false')
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]'
                  : 'border-[var(--rule)] bg-[var(--paper)]/50 hover:border-[var(--ink-3)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <HelpCircle
                  size={18}
                  className={selectedTypes.includes('true_false') ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'}
                />
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${
                    selectedTypes.includes('true_false')
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--rule)] bg-[var(--paper-2)] dark:bg-[var(--paper)]'
                  }`}
                >
                  {selectedTypes.includes('true_false') && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
              <div className="mt-3">
                <p className="font-bold text-xs text-[var(--ink)]">True / False</p>
                <p className="mt-0.5 text-2xs text-[var(--ink-3)]">Binary validation</p>
              </div>
            </button>

            {/* Essay / Open-ended */}
            <button
              type="button"
              onClick={() => toggleType('essay')}
              className={`flex flex-col justify-between rounded-[6px] border p-3.5 text-left transition-all ${
                selectedTypes.includes('essay')
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]'
                  : 'border-[var(--rule)] bg-[var(--paper)]/50 hover:border-[var(--ink-3)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileText
                  size={18}
                  className={selectedTypes.includes('essay') ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'}
                />
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${
                    selectedTypes.includes('essay')
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--rule)] bg-[var(--paper-2)] dark:bg-[var(--paper)]'
                  }`}
                >
                  {selectedTypes.includes('essay') && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
              <div className="mt-3">
                <p className="font-bold text-xs text-[var(--ink)]">Essay / Open</p>
                <p className="mt-0.5 text-2xs text-[var(--ink-3)]">Written explanation</p>
              </div>
            </button>
          </div>
        </div>

        {/* Number of Questions */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label className="block font-mono text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">
              Number of Questions
            </label>
            <span className="font-mono text-xs font-bold text-[var(--accent)]">
              {count} {count === 1 ? 'question' : 'questions'}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            {/* Quick preset chips */}
            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
              {PRESET_COUNTS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateCount(preset)}
                  className={`rounded-[4px] border px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
                    count === preset
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--rule)] bg-[var(--paper)]/50 text-[var(--ink-2)] hover:border-[var(--ink)]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Stepper +/- */}
            <div className="flex items-center gap-1 rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] p-0.5">
              <button
                type="button"
                onClick={() => updateCount(count - 1)}
                disabled={count <= 1}
                aria-label="Decrease question count"
                className="flex h-9 w-9 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-black/5 disabled:opacity-30 sm:h-7 sm:w-7"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center font-mono text-xs font-bold">{count}</span>
              <button
                type="button"
                onClick={() => updateCount(count + 1)}
                disabled={count >= 20}
                aria-label="Increase question count"
                className="flex h-9 w-9 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-black/5 disabled:opacity-30 sm:h-7 sm:w-7"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-[var(--rule)]">
          {hasExistingQuiz && !isGenerating && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-4 py-2 font-mono text-2xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            disabled={isGenerating || selectedTypes.length === 0}
            onClick={handleStart}
            className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent)] px-5 py-2.5 font-mono text-2xs font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[var(--accent-strong)] active:scale-[0.98] disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Generating Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Generate Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
