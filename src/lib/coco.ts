import type { CocoMood } from '../components/coco/sprite';
import type { ProcessingStatus } from '../types';

/**
 * What Coco says, as a pure function of where you are.
 *
 * Coco never knows more than the screen does: every line here is built from
 * the same facts the view is already showing, so the helper can nudge but
 * never contradict the page under it.
 */

export type StudyTab = 'notes' | 'cards' | 'quiz' | 'tutor';

export type CocoScene =
  | { kind: 'intake'; hasSets: boolean }
  | { kind: 'processing'; status: ProcessingStatus }
  | { kind: 'error' }
  | { kind: 'study'; tab: StudyTab; due: number; mastery: number; cards: number };

export type CocoActionId = 'demo' | 'library' | `tab:${StudyTab}`;

export interface CocoAction {
  id: CocoActionId;
  label: string;
}

export interface CocoLine {
  mood: CocoMood;
  /** The opening line, shown in the bubble. */
  say: string;
  /** Extra hints the panel cycles through. */
  tips: string[];
  actions: CocoAction[];
}

const PROCESSING: Partial<Record<ProcessingStatus, string>> = {
  analyzing: 'Reading it all the way through. Long recordings take a minute.',
  generating_flashcards: 'Picking out the ideas worth a flashcard.',
  generating_quiz: 'Writing you a quiz. Nearly there.',
};

const TAB_ACTIONS: Record<StudyTab, CocoAction> = {
  notes: { id: 'tab:notes', label: 'Read the guide' },
  cards: { id: 'tab:cards', label: 'Review cards' },
  quiz: { id: 'tab:quiz', label: 'Quiz me' },
  tutor: { id: 'tab:tutor', label: 'Ask the tutor' },
};

/** Every other tab, in reading order, as a way onward. */
const elsewhere = (tab: StudyTab): CocoAction[] =>
  (Object.keys(TAB_ACTIONS) as StudyTab[]).filter(t => t !== tab).map(t => TAB_ACTIONS[t]);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function cocoSays(scene: CocoScene): CocoLine {
  switch (scene.kind) {
    case 'intake':
      return scene.hasSets
        ? {
            mood: 'idle',
            say: 'Got something new to learn? Drop it in and I will turn it into a study set.',
            tips: [
              'PDFs, Word files, slide decks and lecture recordings all work.',
              'Pasting your own notes works too. Markdown is fine.',
              'Your sets live in the library. Everything stays in this browser.',
            ],
            actions: [{ id: 'library', label: 'Open my library' }],
          }
        : {
            mood: 'happy',
            say: 'Hi, I am Coco! Give me a lecture, slides or notes and I will make you a study set.',
            tips: [
              'Not ready to upload? The demo set shows everything without an API key.',
              'PDFs, Word files, slide decks and lecture recordings all work.',
              'Everything you make stays in this browser. Nothing is uploaded to us.',
            ],
            actions: [{ id: 'demo', label: 'Show me the demo' }],
          };

    case 'processing':
      return {
        mood: 'thinking',
        say: PROCESSING[scene.status] ?? 'Working on it.',
        tips: ['You will land in the study guide the moment it is ready.'],
        actions: [],
      };

    case 'error':
      return {
        mood: 'worried',
        say: 'That did not work. The note at the top says why.',
        tips: [
          'A missing or mistyped Gemini key is the usual cause. It lives in Settings.',
          'Very large files can time out. Try a shorter section.',
        ],
        actions: [],
      };

    case 'study': {
      const { tab, due, mastery, cards } = scene;
      const dueLine = due > 0 ? `${plural(due, 'card')} ${due === 1 ? 'is' : 'are'} due.` : '';

      if (tab === 'cards') {
        return {
          mood: due > 0 ? 'idle' : 'happy',
          say:
            due > 0
              ? `${dueLine} Answer in your head first, then turn the card over.`
              : 'Nothing is due right now. Come back later and I will have more ready.',
          tips: [
            'Grade honestly. A card you nearly missed is not an Easy.',
            'On a keyboard, Space turns a card and 1 to 4 grade it.',
            'Browse shows the whole deck. Deck lets you write a fresh one.',
          ],
          actions: elsewhere(tab),
        };
      }

      if (tab === 'quiz') {
        return {
          mood: 'idle',
          say: 'Try each one before you peek. Getting it wrong here is how it sticks.',
          tips: [
            'Customize changes the question types and how many you get.',
            'Essay answers come with key points to mark yourself against.',
          ],
          actions: elsewhere(tab),
        };
      }

      if (tab === 'tutor') {
        return {
          mood: 'idle',
          say: 'Ask me anything about these notes.',
          tips: ['I answer from your notes, not the open web, so check anything important.'],
          actions: elsewhere(tab),
        };
      }

      return {
        mood: mastery >= 80 ? 'happy' : 'idle',
        say:
          mastery >= 80
            ? `You have mastered ${mastery}% of this set. Lovely work.`
            : due > 0
              ? `${dueLine} Read a section, then test yourself.`
              : `Read it through once, then test yourself on the ${plural(cards, 'card')}.`,
        tips: [
          'The chips under the guide jump straight to a section.',
          'Visualise paints an illustration of the topic to remember it by.',
          'Edit lets you rewrite the guide in your own words.',
          'Highlight colours show mastery: pink is learning, yellow reviewing, green mastered.',
        ],
        actions: elsewhere(tab),
      };
    }
  }
}
