import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Mic, X, GraduationCap } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface UploadAreaProps {
  onProcess: (content: string | File, type: 'text' | 'audio') => void;
  status: ProcessingStatus;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onProcess, status }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('file');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Simple validation
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        onProcess(file, 'audio');
      } else {
        alert("Please upload an audio or video file.");
      }
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onProcess(textInput, 'text');
    }
  };

  const isLoading = status !== 'idle' && status !== 'complete' && status !== 'error';

  return (
    <div className="max-w-2xl mx-auto mt-12 px-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-3">What are we studying today?</h2>
        <p className="text-gray-500">Upload a lecture recording or paste your notes to get started.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 overflow-hidden border border-white">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-4 font-medium text-sm transition-colors ${
              activeTab === 'file' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-4 font-medium text-sm transition-colors ${
              activeTab === 'text' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Paste Text
          </button>
        </div>

        <div className="p-8 min-h-[300px] flex flex-col justify-center">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {status === 'analyzing' ? 'Listening & Analyzing...' : 
                 status === 'generating_flashcards' ? 'Creating Flashcards...' : 
                 'Crafting Quiz...'}
              </h3>
              <p className="text-gray-400">This might take a moment, Gemini is thinking.</p>
            </div>
          ) : activeTab === 'file' ? (
            <div 
              className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="audio/*,video/*" 
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud size={32} />
              </div>
              <p className="text-gray-800 font-medium mb-1">Click to upload lecture</p>
              <p className="text-sm text-gray-400">MP3, WAV, M4A (Max 20MB)</p>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your raw notes or transcript here..."
                className="w-full h-48 p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 resize-none text-gray-700"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="w-full bg-primary hover:bg-secondary disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Generate Study Set
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <FileText size={16} />
          </div>
          <span>Smart Summaries</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
            <GraduationCap size={16} />
          </div>
          <span>Auto Flashcards</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <Mic size={16} />
          </div>
          <span>Audio to Quiz</span>
        </div>
      </div>
    </div>
  );
};

export default UploadArea;