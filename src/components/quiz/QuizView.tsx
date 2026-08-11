import { useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { RotateCcw } from 'lucide-react';
import { gsap, DUR, EASE, STAGGER, shouldAnimate } from '../../lib/motion';
import {
  UNANSWERED,
  answerState,
  scoreInk,
  scoreQuiz,
  scoreVerdict,
  unansweredCount,
} from '../../lib/quiz';
import { inkVar } from '../../lib/mastery';
import TickStrip, { type TickTone } from '../ui/TickStrip';
import type { QuizAttempt, QuizQuestion } from '../../types';

export interface QuizRun {
  answers: number[];
  graded: boolean;
}

export function emptyRun(quiz: QuizQuestion[]): QuizRun {
  return { answers: quiz.map(() => UNANSWERED), graded: false };
}

interface QuizViewProps {
  quiz: QuizQuestion[];
  attempts: QuizAttempt[];
  /**
   * Owned by the study shell, not by this component: switching to the notes
   * for a moment must not throw away a part-finished quiz.
   */
  run: QuizRun;
  onRunChange: (run: QuizRun) => void;
  onSubmit: (attempt: QuizAttempt) => void;
}

const LETTERS = 'ABCDEFGH';

export default function QuizView({
  quiz,
  attempts,
  run,
  onRunChange,
  onSubmit,
}: QuizViewProps) {
  const { answers, graded } = run;
  const scroller = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLDivElement>(null);

  const quizKey = quiz.map(q => q.id).join('|');
  const setAnswers = (next: number[]) => onRunChange({ answers: next, graded });

  const score = useMemo(() => scoreQuiz(quiz, answers), [quiz, answers]);
  const left = unansweredCount(answers);
  const ink = scoreInk(score, quiz.length);

  const ticks: TickTone[] = quiz.map((question, i) => {
    const state = answerState(question, answers[i], graded);
    if (state === 'unanswered') return 'empty';
    if (state === 'answered') return 'ink';
    return state === 'correct' ? 'green' : 'pink';
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

  if (quiz.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="display text-xl">No quiz for this set.</p>
          <p className="mt-2 text-[var(--ink-2)]">
            Quizzes are written when a set is generated. Regenerate this set to get one.
          </p>
        </div>
      </div>
    );
  }

  const submit = () => {
    onRunChange({ answers, graded: true });
    onSubmit({
      id: `attempt-${Date.now()}`,
      takenAt: new Date().toISOString(),
      answers,
      score,
    });
    scroller.current?.scrollTo({ top: 0, behavior: shouldAnimate() ? 'smooth' : 'auto' });
  };

  const retake = () => {
    onRunChange(emptyRun(quiz));
    scroller.current?.scrollTo({ top: 0, behavior: shouldAnimate() ? 'smooth' : 'auto' });
  };

  const best = attempts.reduce((max, a) => Math.max(max, a.score), 0);

  return (
    <div className="flex h-full flex-col">
      {/* Status rail — always visible, so progress never depends on a floating control. */}
      <div className="shrink-0 border-b border-[var(--rule)] bg-[var(--paper-2)] px-6 py-3 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-baseline justify-between gap-4">
            <span className="label">{graded ? 'Marked' : 'Quiz'}</span>
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

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-2xl">
          {graded && (
            <div
              ref={result}
              className="mb-10 border border-[var(--rule)] bg-[var(--paper-2)] p-6"
              style={{ borderLeftWidth: 3, borderLeftColor: inkVar(ink) }}
            >
              <span className="label">Result</span>
              <p className="display mt-2 text-3xl">
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
              <button
                onClick={retake}
                className="mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[var(--ink)] px-4 py-2 font-mono text-2xs font-semibold uppercase tracking-[0.1em] text-[var(--paper)] transition-transform duration-150 active:scale-[0.97]"
              >
                <RotateCcw size={13} />
                Retake
              </button>
            </div>
          )}

          <ol className="space-y-12">
            {quiz.map((question, qi) => {
              const state = answerState(question, answers[qi], graded);

              return (
                <li key={question.id} data-question>
                  <div className="flex gap-4">
                    {/* Numerals earn their place here: quiz order is real order. */}
                    <span
                      className="numeral shrink-0 pt-1 text-sm"
                      style={{
                        color: state === 'unanswered' ? 'var(--ink-3)' : 'var(--ink)',
                      }}
                    >
                      {String(qi + 1).padStart(2, '0')}
                    </span>

                    <div className="min-w-0 flex-1">
                      <fieldset>
                        <legend className="text-base font-semibold leading-snug text-[var(--ink)]">
                          {question.question}
                        </legend>

                        <div className="mt-4 space-y-2">
                          {question.options.map((option, oi) => {
                            const picked = answers[qi] === oi;
                            const correct = oi === question.correctAnswerIndex;

                            // Before marking: only "picked" reads differently.
                            // After marking: the right answer is always shown,
                            // and a wrong pick is marked in learning pink.
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
                                  className="numeral mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] text-2xs font-bold transition-colors duration-150"
                                  style={{ background: chipBg, color: chipText }}
                                >
                                  {LETTERS[oi]}
                                </span>
                                <span className="flex-1 leading-snug">{option}</span>
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      {graded && question.explanation && (
                        <div
                          className="mt-4 border-l-2 pl-4"
                          style={{
                            borderLeftColor:
                              state === 'correct' ? 'var(--green)' : 'var(--pink)',
                          }}
                        >
                          <span className="label">
                            {state === 'correct' ? 'Why that is right' : 'Why you missed it'}
                          </span>
                          <p className="mt-1 text-sm leading-relaxed text-[var(--ink-2)]">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="h-8" />
        </div>
      </div>

      {/* Solid footer, not a floating ghost. It states what is missing. */}
      {!graded && (
        <div className="shrink-0 border-t border-[var(--rule)] bg-[var(--paper-2)] px-6 py-4 sm:px-10">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="min-w-0 text-xs text-[var(--ink-2)]">
              {left === 0
                ? 'Every question answered.'
                : `${left} ${left === 1 ? 'question' : 'questions'} still to answer.`}
            </p>
            <button
              onClick={submit}
              disabled={left > 0}
              className="shrink-0 rounded-[4px] bg-[var(--ink)] px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--paper)] transition-[background-color,transform] duration-150 hover:bg-[var(--ink-2)] active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-[var(--ink-3)] disabled:active:scale-100"
            >
              Check answers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
