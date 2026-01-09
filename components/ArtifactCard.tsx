
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

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onFocus, onRemove, onSwitchVariation, isFocused }) => {
  const isStreaming = artifact.status === 'streaming';
  
  return (
    <div 
      className={`group relative bg-white border ${isFocused ? 'border-[#1a73e8] ring-2 ring-blue-50' : 'border-gray-200'} rounded-[24px] overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer flex flex-col h-full shadow-sm`}
      onClick={onFocus}
    >
      {/* M3 Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isStreaming ? 'bg-[#1a73e8] animate-pulse shadow-[0_0_8px_rgba(26,115,232,0.4)]' : 'bg-gray-300'}`} />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{artifact.title}</span>
          </div>
          {artifact.variations && artifact.variations.length > 1 && (
            <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
              {artifact.variations.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onSwitchVariation?.(idx)}
                  className={`w-4 h-1 rounded-full transition-all ${idx === (artifact.currentVariationIndex ?? 0) ? 'bg-blue-600 w-6' : 'bg-gray-200 hover:bg-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {onRemove && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Icons.Trash className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 text-gray-400 hover:text-[#1a73e8] hover:bg-blue-50 rounded-xl transition-colors">
            <Icons.Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Surface Area */}
      <div className="flex-1 overflow-auto relative bg-gray-50/30 custom-scrollbar flex flex-col">
        {isStreaming && artifact.reasoning && (
          <div className="p-6 bg-blue-50/30 border-b border-blue-50">
            <div className="flex items-center gap-2 mb-2 text-[#1a73e8]">
              <Icons.Sparkles className="w-4 h-4 animate-spin-slow" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Agent Thinking</span>
            </div>
            <p className="text-xs text-gray-600 italic leading-relaxed">{artifact.reasoning}</p>
          </div>
        )}

        <div className="flex-1 relative">
          {artifact.type === 'ui' ? (
            <div className="w-full h-full bg-white">
              <iframe
                srcDoc={artifact.content || `
                  <body style="margin:0;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-family:sans-serif;height:100vh;background:#ffffff;">
                    <div style="text-align:center;">
                      <p style="font-weight:500;margin:0;">${isStreaming ? 'Synthesizing Visuals...' : 'Ready'}</p>
                    </div>
                  </body>
                `}
                title={artifact.id}
                className="w-full h-full border-none pointer-events-none"
              />
            </div>
          ) : (
            <div className="p-6 md:p-8 font-mono text-sm text-gray-700 leading-relaxed whitespace-pre-wrap selection:bg-blue-100">
              {artifact.content || (
                <div className="space-y-4 opacity-30 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {isStreaming && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 overflow-hidden">
            <div className="h-full bg-[#1a73e8] animate-loading w-1/2" />
          </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-loading {
          animation: loading 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};
