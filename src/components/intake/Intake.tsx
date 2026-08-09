import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { FileText, Mic, Upload } from 'lucide-react';
import { gsap, DUR, EASE, STAGGER, prefersReducedMotion } from '../../lib/motion';
import Highlight from '../ui/Highlight';
import Banner from '../ui/Banner';
import Ritual from './Ritual';
import type { ProcessingStatus } from '../../types';

interface IntakeProps {
  onProcess: (content: string | File) => void;
  status: ProcessingStatus;
}

const ACCEPT = 'audio/*,video/*,.pdf,.docx,.pptx';

export default function Intake({ onProcess, status }: IntakeProps) {
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [text, setText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const busy = status !== 'idle' && status !== 'complete' && status !== 'error';

  useGSAP(
    () => {
      if (busy || prefersReducedMotion()) return;
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
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
        {/* Hero — the thesis. A ruled sheet with the headline set into it. */}
        <header data-reveal className="border border-[var(--rule)] bg-[var(--paper-2)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-6 py-2">
            <span className="label">New study set</span>
            <span className="label">Untitled</span>
          </div>

          <div className="px-6 py-10 sm:px-10 sm:py-14">
            <h2 className="display display-xl text-3xl sm:text-4xl">
              Read it once.
              <br />
              <Highlight ink="yellow" coverage={1} delay={0.35}>
                Know it
              </Highlight>{' '}
              for good.
            </h2>

            <p className="mt-6 max-w-md text-[var(--ink-2)]">
              Drop in a lecture recording, a slide deck, or your own messy notes. You get a
              study guide, cards on a review schedule, and a tutor that has read all of it.
            </p>
          </div>

          {/* Legend — teaches the colour system before it carries data. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--rule)] px-6 py-3">
            <span className="label">Ink means</span>
            {(
              [
                ['pink', 'Learning'],
                ['yellow', 'Reviewing'],
                ['green', 'Mastered'],
              ] as const
            ).map(([ink, meaning]) => (
              <span key={ink} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-5"
                  style={{ background: `var(--${ink})` }}
                />
                <span className="numeral text-2xs text-[var(--ink-2)]">{meaning}</span>
              </span>
            ))}
          </div>
        </header>

        {/* Mode switch */}
        <div data-reveal className="mt-10 flex border-b border-[var(--rule)]">
          {(
            [
              ['file', 'Upload a file', Upload],
              ['text', 'Paste text', FileText],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs uppercase tracking-[0.1em] transition-colors duration-150 ${
                mode === value
                  ? 'border-[var(--ink)] text-[var(--ink)]'
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
                className="cursor-pointer border-2 border-dashed px-8 py-16 text-center transition-colors duration-150"
                style={{
                  borderColor: dragging ? 'var(--ink)' : 'var(--rule)',
                  background: dragging ? 'var(--yellow-wash)' : 'transparent',
                }}
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

                <p className="display text-xl">
                  {dragging ? 'Let go' : 'Drop a file here'}
                </p>
                <p className="mt-2 text-sm text-[var(--ink-2)]">
                  or click to choose one
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {['PDF', 'DOCX', 'PPTX', 'MP3', 'M4A', 'MP4'].map(ext => (
                    <span key={ext} className="numeral text-2xs text-[var(--ink-3)]">
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
                className="ruled mt-2 h-64 w-full resize-none border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-[0.4rem] leading-[1.6rem] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--ink)] focus:outline-none"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="numeral text-2xs text-[var(--ink-3)]">
                  {text.trim() ? `${text.trim().split(/\s+/).length} words` : 'Empty'}
                </span>
                <button
                  onClick={() => text.trim() && onProcess(text)}
                  disabled={!text.trim()}
                  className="h-11 rounded-[4px] bg-[var(--ink)] px-6 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--paper)] transition-[background-color,transform] duration-150 hover:bg-[var(--ink-2)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
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
