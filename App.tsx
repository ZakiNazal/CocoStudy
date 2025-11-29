import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import UploadArea from './components/UploadArea';
import StudySession from './components/StudySession';
import { generateSummary, generateFlashcards, generateQuiz } from './services/geminiService';
import { StudySet, ProcessingStatus, ContentType } from './types';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  // Initialize from localStorage or empty array
  const [savedSets, setSavedSets] = useState<StudySet[]>(() => {
    try {
      const saved = localStorage.getItem('coco_study_sets');
      if (saved) {
        // Parse dates correctly
        return JSON.parse(saved, (key, value) => {
          if (key === 'createdAt') return new Date(value);
          return value;
        });
      }
    } catch (e) {
      console.error("Failed to load sets from local storage", e);
    }
    return [];
  });

  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeSet = savedSets.find(s => s.id === activeSetId);

  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('coco_study_sets', JSON.stringify(savedSets));
  }, [savedSets]);

  const handleUpdateSet = (updatedSet: StudySet) => {
    setSavedSets(prev => prev.map(s => s.id === updatedSet.id ? updatedSet : s));
  };

  const handleProcess = async (content: string | File, type: 'text' | 'audio') => {
    setStatus('analyzing');
    
    try {
      let summary = '';
      let inputData: string | { data: string; mimeType: string } = '';

      if (type === 'audio' && content instanceof File) {
        // Convert File to Base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(content);
        });
        
        inputData = { data: base64Data, mimeType: content.type };
        summary = await generateSummary(inputData);
        
      } else if (type === 'text' && typeof content === 'string') {
        inputData = content;
        summary = await generateSummary(content);
      }

      setStatus('generating_flashcards');
      const flashcards = await generateFlashcards(summary);

      setStatus('generating_quiz');
      const quiz = await generateQuiz(summary);

      // Create new set
      const newSet: StudySet = {
        id: Date.now().toString(),
        title: extractTitle(summary) || 'New Study Session',
        createdAt: new Date(),
        summary,
        flashcards,
        quiz,
        originalContent: typeof content === 'string' ? content : null,
        contentType: type === 'audio' ? ContentType.AUDIO : ContentType.TEXT,
        chatHistory: []
      };

      setSavedSets(prev => [newSet, ...prev]);
      setActiveSetId(newSet.id);
      setStatus('complete');

    } catch (error) {
      console.error("Processing failed", error);
      setStatus('error');
      alert("Something went wrong processing your content. Please try again.");
    }
  };

  const extractTitle = (markdown: string): string => {
    const match = markdown.match(/^# (.*$)/m);
    return match ? match[1] : 'Study Note';
  };

  return (
    <HashRouter>
      <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar
            savedSets={savedSets}
            activeSetId={activeSetId}
            onSelectSet={(id) => {
              setActiveSetId(id);
              setIsSidebarOpen(false);
            }}
            onNewSet={() => {
              setActiveSetId(null);
              setIsSidebarOpen(false);
            }}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full relative w-full">
          {!activeSet ? (
             <div className="flex-1 overflow-y-auto">
               <button 
                 className="md:hidden absolute top-6 left-6 p-2 bg-white rounded-lg shadow-sm text-gray-600 z-10"
                 onClick={() => setIsSidebarOpen(true)}
               >
                 <Menu size={24} />
               </button>
               <UploadArea onProcess={handleProcess} status={status} />
             </div>
          ) : (
            <StudySession 
              set={activeSet} 
              onBack={() => setActiveSetId(null)}
              onUpdateSet={handleUpdateSet}
            />
          )}
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
