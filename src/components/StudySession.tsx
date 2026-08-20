import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { ArrowLeft } from 'lucide-react';
import { gsap, DUR, EASE, shouldAnimate } from '../lib/motion';
import { setMastery } from '../lib/mastery';
import { isDue } from '../lib/srs';
import NotesView from './notes/NotesView';
import ReviewSession from './cards/ReviewSession';
import CardBrowser from './cards/CardBrowser';
import CardCustomizeModal from './cards/CardCustomizeModal';
import { clampCardCount } from '../lib/review';
import { generateFlashcards } from '../services/ai';
import QuizView, { emptyRun, type QuizRun } from './quiz/QuizView';
import TutorView from './tutor/TutorView';
import MasteryBar from './ui/MasteryBar';
import type { Grade, StudySet } from '../types';

type Tab = 'notes' | 'cards' | 'quiz' | 'tutor';

/** Remembered across sets, the way the quiz remembers its own options. */
const DECK_SIZE_KEY = 'cocostudy_deck_size';

interface StudySessionProps {
  set: StudySet;
  onBack: () => void;
  onUpdateSet: (set: StudySet) => void;
  onGradeCard: (setId: string, cardId: string, grade: Grade) => void;
}

export default function StudySession({
  set,
  onBack,
  onUpdateSet,
  onGradeCard,
}: StudySessionProps) {
  const [tab, setTab] = useState<Tab>('notes');
  const [browsing, setBrowsing] = useState(false);
  const [quizRun, setQuizRun] = useState<QuizRun>(() => emptyRun(set.quiz));
  const [deckOpen, setDeckOpen] = useState(false);
  const [deckBusy, setDeckBusy] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [deckCount, setDeckCount] = useState(() => {
    const saved = Number(localStorage.getItem(DECK_SIZE_KEY));
    return clampCardCount(saved || set.flashcards.length || 10);
  });

  /**
   * Writes a new deck from the guide. The old cards go with their schedules,
   * which the dialog says plainly before this can be reached.
   */
  const rebuildDeck = async (count: number) => {
    setDeckBusy(true);
    setDeckError(null);
    try {
      const flashcards = await generateFlashcards(set.summary, count);
      if (flashcards.length === 0) {
        setDeckError('No cards came back. Try again.');
        return;
      }
      onUpdateSet({ ...set, flashcards });
      setDeckOpen(false);
    } catch (e) {
      setDeckError(e instanceof Error ? e.message : 'Could not write new cards.');
    } finally {
      setDeckBusy(false);
    }
  };
  const body = useRef<HTMLDivElement>(null);

  const mastery = Math.round(setMastery(set.flashcards) * 100);
  const due = set.flashcards.filter(c => isDue(c.srs, new Date())).length;

  /*
   * Only a change of set resets the shell. This used to also key on the
   * summary and the chat history, which meant sending one tutor message or
   * saving a note threw away an in-progress quiz and the review position.
   */
  useEffect(() => {
    setTab('notes');
    setBrowsing(false);
    setQuizRun(emptyRun(set.quiz));
    // Keyed on the set, not on the quiz array: a write to the set hands us a
    // new array every time and would otherwise wipe a part-finished quiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  useGSAP(
    () => {
      if (!shouldAnimate()) return;
      gsap.from('[data-panel]', { opacity: 0, y: 8, duration: DUR.base, ease: EASE.out });
    },
    { scope: body, dependencies: [tab, browsing] },
  );

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'notes', label: 'Notes' },
    { id: 'cards', label: 'Cards', badge: due },
    { id: 'quiz', label: 'Quiz' },
    { id: 'tutor', label: 'Tutor' },
  ];

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-[var(--rule)] bg-[var(--paper-2)]">
        <div className="flex items-start gap-3 px-4 pb-3 pl-16 pt-4 sm:px-6 md:pl-6 md:pt-5">
          <button
            onClick={onBack}
            aria-label="Back to library"
            className="-ml-1 mt-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule)] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] md:ml-0 md:mt-1 md:h-8 md:w-8"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="display truncate text-lg">{set.title}</h2>
            {/*
             * The provenance line is reference material, not something you read
             * while studying, so on a phone it gives its row to the title and
             * the one number that says where you are.
             */}
            <div className="mt-0.5 hidden flex-wrap items-center gap-x-3 gap-y-1 sm:flex">
              <span className="label">{set.contentType}</span>
              <span className="numeral text-2xs text-[var(--ink-3)]">
                {new Date(set.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="numeral text-2xs text-[var(--ink-3)]">
                {set.flashcards.length} cards
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 sm:hidden">
              <MasteryBar cards={set.flashcards} height={3} className="min-w-0 flex-1" />
              <span className="numeral shrink-0 text-2xs font-bold text-[var(--ink)]">
                {mastery}%
              </span>
            </div>
          </div>

          <div className="hidden w-40 shrink-0 sm:block">
            <div className="flex items-baseline justify-between">
              <span className="label">Mastered</span>
              <span className="numeral text-sm font-bold text-[var(--ink)]">{mastery}%</span>
            </div>
            <MasteryBar cards={set.flashcards} height={4} className="mt-1.5" />
          </div>
        </div>

        {/*
         * On a phone the four views divide the full width into equal index
         * tabs, each one a thumb wide; from sm up they sit back on the left as
         * a normal tab strip.
         */}
        <nav
          className="flex gap-1 overflow-x-auto px-2 no-scrollbar sm:px-6"
          aria-label="Study views"
        >
          {tabs.map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`-mb-px flex flex-1 shrink-0 items-center justify-center gap-1.5 border-b-2 px-3 py-3.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors duration-150 sm:flex-none sm:justify-start sm:py-2.5 ${
                tab === id
                  ? 'border-[var(--ink)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--ink-3)] hover:text-[var(--ink-2)]'
              }`}
            >
              {label}
              {badge ? (
                <span
                  className="numeral px-1 text-2xs font-bold text-[var(--ink)]"
                  style={{ background: 'var(--pink-wash)' }}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </header>

      {/*
       * The shell does not scroll. Each panel owns its own scrolling, which is
       * what lets the tutor pin its composer and the quiz pin its footer
       * instead of having them pushed off the bottom of a shared scroller.
       */}
      <div ref={body} className="min-h-0 flex-1 overflow-hidden">
        {tab === 'notes' && (
          <div data-panel className="h-full">
            <NotesView set={set} onUpdateSet={onUpdateSet} />
          </div>
        )}

        {tab === 'cards' && (
          <div data-panel className="h-full">
            {browsing ? (
              <CardBrowser cards={set.flashcards} onExit={() => setBrowsing(false)} />
            ) : (
              <ReviewSession
                // A rebuilt deck is a different deck, so the run starts over
                // rather than continuing against cards that no longer exist.
                key={`${set.id}:${set.flashcards.length}`}
                cards={set.flashcards}
                onGrade={(cardId, grade) => onGradeCard(set.id, cardId, grade)}
                onBrowse={() => setBrowsing(true)}
                onCustomize={() => setDeckOpen(true)}
              />
            )}
          </div>
        )}

        {tab === 'quiz' && (
          <div data-panel className="h-full">
            <QuizView
              quiz={set.quiz}
              attempts={set.quizAttempts}
              summary={set.summary}
              run={quizRun}
              onRunChange={setQuizRun}
              onUpdateQuiz={newQuiz =>
                onUpdateSet({ ...set, quiz: newQuiz, quizAttempts: [] })
              }
              onSubmit={attempt =>
                onUpdateSet({ ...set, quizAttempts: [...set.quizAttempts, attempt] })
              }
            />
          </div>
        )}

        {tab === 'tutor' && (
          <div data-panel className="h-full">
            <TutorView
              key={set.id}
              title={set.title}
              summary={set.summary}
              history={set.chatHistory}
              onHistoryChange={chatHistory => onUpdateSet({ ...set, chatHistory })}
            />
          </div>
        )}
      </div>

      <CardCustomizeModal
        isOpen={deckOpen}
        onClose={() => {
          setDeckOpen(false);
          setDeckError(null);
        }}
        cards={set.flashcards}
        count={deckCount}
        onCountChange={next => {
          setDeckCount(next);
          try {
            localStorage.setItem(DECK_SIZE_KEY, String(next));
          } catch {
            // Private mode: the choice just does not outlive the session.
          }
        }}
        onGenerate={rebuildDeck}
        isGenerating={deckBusy}
        error={deckError}
      />
    </div>
  );
}
