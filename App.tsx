
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Artifact, Session } from './types';
import { Icons, INITIAL_SUGGESTIONS } from './constants';
import DottedGlowBackground from './components/DottedGlowBackground';
import { ArtifactCard } from './components/ArtifactCard';
import { SideDrawer } from './components/SideDrawer';

// Helper to wait for a specific duration
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

// Robust retry wrapper for Gemini API calls to handle 429 RESOURCE_EXHAUSTED
async function callGeminiWithRetry(fn: () => Promise<any>, maxRetries = 3, initialDelay = 3000) {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || "";
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`Quota exceeded (429). Retry attempt ${i + 1}/${maxRetries} after ${initialDelay}ms...`);
        await wait(initialDelay * (i + 1)); // Exponential-ish backoff
        continue;
      }
      throw error; // If it's not a quota error, throw immediately
    }
  }
  throw lastError;
}

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
      const data = await callGeminiWithRetry(async () => {
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Based on this prompt: "${userPrompt}", suggest a catchy Project Name and a list of 4 key technologies for the tech stack. Return ONLY valid JSON like: {"title": "Name", "stack": ["React", "Node", "Tailwind", "PostgreSQL"]}`,
          config: { responseMimeType: "application/json" }
        });
        return JSON.parse(result.text || "{}");
      });
      setProjectMetadata(data);
    } catch (e) {
      console.error("Failed to generate manifest even after retries", e);
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
      { id: 'art-1', title: 'UX Expert Strategy', type: 'architecture', content: '', status: 'streaming', reasoning: 'Analyzing user journey...' },
      { id: 'art-2', title: 'Persona Specialist Strategy', type: 'logic', content: '', status: 'streaming', reasoning: 'Defining core personas...' },
      { id: 'art-3', title: 'UI Expert Strategy', type: 'ui', content: '', status: 'streaming', reasoning: 'Projecting visual identity...' }
    ];

    setSession({
      id: sessionId,
      prompt: activePrompt,
      artifacts: initialArtifacts,
      timestamp: Date.now()
    });

    try {
      // Step 1: Project Name & Stack (Manifest)
      await generateProjectManifest(activePrompt);
      await wait(3000); // Significant gap to cool down API quota

      // Step 2: Sequential Artifact Generation
      for (let i = 0; i < initialArtifacts.length; i++) {
        const art = initialArtifacts[i];
        
        let systemMsg = "";
        if (art.type === 'ui') {
          systemMsg = "You are a world-class UI designer. Generate a stunning, responsive Tailwind HTML snippet. ONLY return HTML/CSS. No Markdown blocks. Light theme, modern typography.";
        } else if (art.type === 'architecture') {
          systemMsg = "Explain the UX strategy and architecture for the requested project. Be strategic and use professional terminology.";
        } else {
          systemMsg = "Generate core personas and logical flows. Focus on user needs and data structures.";
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const content = await callGeminiWithRetry(async () => {
          const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `PROMPT: ${activePrompt}\n\nINSTRUCTIONS: ${systemMsg}`,
          });
          return result.text || 'Error generating content';
        });

        const reasoning = `Synthesized based on your goal: "${activePrompt.substring(0, 30)}..."`;

        setSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            artifacts: prev.artifacts.map(a => 
              a.id === art.id ? { 
                ...a, 
                content, 
                status: 'complete',
                reasoning,
                variations: [content],
                currentVariationIndex: 0
              } : a
            )
          };
        });

        // Mandatory cool down between heavy generation calls
        if (i < initialArtifacts.length - 1) {
          await wait(4000); 
        }
      }
    } catch (error) {
      console.error("Generation failed after multiple retries:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const addAgent = async () => {
    if (!session || isGenerating) return;
    
    // We start by asking the AI what role is missing
    setIsGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Phase 1: Determine the missing role
      const roleDecision = await callGeminiWithRetry(async () => {
        const currentRoles = session.artifacts.map(a => a.title).join(', ');
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Current project: "${session.prompt}". \nExisting agents: [${currentRoles}]. \nWhat is the most critical NEW agent role missing to expand this project? (e.g., Database Architect, API Specialist, Security Expert, Content Strategist). Return ONLY a JSON object with "title" (catchy, like 'Security Specialist Strategy') and "type" (architecture, logic, or ui).`,
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['architecture', 'logic', 'ui'] }
              },
              required: ['title', 'type']
            }
          }
        });
        return JSON.parse(result.text || "{}");
      });

      const newId = `art-${Date.now()}`;
      const newAgent: Artifact = { 
        id: newId, 
        title: roleDecision.title || 'Module Expansion', 
        type: roleDecision.type || 'architecture', 
        content: '', 
        status: 'streaming',
        reasoning: `Onboarding ${roleDecision.title || 'new agent'}...`
      };

      setSession(prev => prev ? { ...prev, artifacts: [...prev.artifacts, newAgent] } : null);

      await wait(3000);

      // Phase 2: Generate Content for the new role
      const content = await callGeminiWithRetry(async () => {
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `PROMPT: ${session.prompt}\nROLE: ${roleDecision.title}\nGOAL: Provide a specific strategic expansion from this role's perspective. Be thorough and professional.`,
        });
        return result.text || '';
      });
      
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          artifacts: prev.artifacts.map(a => 
            a.id === newId ? { 
              ...a, 
              content, 
              status: 'complete', 
              reasoning: `Expansion module synthesized by ${roleDecision.title}.`,
              variations: [content], 
              currentVariationIndex: 0 
            } : a
          )
        };
      });
    } catch (e) {
      console.error("Failed to add agent", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const refineArtifact = async (id: string, instructions: string) => {
    if (!session || isRefining) return;
    setIsRefining(true);
    
    const target = session.artifacts.find(a => a.id === id);
    if (!target) return;

    setSession(prev => prev ? {
      ...prev,
      artifacts: prev.artifacts.map(a => a.id === id ? { ...a, status: 'streaming', reasoning: `Recalibrating projection...` } : a)
    } : null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const updatedContent = await callGeminiWithRetry(async () => {
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Current: ${target.content}\n\nUpdate according to: ${instructions}`,
          config: { systemInstruction: `Update this ${target.type}. Return content only.` }
        });
        return result.text || target.content;
      });
      
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

  const toggleFocus = (id: string) => {
    if (focusedArtifactId === id) {
      setFocusedArtifactId(null);
      setIsDrawerOpen(false);
    } else {
      setFocusedArtifactId(id);
      setIsDrawerOpen(true);
    }
  };

  const exportAllArtifacts = () => {
    if (!session) return;
    const content = session.artifacts.map(a => `## ${a.title}\n\n${a.content}\n\n`).join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectMetadata?.title || 'project'}-spec.md`;
    a.click();
  };

  const currentFocusedArtifact = session?.artifacts.find(a => a.id === focusedArtifactId) || null;

  return (
    <div className="relative w-screen h-screen bg-[#f8fafc] text-slate-900 flex overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <DottedGlowBackground />
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-20 md:w-24 bg-white border-r border-slate-200 z-[110] flex flex-col items-center py-8 shrink-0 shadow-sm">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200 mb-12">D</div>
        <nav className="flex flex-col gap-10">
          <button className="flex flex-col items-center gap-2 text-blue-600 group">
             <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-all">
                <Icons.Layers className="w-7 h-7" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deck</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-slate-400 hover:text-slate-600 group transition-all">
             <div className="w-14 h-14 bg-transparent rounded-2xl flex items-center justify-center group-hover:bg-slate-50 transition-all">
                <Icons.Code className="w-7 h-7" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Arch</span>
          </button>
        </nav>
        <div className="mt-auto">
           <button onClick={() => { setSession(null); setPrompt(''); }} className="w-12 h-12 text-slate-300 hover:text-slate-500 transition-all">
             <Icons.X className="w-6 h-6" />
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="h-20 flex items-center justify-between px-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl z-[100] shrink-0">
          <div className="flex items-center gap-6">
             {session ? (
               <div className="flex items-center gap-6">
                 <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest truncate max-w-[200px] md:max-w-md">
                   {projectMetadata?.title || session.prompt}
                 </h2>
                 <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                   <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Station Active</span>
                 </div>
               </div>
             ) : (
               <h1 className="text-sm font-black uppercase tracking-[0.3em] text-slate-900">Diffusion Studio</h1>
             )}
          </div>
          
          <div className="flex items-center gap-4">
            {session && (
              <button 
                onClick={addAgent}
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                   <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icons.Plus className="w-4 h-4" />
                )}
                Add Agent
              </button>
            )}
            <button 
              onClick={() => { setSession(null); setPrompt(''); }}
              className="px-6 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              New Project
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden p-8 md:p-12">
          {!session ? (
            <div className="h-full flex flex-col items-center justify-center max-w-5xl mx-auto text-center">
              <div className="space-y-10 animate-in fade-in zoom-in duration-1000">
                <div className="space-y-4">
                  <h2 className="text-7xl md:text-9xl font-black tracking-tighter text-slate-900 leading-[0.85]">
                    STATIONS.
                  </h2>
                  <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto">
                    Transforming natural language into validated software projections.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  {INITIAL_SUGGESTIONS.map(suggestion => (
                    <button 
                      key={suggestion}
                      onClick={() => { setPrompt(suggestion); startGeneration(suggestion); }}
                      className="px-10 py-5 rounded-[2.5rem] bg-white border border-slate-200 text-sm font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 hover:border-blue-400 hover:shadow-2xl hover:-translate-y-2 transition-all active:scale-95 shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {/* Main input on the homepage */}
                <div className="max-w-2xl mx-auto w-full pt-8">
                  <div className="relative bg-white border-2 border-slate-100 rounded-[2rem] p-2 pr-3 flex items-center shadow-xl focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all group">
                    <input 
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && startGeneration()}
                      placeholder="Or describe your own unique vision..."
                      className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-lg font-bold text-slate-800 placeholder:text-slate-300"
                    />
                    <button 
                      onClick={() => startGeneration()}
                      disabled={!prompt.trim() || isGenerating}
                      className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-90 disabled:bg-slate-100 shrink-0"
                    >
                      <Icons.Send className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              ref={stageRef}
              className={`w-full max-w-7xl mx-auto grid gap-10 pb-32 transition-all duration-700 ease-out ${
                focusedArtifactId 
                ? 'grid-cols-1 lg:grid-cols-[1fr_400px]' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {session.artifacts.map((artifact) => (
                <div 
                  key={artifact.id}
                  className={`transition-all duration-700 flex flex-col min-h-[550px] md:min-h-[650px] ${
                    focusedArtifactId && focusedArtifactId !== artifact.id 
                    ? 'hidden lg:flex opacity-20 scale-90 blur-[4px] pointer-events-none' 
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
            </div>
          )}
        </main>

        {/* Floating Refinement Bar in session */}
        {session && (
          <footer className={`fixed bottom-10 left-[7.5rem] right-12 z-[110] transition-all duration-700 ${isGenerating ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
            <div className="max-w-4xl mx-auto">
              <div className="relative bg-white/95 backdrop-blur-3xl border border-slate-200 rounded-[2.5rem] p-2.5 pr-4 flex items-center shadow-[0_25px_70px_rgba(0,0,0,0.12)] focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-600 transition-all group">
                <div className="pl-6 text-blue-600 group-focus-within:scale-110 transition-transform">
                  <Icons.Sparkles className="w-8 h-8" />
                </div>
                <input 
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startGeneration()}
                  placeholder="Redefine the collective intent..."
                  className="flex-1 bg-transparent border-none outline-none px-5 py-6 text-xl font-bold text-slate-800 placeholder:text-slate-300"
                />
                <button 
                  onClick={() => startGeneration()}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-90 disabled:bg-slate-100 shrink-0"
                >
                  <Icons.Send className="w-8 h-8" />
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>

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
