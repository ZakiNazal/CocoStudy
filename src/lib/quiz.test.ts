import { describe, expect, it } from 'vitest';
import {
  UNANSWERED,
  answerState,
  isCorrect,
  scoreInk,
  scoreQuiz,
  scoreVerdict,
  unansweredCount,
} from './quiz';
import type { QuizQuestion } from '../types';

function q(id: string, correctAnswerIndex: number): QuizQuestion {
  return { id, question: id, options: ['a', 'b', 'c', 'd'], correctAnswerIndex, explanation: '' };
}

const QUIZ = [q('1', 0), q('2', 1), q('3', 2)];

describe('scoreQuiz', () => {
  it('counts only exact matches', () => {
    expect(scoreQuiz(QUIZ, [0, 1, 2])).toBe(3);
    expect(scoreQuiz(QUIZ, [0, 0, 0])).toBe(1);
    expect(scoreQuiz(QUIZ, [3, 3, 3])).toBe(0);
  });

  it('treats missing and unanswered entries as wrong, not as index 0', () => {
    expect(scoreQuiz(QUIZ, [])).toBe(0);
    expect(scoreQuiz(QUIZ, [UNANSWERED, UNANSWERED, UNANSWERED])).toBe(0);
    // Question 1's correct answer is index 0, so an unanswered question must
    // not score just because -1 and 0 are both falsy-adjacent.
    expect(scoreQuiz([q('1', 0)], [UNANSWERED])).toBe(0);
  });
});

describe('unansweredCount', () => {
  it('counts the gaps', () => {
    expect(unansweredCount([0, UNANSWERED, 2, UNANSWERED])).toBe(2);
    expect(unansweredCount([0, 1, 2])).toBe(0);
  });
});

describe('answerState', () => {
  it('hides right and wrong until the quiz is graded', () => {
    expect(answerState(QUIZ[0], 0, false)).toBe('answered');
    expect(answerState(QUIZ[0], 3, false)).toBe('answered');
    expect(answerState(QUIZ[0], UNANSWERED, false)).toBe('unanswered');
  });

  it('reveals right and wrong once graded', () => {
    expect(answerState(QUIZ[0], 0, true)).toBe('correct');
    expect(answerState(QUIZ[0], 3, true)).toBe('wrong');
    expect(answerState(QUIZ[0], UNANSWERED, true)).toBe('unanswered');
  });
});

describe('scoreInk', () => {
  it('maps a score onto the recall scale rather than always reading success', () => {
    expect(scoreInk(10, 10)).toBe('green');
    expect(scoreInk(8, 10)).toBe('green');
    expect(scoreInk(7, 10)).toBe('yellow');
    expect(scoreInk(5, 10)).toBe('yellow');
    expect(scoreInk(4, 10)).toBe('pink');
    expect(scoreInk(0, 10)).toBe('pink');
  });

  it('has no ink for an empty quiz', () => {
    expect(scoreInk(0, 0)).toBe('none');
  });
});

describe('scoreVerdict', () => {
  it('does not congratulate a failing score', () => {
    expect(scoreVerdict(1, 10)).toMatch(/another pass/i);
    expect(scoreVerdict(10, 10)).toMatch(/every one right/i);
  });
});

describe('isCorrect', () => {
  it('is false for the unanswered sentinel', () => {
    expect(isCorrect(q('x', 0), UNANSWERED)).toBe(false);
  });
});
