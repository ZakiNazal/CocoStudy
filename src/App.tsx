import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/shell/Sidebar';
import Intake from './components/intake/Intake';
import StudySession from './components/StudySession';
import Banner from './components/ui/Banner';
import Settings from './components/shell/Settings';
import { useStudySets } from './store/useStudySets';
import { useSettings } from './store/useSettings';

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
    clearError,
  } = useStudySets();
  const { meta, update: updateSettings } = useSettings();
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeSet = sets.find(s => s.id === activeSetId) ?? null;

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
          activeSetId={activeSetId}
          onSelectSet={id => {
            setActiveSetId(id);
            setNavOpen(false);
          }}
          onNewSet={() => {
            setActiveSetId(null);
            setNavOpen(false);
          }}
          onOpenSettings={() => {
            setNavOpen(false);
            setSettingsOpen(true);
          }}
        />
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <button
          onClick={() => setNavOpen(v => !v)}
          aria-label={navOpen ? 'Close library' : 'Open library'}
          className="absolute left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink)] md:hidden"
        >
          {navOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

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
      />
    </div>
  );
}
