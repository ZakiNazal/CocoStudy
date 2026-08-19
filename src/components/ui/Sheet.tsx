import { useEffect, useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { X } from 'lucide-react';
import { gsap, DUR, EASE, shouldAnimate } from '../../lib/motion';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A right-edge panel over a scrim.
 *
 * The panel's resting state is its finished state — open and at x:0 — so a
 * skipped entrance (reduced motion, background tab) still renders correctly.
 */
export default function Sheet({ open, title, onClose, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useGSAP(
    () => {
      if (!open || !shouldAnimate()) return;
      gsap.from(scrim.current, { opacity: 0, duration: DUR.quick });
      gsap.from(panel.current, { xPercent: 100, duration: DUR.base, ease: EASE.out });
    },
    { dependencies: [open] },
  );

  // Move focus into the sheet so keyboard and screen-reader users land inside it.
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        ref={scrim}
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-[var(--ink)]/30"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full max-w-[27rem] flex-col border-l border-[var(--rule)] bg-[var(--paper-2)] shadow-[-8px_0_32px_rgba(0,0,0,0.12)]"
      >
        <header className="flex items-center justify-between border-b border-[var(--rule)] px-6 py-5">
          <h2 ref={heading} tabIndex={-1} className="display text-lg">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--ink-3)] transition-colors hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="pb-safe [--pb-base:1.5rem] min-h-0 flex-1 overflow-y-auto px-6 pt-6">{children}</div>
      </div>
    </div>
  );
}
