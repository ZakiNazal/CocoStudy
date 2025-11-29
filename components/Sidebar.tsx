import React, { useState } from 'react';
import { PlusCircle, BookOpen, Settings, GraduationCap, Search } from 'lucide-react';
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
    <div className="w-64 h-full bg-white border-r border-gray-100 flex flex-col shadow-sm hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-primary/20">
          <GraduationCap size={20} />
        </div>
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">CocoStudy</h1>
      </div>

      <div className="px-4 mb-2">
        <button
          onClick={onNewSet}
          className="w-full bg-primary hover:bg-secondary text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-medium shadow-md shadow-primary/20 mb-4"
        >
          <PlusCircle size={20} />
          <span>New Study Set</span>
        </button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 text-gray-700 placeholder-gray-400 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2 mt-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Library</h3>
        {savedSets.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <BookOpen className="mx-auto mb-2 opacity-50" size={24} />
            <p>No notes yet.</p>
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
              className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group ${
                activeSetId === set.id
                  ? 'bg-accent text-primary'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <BookOpen size={18} className={`mt-1 flex-shrink-0 ${activeSetId === set.id ? 'text-primary' : 'text-gray-400'}`} />
              <div className="overflow-hidden min-w-0">
                <p className={`font-medium truncate ${activeSetId === set.id ? 'text-gray-900' : ''}`}>
                  {set.title || 'Untitled Note'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-1">
                  {new Date(set.createdAt).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center gap-3 text-gray-500 hover:text-gray-800 p-2 rounded-lg w-full transition-colors text-sm">
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
