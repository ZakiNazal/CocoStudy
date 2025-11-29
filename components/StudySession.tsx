import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { StudySet } from '../types';
import { BookOpen, Layers, CheckCircle, MessageSquare, ArrowLeft, RefreshCw, Send, GraduationCap, Edit3, Save, X, Bold, Italic, List, CheckSquare } from 'lucide-react';
import { chatWithContext } from '../services/geminiService';

interface StudySessionProps {
  set: StudySet;
  onBack: () => void;
  onUpdateSet: (updatedSet: StudySet) => void;
}

const StudySession: React.FC<StudySessionProps> = ({ set, onBack, onUpdateSet }) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards' | 'quiz' | 'chat'>('notes');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(set.summary);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<number[]>(new Array(set.quiz.length).fill(-1));
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Chat State
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>(set.chatHistory || []);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync state when props change
  useEffect(() => {
    setEditedSummary(set.summary);
    setChatHistory(set.chatHistory || []);
    // Reset quiz state when set changes
    setQuizAnswers(new Array(set.quiz.length).fill(-1));
    setShowQuizResults(false);
    setCurrentCardIndex(0);
  }, [set.id]);

  // --- Editor Logic ---
  const handleSaveNotes = () => {
    onUpdateSet({ ...set, summary: editedSummary });
    setIsEditing(false);
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = editedSummary;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}${prefix}${selection}${suffix}${after}`;
    setEditedSummary(newText);
    
    // Defer focus restoration
    setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = start + prefix.length;
            textareaRef.current.selectionEnd = end + prefix.length;
        }
    }, 0);
  };

  // --- Flashcard Logic ---
  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % set.flashcards.length);
    }, 200);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + set.flashcards.length) % set.flashcards.length);
    }, 200);
  };

  // --- Quiz Logic ---
  const handleQuizSelect = (questionIndex: number, optionIndex: number) => {
    if (showQuizResults) return;
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = optionIndex;
    setQuizAnswers(newAnswers);
  };

  const calculateScore = () => {
    return quizAnswers.reduce((acc, ans, idx) => {
      return acc + (ans === set.quiz[idx].correctAnswerIndex ? 1 : 0);
    }, 0);
  };

  // --- Chat Logic ---
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    
    const newHistory = [...chatHistory, { role: 'user', text: userMsg } as const];
    setChatHistory(newHistory);
    // Optimistic save
    onUpdateSet({ ...set, chatHistory: newHistory });
    
    setIsChatLoading(true);

    try {
      const historyForApi = newHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }));
      
      const response = await chatWithContext(userMsg, set.summary, historyForApi);
      const assistantMsg = { role: 'model', text: response || "I couldn't generate a response." } as const;
      
      const finalHistory = [...newHistory, assistantMsg];
      setChatHistory(finalHistory);
      onUpdateSet({ ...set, chatHistory: finalHistory });

    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Error connecting to AI." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 max-w-[50%]">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-gray-800 text-lg truncate">{set.title}</h2>
            <p className="text-xs text-gray-500 hidden sm:block">{set.flashcards.length} cards • {set.quiz.length} questions</p>
          </div>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0">
          {(['notes', 'flashcards', 'quiz', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="sm:hidden">
                {tab === 'notes' && <BookOpen size={18} />}
                {tab === 'flashcards' && <Layers size={18} />}
                {tab === 'quiz' && <CheckCircle size={18} />}
                {tab === 'chat' && <MessageSquare size={18} />}
              </span>
              <span className="capitalize hidden sm:inline">{tab}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full">
        {activeTab === 'notes' && (
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm min-h-full animate-fade-in relative">
            
            {!isEditing ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <h1 className="text-3xl font-bold text-gray-800 hidden md:block">{set.title}</h1>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="ml-auto flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors px-4 py-2 rounded-full hover:bg-primary/5"
                  >
                    <Edit3 size={16} /> Edit Notes
                  </button>
                </div>
                <div className="prose prose-pink max-w-none prose-headings:font-bold prose-h1:text-3xl prose-p:text-gray-600 prose-li:text-gray-600">
                  <ReactMarkdown>{set.summary}</ReactMarkdown>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-xl border border-gray-100 sticky top-0 z-10">
                   <button onClick={() => insertMarkdown('**', '**')} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600" title="Bold"><Bold size={18}/></button>
                   <button onClick={() => insertMarkdown('*', '*')} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600" title="Italic"><Italic size={18}/></button>
                   <div className="w-px h-6 bg-gray-300 mx-1"></div>
                   <button onClick={() => insertMarkdown('\n- ')} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600" title="List"><List size={18}/></button>
                   <button onClick={() => insertMarkdown('\n- [ ] ')} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600" title="Checkbox"><CheckSquare size={18}/></button>
                   
                   <div className="flex-1"></div>
                   <button 
                     onClick={() => setIsEditing(false)}
                     className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-200 rounded-lg text-sm flex items-center gap-2"
                   >
                     <X size={16} /> Cancel
                   </button>
                   <button 
                     onClick={handleSaveNotes}
                     className="px-4 py-2 bg-primary text-white font-medium rounded-lg text-sm flex items-center gap-2 hover:bg-secondary shadow-md shadow-primary/20"
                   >
                     <Save size={16} /> Save Changes
                   </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full h-[600px] p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 resize-none font-mono text-sm leading-relaxed"
                  placeholder="Start typing your notes..."
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="h-full flex flex-col items-center justify-center animate-fade-in py-10">
            <div className="relative w-full max-w-xl aspect-[3/2] perspective-1000 group">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`w-full h-full relative preserve-3d transition-transform duration-500 cursor-pointer ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-xl shadow-gray-200 flex items-center justify-center p-10 border border-gray-100 text-center hover:shadow-2xl transition-shadow">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 block">Question</span>
                    <h3 className="text-2xl font-bold text-gray-800 leading-snug">{set.flashcards[currentCardIndex].front}</h3>
                  </div>
                  <div className="absolute bottom-8 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Tap to flip
                  </div>
                </div>

                {/* Back */}
                <div 
                  className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary to-secondary rounded-[2rem] shadow-xl shadow-primary/30 flex items-center justify-center p-10 text-white text-center rotate-y-180"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                >
                  <div>
                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest mb-6 block">Answer</span>
                    <p className="text-xl font-medium leading-relaxed">{set.flashcards[currentCardIndex].back}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 mt-12">
              <button 
                onClick={handlePrevCard}
                className="p-4 bg-white rounded-full shadow-lg shadow-gray-100 hover:shadow-xl hover:scale-105 transition-all text-gray-600 border border-gray-50"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex flex-col items-center">
                 <span className="font-bold text-gray-800 text-lg">
                    {currentCardIndex + 1} <span className="text-gray-400 text-sm font-normal mx-1">/</span> {set.flashcards.length}
                 </span>
              </div>
              <button 
                onClick={handleNextCard}
                className="p-4 bg-primary text-white rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all"
              >
                <ArrowLeft size={24} className="rotate-180" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-slide-up pb-20">
            {showQuizResults && (
              <div className="bg-white p-8 rounded-3xl shadow-sm text-center mb-8 border border-green-100 bg-green-50/50">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 shadow-sm">
                  <GraduationCap size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
                <p className="text-gray-500 mb-6">You scored <span className="text-primary font-bold text-xl">{calculateScore()}</span> out of <span className="font-bold">{set.quiz.length}</span></p>
                <button 
                  onClick={() => {
                    setShowQuizResults(false);
                    setQuizAnswers(new Array(set.quiz.length).fill(-1));
                  }}
                  className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto border border-gray-200 shadow-sm"
                >
                  <RefreshCw size={18} /> Retry Quiz
                </button>
              </div>
            )}

            {set.quiz.map((q, qIdx) => (
              <div key={q.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100/50">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex gap-4 leading-relaxed">
                  <span className="bg-primary/10 text-primary w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm">{qIdx + 1}</span>
                  {q.question}
                </h3>
                <div className="space-y-3 pl-12">
                  {q.options.map((opt, oIdx) => {
                    let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all font-medium relative ";
                    if (showQuizResults) {
                      if (oIdx === q.correctAnswerIndex) btnClass += "border-green-500 bg-green-50 text-green-700";
                      else if (quizAnswers[qIdx] === oIdx) btnClass += "border-red-500 bg-red-50 text-red-700";
                      else btnClass += "border-gray-100 text-gray-400 opacity-50";
                    } else {
                      if (quizAnswers[qIdx] === oIdx) btnClass += "border-primary bg-primary/5 text-primary shadow-sm";
                      else btnClass += "border-gray-100 hover:border-gray-300 text-gray-600 hover:bg-gray-50";
                    }

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleQuizSelect(qIdx, oIdx)}
                        className={btnClass}
                      >
                        <div className="flex justify-between items-center z-10 relative">
                          <span>{opt}</span>
                          {showQuizResults && oIdx === q.correctAnswerIndex && <CheckCircle size={20} className="text-green-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {showQuizResults && (
                  <div className="mt-6 ml-12 p-5 bg-blue-50 text-blue-800 rounded-2xl text-sm leading-relaxed border border-blue-100">
                    <strong className="block mb-1 text-blue-900">Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
            
            {!showQuizResults && (
              <button
                onClick={() => setShowQuizResults(true)}
                disabled={quizAnswers.includes(-1)}
                className="w-full bg-primary hover:bg-secondary disabled:bg-gray-300 disabled:shadow-none text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/30 transition-all sticky bottom-6 hover:scale-[1.01]"
              >
                Submit Quiz
              </button>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={24} className="opacity-50"/>
                  </div>
                  <p className="font-medium">Ask me anything about your notes!</p>
                  <p className="text-xs mt-2 opacity-60">I can help clarify concepts or create examples.</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-5 py-4 rounded-2xl rounded-bl-none">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask a question..."
                className="flex-1 px-5 py-4 rounded-xl border-none focus:ring-2 focus:ring-primary/50 bg-white shadow-sm text-gray-700 placeholder-gray-400"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="p-4 bg-primary text-white rounded-xl hover:bg-secondary disabled:bg-gray-300 disabled:shadow-none transition-all shadow-md shadow-primary/20 hover:scale-105"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudySession;
