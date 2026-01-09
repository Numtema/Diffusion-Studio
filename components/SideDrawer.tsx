
import React, { useState } from 'react';
import { Icons } from '../constants';
import { Artifact } from '../types';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: Artifact | null;
  onRefine?: (id: string, instructions: string) => void;
  isRefining?: boolean;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ isOpen, onClose, artifact, onRefine, isRefining }) => {
  const [instructions, setInstructions] = useState('');

  if (!isOpen || !artifact) return null;

  const handleRefine = () => {
    if (!instructions.trim()) return;
    onRefine?.(artifact.id, instructions);
    setInstructions('');
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] z-[200] transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className={`fixed right-0 top-0 bottom-0 w-full md:w-11/12 lg:w-2/3 xl:w-1/2 bg-white z-[201] shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.05,0.7,0.1,1)] transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col sm:rounded-l-[28px]`}>
        {/* Drawer Header */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-30 sm:rounded-tl-[28px]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">{artifact.title}</h2>
              {artifact.variations && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">
                  V{(artifact.currentVariationIndex ?? 0) + 1}
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-gray-500 font-medium">Refine & Inspect Component</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
          >
            <Icons.X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 md:p-10 space-y-10 custom-scrollbar">
          {/* Thinking process if available */}
          {artifact.reasoning && (
            <section className="animate-in fade-in duration-500">
              <div className="flex items-center gap-3 mb-4 text-gray-900 font-bold text-xs uppercase tracking-widest">
                <Icons.Sparkles className="w-5 h-5 text-[#1a73e8]" />
                Strategy & Decisions
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl text-sm text-gray-600 leading-relaxed border border-gray-100 italic">
                {artifact.reasoning}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-3 mb-6 text-gray-900 font-bold text-xs uppercase tracking-widest">
              <Icons.Code className="w-5 h-5 text-[#1a73e8]" />
              Artifact Source
            </div>
            <div className="bg-[#1e1e1e] rounded-2xl p-6 md:p-8 font-mono text-sm text-gray-300 overflow-x-auto shadow-2xl">
              <pre className="whitespace-pre-wrap leading-relaxed">{artifact.content}</pre>
            </div>
          </section>
        </div>

        {/* Action & Refinement Bar */}
        <div className="p-6 md:p-8 border-t border-gray-100 bg-white sm:rounded-bl-[28px]">
          <div className="flex flex-col gap-4">
            <div className="relative group">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={`Tell the agent how to refine the ${artifact.title}...`}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none h-24"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRefine();
                  }
                }}
              />
              <button 
                onClick={handleRefine}
                disabled={!instructions.trim() || isRefining}
                className="absolute right-3 bottom-3 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-200 disabled:shadow-none"
              >
                {isRefining ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icons.Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                   const blob = new Blob([artifact.content], { type: 'text/plain' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `${artifact.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
                   a.click();
                }}
                className="flex-1 py-3 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 border border-gray-200 transition-all text-xs uppercase tracking-widest"
              >
                Download Part
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
