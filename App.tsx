
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Artifact, Session } from './types';
import { Icons, INITIAL_SUGGESTIONS } from './constants';
import DottedGlowBackground from './components/DottedGlowBackground';
import { ArtifactCard } from './components/ArtifactCard';
import { SideDrawer } from './components/SideDrawer';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [focusedArtifactId, setFocusedArtifactId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [projectMetadata, setProjectMetadata] = useState<{title: string, stack: string[]} | null>(null);
  
  const stageRef = useRef<HTMLDivElement>(null);

  const generateProjectManifest = async (userPrompt: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on this prompt: "${userPrompt}", suggest a catchy Project Name and a list of 4 key technologies for the tech stack. Return ONLY valid JSON like: {"title": "Name", "stack": ["React", "Node", "Tailwind", "PostgreSQL"]}`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(result.text || "{}");
      setProjectMetadata(data);
    } catch (e) {
      console.error("Failed to generate manifest", e);
    }
  };

  const startGeneration = useCallback(async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) return;

    setIsGenerating(true);
    setFocusedArtifactId(null);
    setIsDrawerOpen(false);
    setProjectMetadata(null);

    const sessionId = Math.random().toString(36).substring(7);
    const initialArtifacts: Artifact[] = [
      { id: 'art-1', title: 'Technical Architecture', type: 'architecture', content: '', status: 'streaming', reasoning: 'Analyzing requirements...' },
      { id: 'art-2', title: 'User Interface Concept', type: 'ui', content: '', status: 'streaming', reasoning: 'Designing layout...' },
      { id: 'art-3', title: 'Data Flow & Logic', type: 'logic', content: '', status: 'streaming', reasoning: 'Modeling flows...' }
    ];

    setSession({
      id: sessionId,
      prompt: activePrompt,
      artifacts: initialArtifacts,
      timestamp: Date.now()
    });

    generateProjectManifest(activePrompt);

    try {
      const model = 'gemini-3-flash-preview';
      
      const generationTasks = initialArtifacts.map(async (art) => {
        let systemMsg = "";
        if (art.type === 'ui') {
          systemMsg = "You are a world-class UI designer. Generate a stunning, responsive Tailwind HTML snippet. ONLY return HTML/CSS. No Markdown blocks. Ensure the background is white and layout is modern.";
        } else if (art.type === 'architecture') {
          systemMsg = "Explain the technical architecture for the requested project. Use clear markdown formatting with headers and bullet points.";
        } else {
          systemMsg = "Generate the core logic flow, data structures, or API schema for this project in clear markdown or pseudo-code.";
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const result = await ai.models.generateContent({
          model,
          contents: activePrompt,
          config: { systemInstruction: systemMsg }
        });

        const reasoningResult = await ai.models.generateContent({
          model,
          contents: `Provide a short 1-sentence explanation of why you chose this specific ${art.type} for: ${activePrompt}`,
        });

        setSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            artifacts: prev.artifacts.map(a => 
              a.id === art.id ? { 
                ...a, 
                content: result.text || 'Error generating content', 
                status: 'complete',
                reasoning: reasoningResult.text || '',
                variations: [result.text || ''],
                currentVariationIndex: 0
              } : a
            )
          };
        });
      });

      await Promise.all(generationTasks);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const refineArtifact = async (id: string, instructions: string) => {
    if (!session) return;
    setIsRefining(true);
    
    const target = session.artifacts.find(a => a.id === id);
    if (!target) return;

    setSession(prev => prev ? {
      ...prev,
      artifacts: prev.artifacts.map(a => a.id === id ? { ...a, status: 'streaming', reasoning: `Refining based on: ${instructions}` } : a)
    } : null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const promptContext = `Current Content: ${target.content}\nUser Request: ${instructions}\nContext: ${session.prompt}`;
      
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: promptContext,
        config: { systemInstruction: `Update the ${target.type} artifact. Return only the updated content. If it is UI, return only HTML/CSS.` }
      });

      const updatedContent = result.text || target.content;
      
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          artifacts: prev.artifacts.map(a => {
            if (a.id === id) {
              const newVariations = [...(a.variations || []), updatedContent];
              return {
                ...a,
                content: updatedContent,
                status: 'complete',
                variations: newVariations,
                currentVariationIndex: newVariations.length - 1
              };
            }
            return a;
          })
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefining(false);
    }
  };

  const switchVariation = (id: string, index: number) => {
    setSession(prev => prev ? {
      ...prev,
      artifacts: prev.artifacts.map(a => a.id === id ? { ...a, content: a.variations?.[index] || a.content, currentVariationIndex: index } : a)
    } : null);
  };

  const addAgent = async () => {
    if (!session) return;
    const newId = `art-${Date.now()}`;
    const newAgent: Artifact = { 
      id: newId, 
      title: 'Strategic Expansion', 
      type: 'logic', 
      content: '', 
      status: 'streaming',
      reasoning: 'Identifying new opportunities...'
    };

    setSession(prev => prev ? { ...prev, artifacts: [...prev.artifacts, newAgent] } : null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide a specialized additional module for: ${session.prompt}.`,
        config: { systemInstruction: "Generate a technical module. Return content only." }
      });
      
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          artifacts: prev.artifacts.map(a => 
            a.id === newId ? { ...a, content: result.text || '', status: 'complete', variations: [result.text || ''], currentVariationIndex: 0 } : a
          )
        };
      });
    } catch (e) {
      console.error(e);
    }
  };

  const exportAllArtifacts = () => {
    if (!session) return;
    let fullExport = `# Project: ${projectMetadata?.title || 'AI Generated Project'}\nPrompt: ${session.prompt}\n\n`;
    session.artifacts.forEach(art => {
      fullExport += `## ARTIFACT: ${art.title}\n${art.content}\n\n`;
    });
    const blob = new Blob([fullExport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectMetadata?.title?.toLowerCase().replace(/\s+/g, '-') || 'project'}-export.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleFocus = (id: string) => {
    if (focusedArtifactId === id) {
      setIsDrawerOpen(true);
    } else {
      setFocusedArtifactId(id);
    }
  };

  const currentFocusedArtifact = session?.artifacts.find(a => a.id === focusedArtifactId) || null;

  return (
    <div className="relative w-screen h-screen bg-[#f8f9fa] text-gray-900 flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <DottedGlowBackground />
      </div>

      {/* Material Top App Bar */}
      <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-200 bg-white/90 backdrop-blur-md z-[100] shrink-0">
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-8 h-8 bg-[#1a73e8] rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-blue-100">D</div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-gray-900 truncate">Diffusion Studio</span>
            {projectMetadata && (
              <span className="text-[10px] text-[#1a73e8] font-bold uppercase tracking-widest truncate">{projectMetadata.title}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {session && (
            <button 
              onClick={addAgent}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-200 bg-white text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
            >
              <Icons.Plus className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Add Agent</span>
            </button>
          )}
          <button 
            onClick={exportAllArtifacts}
            disabled={!session}
            className="px-3 py-1.5 md:px-5 md:py-2 rounded-full bg-[#1a73e8] text-white text-xs md:text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-gray-200 disabled:shadow-none active:scale-95"
          >
            Export All
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-12">
        {!session ? (
          <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto text-center px-4">
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                Design <span className="text-[#1a73e8]">Anything.</span><br />
                <span className="text-gray-300">Build Everything.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mx-auto">
                L'atelier créatif où vos intentions deviennent architecture, code et interfaces.
              </p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 pt-4">
                {INITIAL_SUGGESTIONS.map(suggestion => (
                  <button 
                    key={suggestion}
                    onClick={() => { setPrompt(suggestion); startGeneration(suggestion); }}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-2xl bg-white border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:text-[#1a73e8] hover:border-blue-400 hover:shadow-lg transition-all active:scale-95"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div 
            ref={stageRef}
            className={`w-full max-w-7xl mx-auto grid gap-6 md:gap-8 pb-32 transition-all duration-500 ease-in-out ${
              focusedArtifactId 
              ? 'grid-cols-1 lg:grid-cols-[1fr_380px]' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {session.artifacts.map((artifact) => (
              <div 
                key={artifact.id}
                className={`transition-all duration-500 flex flex-col min-h-[450px] md:min-h-[550px] ${
                  focusedArtifactId && focusedArtifactId !== artifact.id 
                  ? 'hidden lg:flex opacity-30 scale-95 blur-[1px] pointer-events-none' 
                  : 'opacity-100 scale-100'
                }`}
              >
                <ArtifactCard 
                  artifact={artifact} 
                  onFocus={() => toggleFocus(artifact.id)}
                  onSwitchVariation={(idx) => switchVariation(artifact.id, idx)}
                  onRemove={() => setSession(prev => prev ? { ...prev, artifacts: prev.artifacts.filter(a => a.id !== artifact.id) } : null)}
                  isFocused={focusedArtifactId === artifact.id}
                />
              </div>
            ))}
            
            {!focusedArtifactId && (
              <div 
                onClick={addAgent}
                className="group border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-8 md:p-12 cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all text-gray-400 hover:text-[#1a73e8] min-h-[300px]"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 group-hover:scale-110 transition-all shadow-sm">
                  <Icons.Plus className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <p className="font-bold text-xs uppercase tracking-[0.2em] text-center">Spawn Insight Agent</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Input Bar */}
      <footer className={`fixed bottom-0 sm:bottom-8 inset-x-0 z-[110] px-4 md:px-6 transition-all duration-500 ${isGenerating ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="max-w-4xl mx-auto mb-4 sm:mb-0">
          <div className="relative bg-white/95 backdrop-blur-2xl border border-gray-200 rounded-2xl sm:rounded-[2.5rem] p-1.5 md:p-2 pr-2.5 flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.08)] focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-[#1a73e8] transition-all">
            <div className="pl-4 md:pl-6 text-[#1a73e8]">
              <Icons.Sparkles className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <input 
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startGeneration()}
              placeholder={session ? "Refine your global idea..." : "What are we building today?"}
              className="flex-1 bg-transparent border-none outline-none px-3 md:px-4 py-3 md:py-5 text-sm md:text-lg font-medium text-gray-800 placeholder:text-gray-400"
            />
            <button 
              onClick={() => startGeneration()}
              disabled={!prompt.trim() || isGenerating}
              className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-full bg-[#1a73e8] text-white flex items-center justify-center hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-100"
            >
              <Icons.Send className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </footer>

      <SideDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        artifact={currentFocusedArtifact}
        onRefine={refineArtifact}
        isRefining={isRefining}
      />
    </div>
  );
};

export default App;
