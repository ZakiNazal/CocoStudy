import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { starterPrompts } from '../../lib/tutor';
import { chatWithContext } from '../../services/ai';
import MarkdownView from '../notes/MarkdownView';
import Banner from '../ui/Banner';
import type { ChatMessage } from '../../types';

interface TutorViewProps {
  title: string;
  summary: string;
  history: ChatMessage[];
  onHistoryChange: (history: ChatMessage[]) => void;
}

const MAX_COMPOSER_PX = 160;

export default function TutorView({
  title,
  summary,
  history,
  onHistoryChange,
}: TutorViewProps) {
  const [chat, setChat] = useState<ChatMessage[]>(history);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);

  // Adopt history only when the thread is actually a different one; a reply we
  // just sent comes back as a new array and must not clobber local state.
  useEffect(() => {
    setChat(current => (current.length >= history.length ? current : history));
  }, [history]);

  /**
   * Scrolls the message log only — never `scrollIntoView`, which walks up and
   * moves ancestor scrollers too.
   */
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, busy]);

  // Grow the composer with its content, up to a cap, then let it scroll.
  useEffect(() => {
    const el = composer.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_PX)}px`;
  }, [draft]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;

    setDraft('');
    setError(null);
    const next: ChatMessage[] = [...chat, { role: 'user', text: message }];
    setChat(next);
    setBusy(true);

    try {
      const reply = await chatWithContext(message, summary, next);
      const final: ChatMessage[] = [...next, { role: 'model', text: reply }];
      setChat(final);
      onHistoryChange(final);
    } catch (e) {
      // Keep the question on screen and put the text back so it can be resent.
      setChat(chat);
      setDraft(message);
      setError(e instanceof Error ? e.message : 'Could not reach the tutor.');
    } finally {
      setBusy(false);
    }
  };

  const starters = starterPrompts(summary, title);

  return (
    <div className="flex h-full flex-col">
      <div ref={log} className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-10">
        <div className="mx-auto max-w-2xl py-8">
          {chat.length === 0 ? (
            <div>
              <span className="label">Tutor</span>
              <p className="display mt-3 text-2xl">I have read these notes.</p>
              <p className="mt-3 max-w-md leading-relaxed text-[var(--ink-2)]">
                Ask for a plainer explanation, a worked example, or a harder version of
                anything in this set. Answers come from your notes, not the open web.
              </p>

              <div className="mt-8 space-y-2">
                <span className="label">Start with</span>
                {starters.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => void send(prompt)}
                    className="group flex w-full items-center justify-between gap-4 rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-3 text-left text-sm text-[var(--ink-2)] transition-[border-color,color] duration-150 hover:border-[var(--ink)] hover:text-[var(--ink)]"
                  >
                    <span>{prompt}</span>
                    <ArrowUp
                      size={14}
                      className="shrink-0 rotate-45 text-[var(--ink-3)] transition-colors group-hover:text-[var(--ink)]"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {chat.map((message, i) =>
                message.role === 'user' ? (
                  <div key={i} className="border-l-2 border-[var(--ink)] pl-4">
                    <span className="label">You</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-[1.7] text-[var(--ink)]">
                      {message.text}
                    </p>
                  </div>
                ) : (
                  <div key={i}>
                    <span className="label">Tutor</span>
                    <div className="mt-1 text-sm leading-[1.7]">
                      <MarkdownView>{message.text}</MarkdownView>
                    </div>
                  </div>
                ),
              )}

              {busy && (
                <div>
                  <span className="label">Tutor</span>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-[var(--ink-3)]">
                    <Loader2 size={13} className="animate-spin" />
                    Reading your notes
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--rule)] bg-[var(--paper-2)] px-6 py-4 sm:px-10">
        <div className="mx-auto max-w-2xl">
          {error && (
            <div className="mb-3">
              <Banner tone="error" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 focus-within:border-[var(--ink)]">
            <textarea
              ref={composer}
              rows={1}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder="Ask about these notes"
              aria-label="Ask the tutor about these notes"
              className="max-h-40 min-h-[1.5rem] flex-1 resize-none bg-transparent text-sm leading-6 text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none"
            />
            <button
              onClick={() => void send(draft)}
              disabled={!draft.trim() || busy}
              aria-label="Send message"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-[var(--ink)] text-[var(--paper)] transition-[opacity,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:active:scale-100"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
            </button>
          </div>

          <p className="mt-2 text-2xs text-[var(--ink-3)]">
            Enter sends · Shift + Enter adds a line
          </p>
        </div>
      </div>
    </div>
  );
}
