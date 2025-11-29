import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import UploadArea from './components/UploadArea';
import StudySession from './components/StudySession';
import { generateSummary, generateFlashcards, generateQuiz } from './services/geminiService';
import { StudySet, ProcessingStatus, ContentType } from './types';
import { Menu, GraduationCap } from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';
// @ts-ignore
import JSZip from 'jszip';

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

  // --- Document Extraction Helpers ---
  const extractTextFromDocx = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (e) {
      console.error("Docx extraction failed", e);
      throw new Error("Failed to read Word document.");
    }
  };

  const extractTextFromPptx = async (file: File): Promise<string> => {
    try {
      const zip = new JSZip();
      await zip.loadAsync(file);
      
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );
      
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)![1] || '0');
        const numB = parseInt(b.match(/slide(\d+)\.xml/)![1] || '0');
        return numA - numB;
      });

      let fullText = "";
      const parser = new DOMParser();

      for (const filename of slideFiles) {
        const content = await zip.files[filename].async('string');
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const textNodes = xmlDoc.getElementsByTagName("a:t"); 
        
        let slideText = "";
        for (let i = 0; i < textNodes.length; i++) {
          if (textNodes[i].textContent) {
            slideText += textNodes[i].textContent + " ";
          }
        }
        
        if (slideText.trim()) {
           fullText += `[Slide ${filename.match(/slide(\d+)\.xml/)![1]}]\n${slideText}\n\n`;
        }
      }
      return fullText || "No text found in slides.";
    } catch (e) {
      console.error("PPTX extraction failed", e);
      throw new Error("Failed to read PowerPoint file.");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleProcess = async (content: string | File, type: 'text' | 'audio' | 'document') => {
    setStatus('analyzing');
    
    try {
      let summary = '';
      let inputData: string | { data: string; mimeType: string } = '';
      let originalTextForChat = '';

      if (content instanceof File) {
        const fileType = content.type;
        const fileName = content.name.toLowerCase();

        if (type === 'audio' || fileType.startsWith('audio/') || fileType.startsWith('video/')) {
           const base64Data = await fileToBase64(content);
           inputData = { data: base64Data, mimeType: fileType || 'audio/mp3' };
           summary = await generateSummary(inputData);
        } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
           const base64Data = await fileToBase64(content);
           inputData = { data: base64Data, mimeType: 'application/pdf' };
           summary = await generateSummary(inputData);
        } else if (fileName.endsWith('.docx')) {
           const text = await extractTextFromDocx(content);
           inputData = text;
           originalTextForChat = text;
           summary = await generateSummary(text);
        } else if (fileName.endsWith('.pptx')) {
           const text = await extractTextFromPptx(content);
           inputData = text;
           originalTextForChat = text;
           summary = await generateSummary(text);
        } else {
           throw new Error("Unsupported file type");
        }
      } else if (typeof content === 'string') {
        inputData = content;
        originalTextForChat = content;
        summary = await generateSummary(content);
      }

      setStatus('generating_flashcards');
      const flashcards = await generateFlashcards(summary);

      setStatus('generating_quiz');
      const quiz = await generateQuiz(summary);

      const newSet: StudySet = {
        id: Date.now().toString(),
        title: extractTitle(summary) || 'New Study Session',
        createdAt: new Date(),
        summary,
        flashcards,
        quiz,
        originalContent: originalTextForChat || null,
        contentType: type === 'audio' ? ContentType.AUDIO : (type === 'document' ? ContentType.DOCUMENT : ContentType.TEXT),
        chatHistory: []
      };

      setSavedSets(prev => [newSet, ...prev]);
      setActiveSetId(newSet.id);
      setStatus('complete');

    } catch (error: any) {
      console.error("Processing failed", error);
      setStatus('error');
      alert(`Error: ${error.message || "Failed to process content."}`);
    }
  };

  const extractTitle = (markdown: string): string => {
    const match = markdown.match(/^# (.*$)/m);
    return match ? match[1] : 'Study Note';
  };

  return (
    <HashRouter>
      <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30 md:hidden animate-fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
        <main className="flex-1 flex flex-col h-full relative w-full bg-background">
          {!activeSet ? (
             <div className="flex-1 h-full overflow-hidden relative">
               {/* Mobile Menu Trigger */}
               <button 
                 className="md:hidden absolute top-6 left-6 p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-600 z-20"
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