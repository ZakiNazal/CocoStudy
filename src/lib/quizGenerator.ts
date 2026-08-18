import { generateCustomQuiz, MissingApiKeyError } from '../services/ai';
import type { QuestionType, QuizOptions, QuizQuestion } from '../types';

/**
 * Fallback questions dataset for study concepts when offline or before API key is configured.
 */
const SAMPLE_MCQS: Omit<QuizQuestion, 'id'>[] = [
  {
    type: 'mcq',
    question: 'Why does re-reading a chapter feel more effective than it actually is?',
    options: [
      'It builds recognition and fluency, which feel like knowledge but require no retrieval',
      'It takes longer than active recall, so it must be doing more work',
      'It activates long-term memory directly, bypassing working memory',
      'It only works when the material is already well understood',
    ],
    correctAnswerIndex: 0,
    explanation:
      'Familiarity is not memory. Re-reading produces the fluency illusion — the material looks familiar, so preparation feels complete when nothing has been retrieved.',
  },
  {
    type: 'mcq',
    question: "What happens to a card's ease factor after a lapse?",
    options: [
      'It rises, so the card returns sooner',
      'It falls, so future intervals grow more slowly',
      'It resets to the default for all cards in the set',
      'It is unaffected; only the interval changes',
    ],
    correctAnswerIndex: 1,
    explanation:
      'A lapse is evidence the card is harder for this learner than assumed. Lowering ease makes its intervals grow more slowly from then on.',
  },
  {
    type: 'mcq',
    question: 'A review feels completely effortless. What does that indicate?',
    options: [
      'The card has been mastered and should be deleted',
      'The material was never encoded properly',
      'The interval was too short and should grow faster',
      'The ease factor is too high and should be reduced',
    ],
    correctAnswerIndex: 2,
    explanation:
      'Effortless recall means the memory had not begun to fade, so the retrieval did little work. Grading it Easy raises the ease factor and pushes the next review further out.',
  },
  {
    type: 'mcq',
    question: 'Which best describes a desirable difficulty?',
    options: [
      'Any task hard enough that you fail it more often than not',
      'Challenge that slows practice but improves long-term retention',
      'Material presented in a deliberately confusing order',
      'Studying while tired, so recall must work harder',
    ],
    correctAnswerIndex: 1,
    explanation:
      "Bjork's finding is that conditions slowing acquisition often improve retention. The difficulty must still allow success most of the time.",
  },
  {
    type: 'mcq',
    question: 'A student has 400 overdue cards and falls further behind weekly. The most likely cause is:',
    options: [
      'Their ease factors are set too low across the board',
      'They are grading themselves too harshly on each review',
      'They are adding new material faster than reviews can be sustained',
      'The intervals are growing too quickly for the material',
    ],
    correctAnswerIndex: 2,
    explanation:
      'A growing backlog is almost always an intake problem, not a scheduling one. Stop adding new cards until the backlog clears, then cap daily additions to what the review load allows.',
  },
];

const SAMPLE_TRUE_FALSE: Omit<QuizQuestion, 'id'>[] = [
  {
    type: 'true_false',
    question: 'Active recall strengthens neural memory pathways significantly more than passive re-reading.',
    options: ['True', 'False'],
    correctAnswerIndex: 0,
    explanation: 'True. The act of retrieving information from memory without prompts builds long-term retention far better than passive review.',
  },
  {
    type: 'true_false',
    question: 'A card’s review interval should increase immediately after a lapse occurs.',
    options: ['True', 'False'],
    correctAnswerIndex: 1,
    explanation: 'False. A lapse resets the interval back to day 1 and lowers the ease factor so it is reviewed more frequently.',
  },
  {
    type: 'true_false',
    question: 'The fluency illusion occurs when ease of reading is mistaken for strength of memory.',
    options: ['True', 'False'],
    correctAnswerIndex: 0,
    explanation: 'True. High familiarity creates the false perception of mastery even when retrieval strength is low.',
  },
  {
    type: 'true_false',
    question: 'Bundling multiple distinct facts onto a single flashcard is recommended for efficiency.',
    options: ['True', 'False'],
    correctAnswerIndex: 1,
    explanation: 'False. Multi-fact cards fail as a single unit and prevent identifying which specific concept was forgotten. One fact per card is optimal.',
  },
  {
    type: 'true_false',
    question: 'Forgetting between study sessions is the mechanism that enables memories to be rebuilt stronger.',
    options: ['True', 'False'],
    correctAnswerIndex: 0,
    explanation: 'True. As memory decays slightly, retrieving it requires cognitive effort, which reconstructs and consolidates it more durably.',
  },
];

