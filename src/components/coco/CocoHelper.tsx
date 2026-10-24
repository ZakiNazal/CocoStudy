import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import CocoSprite from './CocoSprite';
import { cocoSays, type CocoActionId, type CocoScene } from '../../lib/coco';

interface CocoHelperProps {
  scene: CocoScene;
  onAction: (id: CocoActionId) => void;
  onHide: () => void;
}

/** Long enough to read twice at a glance, short enough not to nag. */
const BUBBLE_MS = 7000;

/**
 * Coco, the study helper.
 *
 * On a phone Coco sits in the top corner, opposite the library button, because
 * the bottom of the screen belongs to the composer, the quiz submit and the
 * grading buttons. From `sm` up there is room in the margin, so Coco moves to
 * the bottom corner and speaks upward.
 */
export default function CocoHelper({ scene, onAction, onHide }: CocoHelperProps) {
  const sceneKey = JSON.stringify(scene);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const line = useMemo(() => cocoSays(scene), [sceneKey]);

  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(true);
  const [tip, setTip] = useState(0);
  const [cheer, setCheer] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>());

  /*
   * Coco speaks up when you arrive somewhere, not every time a number on the
   * page moves — grading a card changes the due count, and a bubble popping
   * after every grade would be nagging. Each tab gets its greeting once;
   * progress and errors always get through.
   */
  const topic =
    scene.kind === 'study'
      ? `study:${scene.tab}`
      : scene.kind === 'processing'
        ? `processing:${scene.status}`
        : scene.kind;
  const urgent = scene.kind === 'processing' || scene.kind === 'error';

  // A greeting counts as heard once it has run its course or been waved away —
  // not when it starts, or StrictMode's second effect pass would swallow it.
  const heard = () => seen.current.add(topic);

  useEffect(() => {
    setTip(0);
    if (!urgent && seen.current.has(topic)) {
      setBubble(false);
      return;
    }
    setBubble(true);
    // Work in progress stays up: it is the one line you are waiting on.
    if (scene.kind === 'processing') return;
    const timer = window.setTimeout(() => {
      seen.current.add(topic);
      setBubble(false);
    }, BUBBLE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => {
    if (!cheer) return;
    const timer = window.setTimeout(() => setCheer(false), 900);
    return () => window.clearTimeout(timer);
  }, [cheer]);

  const toggle = () => {
    heard();
    setBubble(false);
    if (!open) setCheer(true);
    setOpen(!open);
  };

  const act = (id: CocoActionId) => {
    setOpen(false);
    onAction(id);
  };

  const mood = cheer && line.mood !== 'thinking' ? 'happy' : line.mood;
  const tipText = line.tips[tip % Math.max(line.tips.length, 1)];

  // Shared by the bubble and the panel: below Coco on a phone, above it on sm+.
  const floating =
    'coco-pop absolute right-0 top-full z-10 mt-2 w-[min(19rem,calc(100vw-1.5rem))] rounded-[6px] border border-[var(--ink)] bg-[var(--paper-2)] text-left shadow-[0_6px_24px_rgba(17,24,39,0.12)] [--coco-pop-from:-6px] sm:bottom-full sm:top-auto sm:mb-2 sm:mt-0 sm:[--coco-pop-from:6px]';
  const tail =
    'absolute right-5 h-2.5 w-2.5 rotate-45 border-[var(--ink)] bg-[var(--paper-2)] -top-[6px] border-l border-t sm:top-auto sm:-bottom-[6px] sm:border-l-0 sm:border-t-0 sm:border-b sm:border-r';

  return (
    <div
      ref={root}
      className="absolute right-3 top-3 z-20 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-5 sm:top-auto"
    >
      <button
        onClick={toggle}
        aria-label="Coco, your study helper"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group relative flex h-12 w-11 items-end justify-center rounded-[6px] transition-transform duration-150 hover:-translate-y-0.5 active:scale-95 sm:h-[68px] sm:w-[60px]"
      >
        <CocoSprite mood={mood} className="h-auto w-[39px] sm:w-[52px]" />
      </button>

      {/* The bubble is a live region, so a screen reader hears what Coco says
          the same moment a sighted user sees it. */}
      <div aria-live="polite" className="sr-only">
        {bubble && !open ? line.say : ''}
      </div>

      {bubble && !open && (
        <div className={floating} key={line.say}>
          <span aria-hidden="true" className={tail} />
          <div className="relative flex items-start gap-2 py-3 pl-4 pr-2">
            <button
              onClick={() => {
                heard();
                setOpen(true);
              }}
              className="flex-1 text-left text-sm leading-snug text-[var(--ink)]"
            >
              {line.say}
            </button>
            <button
              onClick={() => {
                heard();
                setBubble(false);
              }}
              aria-label="Dismiss"
              className="-mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-[var(--ink-3)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div role="dialog" aria-label="Coco" className={floating}>
          <span aria-hidden="true" className={tail} />
          <div className="relative">
            <div className="flex items-center justify-between border-b border-[var(--rule)] py-1.5 pl-4 pr-1.5">
              <span className="label">Coco · study helper</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close Coco"
                className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--ink-3)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 pt-3">
              <p className="text-sm leading-snug text-[var(--ink)]">{line.say}</p>

              {tipText && (
                <div className="mt-3 rounded-[4px] bg-[var(--yellow-wash)]/60 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="label text-[var(--ink-2)]">Tip</span>
                    {line.tips.length > 1 && (
                      <button
                        onClick={() => setTip(t => t + 1)}
                        className="-my-1 rounded-[3px] px-1.5 py-1 font-mono text-2xs text-[var(--ink-2)] hover:text-[var(--ink)]"
                      >
                        Next tip
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--ink)]">{tipText}</p>
                </div>
              )}
            </div>

            {line.actions.length > 0 && (
              <div className="mt-3 space-y-1 px-2">
                {line.actions.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => act(id)}
                    className="group flex min-h-11 w-full items-center justify-between rounded-[4px] px-2 text-left text-sm font-medium text-[var(--ink)] hover:bg-[var(--paper-3)] sm:min-h-9"
                  >
                    {label}
                    <ArrowRight
                      size={14}
                      className="text-[var(--ink-3)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-[var(--rule)] px-4 py-2">
              <span className="text-2xs text-[var(--ink-3)]">Back any time in Settings.</span>
              <button
                onClick={() => {
                  setOpen(false);
                  onHide();
                }}
                className="rounded-[3px] px-1.5 py-1 font-mono text-2xs text-[var(--ink-2)] hover:text-[var(--ink)]"
              >
                Hide Coco
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
