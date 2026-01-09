
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
        className="fixed inset-0 bg-slate-900/10 backdrop-blur-md z-[200] transition-opacity duration-500"
        onClick={onClose}
      />
      
      <div className={`fixed right-0 top-0 bottom-0 w-full md:w-11/12 lg:w-2/3 xl:w-1/2 bg-white z-[201] shadow-[-20px_0_80px_rgba(0,0,0,0.08)] transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col sm:rounded-l-[3rem] border-l border-slate-100`}>
        {/* Drawer Header */}
        <div className="px-10 py-8 md:px-12 md:py-10 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xl z-30 sm:rounded-tl-[3rem]">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{artifact.title}</h2>
              {artifact.variations && (
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-blue-100">
                  Variation {(artifact.currentVariationIndex ?? 0) + 1}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Advanced Inspection Module</p>
          </div>
          <button 
            onClick={onClose}
            className="p-4 hover:bg-slate-50 rounded-full transition-all text-slate-300 hover:text-slate-900 border border-transparent hover:border-slate-100"
          >
            <Icons.X className="w-8 h-8" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-10 md:p-14 space-y-16 custom-scrollbar bg-slate-50/20">
          
          {/* Thinking & Rationale Section */}
          <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center gap-4 mb-6 text-slate-900 font-black text-xs uppercase tracking-[0.2em]">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                 <Icons.Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              Strategic Context
            </div>
            <div className="p-10 bg-white rounded-[2rem] text-lg text-slate-600 leading-relaxed border border-slate-100 shadow-sm italic font-serif">
              "{artifact.reasoning || 'Generating context...'}"
            </div>
          </section>

          {/* Technical Data Section */}
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <div className="flex items-center gap-4 mb-6 text-slate-900 font-black text-xs uppercase tracking-[0.2em]">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                 <Icons.Code className="w-5 h-5 text-slate-600" />
              </div>
              Projection Data
            </div>
            <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-14 font-mono text-sm text-slate-300 overflow-x-auto shadow-2xl border border-slate-800">
              <pre className="whitespace-pre-wrap leading-relaxed">{artifact.content}</pre>
            </div>
          </section>
        </div>

        {/* Refinement Interface */}
        <div className="p-10 md:p-12 border-t border-slate-50 bg-white sm:rounded-bl-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-6">
            <div className="relative group">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={`Ask the agent to refine this specific ${artifact.title}...`}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-lg font-medium text-slate-800 focus:ring-8 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all resize-none h-40 shadow-inner placeholder:text-slate-300"
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
                className="absolute right-6 bottom-6 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-90 transition-all disabled:bg-slate-200 disabled:shadow-none flex items-center justify-center"
              >
                {isRefining ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icons.Send className="w-8 h-8" />
                )}
              </button>
            </div>
            
            <div className="flex gap-4">
               <button 
                onClick={() => {
                   const blob = new Blob([artifact.content], { type: 'text/plain' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `spec-${artifact.id}.txt`;
                   a.click();
                }}
                className="flex-1 py-4 bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"
              >
                Download Segment
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </>
  );
};
