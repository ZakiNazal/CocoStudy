import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  CheckSquare,
  Edit3,
  Image as ImageIcon,
  Italic,
  List,
  Loader2,
  Save,
  Send,
  X,
} from 'lucide-react';
import { gsap, DUR, EASE, shouldAnimate } from '../lib/motion';
import { setMastery } from '../lib/mastery';
import { getBlobUrl, putBlob } from '../lib/db';
import { chatWithContext, generateStudyImage } from '../services/ai';
import MarkdownView from './notes/MarkdownView';
import ReviewSession from './cards/ReviewSession';
import MasteryBar from './ui/MasteryBar';
import Banner from './ui/Banner';
import type { ChatMessage, Grade, StudySet } from '../types';

type Tab = 'notes' | 'cards' | 'quiz' | 'tutor';

const TABS: { id: Tab; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'cards', label: 'Cards' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'tutor', label: 'Tutor' },
];

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

  // Notes editing
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(set.summary);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Images
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Cards
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Quiz
  const [answers, setAnswers] = useState<number[]>(() => new Array(set.quiz.length).fill(-1));
  const [graded, setGraded] = useState(false);

  // Tutor
  const [chat, setChat] = useState<ChatMessage[]>(set.chatHistory);
  const [draftMessage, setDraftMessage] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const body = useRef<HTMLDivElement>(null);
  const mastery = Math.round(setMastery(set.flashcards) * 100);

  useEffect(() => {
    setDraft(set.summary);
    setChat(set.chatHistory);
    setAnswers(new Array(set.quiz.length).fill(-1));
    setGraded(false);
    setCardIndex(0);
    setFlipped(false);
    setEditing(false);
    setBrowsing(false);
  }, [set.id, set.summary, set.chatHistory, set.quiz.length]);

  // Blob keys resolve to object URLs for rendering.
  useEffect(() => {
    let created: string[] = [];
    let cancelled = false;

    Promise.all(set.images.map(getBlobUrl)).then(urls => {
      const resolved = urls.filter((u): u is string => Boolean(u));
      if (cancelled) {
        resolved.forEach(URL.revokeObjectURL);
        return;
      }
      created = resolved;
      setImageUrls(resolved);
    });

    return () => {
      cancelled = true;
      created.forEach(URL.revokeObjectURL);
    };
  }, [set.images]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  useGSAP(
    () => {
      if (!shouldAnimate()) return;
      gsap.from('[data-panel]', { opacity: 0, y: 10, duration: DUR.base, ease: EASE.out });
    },
    { scope: body, dependencies: [tab] },
  );

  const wrapSelection = (prefix: string, suffix = '') => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    setDraft(
      `${draft.slice(0, start)}${prefix}${draft.slice(start, end)}${suffix}${draft.slice(end)}`,
    );
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + prefix.length;
      el.selectionEnd = end + prefix.length;
    });
  };

  const handleVisualize = async () => {
    if (imageBusy) return;
    setImageBusy(true);
    setImageError(null);
    try {
      const blob = await generateStudyImage(set.title);
      if (!blob) {
        setImageError('Gemini did not return an image. Try again.');
        return;
      }
      onUpdateSet({ ...set, images: [...set.images, await putBlob(blob)] });
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Could not generate a visual.');
    } finally {
      setImageBusy(false);
    }
  };

  const send = async () => {
    const message = draftMessage.trim();
    if (!message || chatBusy) return;

    setDraftMessage('');
    setChatError(null);
    const next: ChatMessage[] = [...chat, { role: 'user', text: message }];
    setChat(next);
    setChatBusy(true);

    try {
      const reply = await chatWithContext(message, set.summary, next);
      const final: ChatMessage[] = [...next, { role: 'model', text: reply }];
      setChat(final);
      onUpdateSet({ ...set, chatHistory: final });
    } catch (e) {
      setChat(next);
      setChatError(e instanceof Error ? e.message : 'Could not reach the tutor.');
    } finally {
      setChatBusy(false);
    }
  };

  const score = answers.reduce(
    (total, answer, i) => total + (answer === set.quiz[i]?.correctAnswerIndex ? 1 : 0),
    0,
  );

  const card = set.flashcards[cardIndex];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-[var(--rule)] bg-[var(--paper-2)]">
        <div className="flex items-start gap-3 px-6 pb-3 pt-5 pl-16 md:pl-6">
          <button
            onClick={onBack}
            aria-label="Back to library"
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule)] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="display truncate text-lg">{set.title}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
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
          </div>

          <div className="hidden w-40 shrink-0 sm:block">
            <div className="flex items-baseline justify-between">
              <span className="label">Mastered</span>
              <span className="numeral text-sm font-bold text-[var(--ink)]">{mastery}%</span>
            </div>
            <MasteryBar cards={set.flashcards} height={4} className="mt-1.5" />
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-6 no-scrollbar" aria-label="Study views">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors duration-150 ${
                tab === id
                  ? 'border-[var(--ink)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--ink-3)] hover:text-[var(--ink-2)]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Body */}
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'notes' && (
          <div data-panel className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
            {imageError && (
              <div className="mb-6">
                <Banner tone="error" onDismiss={() => setImageError(null)}>
                  {imageError}
                </Banner>
              </div>
            )}

            {!editing ? (
              <>
                <div className="mb-8 flex items-center justify-between border-b border-[var(--rule)] pb-3">
                  <span className="label">Study guide</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleVisualize}
                      disabled={imageBusy}
                      className="flex items-center gap-1.5 border border-[var(--rule)] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-50"
                    >
                      {imageBusy ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ImageIcon size={13} />
                      )}
                      {imageBusy ? 'Drawing' : 'Visualise'}
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 border border-[var(--rule)] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>
                  </div>
                </div>

                {imageUrls.length > 0 && (
                  <div className="mb-10 grid gap-4 sm:grid-cols-2">
                    {imageUrls.map((url, i) => (
                      <figure key={url} className="border border-[var(--rule)]">
                        <img src={url} alt={`Illustration ${i + 1} for ${set.title}`} className="w-full" />
                        <figcaption className="label border-t border-[var(--rule)] px-3 py-1.5">
                          Generated
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}

                <article>
                  <MarkdownView>{set.summary}</MarkdownView>
                </article>
              </>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-[var(--rule)] pb-3">
                  {(
                    [
                      [Bold, 'Bold', () => wrapSelection('**', '**')],
                      [Italic, 'Italic', () => wrapSelection('*', '*')],
                      [List, 'Bullet', () => wrapSelection('\n- ')],
                      [CheckSquare, 'Checkbox', () => wrapSelection('\n- [ ] ')],
                    ] as const
                  ).map(([Icon, label, action]) => (
                    <button
                      key={label}
                      onClick={action}
                      title={label}
                      aria-label={label}
                      className="flex h-8 w-8 items-center justify-center text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                    >
                      <Icon size={15} />
                    </button>
                  ))}

                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => {
                        setDraft(set.summary);
                        setEditing(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    >
                      <X size={13} />
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdateSet({ ...set, summary: draft });
                        setEditing(false);
                      }}
                      className="flex items-center gap-1.5 bg-[var(--ink)] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--paper)] transition-transform active:scale-[0.97]"
                    >
                      <Save size={13} />
                      Save
                    </button>
                  </div>
                </div>

                <textarea
                  ref={textarea}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  aria-label="Edit study guide"
                  className="ruled h-[60vh] w-full resize-none border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-[0.4rem] font-mono text-xs leading-[1.6rem] text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
                />
              </>
            )}
          </div>
        )}

        {tab === 'cards' && !browsing && (
          <div data-panel>
            <ReviewSession
              key={set.id}
              cards={set.flashcards}
              onGrade={(cardId, grade) => onGradeCard(set.id, cardId, grade)}
              onBrowse={() => setBrowsing(true)}
            />
          </div>
        )}

        {tab === 'cards' && browsing && (
          <div data-panel className="mx-auto flex max-w-2xl flex-col items-center px-6 py-10">
            {!card ? (
              <p className="py-20 text-[var(--ink-2)]">
                This set has no cards yet.
              </p>
            ) : (
              <>
                <div className="flex w-full items-center justify-between border-b border-[var(--rule)] pb-2">
                  <span className="label">Card</span>
                  <span className="numeral text-xs text-[var(--ink-2)]">
                    {cardIndex + 1} / {set.flashcards.length}
                  </span>
                </div>

                <button
                  onClick={() => setFlipped(f => !f)}
                  aria-label={flipped ? 'Show the question' : 'Show the answer'}
                  className="mt-8 w-full"
                  style={{ perspective: '1400px' }}
                >
                  <div
                    className="relative aspect-[8/5] w-full transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: flipped ? 'rotateY(180deg)' : 'none',
                    }}
                  >
                    <div
                      className="absolute inset-0 flex flex-col justify-between border border-[var(--rule)] bg-[var(--paper-2)] p-8 text-left"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <span className="label">Question</span>
                      <p className="display text-xl leading-tight">{card.front}</p>
                      <span className="numeral text-2xs text-[var(--ink-3)]">
                        Click to turn over
                      </span>
                    </div>

                    <div
                      className="absolute inset-0 flex flex-col justify-between border border-[var(--ink)] bg-[var(--ink)] p-8 text-left"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <span className="label" style={{ color: 'var(--paper-3)' }}>
                        Answer
                      </span>
                      <p className="text-lg leading-snug text-[var(--paper)]">{card.back}</p>
                      <span
                        className="numeral text-2xs"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        Click to turn back
                      </span>
                    </div>
                  </div>
                </button>

                <div className="mt-8 flex w-full items-center justify-between">
                  <button
                    onClick={() => {
                      setFlipped(false);
                      setCardIndex(i => (i - 1 + set.flashcards.length) % set.flashcards.length);
                    }}
                    className="flex items-center gap-2 border border-[var(--rule)] px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                  >
                    <ArrowLeft size={14} />
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      setFlipped(false);
                      setCardIndex(i => (i + 1) % set.flashcards.length);
                    }}
                    className="flex items-center gap-2 border border-[var(--rule)] px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                  >
                    Next
                    <ArrowRight size={14} />
                  </button>
                </div>

                <button
                  onClick={() => setBrowsing(false)}
                  className="mt-6 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] hover:text-[var(--ink)]"
                >
                  Back to review
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'quiz' && (
          <div data-panel className="mx-auto max-w-2xl px-6 py-8 sm:px-10">
            {set.quiz.length === 0 ? (
              <p className="py-20 text-center text-[var(--ink-2)]">
                This set has no quiz yet.
              </p>
            ) : (
              <>
                {graded && (
                  <div
                    className="mb-10 border border-[var(--rule)] bg-[var(--paper-2)] p-6"
                    style={{ borderLeftWidth: 3, borderLeftColor: 'var(--green)' }}
                  >
                    <span className="label">Result</span>
                    <p className="display mt-2 text-2xl">
                      {score} of {set.quiz.length}
                    </p>
                    <button
                      onClick={() => {
                        setGraded(false);
                        setAnswers(new Array(set.quiz.length).fill(-1));
                      }}
                      className="mt-5 bg-[var(--ink)] px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--paper)] transition-transform active:scale-[0.97]"
                    >
                      Try again
                    </button>
                  </div>
                )}

                <ol className="space-y-10">
                  {set.quiz.map((question, qi) => (
                    <li key={question.id}>
                      <div className="flex gap-4">
                        {/* Numerals belong here: quiz order is real. */}
                        <span className="numeral shrink-0 pt-0.5 text-sm text-[var(--ink-3)]">
                          {String(qi + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--ink)]">{question.question}</p>

                          <div className="mt-4 space-y-2">
                            {question.options.map((option, oi) => {
                              const picked = answers[qi] === oi;
                              const correct = oi === question.correctAnswerIndex;

                              let style = 'border-[var(--rule)] text-[var(--ink-2)]';
                              let wash: string | undefined;

                              if (graded) {
                                if (correct) {
                                  style = 'border-[var(--ink)] text-[var(--ink)]';
                                  wash = 'var(--green-wash)';
                                } else if (picked) {
                                  style = 'border-[var(--ink)] text-[var(--ink)]';
                                  wash = 'var(--pink-wash)';
                                } else {
                                  style = 'border-[var(--rule)] text-[var(--ink-3)]';
                                }
                              } else if (picked) {
                                style = 'border-[var(--ink)] text-[var(--ink)]';
                              }

                              return (
                                <button
                                  key={oi}
                                  disabled={graded}
                                  onClick={() => {
                                    if (graded) return;
                                    const next = [...answers];
                                    next[qi] = oi;
                                    setAnswers(next);
                                  }}
                                  className={`flex w-full items-center gap-3 border px-4 py-3 text-left text-sm transition-colors duration-150 ${style} ${
                                    graded ? '' : 'hover:border-[var(--ink)]'
                                  }`}
                                  style={{ background: wash }}
                                >
                                  <span className="numeral text-2xs text-[var(--ink-3)]">
                                    {String.fromCharCode(65 + oi)}
                                  </span>
                                  <span className="flex-1">{option}</span>
                                </button>
                              );
                            })}
                          </div>

                          {graded && (
                            <div className="mt-4 border-l-2 border-[var(--rule)] pl-4">
                              <span className="label">Why</span>
                              <p className="mt-1 text-sm text-[var(--ink-2)]">
                                {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

                {!graded && (
                  <div className="sticky bottom-6 mt-10 flex justify-center">
                    <button
                      onClick={() => {
                        setGraded(true);
                        onUpdateSet({
                          ...set,
                          quizAttempts: [
                            ...set.quizAttempts,
                            {
                              id: `attempt-${Date.now()}`,
                              takenAt: new Date().toISOString(),
                              answers,
                              score,
                            },
                          ],
                        });
                      }}
                      disabled={answers.includes(-1)}
                      className="bg-[var(--ink)] px-8 py-3 font-mono text-xs uppercase tracking-[0.1em] text-[var(--paper)] transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                    >
                      {answers.includes(-1)
                        ? `${answers.filter(a => a === -1).length} left`
                        : 'Check answers'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'tutor' && (
          <div data-panel className="mx-auto flex h-full max-w-2xl flex-col px-6 sm:px-10">
            <div className="min-h-0 flex-1 overflow-y-auto py-8">
              {chat.length === 0 ? (
                <div className="border border-[var(--rule)] bg-[var(--paper-2)] p-8">
                  <span className="label">Tutor</span>
                  <p className="display mt-3 text-xl">I've read these notes.</p>
                  <p className="mt-3 text-[var(--ink-2)]">
                    Ask for a plainer explanation, a worked example, or a harder version of
                    anything in this set.
                  </p>
                </div>
              ) : (
                <div className="space-y-7">
                  {chat.map((message, i) => (
                    <div key={i}>
                      <span className="label">
                        {message.role === 'user' ? 'You' : 'Tutor'}
                      </span>
                      <div
                        className={`mt-1.5 text-sm leading-[1.7] ${
                          message.role === 'user'
                            ? 'border-l-2 border-[var(--ink)] pl-4 text-[var(--ink)]'
                            : 'text-[var(--ink-2)]'
                        }`}
                      >
                        <MarkdownView>{message.text}</MarkdownView>
                      </div>
                    </div>
                  ))}

                  {chatBusy && (
                    <div>
                      <span className="label">Tutor</span>
                      <p className="mt-1.5 flex items-center gap-2 text-sm text-[var(--ink-3)]">
                        <Loader2 size={13} className="animate-spin" />
                        Thinking
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            <div className="shrink-0 border-t border-[var(--rule)] py-4">
              {chatError && (
                <div className="mb-3">
                  <Banner tone="error" onDismiss={() => setChatError(null)}>
                    {chatError}
                  </Banner>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={draftMessage}
                  onChange={e => setDraftMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Ask about these notes"
                  aria-label="Ask the tutor about these notes"
                  className="h-11 flex-1 border border-[var(--rule)] bg-[var(--paper-2)] px-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--ink)] focus:outline-none"
                />
                <button
                  onClick={send}
                  disabled={!draftMessage.trim() || chatBusy}
                  aria-label="Send"
                  className="flex h-11 w-11 items-center justify-center bg-[var(--ink)] text-[var(--paper)] transition-transform active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
