import type { Ink } from './mastery';
import type { QuizQuestion } from '../types';

export type AnswerState = 'unanswered' | 'answered' | 'correct' | 'wrong';

/** -1 means the question has not been answered yet. */
export const UNANSWERED = -1;

export function isCorrect(question: QuizQuestion, answer: number): boolean {
  return answer === question.correctAnswerIndex;
}

export function scoreQuiz(quiz: QuizQuestion[], answers: number[]): number {
  return quiz.reduce((total, q, i) => total + (isCorrect(q, answers[i] ?? UNANSWERED) ? 1 : 0), 0);
}

export function unansweredCount(answers: number[]): number {
  return answers.filter(a => a === UNANSWERED).length;
}

/**
 * State of one question, for the tick strip and the option styling.
 * Before grading a question is only answered or not — right and wrong are
 * not revealed until the whole quiz is checked.
 */
export function answerState(
  question: QuizQuestion,
  answer: number,
  graded: boolean,
): AnswerState {
  if (answer === UNANSWERED) return 'unanswered';
  if (!graded) return 'answered';
  return isCorrect(question, answer) ? 'correct' : 'wrong';
}

/**
 * Ink for a score, on the same scale the highlighter uses: green is mastered,
 * yellow is still under review, pink is learning. A result is recall data, so
 * it takes recall colour rather than a fixed "success" green.
 */
export function scoreInk(correct: number, total: number): Ink {
  if (total === 0) return 'none';
  const ratio = correct / total;
  if (ratio >= 0.8) return 'green';
  if (ratio >= 0.5) return 'yellow';
  return 'pink';
}

/** Plain-language verdict. Never congratulatory about a bad score. */
export function scoreVerdict(correct: number, total: number): string {
  if (total === 0) return 'No questions in this set.';
  const ratio = correct / total;
  if (ratio === 1) return 'Every one right.';
  if (ratio >= 0.8) return 'Solid. Review the misses below.';
  if (ratio >= 0.5) return 'Half-learned. The misses are where the work is.';
  return 'This one needs another pass. Read the explanations, then retake it.';
}
