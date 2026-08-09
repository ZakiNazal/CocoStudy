import { useState } from 'react';
import Sidebar from './components/Sidebar';
import UploadArea from './components/UploadArea';
import StudySession from './components/StudySession';
import { useStudySets } from './store/useStudySets';
import { Menu } from 'lucide-react';

export default function App() {
  const { sets, status, error, createFromFile, createFromText, updateSet, clearError } =
    useStudySets();
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeSet = sets.find(s => s.id === activeSetId) ?? null;

  const handleProcess = async (content: string | File) => {
    const created =
      content instanceof File ? await createFromFile(content) : await createFromText(content);
    if (created) setActiveSetId(created.id);
  };

  return (
    <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          savedSets={sets}
          activeSetId={activeSetId}
          onSelectSet={id => {
            setActiveSetId(id);
            setIsSidebarOpen(false);
          }}
          onNewSet={() => {
            setActiveSetId(null);
            setIsSidebarOpen(false);
          }}
        />
      </div>

      <main className="flex-1 flex flex-col h-full relative w-full bg-background">
        {error && (
          <div
            role="alert"
            className="mx-6 mt-6 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{error}</span>
            <button onClick={clearError} className="font-semibold underline">
              Dismiss
            </button>
          </div>
        )}

        {!activeSet ? (
          <div className="flex-1 h-full overflow-hidden relative">
            <button
              className="md:hidden absolute top-6 left-6 p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-600 z-20"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open library"
            >
              <Menu size={24} />
            </button>
            <UploadArea onProcess={handleProcess} status={status} />
          </div>
        ) : (
          <StudySession
            set={activeSet}
            onBack={() => setActiveSetId(null)}
            onUpdateSet={updateSet}
          />
        )}
      </main>
    </div>
  );
}