const SAMPLE_ESSAYS: Omit<QuizQuestion, 'id'>[] = [
  {
    type: 'essay',
    question: 'Explain the difference between recognition and recall, and describe why relying on recognition leads to poor test performance.',
    options: [],
    correctAnswerIndex: 0,
    sampleAnswer:
      'Recognition is identifying information when cues are present, whereas recall is producing knowledge unaided from memory. Relying on recognition causes the fluency illusion, where students think they know material because it looks familiar, but cannot retrieve it under exam conditions without cues.',
    keyPoints: [
      'Recognition relies on external cues while recall is unaided retrieval',
      'The fluency illusion gives false confidence during passive re-reading',
      'Only active retrieval strengthens durable long-term retention',
    ],
    explanation:
      'Active recall tests the actual retrieval pathway needed for real-world application, while recognition only tests familiarity.',
  },
  {
    type: 'essay',
    question: 'Define the concept of "desirable difficulty" and explain how a spaced repetition scheduler applies it.',
    options: [],
    correctAnswerIndex: 0,
    sampleAnswer:
      'Desirable difficulty is a level of cognitive challenge that slows initial learning but substantially boosts long-term retention. A spaced repetition scheduler applies this by waiting until a memory is just about to be forgotten before prompting review, maximizing the effort and value of each retrieval.',
    keyPoints: [
      'Challenge that requires effort while maintaining high success rates',
      'Scheduling reviews right before memory fades',
      'Effortful retrieval produces stronger synaptic consolidation',
    ],
    explanation:
      'If reviews feel effortless, the interval is too short. If reviews frequently fail, the difficulty is too high.',
  },
  {
    type: 'essay',
    question: 'A learner has accumulated 300 overdue flashcards and cannot keep up with daily reviews. Diagnose the root cause and provide a sustainable solution.',
    options: [],
    correctAnswerIndex: 0,
    sampleAnswer:
      'The root cause is almost always card intake outrunning review capacity. The solution is to pause adding any new cards immediately, dedicate daily sessions to chipping away at the backlog, and once cleared, set a sustainable daily limit on new cards.',
    keyPoints: [
      'Card creation outpaced daily review capacity',
      'Pause adding new material until the backlog is zero',
      'Enforce daily new-card caps based on available study time',
    ],
    explanation:
      'A backlog is an intake management issue. Sustainable habits beat high-volume ambition.',
  },
];

export async function createQuiz(
  summary: string,
  options: QuizOptions,
): Promise<QuizQuestion[]> {
  try {
    return await generateCustomQuiz(summary, options);
  } catch (err) {
    if (err instanceof MissingApiKeyError || (err instanceof Error && err.name === 'MissingApiKeyError')) {
      return generateFallbackQuiz(options);
    }
    try {
      return generateFallbackQuiz(options);
    } catch {
      throw err;
    }
  }
}

export function generateFallbackQuiz(options: QuizOptions): QuizQuestion[] {
  const types = options.types.length > 0 ? options.types : (['mcq'] as QuestionType[]);
  const targetCount = Math.max(1, Math.min(20, options.count || 5));
  const pool: Omit<QuizQuestion, 'id'>[] = [];

  const typePools: Record<QuestionType, Omit<QuizQuestion, 'id'>[]> = {
    mcq: SAMPLE_MCQS,
    true_false: SAMPLE_TRUE_FALSE,
    essay: SAMPLE_ESSAYS,
  };

  let currentTypeIdx = 0;
  const usedIndices: Record<QuestionType, Set<number>> = {
    mcq: new Set(),
    true_false: new Set(),
    essay: new Set(),
  };

  while (pool.length < targetCount) {
    const type = types[currentTypeIdx % types.length];
    const source = typePools[type] || SAMPLE_MCQS;
    const used = usedIndices[type];

    let pickIdx = 0;
    while (used.size < source.length && used.has(pickIdx)) {
      pickIdx = (pickIdx + 1) % source.length;
    }
    if (used.size >= source.length) {
      pickIdx = pool.length % source.length;
    }
    used.add(pickIdx);

    pool.push({ ...source[pickIdx] });
    currentTypeIdx++;
  }

  const now = Date.now();
  return pool.slice(0, targetCount).map((q, i) => ({
    ...q,
    id: `quiz-gen-${i}-${now}`,
  }));
}
