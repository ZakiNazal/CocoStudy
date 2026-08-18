import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { FileText, Mic, Sparkles, Upload } from 'lucide-react';
import { gsap, DUR, EASE, STAGGER, shouldAnimate } from '../../lib/motion';
import Banner from '../ui/Banner';
import Ritual from './Ritual';
import type { ProcessingStatus } from '../../types';

interface IntakeProps {
  onProcess: (content: string | File) => void;
  onLoadDemo: () => void;
  hasSets: boolean;
  status: ProcessingStatus;
}

const ACCEPT = 'audio/*,video/*,.pdf,.docx,.pptx';

export default function Intake({ onProcess, onLoadDemo, hasSets, status }: IntakeProps) {
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [text, setText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const busy = status !== 'idle' && status !== 'complete' && status !== 'error';

  useGSAP(
    () => {
      if (busy || !shouldAnimate()) return;
      gsap.from('[data-reveal]', {
        opacity: 0,
        y: 14,
        duration: DUR.slow,
        ease: EASE.out,
        stagger: STAGGER.standard,
      });
    },
    { scope: root, dependencies: [busy] },
  );

  const handleFile = (file: File) => {
    setFileError(null);
    const name = file.name.toLowerCase();
    const supported =
      file.type.startsWith('audio/') ||
      file.type.startsWith('video/') ||
      file.type === 'application/pdf' ||
      name.endsWith('.pdf') ||
      name.endsWith('.docx') ||
      name.endsWith('.pptx');

    if (!supported) {
      setFileError(
        `CocoStudy can't read ${file.name}. Try a PDF, Word (.docx), PowerPoint (.pptx), or an audio recording.`,
      );
      return;
    }
    onProcess(file);
  };

  if (busy) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto px-6">
        <Ritual status={status} />
      </div>
    );
  }

  return (
    <div ref={root} className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        {/* Hero — the thesis */}
        <header data-reveal className="border border-[var(--rule)] bg-[var(--paper-2)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-6 py-2">
            <span className="text-2xs font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
              New study set
            </span>
            <span className="text-2xs font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
              Untitled
            </span>
          </div>

          <div className="px-6 py-10 sm:px-10 sm:py-12">
            <h2 className="display display-xl text-3xl sm:text-4xl font-extrabold text-[#0052FF] leading-[1.08]">
              Read it once.
              <br />
              <span className="relative inline-block mt-1">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[#FEF08A] z-0 -mx-1 px-1 rounded-[2px]"
                />
                <span className="relative z-10 text-[#0052FF] font-black">Know it</span>
              </span>{' '}
              <span className="text-[#0052FF]">for good.</span>
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-relaxed text-[var(--ink-2)]">
              Drop in a lecture recording, a slide deck, or your own messy notes. You get a
              study guide, cards on a review schedule, and a tutor that has read all of it.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--rule)] px-6 py-3">
            <span className="text-2xs font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
              Ink means
            </span>
            {(
              [
                ['pink', 'Learning', 'var(--pink)'],
                ['yellow', 'Reviewing', 'var(--yellow)'],
                ['green', 'Mastered', 'var(--green)'],
              ] as const
            ).map(([ink, meaning, color]) => (
              <span key={ink} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-5 rounded-[1px]"
                  style={{ background: color }}
                />
                <span className="text-2xs font-medium text-[var(--ink-2)]">{meaning}</span>
              </span>
            ))}
          </div>
        </header>

        {!hasSets && (
          <div
            data-reveal
            className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-[var(--rule)] bg-transparent dark:bg-[var(--paper-2)]/40 px-6 py-4"
          >
            <p className="text-sm text-[var(--ink-2)]">
              Want to look around first? Load a worked example — no API key needed.
            </p>
            <button
              onClick={onLoadDemo}
              className="flex shrink-0 items-center gap-2 border border-[var(--ink)] bg-transparent px-4 py-2 text-xs font-bold text-[var(--ink)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--ink)] hover:text-white active:scale-[0.98]"
            >
              <Sparkles size={14} />
              Open the demo set
            </button>
          </div>
        )}

        {/* Mode switch */}
        <div data-reveal className="mt-10 flex border-b border-[var(--rule)]">
          {(
            [
              ['file', 'Upload File', Upload],
              ['text', 'Write a Text', FileText],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`-mb-px flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-colors duration-150 ${
                mode === value
                  ? 'border-[#0052FF] text-[#0052FF]'
                  : 'border-transparent text-[var(--ink-3)] hover:text-[var(--ink-2)]'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div data-reveal className="mt-8">
          {mode === 'file' ? (
            <>
              <div
                onDragEnter={e => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragOver={e => e.preventDefault()}
                onDragLeave={e => {
                  e.preventDefault();
                  setDragging(false);
                }}
                onDrop={e => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                onClick={() => fileInput.current?.click()}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Choose a file to upload, or drop one here"
                className="cursor-pointer border-2 border-dashed border-[#0052FF] bg-[#F5F8FF]/30 dark:bg-[#0052FF]/5 px-8 py-16 text-center transition-colors duration-150 hover:bg-[#F0F5FF]/60"
              >
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
                />

                <p className="display text-2xl font-bold text-[#0052FF]">
                  {dragging ? 'Let go' : 'Drop a file here'}
                </p>
                <p className="mt-2 text-sm text-[var(--ink-2)]">
                  or click to choose one
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {['PDF', 'DOCX', 'PPTX', 'MP3', 'M4A', 'MP4'].map(ext => (
                    <span key={ext} className="numeral text-2xs text-[var(--ink-3)] font-semibold">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>

              {fileError && (
                <div className="mt-4">
                  <Banner tone="error" onDismiss={() => setFileError(null)}>
                    {fileError}
                  </Banner>
                </div>
              )}

              <p className="mt-4 flex items-center gap-2 text-xs text-[var(--ink-3)]">
                <Mic size={13} />
                Recording straight into CocoStudy is coming.
              </p>
            </>
          ) : (
            <>
              <label htmlFor="paste" className="label">
                Your notes
              </label>
              <textarea
                id="paste"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste anything you need to learn. Markdown works."
                className="mt-2 h-64 w-full resize-none rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] p-4 leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[#0052FF] focus:outline-none"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="numeral text-2xs text-[var(--ink-3)]">
                  {text.trim() ? `${text.trim().split(/\s+/).length} words` : 'Empty'}
                </span>
                <button
                  onClick={() => text.trim() && onProcess(text)}
                  disabled={!text.trim()}
                  className="h-10 rounded-[6px] bg-[#0052FF] px-6 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#0042D1] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Make a study set
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
