import { useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { Check, Edit3, HelpCircle, ListChecks, RotateCcw, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { gsap, DUR, EASE, STAGGER, shouldAnimate } from '../../lib/motion';
import {
  UNANSWERED,
  isAnswered,
  isCorrect,
  scoreInk,
  scoreVerdict,
  unansweredCount,
} from '../../lib/quiz';
import { inkVar } from '../../lib/mastery';
import { createQuiz } from '../../lib/quizGenerator';
import TickStrip, { type TickTone } from '../ui/TickStrip';
import Banner from '../ui/Banner';
import QuizCustomizeModal from './QuizCustomizeModal';
import type { QuizAttempt, QuizOptions, QuizQuestion } from '../../types';

export interface QuizRun {
  answers: (number | string)[];
  graded: boolean;
  essayGrades?: Record<number, boolean>;
}

export function emptyRun(quiz: QuizQuestion[]): QuizRun {
  return {
    answers: quiz.map(q => (q.type === 'essay' ? '' : UNANSWERED)),
    graded: false,
    essayGrades: {},
  };
}

interface QuizViewProps {
  quiz: QuizQuestion[];
  attempts: QuizAttempt[];
  summary?: string;
  run: QuizRun;
  onRunChange: (run: QuizRun) => void;
  onSubmit: (attempt: QuizAttempt) => void;
  onUpdateQuiz?: (newQuiz: QuizQuestion[]) => void;
}

const LETTERS = 'ABCDEFGH';
const STORAGE_KEY = 'cocostudy_last_quiz_options';

export default function QuizView({
  quiz,
  attempts,
  summary = '',
  run,
  onRunChange,
  onSubmit,
  onUpdateQuiz,
}: QuizViewProps) {
  const { answers, graded, essayGrades = {} } = run;
  const scroller = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLDivElement>(null);

  // Load last selected options from localStorage or defaults
  const [options, setOptions] = useState<QuizOptions>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as QuizOptions;
        if (parsed.types && parsed.types.length > 0 && parsed.count) {
          return parsed;
        }
      }
    } catch {
      // ignore JSON error
    }
    return { types: ['mcq', 'true_false', 'essay'], count: 5 };
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Check if opened for the first time
  useEffect(() => {
    if (quiz.length === 0) {
      setIsCustomizeOpen(true);
    }
  }, [quiz.length]);

  const quizKey = quiz.map(q => q.id).join('|');

  const setAnswers = (next: (number | string)[]) =>
    onRunChange({ answers: next, graded, essayGrades });

  const setEssayGrade = (qIndex: number, pass: boolean) => {
    const nextGrades = { ...essayGrades, [qIndex]: pass };
    onRunChange({ answers, graded, essayGrades: nextGrades });
  };

  // Compute final effective score including essay self-grades
  const score = useMemo(() => {
    return quiz.reduce((total, q, i) => {
      if (q.type === 'essay') {
        // If graded and user marked pass/fail
        if (essayGrades[i] !== undefined) {
          return total + (essayGrades[i] ? 1 : 0);
        }
        return total + (isCorrect(q, answers[i] ?? '') ? 1 : 0);
      }
      return total + (isCorrect(q, answers[i] ?? UNANSWERED) ? 1 : 0);
    }, 0);
  }, [quiz, answers, essayGrades]);

  const left = unansweredCount(answers, quiz);
  const ink = scoreInk(score, quiz.length);

  const ticks: TickTone[] = quiz.map((question, i) => {
    const ans = answers[i] ?? (question.type === 'essay' ? '' : UNANSWERED);
    const answered = isAnswered(question, ans);

    if (!answered) return 'empty';
    if (!graded) return 'ink';

    if (question.type === 'essay') {
      if (essayGrades[i] !== undefined) {
        return essayGrades[i] ? 'green' : 'pink';
      }
      return ans ? 'green' : 'pink';
    }

    return isCorrect(question, ans) ? 'green' : 'pink';
  });

  useGSAP(
    () => {
      if (!graded || !shouldAnimate()) return;
      gsap.from(result.current, { opacity: 0, y: -8, duration: DUR.base, ease: EASE.out });
    },
    { dependencies: [graded] },
  );

  useGSAP(
    () => {
      if (!shouldAnimate()) return;
      gsap.from('[data-question]', {
        opacity: 0,
        y: 12,
        duration: DUR.base,
        ease: EASE.out,
        stagger: STAGGER.micro,
      });
    },
    { scope: scroller, dependencies: [quizKey] },
  );

  const handleOptionsChange = (newOpts: QuizOptions) => {
    setOptions(newOpts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOpts));
    } catch {
      // ignore
    }
  };

  const handleGenerate = async (opts: QuizOptions) => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const generated = await createQuiz(summary, opts);
      if (generated && generated.length > 0) {
        if (onUpdateQuiz) {
          onUpdateQuiz(generated);
        }
        onRunChange(emptyRun(generated));
        setIsCustomizeOpen(false);
        scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setGenerationError('Unable to generate quiz. Please try again.');
      }
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : 'Quiz generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const submit = () => {
    onRunChange({ answers, graded: true, essayGrades });
    onSubmit({
      id: `attempt-${Date.now()}`,
      takenAt: new Date().toISOString(),
      answers,
      score,
    });
    scroller.current?.scrollTo({ top: 0, behavior: shouldAnimate() ? 'smooth' : 'auto' });
  };

  const retakeSame = () => {
    onRunChange(emptyRun(quiz));
    scroller.current?.scrollTo({ top: 0, behavior: shouldAnimate() ? 'smooth' : 'auto' });
  };

  const handleTryAgainWithModal = () => {
    // Opens the customization popup with the exact options they picked the first time!
    setIsCustomizeOpen(true);
  };

  const best = attempts.reduce((max, a) => Math.max(max, a.score), 0);

  if (quiz.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Sparkles className="mx-auto text-[var(--accent)]" size={28} />
          <p className="display mt-3 text-xl font-bold">No quiz generated yet</p>
          <p className="mt-2 text-sm text-[var(--ink-2)]">
            Configure your question types and length to generate a personalized study quiz.
          </p>
          <button
            onClick={() => setIsCustomizeOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent)] px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-[var(--accent-strong)]"
          >
            <Sparkles size={14} />
            Customize & Generate
          </button>
        </div>

        <QuizCustomizeModal
          isOpen={isCustomizeOpen}
          onClose={() => setIsCustomizeOpen(false)}
          options={options}
          onOptionsChange={handleOptionsChange}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          hasExistingQuiz={quiz.length > 0}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Customize Modal */}
      <QuizCustomizeModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        options={options}
        onOptionsChange={handleOptionsChange}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        hasExistingQuiz={quiz.length > 0}
      />

      {/* Status rail */}
      <div className="shrink-0 border-b border-[var(--rule)] bg-[var(--paper-2)] px-4 py-3 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="label">{graded ? 'Marked' : 'Quiz'}</span>
              <button
                onClick={() => setIsCustomizeOpen(true)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] px-3 py-1 font-mono text-2xs uppercase tracking-[0.08em] text-[var(--ink-2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:min-h-0 sm:px-2.5 dark:bg-[var(--paper)]"
              >
                <SlidersHorizontal size={11} />
                <span>Customize</span>
              </button>
            </div>

            <span className="numeral text-2xs text-[var(--ink-3)]">
              {graded
                ? `${score} of ${quiz.length} correct`
                : `${quiz.length - left} of ${quiz.length} answered`}
            </span>
          </div>

          <TickStrip
            className="mt-2"
            ticks={ticks}
            summary={
              graded
                ? `${score} of ${quiz.length} questions correct.`
                : `${quiz.length - left} of ${quiz.length} questions answered.`
            }
          />
        </div>
      </div>

      <div ref={scroller} className="pb-safe [--pb-base:2rem] min-h-0 flex-1 overflow-y-auto px-4 pt-8 sm:px-10">
        <div className="mx-auto max-w-2xl">
          {generationError && (
            <div className="mb-6">
              <Banner tone="error" onDismiss={() => setGenerationError(null)}>
                {generationError}
              </Banner>
            </div>
          )}
          {graded && (
            <div
              ref={result}
              className="mb-10 rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)] p-6"
              style={{ borderLeftWidth: 4, borderLeftColor: inkVar(ink) }}
            >
              <div className="flex items-center justify-between">
                <span className="label">Results</span>
                <span className="numeral text-2xs font-semibold text-[var(--ink-3)]">
                  {Math.round((score / quiz.length) * 100)}% Accuracy
                </span>
              </div>

              <p className="display mt-2 text-3xl font-extrabold text-[var(--ink)]">
                <span className="numeral">{score}</span>
                <span className="text-[var(--ink-3)]">/{quiz.length}</span>
              </p>
              <p className="mt-2 text-sm text-[var(--ink-2)]">
                {scoreVerdict(score, quiz.length)}
              </p>

              {attempts.length > 1 && (
                <p className="numeral mt-3 text-2xs text-[var(--ink-3)]">
                  Best of {attempts.length} attempts: {best}/{quiz.length}
                </p>
              )}

              {/* Action Buttons: Try Again (Pop-up with same settings) and Retake same */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleTryAgainWithModal}
                  className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent)] px-4 py-2 font-mono text-2xs font-semibold uppercase tracking-[0.1em] text-white transition-all hover:bg-[var(--accent-strong)] active:scale-[0.98]"
                >
                  <Sparkles size={13} />
                  Try Again (New Questions)
                </button>

                <button
                  onClick={retakeSame}
                  className="inline-flex items-center gap-2 rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-4 py-2 font-mono text-2xs font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition-colors hover:border-[var(--ink)] active:scale-[0.98]"
                >
                  <RotateCcw size={13} />
                  Retake Same
                </button>
              </div>
            </div>
          )}

          <ol className="space-y-12">
            {quiz.map((question, qi) => {
              const currentAnswer = answers[qi] ?? (question.type === 'essay' ? '' : UNANSWERED);
              const qType = question.type || 'mcq';

              return (
                <li key={question.id} data-question>
                  <div className="flex gap-4">
                    {/* Question Number */}
                    <span
                      className="numeral shrink-0 pt-1 font-mono text-sm font-bold"
                      style={{
                        color: !isAnswered(question, currentAnswer)
                          ? 'var(--ink-3)'
                          : 'var(--ink)',
                      }}
                    >
                      {String(qi + 1).padStart(2, '0')}
                    </span>

                    <div className="min-w-0 flex-1">
                      {/* Badge for Type */}
                      <div className="mb-2 flex items-center gap-2">
                        {qType === 'mcq' && (
                          <span className="inline-flex items-center gap-1 rounded-[3px] bg-[var(--paper-3)] px-1.5 py-0.5 font-mono text-2xs text-[var(--ink-3)]">
                            <ListChecks size={10} /> Multiple Choice
                          </span>
                        )}
                        {qType === 'true_false' && (
                          <span className="inline-flex items-center gap-1 rounded-[3px] bg-[var(--paper-3)] px-1.5 py-0.5 font-mono text-2xs text-[var(--ink-3)]">
                            <HelpCircle size={10} /> True / False
                          </span>
                        )}
                        {qType === 'essay' && (
                          <span className="inline-flex items-center gap-1 rounded-[3px] bg-[var(--accent)]/10 px-1.5 py-0.5 font-mono text-2xs font-semibold text-[var(--accent)]">
                            <Edit3 size={10} /> Essay / Short Answer
                          </span>
                        )}
                      </div>

                      <fieldset>
                        <legend className="text-base font-semibold leading-snug text-[var(--ink)]">
                          {question.question}
                        </legend>

                        {/* --- RENDER 1: Multiple Choice Options --- */}
                        {qType === 'mcq' && (
                          <div className="mt-4 space-y-2">
                            {question.options.map((option, oi) => {
                              const picked = currentAnswer === oi;
                              const correct = oi === question.correctAnswerIndex;

                              let border = 'var(--rule)';
                              let wash: string | undefined;
                              let text = 'var(--ink-2)';
                              let chipBg = 'transparent';
                              let chipText = 'var(--ink-3)';

                              if (graded) {
                                if (correct) {
                                  border = 'var(--ink)';
                                  wash = 'var(--green-wash)';
                                  text = 'var(--ink)';
                                  chipBg = 'var(--ink)';
                                  chipText = 'var(--paper)';
                                } else if (picked) {
                                  border = 'var(--ink)';
                                  wash = 'var(--pink-wash)';
                                  text = 'var(--ink)';
                                  chipBg = 'var(--ink)';
                                  chipText = 'var(--paper)';
                                } else {
                                  text = 'var(--ink-3)';
                                }
                              } else if (picked) {
                                border = 'var(--ink)';
                                text = 'var(--ink)';
                                chipBg = 'var(--ink)';
                                chipText = 'var(--paper)';
                              }

                              return (
                                <button
                                  key={oi}
                                  type="button"
                                  role="radio"
                                  aria-checked={picked}
                                  disabled={graded}
                                  onClick={() => {
                                    const next = [...answers];
                                    next[qi] = oi;
                                    setAnswers(next);
                                  }}
                                  className={`flex w-full items-start gap-3 rounded-[4px] border px-4 py-3 text-left text-sm transition-[border-color,background-color,color] duration-150 ${
                                    graded ? 'cursor-default' : 'hover:border-[var(--ink-3)]'
                                  }`}
                                  style={{ borderColor: border, background: wash, color: text }}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="numeral flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border text-2xs font-semibold"
                                    style={{
                                      borderColor: border,
                                      background: chipBg,
                                      color: chipText,
                                    }}
                                  >
                                    {LETTERS[oi] ?? String(oi + 1)}
                                  </span>
                                  <span className="flex-1 leading-snug">{option}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* --- RENDER 2: True / False Buttons --- */}
                        {qType === 'true_false' && (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            {['True', 'False'].map((label, oi) => {
                              const picked = currentAnswer === oi;
                              const correct = oi === question.correctAnswerIndex;

                              let border = 'var(--rule)';
                              let wash: string | undefined;
                              let text = 'var(--ink-2)';

                              if (graded) {
                                if (correct) {
                                  border = 'var(--ink)';
                                  wash = 'var(--green-wash)';
                                  text = 'var(--ink)';
                                } else if (picked) {
                                  border = 'var(--ink)';
                                  wash = 'var(--pink-wash)';
                                  text = 'var(--ink)';
                                } else {
                                  text = 'var(--ink-3)';
                                }
                              } else if (picked) {
                                border = 'var(--accent)';
                                wash = 'color-mix(in srgb, var(--accent) 6%, transparent)';
                                text = 'var(--ink)';
                              }

                              return (
                                <button
                                  key={label}
                                  type="button"
                                  disabled={graded}
                                  onClick={() => {
                                    const next = [...answers];
                                    next[qi] = oi;
                                    setAnswers(next);
                                  }}
                                  className={`flex items-center justify-center gap-2 rounded-[4px] border py-3 px-4 font-mono text-sm font-bold transition-all ${
                                    graded ? 'cursor-default' : 'hover:border-[var(--ink-3)]'
                                  }`}
                                  style={{ borderColor: border, background: wash, color: text }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* --- RENDER 3: Essay / Short Answer --- */}
                        {qType === 'essay' && (
                          <div className="mt-4 space-y-3">
                            <textarea
                              rows={3}
                              disabled={graded}
                              value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                              onChange={e => {
                                const next = [...answers];
                                next[qi] = e.target.value;
                                setAnswers(next);
                              }}
                              placeholder="Type your explanation or response in your own words..."
                              className="w-full rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] p-3 text-sm leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--accent)] focus:outline-none disabled:bg-[var(--paper-3)]"
                            />

                            {/* When graded, show Sample Answer, Key Points and Self-Grading */}
                            {graded && (
                              <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--paper-3)]/60 p-4 space-y-3">
                                {question.sampleAnswer && (
                                  <div>
                                    <span className="font-mono text-2xs font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
                                      Model / Sample Answer
                                    </span>
                                    <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
                                      {question.sampleAnswer}
                                    </p>
                                  </div>
                                )}

                                {question.keyPoints && question.keyPoints.length > 0 && (
                                  <div>
                                    <span className="font-mono text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">
                                      Key Points to Check
                                    </span>
                                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[var(--ink-2)]">
                                      {question.keyPoints.map((kp, kpi) => (
                                        <li key={kpi}>{kp}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Self-Evaluation Check */}
                                <div className="pt-2 border-t border-[var(--rule)] flex items-center justify-between">
                                  <span className="font-mono text-2xs text-[var(--ink-3)]">
                                    Self-Evaluation:
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEssayGrade(qi, true)}
                                      className={`inline-flex items-center gap-1 rounded-[3px] border px-2.5 py-1 font-mono text-2xs font-semibold transition-colors ${
                                        essayGrades[qi] === true
                                          ? 'border-[var(--green)] bg-[var(--green-wash)] text-[var(--ink)]'
                                          : 'border-[var(--rule)] bg-[var(--paper-2)] dark:bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--green)]'
                                      }`}
                                    >
                                      <Check size={12} /> Got It
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEssayGrade(qi, false)}
                                      className={`inline-flex items-center gap-1 rounded-[3px] border px-2.5 py-1 font-mono text-2xs font-semibold transition-colors ${
                                        essayGrades[qi] === false
                                          ? 'border-[var(--pink)] bg-[var(--pink-wash)] text-[var(--ink)]'
                                          : 'border-[var(--rule)] bg-[var(--paper-2)] dark:bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--pink)]'
                                      }`}
                                    >
                                      <X size={12} /> Review
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </fieldset>

                      {/* Explanation displayed after grading */}
                      {graded && question.explanation && (
                        <p className="mt-3 text-xs leading-relaxed text-[var(--ink-2)]">
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Submit button when not graded. Stacked on a phone: the count reads
              above the button rather than squeezing it to half a thumb. */}
          {!graded && (
            <div className="mt-12 flex flex-col gap-3 border-t border-[var(--rule)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-2xs text-[var(--ink-3)]">
                {left > 0 ? `${left} unanswered remaining` : 'All questions answered'}
              </span>

              <button
                onClick={submit}
                disabled={left === quiz.length}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[var(--accent)] px-6 font-mono text-2xs font-semibold uppercase tracking-[0.1em] text-white transition-all hover:bg-[var(--accent-strong)] active:scale-[0.98] disabled:opacity-50 sm:h-10 sm:w-auto"
              >
                Submit Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
