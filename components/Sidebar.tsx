import React, { useState } from 'react';
import { Plus, Book, Settings, GraduationCap, Search, ChevronRight, LayoutGrid } from 'lucide-react';
import { StudySet } from '../types';

interface SidebarProps {
  savedSets: StudySet[];
  activeSetId: string | null;
  onSelectSet: (id: string) => void;
  onNewSet: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ savedSets, activeSetId, onSelectSet, onNewSet }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSets = savedSets.filter(set => 
    set.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-72 h-full bg-white/60 backdrop-blur-xl border-r border-white/50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-all duration-300">
      {/* Brand */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30 transform rotate-3">
          <GraduationCap size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">CocoStudy</h1>
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">AI Companion</p>
        </div>
      </div>

      {/* Main Actions */}
      <div className="px-6 mb-2">
        <button
          onClick={onNewSet}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 font-semibold shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus size={20} className="stroke-[3]" />
          <span>New Study Set</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-6 mt-4 mb-2">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 text-gray-700 placeholder-gray-400 transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-4 mt-2">Your Library</h3>
        
        {savedSets.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Book className="text-gray-300" size={20} />
            </div>
            <p className="text-sm text-gray-500 font-medium">No notes yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first study set!</p>
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>No matches found.</p>
          </div>
        ) : (
          filteredSets.map((set) => (
            <button
              key={set.id}
              onClick={() => onSelectSet(set.id)}
              className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 flex items-center gap-3 group relative overflow-hidden ${
                activeSetId === set.id
                  ? 'bg-white shadow-soft text-primary-dark ring-1 ring-primary/10'
                  : 'hover:bg-white/50 text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                 activeSetId === set.id ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-primary'
              }`}>
                {activeSetId === set.id ? <LayoutGrid size={16} /> : <Book size={16} />}
              </div>
              
              <div className="overflow-hidden min-w-0 flex-1">
                <p className={`font-semibold truncate text-sm ${activeSetId === set.id ? 'text-gray-900' : ''}`}>
                  {set.title || 'Untitled Note'}
                </p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5 font-medium">
                  {new Date(set.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {set.flashcards.length} Cards
                </p>
              </div>

              {activeSetId === set.id && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full"></div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100/50">
        <button className="flex items-center gap-3 text-gray-500 hover:text-gray-800 p-3 rounded-xl w-full transition-colors text-sm font-medium hover:bg-white/50">
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;