import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { gsap, DUR, EASE, STAGGER, shouldAnimate } from '../../lib/motion';
import { setMastery } from '../../lib/mastery';
import { isDue } from '../../lib/srs';
import { groupSets, MAX_FOLDER_NAME } from '../../lib/folders';
import { nextTheme, normalizeTheme, type Theme } from '../../lib/theme';
import MasteryBar from '../ui/MasteryBar';
import type { Folder, StudySet } from '../../types';

interface SidebarProps {
  sets: StudySet[];
  folders: Folder[];
  activeSetId: string | null;
  onSelectSet: (id: string) => void;
  onNewSet: () => void;
  onOpenSettings: () => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveSet: (setId: string, folderId: string | null) => void;
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
}

/** The two footer controls read as one pair, so they share a face. */
const footerButton =
  'flex h-8 items-center gap-2 rounded-[4px] border border-[var(--rule)] font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors duration-150 hover:border-[var(--ink)] hover:text-[var(--ink)]';

/** The name field used for both creating and renaming, so they read alike. */
const nameInput =
  'h-7 w-full rounded-[4px] border border-[var(--ink)] bg-[var(--paper)] px-2 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink)] focus:outline-none';

const menuItem =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors duration-100 hover:bg-[var(--paper-3)] hover:text-[var(--ink)]';

function dueCount(set: StudySet, now: Date): number {
  return set.flashcards.filter(c => isDue(c.srs, now)).length;
}

