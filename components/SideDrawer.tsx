
import React from 'react';
import { Icons } from '../constants';
import { Artifact } from '../types';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: Artifact | null;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ isOpen, onClose, artifact }) => {
  if (!isOpen || !artifact) return null;

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
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{artifact.title}</h2>
            <p className="text-xs md:text-sm text-gray-500 font-medium">Deep Dive & Integration</p>
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
          <section>
            <div className="flex items-center gap-3 mb-6 text-gray-900 font-bold text-xs uppercase tracking-widest">
              <Icons.Code className="w-5 h-5 text-[#1a73e8]" />
              Detailed Artifact Data
            </div>
            <div className="bg-[#fcfdfe] rounded-2xl border border-gray-100 p-6 md:p-8 font-mono text-sm text-gray-700 overflow-x-auto shadow-inner">
              <pre className="whitespace-pre-wrap leading-relaxed">{artifact.content}</pre>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 text-gray-900 font-bold text-xs uppercase tracking-widest">
              <Icons.Sparkles className="w-5 h-5 text-[#1a73e8]" />
              AI Recommendations
            </div>
            <div className="p-6 bg-blue-50/40 rounded-3xl border border-blue-100/50">
              <p className="text-base text-gray-700 leading-relaxed">
                The AI suggests integrating a robust <strong>State Management</strong> layer for this module. This specific architecture favors <strong>Component Composition</strong> over inheritance to maximize reuse in large-scale applications.
              </p>
            </div>
          </section>
        </div>

        {/* Action Bar */}
        <div className="p-6 md:p-8 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-3 sm:rounded-bl-[28px]">
          <button className="flex-1 py-4 bg-gray-50 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 border border-gray-200">
             Copy Data
          </button>
          <button className="flex-1 py-4 bg-[#1a73e8] text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95">
            <Icons.Sparkles className="w-5 h-5" />
            Iterate Further
          </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f3f4;
          border-radius: 10px;
        }
      `}</style>
    </>
  );
};
