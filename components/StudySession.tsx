import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { StudySet } from '../types';
import { BookOpen, Layers, CheckCircle, Sparkles, ArrowLeft, RefreshCw, Send, GraduationCap, Edit3, Save, X, Bold, Italic, List, CheckSquare, Lightbulb, MoreHorizontal } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

      {/* Header */}
      <div className="px-6 md:px-10 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-md transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-gray-900 text-xl tracking-tight leading-none">{set.title}</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wide">
                    {set.contentType}
                </span>
                <span className="text-xs text-gray-400">Created {new Date(set.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        {/* Floating Navigation Pill */}
        <div className="hidden md:flex bg-white/80 backdrop-blur-md p-1.5 rounded-full border border-white shadow-soft">
          {(['notes', 'flashcards', 'quiz', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-sm font-bold rounded-full transition-all duration-300 flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab === 'notes' && <BookOpen size={16} />}
              {tab === 'flashcards' && <Layers size={16} />}
              {tab === 'quiz' && <CheckCircle size={16} />}
              {tab === 'chat' && <Sparkles size={16} />}
              <span className="capitalize">{tab === 'chat' ? 'AI Tutor' : tab}</span>
            </button>
          ))}
        </div>
        
        {/* Mobile Nav Button (Placeholder for simplicity, standard mobile users use bottom or top simple nav) */}
        <button className="md:hidden p-2 text-gray-600">
             <MoreHorizontal />
        </button>
      </div>

      {/* Mobile Nav (Visible only on small screens) */}
      <div className="md:hidden flex overflow-x-auto px-6 gap-2 pb-4 no-scrollbar">
           {(['notes', 'flashcards', 'quiz', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-white border border-gray-100 text-gray-500'
              }`}
            >
              {tab === 'chat' ? 'AI Tutor' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-10 z-0">
        <div className="max-w-5xl mx-auto h-full">
          
          {activeTab === 'notes' && (
            <div className="bg-white p-8 md:p-14 rounded-[2.5rem] shadow-soft border border-white min-h-[calc(100%-2rem)] animate-slide-up relative overflow-hidden group">
               {/* Decorative top gradient */}
               <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>

              {!isEditing ? (
                <>
                  <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">Study Notes</h1>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary transition-colors px-4 py-2 rounded-full bg-gray-50 hover:bg-primary/5"
                    >
                      <Edit3 size={16} /> Edit
                    </button>
                  </div>
                  <div className="prose prose-lg prose-gray max-w-none 
                    prose-headings:font-bold prose-headings:text-gray-900 
                    prose-p:text-gray-600 prose-p:leading-relaxed 
                    prose-strong:text-primary prose-strong:font-bold
                    prose-li:text-gray-600 prose-li:marker:text-primary/50
                    prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                  ">
                    <ReactMarkdown>{set.summary}</ReactMarkdown>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-xl border border-gray-100 sticky top-0 z-10 shadow-sm">
                     <button onClick={() => insertMarkdown('**', '**')} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all" title="Bold"><Bold size={18}/></button>
                     <button onClick={() => insertMarkdown('*', '*')} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all" title="Italic"><Italic size={18}/></button>
                     <div className="w-px h-6 bg-gray-200 mx-1"></div>
                     <button onClick={() => insertMarkdown('\n- ')} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all" title="List"><List size={18}/></button>
                     <button onClick={() => insertMarkdown('\n- [ ] ')} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-600 transition-all" title="Checkbox"><CheckSquare size={18}/></button>
                     
                     <div className="flex-1"></div>
                     <button 
                       onClick={() => setIsEditing(false)}
                       className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-200 rounded-lg text-sm flex items-center gap-2"
                     >
                       <X size={16} /> Cancel
                     </button>
                     <button 
                       onClick={handleSaveNotes}
                       className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg text-sm flex items-center gap-2 hover:bg-black shadow-lg shadow-gray-300"
                     >
                       <Save size={16} /> Save
                     </button>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="w-full h-[600px] p-6 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 resize-none font-mono text-sm leading-relaxed text-gray-700"
                    placeholder="Start typing your notes..."
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div className="h-full flex flex-col items-center justify-center animate-fade-in py-6 md:py-12">
              <div className="w-full max-w-2xl relative">
                  {/* Stack effect behind card */}
                  <div className="absolute top-4 left-4 right-4 bottom-0 bg-white/40 rounded-[2.5rem] shadow-sm transform scale-95 translate-y-2 z-0"></div>
                  <div className="absolute top-8 left-8 right-8 bottom-0 bg-white/20 rounded-[2.5rem] shadow-sm transform scale-90 translate-y-4 z-0"></div>

                  <div className="relative aspect-[3/2] perspective-1000 group z-10">
                    <div
                        onClick={() => setIsFlipped(!isFlipped)}
                        className={`w-full h-full relative preserve-3d transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) cursor-pointer ${
                        isFlipped ? 'rotate-y-180' : ''
                        }`}
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* Front */}
                        <div 
                           className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] shadow-soft border border-white flex flex-col items-center justify-center p-8 md:p-16 text-center hover:shadow-glow transition-shadow duration-300"
                           style={{ backfaceVisibility: 'hidden' }}
                        >
                           <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                                <Sparkles size={24} />
                           </div>
                           <h3 className="text-2xl md:text-3xl font-bold text-gray-800 leading-snug select-none">
                                {set.flashcards[currentCardIndex].front}
                           </h3>
                           <div className="absolute bottom-8 flex flex-col items-center gap-2 opacity-40">
                                <div className="text-[10px] font-bold uppercase tracking-widest">Question</div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                           </div>
                        </div>

                        {/* Back */}
                        <div 
                        className="absolute inset-0 backface-hidden bg-gray-900 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-8 md:p-16 text-center rotate-y-180 text-white"
                        style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                        >
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-white">
                                <Lightbulb size={24} />
                            </div>
                            <p className="text-xl md:text-2xl font-medium leading-relaxed select-none text-gray-100">
                                {set.flashcards[currentCardIndex].back}
                            </p>
                             <div className="absolute bottom-8 flex flex-col items-center gap-2 opacity-40">
                                <div className="text-[10px] font-bold uppercase tracking-widest">Answer</div>
                           </div>
                        </div>
                    </div>
                  </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6 mt-12 bg-white px-6 py-3 rounded-full shadow-lg shadow-gray-200/50 border border-gray-100">
                <button 
                  onClick={handlePrevCard}
                  className="p-3 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-all"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col items-center w-24">
                   <span className="font-bold text-gray-900 text-lg">
                      {currentCardIndex + 1} <span className="text-gray-300 text-base font-normal">/</span> {set.flashcards.length}
                   </span>
                </div>
                <button 
                  onClick={handleNextCard}
                  className="p-3 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-all"
                >
                  <ArrowLeft size={24} className="rotate-180" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-slide-up pb-20 pt-4">
              {showQuizResults && (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-soft border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 text-center mb-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-green-400"></div>
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 shadow-md">
                    <GraduationCap size={48} />
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Quiz Complete!</h2>
                  <p className="text-gray-600 mb-8 text-lg">You scored <span className="text-green-600 font-bold text-2xl mx-1">{calculateScore()}</span> / {set.quiz.length}</p>
                  <button 
                    onClick={() => {
                      setShowQuizResults(false);
                      setQuizAnswers(new Array(set.quiz.length).fill(-1));
                    }}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-200 flex items-center gap-2 mx-auto hover:scale-105"
                  >
                    <RefreshCw size={20} /> Retry Quiz
                  </button>
                </div>
              )}

              {set.quiz.map((q, qIdx) => (
                <div key={q.id} className="bg-white p-8 md:p-10 rounded-[2rem] shadow-card border border-gray-100/50 hover:shadow-soft transition-shadow duration-300">
                  <div className="flex gap-5 mb-6">
                      <span className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-md">{qIdx + 1}</span>
                      <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-relaxed pt-0.5">
                        {q.question}
                      </h3>
                  </div>
                  
                  <div className="space-y-3 pl-0 md:pl-14">
                    {q.options.map((opt, oIdx) => {
                      let btnClass = "w-full text-left p-5 rounded-xl border-2 transition-all font-medium relative flex items-center justify-between group ";
                      if (showQuizResults) {
                        if (oIdx === q.correctAnswerIndex) btnClass += "border-green-500 bg-green-50 text-green-800";
                        else if (quizAnswers[qIdx] === oIdx) btnClass += "border-red-400 bg-red-50 text-red-800";
                        else btnClass += "border-gray-100 text-gray-400 opacity-60";
                      } else {
                        if (quizAnswers[qIdx] === oIdx) btnClass += "border-gray-900 bg-gray-900 text-white shadow-lg";
                        else btnClass += "border-gray-100 hover:border-primary hover:bg-primary/5 text-gray-600 hover:text-primary";
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleQuizSelect(qIdx, oIdx)}
                          className={btnClass}
                        >
                            <span className="z-10">{opt}</span>
                            {showQuizResults && oIdx === q.correctAnswerIndex && (
                                <div className="bg-green-200 text-green-700 rounded-full p-1"><CheckCircle size={16} /></div>
                            )}
                        </button>
                      );
                    })}
                  </div>
                  {showQuizResults && (
                    <div className="mt-6 ml-0 md:ml-14 p-6 bg-blue-50/50 text-blue-900 rounded-2xl text-sm leading-relaxed border border-blue-100 flex gap-4">
                        <Lightbulb className="flex-shrink-0 text-blue-500" size={20} />
                        <div>
                            <strong className="block mb-1 font-bold text-blue-600">Explanation</strong>
                            {q.explanation}
                        </div>
                    </div>
                  )}
                </div>
              ))}
              
              {!showQuizResults && (
                <div className="sticky bottom-6 flex justify-center pt-4">
                    <button
                        onClick={() => setShowQuizResults(true)}
                        disabled={quizAnswers.includes(-1)}
                        className="px-12 py-4 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:shadow-none text-white rounded-full font-bold text-lg shadow-xl shadow-gray-400/50 transition-all hover:scale-105 active:scale-95"
                    >
                        Submit Answers
                    </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-[calc(100vh-160px)] bg-white rounded-[2.5rem] shadow-soft border border-gray-100 overflow-hidden relative">
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-gray-50/30">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                    <div className="w-20 h-20 bg-gradient-to-tr from-primary to-secondary rounded-[2rem] flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                      <Sparkles size={32} className="text-white"/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">AI Study Tutor</h3>
                    <p className="text-gray-500 max-w-xs">I've read your notes! Ask me to explain concepts, give examples, or create practice problems.</p>
                  </div>
                )}
                
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>
                        
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold shadow-sm ${
                            msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-primary'
                        }`}>
                            {msg.role === 'user' ? 'YOU' : 'AI'}
                        </div>

                        {/* Bubble */}
                        <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-gray-900 text-white rounded-br-sm' 
                            : 'bg-white border border-gray-100 text-gray-700 rounded-bl-sm'
                        }`}>
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                    </div>
                  </div>
                ))}
                
                {isChatLoading && (
                  <div className="flex justify-start w-full">
                     <div className="flex max-w-[80%] flex-row gap-3 items-end">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-primary flex items-center justify-center flex-shrink-0 text-[10px] font-bold shadow-sm">AI</div>
                        <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                     </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-6 bg-white border-t border-gray-100 flex gap-3 items-center z-10">
                <div className="flex-1 bg-gray-50 rounded-2xl flex items-center border border-gray-100 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your question..."
                        className="flex-1 bg-transparent px-5 py-4 border-none focus:ring-0 text-gray-800 placeholder-gray-400 outline-none"
                    />
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-4 bg-primary text-white rounded-2xl hover:bg-primary-dark disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20 hover:scale-105 active:scale-95"
                >
                  <Send size={20} className={chatInput.trim() ? "ml-0.5" : ""} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudySession;