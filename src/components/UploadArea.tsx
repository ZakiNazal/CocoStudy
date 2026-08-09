import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, Music, FileType, GraduationCap } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface UploadAreaProps {
  onProcess: (content: string | File, type: 'text' | 'audio' | 'document') => void;
  status: ProcessingStatus;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onProcess, status }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('file');
  const [textInput, setTextInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const type = file.type;
    const name = file.name.toLowerCase();

    // Check for Audio/Video
    if (type.startsWith('audio/') || type.startsWith('video/')) {
      onProcess(file, 'audio');
      return;
    }
    
    // Check for PDF, Docx, PPTX, Images
    if (
      type === 'application/pdf' || 
      name.endsWith('.pdf') ||
      name.endsWith('.docx') || 
      name.endsWith('.pptx') ||
      name.endsWith('.doc') ||
      name.endsWith('.ppt') 
    ) {
      onProcess(file, 'document');
      return;
    }

    alert("Please upload a supported file: Audio, Video, PDF, Word (.docx), PowerPoint (.pptx).");
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onProcess(textInput, 'text');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const isLoading = status !== 'idle' && status !== 'complete' && status !== 'error';

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background/50">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center justify-center min-h-full">
        
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Sparkles size={14} className="text-primary" />
            <span>AI-Powered Study Companion</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            What are we <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">mastering</span> today?
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Upload your lecture notes, recordings, or slides. Gemini AI will transform them into summaries, quizzes, and flashcards instantly.
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-soft border border-white p-2 animate-scale-in">
          
          {/* Tabs */}
          <div className="flex p-1.5 bg-gray-50 rounded-[2rem] mb-2 relative">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-3 rounded-[1.8rem] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 z-10 ${
                activeTab === 'file' 
                  ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UploadCloud size={18} className={activeTab === 'file' ? 'text-primary' : ''} />
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-3 rounded-[1.8rem] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 z-10 ${
                activeTab === 'text' 
                  ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={18} className={activeTab === 'text' ? 'text-primary' : ''} />
              Paste Text
            </button>
          </div>

          <div className="p-6 md:p-8">
            {isLoading ? (
              <div className="py-16 text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                   <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                     <Sparkles size={32} className="text-primary animate-pulse" />
                   </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {status === 'analyzing' ? 'Reading your materials...' : 
                   status === 'generating_flashcards' ? 'Creating flashcards...' : 
                   'Drafting the final quiz...'}
                </h3>
                <p className="text-gray-400">This usually takes about 10-20 seconds. Bring your coffee and wait.</p>
              </div>
            ) : activeTab === 'file' ? (
              <div 
                className={`relative border-3 border-dashed rounded-[2rem] p-12 text-center transition-all duration-300 cursor-pointer group ${
                  dragActive 
                    ? 'border-primary bg-primary/5 scale-[0.99]' 
                    : 'border-gray-100 hover:border-primary/50 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="audio/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" 
                  onChange={handleFileChange}
                />
                
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <UploadCloud size={40} className="text-primary" />
                </div>
                
                <p className="text-xl font-bold text-gray-800 mb-2">
                  Click or drag file to upload
                </p>
                <p className="text-sm text-gray-400 max-w-xs mx-auto mb-8">
                  Supports PDF, PowerPoint, Word, and Audio files (lectures, meetings).
                </p>

                <div className="flex items-center justify-center gap-4 opacity-60">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                        <FileType size={14} className="text-red-400"/> PDF
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                        <Music size={14} className="text-purple-400"/> MP3
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                        <FileText size={14} className="text-blue-400"/> DOCX
                    </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="# Paste your notes here...&#10;&#10;Or any text you want to learn from. Markdown is supported."
                  className="w-full h-64 p-6 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 resize-none text-gray-700 placeholder-gray-400 text-base leading-relaxed"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Generate Study Set
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl px-4">
            <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
                    <Sparkles size={18}/>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">Smart Summaries</h3>
                <p className="text-xs text-gray-500 mt-1">Converts clutter into clear, structured notes.</p>
            </div>
            <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                    <GraduationCap size={18}/>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">Active Recall</h3>
                <p className="text-xs text-gray-500 mt-1">Auto-generated flashcards for better understanding.</p>
            </div>
            <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                    <FileType size={18}/>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">Multi-Format</h3>
                <p className="text-xs text-gray-500 mt-1">Upload slides, docs, or audio lectures.</p>
            </div>
        </div>
        <div className="mt-10 text-xs text-gray-400">
          <p>Powered by Google Gemini AI • Built with ❤️ by CocoStudyAI Team</p>
        </div>
      </div>
    </div>
  );
};

export default UploadArea;