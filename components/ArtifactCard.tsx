
import React from 'react';
import { Artifact } from '../types';
import { Icons } from '../constants';

interface ArtifactCardProps {
  artifact: Artifact;
  onFocus: () => void;
  onRemove?: () => void;
  onSwitchVariation?: (index: number) => void;
  isFocused?: boolean;
}

const getAgentMetadata = (title: string) => {
  if (title.includes('UX')) return { role: 'UX Expert', icon: <Icons.Layers className="w-6 h-6" />, color: 'bg-indigo-600' };
  if (title.includes('Persona')) return { role: 'Persona Specialist', icon: <Icons.Maximize className="w-6 h-6" />, color: 'bg-purple-600' };
  if (title.includes('UI')) return { role: 'UI Expert', icon: <Icons.Code className="w-6 h-6" />, color: 'bg-blue-600' };
  return { role: 'Module Strategy', icon: <Icons.Sparkles className="w-6 h-6" />, color: 'bg-slate-800' };
};

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onFocus, onRemove, onSwitchVariation, isFocused }) => {
  const isStreaming = artifact.status === 'streaming';
  const metadata = getAgentMetadata(artifact.title);
  
  return (
    <div 
      className={`group relative bg-white border ${isFocused ? 'border-blue-600 ring-[6px] ring-blue-50' : 'border-slate-100 shadow-sm'} rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl cursor-pointer flex flex-col h-full`}
      onClick={onFocus}
    >
      {/* Top Banner Area */}
      <div className="px-10 pt-10 pb-6 flex items-start justify-between">
        <div className="flex gap-6 items-center">
           <div className={`w-14 h-14 ${metadata.color} rounded-2xl flex items-center justify-center text-white shadow-xl shadow-${metadata.color.split('-')[1]}-100 transform group-hover:scale-110 transition-transform`}>
              {metadata.icon}
           </div>
           <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2">{artifact.title}</h3>
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metadata.role}</span>
                 <div className="px-2 py-0.5 bg-slate-50 rounded border border-slate-100 text-[8px] font-black text-slate-400 uppercase">Projection Active</div>
              </div>
           </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-slate-50 rounded-xl text-slate-300 hover:text-blue-600 transition-colors">
            <Icons.Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Surface */}
      <div className="flex-1 relative mx-8 mb-8 bg-slate-50/50 rounded-[2rem] border border-slate-100/50 p-6 flex flex-col shadow-inner overflow-hidden">
        {isStreaming ? (
           <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-[6px] border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Synthesizing Data</p>
                <p className="text-xs font-bold text-slate-400 italic">"{artifact.reasoning || 'Calibrating neural projection...'}"</p>
              </div>
           </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            {artifact.type === 'ui' ? (
              <div className="w-full h-full min-h-[350px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
                <iframe
                  srcDoc={artifact.content || ''}
                  title={artifact.id}
                  className="w-full h-full border-none pointer-events-none"
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center font-serif italic text-2xl text-slate-700 leading-relaxed text-center px-6 py-10 selection:bg-blue-100">
                "{artifact.content.substring(0, 300)}{artifact.content.length > 300 ? '...' : ''}"
              </div>
            )}
          </div>
        )}
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Bottom Artifact Controls */}
      <div className="px-10 pb-10 flex items-center justify-between mt-auto">
        <div className="flex gap-2">
           {artifact.variations?.map((_, idx) => (
             <button
               key={idx}
               onClick={(e) => { e.stopPropagation(); onSwitchVariation?.(idx); }}
               className={`text-[10px] font-black w-8 h-8 rounded-xl transition-all flex items-center justify-center border ${idx === (artifact.currentVariationIndex ?? 0) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-500'}`}
             >
               A{idx + 1}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3 text-blue-600 font-black text-[11px] uppercase tracking-[0.25em] group-hover:translate-x-2 transition-all">
           Inspect Projection
           <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
             <Icons.Send className="w-4 h-4 rotate-45" />
           </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};
