import { ContentType, type Flashcard, type StudySet, type SrsState } from '../types';
import { EASE_DEFAULT } from './srs';

const DAY = 86_400_000;

/**
 * The demo set teaches the system the app implements. Its cards carry a
 * spread of scheduling states so the highlighter ink and mastery bars show
 * real variation the moment it loads.
 */
const SUMMARY = `# Spaced Repetition and the Forgetting Curve

Reviewing material at widening intervals beats cramming, because each recall rebuilds a fading memory.

## Executive summary

Memory decays predictably. Hermann Ebbinghaus mapped that decay in 1885, and the century of research since has shown that the decay is not the enemy — it is the mechanism. Retrieving something just as you are about to forget it strengthens the memory far more than re-reading it while it is still fresh. Spaced repetition schedules reviews to land at that moment.

## Learning objectives

- Explain why the forgetting curve flattens after each successful review.
- Identify the difference between recognition and recall, and why only one builds memory.
- Apply the desirable difficulty principle when choosing what to study next.
- Describe how an interval and an ease factor together schedule a card.

## Outline

- The forgetting curve
- Active recall versus recognition
- Desirable difficulty
- How a scheduler decides
- Where it breaks down

## Detailed notes

### The forgetting curve

Ebbinghaus memorised nonsense syllables and tested himself over days, producing the first quantitative picture of decay. Retention drops sharply within the first day, then levels off.

- **Forgetting curve** — the exponential decline in retention over time since the last review. The steepness depends on how well the material was encoded.
- **Spacing effect** — the same total study time produces more durable memory when it is distributed across days rather than massed into one session.
- Each successful review flattens the curve, so the next review can be scheduled further out.

### Active recall versus recognition

Re-reading a page feels productive because the material looks familiar. Familiarity is not memory.

- **Recognition** — knowing you have seen something before. Cheap, fast, and a poor predictor of whether you can produce it.
- **Active recall** — retrieving the answer from memory with no cue on screen. Effortful, and the effort is the point.
- **Fluency illusion** — mistaking the ease of reading for the strength of a memory. It is the single most common reason students over-estimate how prepared they are.

### Desirable difficulty

Robert Bjork's work shows that conditions which slow learning down during practice often improve retention afterwards.

- **Desirable difficulty** — a level of challenge high enough to require real effort but low enough to succeed most of the time.
- If a review always feels easy, the interval is too short and the time is wasted.
- If reviews frequently fail, the material was never encoded well enough, and the fix is better notes, not more repetitions.

### How a scheduler decides

A scheduler keeps two numbers per card and updates them each time you grade yourself.

- **Interval** — how many days until the card comes back. It grows multiplicatively.
- **Ease factor** — a per-card multiplier reflecting how hard you find that specific card. Cards you keep missing grow their intervals more slowly.
- **Lapse** — a failed review. It resets the interval and lowers the ease, sending the card back into short-term rotation.

\`\`\`
next_interval = current_interval × ease_factor
\`\`\`

### Where it breaks down

- Spaced repetition schedules *retrieval*. It cannot create understanding that was never there.
- Cards that bundle several facts fail as a unit, which teaches you nothing about which part you actually forgot.
- A backlog of overdue cards is demoralising, and the usual cause is adding new material faster than you can sustain reviews.

## Glossary

**Forgetting curve** — the exponential decline in retention since the last successful review.
**Spacing effect** — distributed practice produces more durable memory than massed practice.
**Active recall** — producing an answer from memory without a cue present.
**Recognition** — identifying something as previously seen, without being able to produce it.
**Fluency illusion** — mistaking ease of reading for strength of memory.
**Desirable difficulty** — challenge that slows practice but improves long-term retention.
**Interval** — days scheduled until a card's next review.
**Ease factor** — per-card multiplier governing how fast its interval grows.
**Lapse** — a failed review that resets the interval and reduces ease.

## Study plan

- **20 minutes** — read this guide once, then close it and write down the five terms you remember.
- **15 minutes** — work the cards. Grade honestly; a card you nearly missed is not an Easy.
- **10 minutes** — take the quiz, then re-read only the sections behind the questions you missed.

## Practice questions

1. Why does re-reading a chapter feel more effective than it is?
2. What happens to a card's ease factor after a lapse, and why?
3. Explain the spacing effect to someone who has never heard of it.
4. You review a card and it feels effortless. What should change?
5. A student has 400 overdue cards and is falling further behind each week. Diagnose the cause and propose a fix.

**Answers**

1. Re-reading builds recognition and fluency, which feel like knowledge but do not require retrieval. The fluency illusion makes preparation feel complete when it is not.
2. It decreases. A lapse is evidence the card is harder for this learner than assumed, so its intervals should grow more slowly from now on.
3. Studying the same material across several days beats studying it for the same total time in one sitting, because each gap lets the memory fade slightly and each recall rebuilds it stronger.
4. The interval was too short. It should grow faster, which an Easy grade does by raising the ease factor.
5. New cards are being added faster than reviews can be sustained. The fix is to stop adding material until the backlog clears, then cap daily new cards to what the review load allows.

## Key takeaways

- Forgetting is the mechanism, not the failure.
- Recall builds memory. Recognition does not.
- If it always feels easy, the interval is too short.
- One fact per card, or a failure teaches you nothing.
- Sustainable review load beats an ambitious one.`;

