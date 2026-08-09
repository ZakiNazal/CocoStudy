import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { Plus, Search, Settings } from 'lucide-react';
import { gsap, DUR, EASE, STAGGER, prefersReducedMotion } from '../../lib/motion';
import { setMastery } from '../../lib/mastery';
import { isDue } from '../../lib/srs';
import MasteryBar from '../ui/MasteryBar';
import type { StudySet } from '../../types';

interface SidebarProps {
  sets: StudySet[];
  activeSetId: string | null;
  onSelectSet: (id: string) => void;
  onNewSet: () => void;
  onOpenSettings: () => void;
}

function dueCount(set: StudySet, now: Date): number {
  return set.flashcards.filter(c => isDue(c.srs, now)).length;
}

export default function Sidebar({
  sets,
  activeSetId,
  onSelectSet,
  onNewSet,
  onOpenSettings,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const now = new Date();

  const filtered = sets.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
  const totalDue = sets.reduce((sum, s) => sum + dueCount(s, now), 0);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-row]', {
        opacity: 0,
        x: -8,
        duration: DUR.base,
        ease: EASE.out,
        stagger: STAGGER.micro,
      });
    },
    { scope: root, dependencies: [sets.length] },
  );

  return (
    <div
      ref={root}
      className="flex h-full w-[17.5rem] flex-col border-r border-[var(--rule)] bg-[var(--paper-2)]"
    >
      {/* Masthead */}
      <div className="border-b border-[var(--rule)] px-5 py-5">
        <div className="flex items-baseline justify-between">
          <h1 className="display text-lg tracking-[-0.02em]">CocoStudy</h1>
          {totalDue > 0 && (
            <span
              className="numeral px-1.5 py-0.5 text-2xs font-bold text-[var(--ink)]"
              style={{ background: 'var(--pink-wash)' }}
              title={`${totalDue} cards due for review`}
            >
              {totalDue} due
            </span>
          )}
        </div>
        <p className="label mt-1">Marked up as you learn</p>
      </div>

      {/* Actions */}
      <div className="space-y-3 px-5 py-4">
        <button
          onClick={onNewSet}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-[var(--ink)] font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--paper)] transition-[background-color,transform] duration-150 hover:bg-[var(--ink-2)] active:scale-[0.97]"
        >
          <Plus size={15} strokeWidth={2.5} />
          New set
        </button>

        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search your library"
            className="h-9 w-full rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] pl-8 pr-3 font-mono text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--ink)] focus:outline-none"
          />
        </div>
      </div>

      {/* Library */}
      <div className="flex items-center justify-between border-y border-[var(--rule)] px-5 py-2">
        <span className="label">Library</span>
        <span className="numeral text-2xs text-[var(--ink-3)]">{sets.length}</span>
      </div>

      <nav className="flex-1 overflow-y-auto" aria-label="Study sets">
        {sets.length === 0 ? (
          <div className="px-5 py-10">
            <p className="text-sm text-[var(--ink-2)]">Nothing here yet.</p>
            <p className="mt-1 text-sm text-[var(--ink-3)]">
              Drop in a lecture or paste your notes to start a set.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--ink-3)]">
            No sets match “{query}”.
          </p>
        ) : (
          filtered.map(set => {
            const active = set.id === activeSetId;
            const due = dueCount(set, now);
            const mastery = Math.round(setMastery(set.flashcards) * 100);

            return (
              <button
                key={set.id}
                data-row
                onClick={() => onSelectSet(set.id)}
                aria-current={active ? 'true' : undefined}
                className={`relative block w-full border-b border-[var(--rule)] px-5 py-3 text-left transition-colors duration-150 ${
                  active ? 'bg-[var(--paper-3)]' : 'hover:bg-[var(--paper-3)]/60'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{ background: 'var(--ink)' }}
                  />
                )}

                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[var(--ink)]">
                    {set.title}
                  </span>
                  {due > 0 && (
                    <span
                      className="numeral shrink-0 px-1 text-2xs font-bold text-[var(--ink)]"
                      style={{ background: 'var(--pink-wash)' }}
                    >
                      {due}
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  <span className="numeral text-2xs text-[var(--ink-3)]">
                    {set.flashcards.length} cards
                  </span>
                  <span className="text-2xs text-[var(--ink-3)]">·</span>
                  <span className="numeral text-2xs text-[var(--ink-3)]">{mastery}%</span>
                </div>

                <MasteryBar cards={set.flashcards} height={3} className="mt-2" />
              </button>
            );
          })
        )}
      </nav>

      <div className="border-t border-[var(--rule)] px-5 py-3">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  );
}
