import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/shell/Sidebar';
import Intake from './components/intake/Intake';
import StudySession from './components/StudySession';
import Banner from './components/ui/Banner';
import Settings from './components/shell/Settings';
import { useStudySets } from './store/useStudySets';
import { useSettings } from './store/useSettings';
import { addFolder, removeFolder, renameFolder } from './lib/folders';

export default function App() {
  const {
    sets,
    status,
    error,
    createFromFile,
    createFromText,
    gradeCard,
    loadDemoSet,
    updateSet,
    moveSetToFolder,
    unfileFolder,
    refresh,
    clearError,
  } = useStudySets();
  const { meta, update: updateSettings } = useSettings();
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeSet = sets.find(s => s.id === activeSetId) ?? null;
  const folders = meta?.folders ?? [];

  /* The drawer is a modal surface on a phone, so it closes the way every other
     one does. Without this, Escape does nothing and the page behind it scrolls
     under your finger while the library is open on top. */
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [navOpen]);

  /** Deleting a shelf empties it onto Unfiled — the sets themselves survive. */
  const handleDeleteFolder = async (id: string) => {
    await unfileFolder(id);
    await updateSettings({ folders: removeFolder(folders, id) });
  };

  const handleProcess = async (content: string | File) => {
    const created =
      content instanceof File ? await createFromFile(content) : await createFromText(content);
    if (created) setActiveSetId(created.id);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--paper)]">
      {/* Mobile scrim */}
      {navOpen && (
        <button
          aria-label="Close library"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-[var(--ink)]/25 md:hidden"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:relative md:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          sets={sets}
          folders={folders}
          onCreateFolder={name =>
            void updateSettings({ folders: addFolder(folders, name, new Date()).folders })
          }
          onRenameFolder={(id, name) =>
            void updateSettings({ folders: renameFolder(folders, id, name) })
          }
          onDeleteFolder={id => void handleDeleteFolder(id)}
          onMoveSet={(setId, folderId) => void moveSetToFolder(setId, folderId)}
          activeSetId={activeSetId}
          onSelectSet={id => {
            setActiveSetId(id);
            setNavOpen(false);
          }}
          onNewSet={() => {
            setActiveSetId(null);
            setNavOpen(false);
          }}
          onCloseNav={() => setNavOpen(false)}
          onOpenSettings={() => {
            setNavOpen(false);
            setSettingsOpen(true);
          }}
          theme={meta?.theme ?? 'light'}
          onChangeTheme={theme => void updateSettings({ theme })}
        />
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col">
        {/*
         * Only while the library is shut. Open, it sat on top of the drawer's
         * own masthead and covered the mark; the way out belongs inside the
         * drawer, next to the name it belongs to.
         */}
        {!navOpen && (
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open library"
            aria-expanded={false}
            className="absolute left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink)] active:bg-[var(--paper-3)] md:hidden"
          >
            <Menu size={18} />
          </button>
        )}

        {error && (
          <div className="px-6 pt-6">
            <Banner tone="error" onDismiss={clearError}>
              {error}
            </Banner>
          </div>
        )}

        <div className="min-h-0 flex-1">
          {activeSet ? (
            <StudySession
              set={activeSet}
              onBack={() => setActiveSetId(null)}
              onUpdateSet={updateSet}
              onGradeCard={gradeCard}
            />
          ) : (
            <Intake
              onProcess={handleProcess}
              onLoadDemo={async () => setActiveSetId((await loadDemoSet()).id)}
              hasSets={sets.length > 0}
              status={status}
            />
          )}
        </div>
      </main>

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        meta={meta}
        onUpdate={updateSettings}
        sets={sets}
        onRestored={refresh}
      />
    </div>
  );
}