interface Seed {
  front: string;
  back: string;
  term: string;
  /** Days of interval. 0 with reps 0 means a brand new card. */
  interval: number;
  reps: number;
  lapses: number;
  /** Days from now until due. Negative means already due. */
  dueIn: number;
  state: SrsState['state'];
  ease?: number;
}

const SEEDS: Seed[] = [
  // Mastered — long intervals, green ink.
  {
    front: 'What does the forgetting curve describe?',
    back: 'The exponential decline in retention over the time since your last successful review.',
    term: 'Forgetting curve',
    interval: 64, reps: 9, lapses: 0, dueIn: 21, state: 'review', ease: 2.7,
  },
  {
    front: 'What is the spacing effect?',
    back: 'The same total study time produces more durable memory when distributed across days rather than massed into one session.',
    term: 'Spacing effect',
    interval: 38, reps: 7, lapses: 0, dueIn: 12, state: 'review', ease: 2.6,
  },
  {
    front: 'What is active recall?',
    back: 'Retrieving an answer from memory with no cue on screen. The effort of retrieval is what strengthens the memory.',
    term: 'Active recall',
    interval: 27, reps: 6, lapses: 1, dueIn: 4, state: 'review',
  },

  // Reviewing — mid intervals, yellow ink.
  {
    front: 'How does recognition differ from recall?',
    back: 'Recognition is knowing you have seen something before. Recall is producing it unaided. Only recall builds durable memory.',
    term: 'Recognition',
    interval: 12, reps: 5, lapses: 1, dueIn: 3, state: 'review',
  },
  {
    front: 'What is the fluency illusion?',
    back: 'Mistaking the ease of reading something for the strength of the memory. The most common reason students over-estimate how prepared they are.',
    term: 'Fluency illusion',
    interval: 8, reps: 4, lapses: 1, dueIn: -1, state: 'review',
  },
  {
    front: 'What is a desirable difficulty?',
    back: 'A level of challenge high enough to require real effort, but low enough that you succeed most of the time.',
    term: 'Desirable difficulty',
    interval: 5, reps: 3, lapses: 0, dueIn: -2, state: 'review',
  },

  // Learning — pink ink.
  {
    front: 'What does a card\'s ease factor control?',
    back: 'How fast that specific card\'s interval grows. Cards you keep missing have their intervals extended more slowly.',
    term: 'Ease factor',
    interval: 1, reps: 2, lapses: 2, dueIn: 0, state: 'learning', ease: 1.9,
  },
  {
    front: 'What happens to a card after a lapse?',
    back: 'Its interval resets and its ease drops, sending it back into short-term rotation.',
    term: 'Lapse',
    interval: 1, reps: 3, lapses: 2, dueIn: -1, state: 'lapsed', ease: 1.8,
  },

  // New — bare paper.
  {
    front: 'Why does a card that bundles several facts fail badly?',
    back: 'It fails as a unit, so a miss tells you nothing about which specific part you forgot. One fact per card.',
    term: 'One fact per card',
    interval: 0, reps: 0, lapses: 0, dueIn: 0, state: 'new',
  },
  {
    front: 'What usually causes a large backlog of overdue cards?',
    back: 'Adding new material faster than the review load can be sustained. The fix is to stop adding until the backlog clears.',
    term: 'backlog',
    interval: 0, reps: 0, lapses: 0, dueIn: 0, state: 'new',
  },
];

function toCard(seed: Seed, index: number, now: Date): Flashcard {
  return {
    id: `demo-card-${index}`,
    front: seed.front,
    back: seed.back,
    term: seed.term,
    srs: {
      due: new Date(now.getTime() + seed.dueIn * DAY).toISOString(),
      interval: seed.interval,
      ease: seed.ease ?? EASE_DEFAULT,
      reps: seed.reps,
      lapses: seed.lapses,
      state: seed.state,
      lastReviewed:
        seed.reps > 0
          ? new Date(now.getTime() - seed.interval * DAY).toISOString()
          : undefined,
    },
  };
}

export const DEMO_SET_ID = 'demo-spaced-repetition';

export function buildDemoSet(now: Date = new Date()): StudySet {
  const iso = now.toISOString();
  return {
    id: DEMO_SET_ID,
    title: 'Spaced Repetition and the Forgetting Curve',
    createdAt: new Date(now.getTime() - 26 * DAY).toISOString(),
    updatedAt: iso,
    summary: SUMMARY,
    flashcards: SEEDS.map((seed, i) => toCard(seed, i, now)),
    quiz: [
      {
        id: 'demo-quiz-0',
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
        id: 'demo-quiz-1',
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
        id: 'demo-quiz-2',
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
        id: 'demo-quiz-3',
        question: 'Which best describes a desirable difficulty?',
        options: [
          'Any task hard enough that you fail it more often than not',
          'Challenge that slows practice but improves long-term retention',
          'Material presented in a deliberately confusing order',
          'Studying while tired, so recall must work harder',
        ],
        correctAnswerIndex: 1,
        explanation:
          'Bjork\'s finding is that conditions slowing acquisition often improve retention. The difficulty must still allow success most of the time.',
      },
      {
        id: 'demo-quiz-4',
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
    ],
    quizAttempts: [],
    originalContent: null,
    contentType: ContentType.TEXT,
    chatHistory: [],
    images: [],
    tags: ['learning science', 'demo'],
    archived: false,
  };
}