export default function Sidebar({
  sets,
  folders,
  activeSetId,
  onSelectSet,
  onNewSet,
  onOpenSettings,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveSet,
  theme,
  onChangeTheme,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const [setMenu, setSetMenu] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const now = new Date();

  const searching = query.trim().length > 0;
  const filtered = sets.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
  const totalDue = sets.reduce((sum, s) => sum + dueCount(s, now), 0);
  // The icon names the palette you would switch to, the way a light switch
  // shows its destination rather than the room you are standing in.
  const dark = normalizeTheme(theme) === 'dark';

  // A search cuts across the shelves, so its results are one flat list. Filing
  // stays put — the groups come back the moment the field is cleared.
  const groups = groupSets(sets, folders);

  // Escape backs out of whatever is open. The ref is what keeps the blur that
  // follows an unmounting input from committing the name you just abandoned.
  const cancelled = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      cancelled.current = true;
      setCreating(false);
      setRenamingId(null);
      setDraft('');
      setFolderMenu(null);
      setSetMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useGSAP(
    () => {
      if (!shouldAnimate()) return;
      gsap.from('[data-row]', {
        opacity: 0,
        x: -8,
        duration: DUR.base,
        ease: EASE.out,
        stagger: STAGGER.micro,
      });
    },
    { scope: root, dependencies: [sets.length, folders.length] },
  );

  const closeMenus = () => {
    setFolderMenu(null);
    setSetMenu(null);
  };

  const toggle = (id: string) =>
    setCollapsed(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const commitNew = () => {
    if (!cancelled.current) onCreateFolder(draft);
    setDraft('');
    setCreating(false);
  };

  const commitRename = (id: string) => {
    if (!cancelled.current) onRenameFolder(id, draft);
    setDraft('');
    setRenamingId(null);
  };

  /** The destinations a set can be filed under, minus where it already sits. */
  const destinations = (set: StudySet) => [
    ...folders.filter(f => f.id !== set.folderId),
    ...(set.folderId ? [null] : []),
  ];

  function renderSet(set: StudySet) {
    const active = set.id === activeSetId;
    const due = dueCount(set, now);
    const mastery = Math.round(setMastery(set.flashcards) * 100);
    const open = setMenu === set.id;

    return (
      <div
        key={set.id}
        data-row
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('text/plain', set.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDropTarget(null)}
        className={`group relative border-b border-[var(--rule)] transition-colors duration-150 ${
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

        <button
          onClick={() => onSelectSet(set.id)}
          aria-current={active ? 'true' : undefined}
          className="block w-full px-5 py-3 pr-10 text-left"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-[var(--ink)]">{set.title}</span>
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

        <button
          onClick={() => setSetMenu(open ? null : set.id)}
          aria-label={`File “${set.title}” in a folder`}
          aria-expanded={open}
          className={`absolute right-2 top-2.5 flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--ink-3)] transition-opacity duration-150 hover:bg-[var(--paper)] hover:text-[var(--ink)] focus:opacity-100 ${
            open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <MoreHorizontal size={14} />
        </button>

        {open && (
          <>
            <button
              aria-label="Close menu"
              onClick={closeMenus}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute right-2 top-9 z-50 w-48 border border-[var(--rule)] bg-[var(--paper-2)] py-1 shadow-lg">
              <p className="label px-3 py-1 text-[var(--ink-3)]">Move to</p>
              {destinations(set).map(folder => (
                <button
                  key={folder?.id ?? 'unfiled'}
                  onClick={() => {
                    onMoveSet(set.id, folder?.id ?? null);
                    closeMenus();
                  }}
                  className={menuItem}
                >
                  <span className="truncate">{folder ? folder.name : 'Unfiled'}</span>
                </button>
              ))}
              {destinations(set).length === 0 && (
                <p className="px-3 py-1.5 text-2xs text-[var(--ink-3)]">
                  No folders yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderGroup(folder: Folder | null, groupSetsList: StudySet[]) {
    const id = folder?.id ?? 'unfiled';
    const shut = collapsed.has(id);
    const open = folderMenu === id;
    const over = dropTarget === id;

    return (
      <section key={id}>
        <div
          onDragOver={e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTarget(id);
          }}
          onDragLeave={() => setDropTarget(current => (current === id ? null : current))}
          onDrop={e => {
            e.preventDefault();
            const setId = e.dataTransfer.getData('text/plain');
            if (setId) onMoveSet(setId, folder?.id ?? null);
            setDropTarget(null);
          }}
          className={`relative flex items-center gap-1.5 border-b border-[var(--rule)] px-3 py-1.5 transition-colors duration-150 ${
            over ? 'bg-[var(--pink-wash)]' : 'bg-[var(--paper-2)]'
          }`}
        >
          {renamingId === id && folder ? (
            <input
              autoFocus
              value={draft}
              maxLength={MAX_FOLDER_NAME}
              onChange={e => setDraft(e.target.value)}
              onBlur={() => commitRename(folder.id)}
              onKeyDown={e => e.key === 'Enter' && commitRename(folder.id)}
              aria-label="Folder name"
              className={nameInput}
            />
          ) : (
            <>
              <button
                onClick={() => toggle(id)}
                aria-expanded={!shut}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                {shut ? (
                  <ChevronRight size={13} className="shrink-0 text-[var(--ink-3)]" />
                ) : (
                  <ChevronDown size={13} className="shrink-0 text-[var(--ink-3)]" />
                )}
                <span className="label truncate">{folder ? folder.name : 'Unfiled'}</span>
                <span className="numeral ml-auto pl-2 text-2xs text-[var(--ink-3)]">
                  {groupSetsList.length}
                </span>
              </button>

              {folder && (
                <button
                  onClick={() => setFolderMenu(open ? null : id)}
                  aria-label={`Options for “${folder.name}”`}
                  aria-expanded={open}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[var(--ink-3)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                >
                  <MoreHorizontal size={13} />
                </button>
              )}
            </>
          )}

          {open && folder && (
            <>
              <button
                aria-label="Close menu"
                onClick={closeMenus}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-2 top-7 z-50 w-40 border border-[var(--rule)] bg-[var(--paper-2)] py-1 shadow-lg">
                <button
                  onClick={() => {
                    cancelled.current = false;
                    setDraft(folder.name);
                    setRenamingId(id);
                    closeMenus();
                  }}
                  className={menuItem}
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    onDeleteFolder(folder.id);
                    closeMenus();
                  }}
                  className={menuItem}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>

        {!shut &&
          (groupSetsList.length > 0 ? (
            groupSetsList.map(renderSet)
          ) : (
            <p className="border-b border-[var(--rule)] px-5 py-3 text-2xs text-[var(--ink-3)]">
              {folder ? 'Drag a set here to file it.' : 'Everything is filed.'}
            </p>
          ))}
      </section>
    );
  }

  return (
    <div
      ref={root}
      className="flex h-full w-[17.5rem] flex-col border-r border-[var(--rule)] bg-[var(--paper-2)]"
    >
      {/* Masthead */}
      <div className="border-b border-[var(--rule)] px-5 py-5">
        {/* The cropped mark, so the box it sits in is the size it reads at —
            the full logo is mostly glow and would sit smaller than the word. */}
        <div className="flex items-center gap-2.5">
          {/* The mark leads: a 36px box holds 32px of ink, close to twice the
              word's 17.1px cap-to-descender span. */}
          <img src="/mark.png" alt="" className="h-9 w-9 shrink-0" />
          <h1 className="display text-xl leading-none tracking-[-0.02em]">CocoStudy</h1>
        </div>
        <p className="label mt-3">Marked up as you learn</p>
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
      <div className="flex items-center justify-between gap-2 border-y border-[var(--rule)] px-5 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="label">Library</span>
          {totalDue > 0 && (
            <span
              className="numeral shrink-0 whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-2xs font-bold text-[var(--ink)]"
              style={{ background: 'var(--pink-wash)' }}
              title={`${totalDue} cards due for review`}
            >
              {totalDue} due
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              cancelled.current = false;
              setDraft('');
              setCreating(true);
            }}
            aria-label="New folder"
            title="New folder"
            className="flex h-5 w-5 items-center justify-center rounded-[4px] text-[var(--ink-3)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
          >
            <FolderPlus size={14} />
          </button>
          <span className="numeral text-2xs text-[var(--ink-3)]">{sets.length}</span>
        </div>
      </div>

      {creating && (
        <div className="border-b border-[var(--rule)] px-3 py-1.5">
          <input
            autoFocus
            value={draft}
            maxLength={MAX_FOLDER_NAME}
            placeholder="Folder name"
            onChange={e => setDraft(e.target.value)}
            onBlur={commitNew}
            onKeyDown={e => e.key === 'Enter' && commitNew()}
            aria-label="New folder name"
            className={nameInput}
          />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto" aria-label="Study sets">
        {sets.length === 0 ? (
          <div className="px-5 py-10">
            <p className="text-sm text-[var(--ink-2)]">Nothing here yet.</p>
            <p className="mt-1 text-sm text-[var(--ink-3)]">
              Drop in a lecture or paste your notes to start a set.
            </p>
          </div>
        ) : searching ? (
          filtered.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[var(--ink-3)]">No sets match “{query}”.</p>
          ) : (
            filtered.map(renderSet)
          )
        ) : folders.length === 0 ? (
          // One shelf needs no label. Folders only appear once you make one.
          sets.map(renderSet)
        ) : (
          groups.map(g => renderGroup(g.folder, g.sets))
        )}
      </nav>

      <div className="flex items-center gap-2 border-t border-[var(--rule)] px-5 py-3">
        <button onClick={onOpenSettings} className={`${footerButton} px-2.5`}>
          <Settings size={14} />
          Settings
        </button>

        <button
          onClick={() => onChangeTheme(nextTheme(theme))}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`${footerButton} ml-auto w-8 justify-center`}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  );
}
