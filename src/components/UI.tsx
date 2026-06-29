import { useEffect, useState } from 'react';
import { state, resetGame, getActiveMap } from '../game';
import { Flame, Target, Trophy, User, Map as MapIcon, ArrowLeft, Cloud, TreePine, Moon, Stars, Cpu, Ghost, Skull, Shuffle, Sparkles, Key, HelpCircle } from 'lucide-react';
import { useGameStore, ITEMS } from '../store';

export function UI() {
  const [status, setStatus] = useState(state.status);
  const [score, setScore] = useState(state.score);
  const [coins, setCoins] = useState(state.coins);
  const [level, setLevel] = useState(state.level);
  const store = useGameStore();

  const [forgeType, setForgeType] = useState<'chars'|'maps'|'skills'|'controls'>('chars');
  const [forgePrompt, setForgePrompt] = useState('');
  const [apiKey, setApiKey] = useState(store.genaiKey);
  const [isForging, setIsForging] = useState(false);
  const [forgeResult, setForgeResult] = useState('');
  const [warpAlpha, setWarpAlpha] = useState(0);

  const handleForge = async () => {
      if(!apiKey || !forgePrompt) {
          setForgeResult("API Key and Prompt are required.");
          return;
      }
      setIsForging(true);
      setForgeResult("Forging in progress...");
      store.genaiKey = apiKey;

      const partsSchema = `Array of objects: { "shape": "box"|"sphere"|"cylinder"|"cone"|"torus"|"dodecahedron", "color": "hex string", "pos": [x,y,z], "scale": [x,y,z], "rot": [x,y,z], "material"?: "standard"|"glow"|"wireframe", "anim"?: "spinY"|"spinX"|"float"|"pulse"|"none" }`;

      const systemInstruction = 
        forgeType === 'controls' ? `You are a game engine controller. The user wants to modify the game mechanics. Return ONLY a raw JSON patch for the GLOBAL_SETTINGS object, no markdown. Schema: { "speedModifier"?: number, "gravity"?: number, "jumpVelocity"?: number, "laneWidth"?: number, "cameraY"?: number, "cameraZ"?: number, "fov"?: number, "coinSpawnRate"?: number, "obstacleSpawnRate"?: number }. Example: if they want fast speed, low gravity, zoomed out, return { "speedModifier": 2, "gravity": 20, "cameraY": 10, "cameraZ": 20 }. Only include fields that the user implicitly or explicitly wants to change.` :
        forgeType === 'chars' ? `You are an expert game 3D character designer. Generate a JSON character. Output ONLY raw JSON, no markdown. Schema: { "id": "gen-c-...", "name": string, "desc": string, "cost": number, "parts": ${partsSchema} }. IMPORTANT: Create a highly detailed, visually stunning, multi-part composed 3D character. Be incredibly creative with scales, positions, rotations, glow materials, and animations. Use 5-15 parts. If the user does not explicitly specify a cost/price, set cost to 50.` :
        forgeType === 'maps' ? `You are an expert game environment designer. Generate a JSON map. Output ONLY raw JSON, no markdown. Schema: { "id": "gen-m-...", "name": string, "desc": string, "cost": number, "fogColor": string, "ambientColor": string, "dirColor": string, "decorations": ${partsSchema} }. IMPORTANT: Create a deeply atmospheric map. "decorations" are huge sky objects, background buildings, or terrain features that set the mood. If the user does not explicitly specify a cost/price, set cost to 50.` :
        "You are a game content generator. Generate a JSON skill. Output ONLY raw JSON, no markdown. Schema: { id: string, name: string, desc: string, baseCost: number, maxLevel: number }. id must start with 'gen-s-'. If the user does not explicitly specify a cost/price, set baseCost to 50.";

      try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  system_instruction: { parts: { text: systemInstruction } },
                  contents: [ { parts: [ { text: forgePrompt } ] } ],
                  generationConfig: { responseMimeType: "application/json" }
              })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          
          let parsed;
          try {
              const text = data.candidates[0].content.parts[0].text;
              parsed = JSON.parse(text);
          } catch(e) { throw new Error("Failed to parse JSON response"); }

          if (forgeType === 'controls') {
              store.applySettingsPatch(parsed);
              setForgeResult(`Game physics updated successfully! Hit Play to see the changes.`);
              setForgePrompt('');
              setIsForging(false);
              return;
          } else if (forgeType === 'chars') {
              if (parsed.cost === undefined) parsed.cost = 50;
              store.addCustomChar(parsed);
          } else if (forgeType === 'maps') {
              if (parsed.cost === undefined) parsed.cost = 50;
              store.addCustomMap(parsed);
          } else if (forgeType === 'skills') {
              if (parsed.baseCost === undefined) parsed.baseCost = 50;
              store.addCustomSkill(parsed);
          }

          setForgeResult(`Successfully forged: ${parsed.name}! Go to the Select screen to buy it.`);
          setForgePrompt('');
      } catch (err: any) {
          setForgeResult("Error: " + err.message);
      } finally {
          setIsForging(false);
      }
  };

  useEffect(() => {
    let animationFrameId: number;
    let prevMap = getActiveMap();

    const loop = () => {
      setStatus(prev => state.status !== prev ? state.status : prev);
      setScore(prev => state.score !== prev ? state.score : prev);
      setCoins(prev => state.coins !== prev ? state.coins : prev);
      setLevel(prev => state.level !== prev ? state.level : prev);

      const currentMap = getActiveMap();
      if (currentMap !== prevMap && state.status === 'PLAYING') {
          prevMap = currentMap;
          setWarpAlpha(1);
          setTimeout(() => setWarpAlpha(0), 100);
      } else if (state.status !== 'PLAYING') {
          prevMap = currentMap;
      }

      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handlePurchaseChar = (id: string, cost: number) => {
      if (store.unlockedChars.includes(id)) {
          store.selChar = id;
      } else if (store.fireballs >= cost) {
          store.fireballs -= cost;
          store.unlockChar(id);
          store.selChar = id;
      }
  };

  const handlePurchaseMap = (id: string, cost: number) => {
      if (store.unlockedMaps.includes(id)) {
          store.selMap = id;
      } else if (store.fireballs >= cost) {
          store.fireballs -= cost;
          store.unlockMap(id);
          store.selMap = id;
      }
  };

  const handlePurchaseSkill = (id: string, baseCost: number) => {
      const currentLevel = store.getSkillLevel(id);
      const cost = baseCost * (currentLevel + 1);
      if (store.fireballs >= cost) {
          store.fireballs -= cost;
          store.upgradeSkill(id);
      }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 overflow-hidden">
      <div 
         className="absolute inset-0 pointer-events-none bg-white z-[999] transition-opacity duration-[1500ms] ease-out" 
         style={{ opacity: warpAlpha }} 
      />
      
      {status === 'PLAYING' && (
        <div className="flex justify-between items-start pt-2 px-4 shadow-[inset_0_50px_50px_-50px_rgba(0,0,0,0.9)] text-amber-50">
          <div className="flex items-center gap-6">
              <div className="flex flex-col items-center justify-center bg-orange-600/80 rounded-full w-14 h-14 border-2 border-orange-400 drop-shadow-[0_2px_10px_rgba(234,88,12,0.8)]">
                  <p className="text-[10px] uppercase font-bold tracking-widest leading-none mt-1">Level</p>
                  <p className="font-mono text-2xl font-black">{level}</p>
              </div>
              <div className="flex flex-col">
                  <div className="flex items-center gap-2 font-mono text-3xl font-black italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <Target className="text-zinc-400" size={24} />
                    {score}
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-3xl font-black italic text-orange-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <Flame size={28} className="animate-pulse" />
            {coins}
          </div>
        </div>
      )}

      {status === 'MENU' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center py-6 pointer-events-auto overflow-y-auto animate-in fade-in duration-1000">
          <div className="absolute inset-0 bg-zinc-950/20 -z-20" />
          <div className="absolute inset-0 -z-10 mix-blend-overlay opacity-60 pointer-events-none fade-in animate-in duration-[3000ms]">
             <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-orange-600/10 rounded-full mix-blend-screen animate-[spin_10s_ease-in-out_infinite_alternate]" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-yellow-500/10 rounded-full mix-blend-screen animate-pulse duration-[5000ms]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 -z-10" />

          {/* Top Bar - Lifetime Stats */}
          <div className="w-full mb-auto flex justify-between px-6">
               <div className="flex flex-col items-start bg-black/40 px-6 py-3 rounded-full border border-orange-500/20">
                   <p className="text-orange-200/50 uppercase text-xs font-bold tracking-widest">Highscore</p>
                   <p className="flex items-center gap-2 font-mono text-2xl font-black text-white"><Trophy size={18} className="text-yellow-400"/> {store.highscore}m</p>
               </div>
               <div className="flex flex-col items-end bg-black/40 px-6 py-3 rounded-full border border-orange-500/20">
                   <p className="text-orange-200/50 uppercase text-xs font-bold tracking-widest">Energy</p>
                   <p className="flex items-center gap-2 font-mono text-2xl font-black text-orange-400"><Flame size={18}/> {store.fireballs}</p>
               </div>
          </div>

          <div className="relative flex flex-col items-center scale-75 sm:scale-100">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none delay-700" />
            
            <h1 className="relative font-black tracking-tighter italic text-center leading-tight mb-2 animate-in slide-in-from-bottom-20 zoom-in-90 duration-1000 ease-out fill-mode-both">
              <span className="block text-7xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-orange-300 via-orange-500 to-red-600 drop-shadow-[0_0_40px_rgba(234,88,12,0.4)] px-4">SOLSTICE</span>
              <span className="block text-5xl md:text-7xl text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] pb-4 mt-2">RUNNER</span>
            </h1>
            
            <p className="items-center flex gap-4 text-orange-200 font-bold tracking-[0.5em] uppercase text-sm md:text-lg animate-in slide-in-from-bottom-5 duration-1000 delay-[400ms] fill-mode-both mb-10 drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
              <span className="w-10 h-px bg-orange-500/50 hidden md:block" />
              The longest day awaits
              <span className="w-10 h-px bg-orange-500/50 hidden md:block" />
            </p>

            <button
              onClick={() => resetGame()}
              className="group relative px-16 py-5 bg-transparent text-white font-black text-2xl rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 tracking-[0.2em] uppercase animate-in zoom-in-95 duration-1000 delay-[800ms] fill-mode-both border border-orange-500/30 hover:border-orange-500/80 shadow-[0_0_40px_rgba(249,115,22,0.2)] hover:shadow-[0_0_60px_rgba(249,115,22,0.6)] backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/80 via-rose-600/80 to-orange-600/80 opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full duration-1000 transition-transform ease-in-out skew-x-12" />
              <span className="relative z-10 flex items-center justify-center gap-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                Begin Journey
                <Flame size={28} className="group-hover:text-yellow-300 group-hover:scale-110 transition-all text-orange-200" strokeWidth={2.5} />
              </span>
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-8 mb-4 animate-in slide-in-from-bottom-10 delay-1000 fill-mode-both duration-1000">
             <button onClick={() => { state.status = 'CHOOSE_CHARACTER'; setStatus('CHOOSE_CHARACTER'); }} className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-700 text-zinc-300 px-5 py-3 rounded-full font-bold uppercase tracking-widest text-xs sm:text-sm transition-colors border border-zinc-700 hover:border-orange-500/50 shadow-lg">
                 <User size={16} /> Heroes
             </button>
             <button onClick={() => { state.status = 'CHOOSE_MAP'; setStatus('CHOOSE_MAP'); }} className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-700 text-zinc-300 px-5 py-3 rounded-full font-bold uppercase tracking-widest text-xs sm:text-sm transition-colors border border-zinc-700 hover:border-orange-500/50 shadow-lg">
                 <MapIcon size={16} /> Maps
             </button>
             <button onClick={() => { state.status = 'SKILLS'; setStatus('SKILLS'); }} className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-700 text-zinc-300 px-5 py-3 rounded-full font-bold uppercase tracking-widest text-xs sm:text-sm transition-colors border border-zinc-700 hover:border-orange-500/50 shadow-lg">
                 <Target size={16} /> Skills
             </button>
             <button onClick={() => { state.status = 'AI_FORGE'; setStatus('AI_FORGE'); }} className="flex items-center gap-2 bg-gradient-to-r from-orange-900/80 to-red-900/80 hover:from-orange-800 hover:to-red-800 text-zinc-200 px-5 py-3 rounded-full font-bold uppercase tracking-widest text-xs sm:text-sm transition-colors border border-orange-500/50 hover:border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                 <Sparkles size={16} className="text-orange-300" /> AI Forge
             </button>
             <button onClick={() => { state.status = 'HELP'; setStatus('HELP'); }} className="flex items-center gap-2 bg-blue-900/80 hover:bg-blue-700 text-zinc-200 px-5 py-3 rounded-full font-bold uppercase tracking-widest text-xs sm:text-sm transition-colors border border-blue-500/50 hover:border-blue-400 shadow-lg">
                 <HelpCircle size={16} className="text-blue-300" /> How to Play
             </button>
          </div>
        </div>
      )}

      {status === 'HELP' && (
         <div className="absolute inset-0 bg-black/90 flex flex-col items-center overflow-y-auto py-12 px-6 pointer-events-auto backdrop-blur-md">
             <div className="w-full max-w-3xl relative">
                 <button onClick={() => { state.status = 'MENU'; setStatus('MENU'); }} className="absolute -top-6 left-0 text-white flex items-center gap-2 font-bold tracking-widest uppercase hover:text-orange-400 transition-colors z-10">
                     <ArrowLeft /> Back
                 </button>

                 <h2 className="text-4xl font-black text-white italic tracking-tighter mb-8 mt-12 text-center border-b border-zinc-800 pb-4">HOW TO <span className="text-blue-500">PLAY</span></h2>

                 <div className="space-y-8 text-zinc-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                     <section className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                         <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Target className="text-orange-500" /> Controls</h3>
                         <ul className="list-disc pl-5 space-y-2">
                             <li><strong className="text-white">Left / Right Arrows or A / D:</strong> Move between lanes to dodge tall columns.</li>
                             <li><strong className="text-white">Up Arrow or W:</strong> Jump over low hurdles and gaps.</li>
                             <li><strong className="text-white">Down Arrow or S:</strong> Slide under high archways.</li>
                             <li><strong className="text-white">Mobile:</strong> Swipe Left, Right, Up, or Down to control your character.</li>
                         </ul>
                     </section>

                     <section className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                         <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><User className="text-purple-400" /> Game Options</h3>
                         <p className="mb-2">You can customize your experience in the main menu:</p>
                         <ul className="list-disc pl-5 space-y-2">
                             <li><strong className="text-white">Heroes:</strong> Buy and equip new characters with the Fireballs you collect.</li>
                             <li><strong className="text-white">Maps:</strong> Unlock distinct environments like the Haunted Graveyard or the dynamic Multi Map.</li>
                             <li><strong className="text-white">Skills:</strong> Upgrade your abilities permanently, such as increasing your Coin Magnet range or Starting Speed.</li>
                         </ul>
                     </section>

                     <section className="bg-zinc-900/50 p-6 rounded-2xl border border-orange-900/50 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                         <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Sparkles className="text-orange-500" /> AI Forge & Gemini API</h3>
                         <p className="mb-4">The <strong className="text-orange-400">AI Forge</strong> is a revolutionary feature that lets you create your own game content using AI!</p>
                         <ul className="list-disc pl-5 space-y-4">
                             <li>
                                 <strong className="text-white">How to Setup:</strong> Click the "Get API Key" link in the AI Forge menu to generate a free Google Gemini API key. Paste it into the game to activate the Forge.
                             </li>
                             <li>
                                 <strong className="text-white">Characters:</strong> Type what you want (e.g., "A fire demon") and the AI will generate a custom 3D model with glowing parts and animations.
                             </li>
                             <li>
                                 <strong className="text-white">Maps:</strong> Describe an environment (e.g., "Cyberpunk city") and the AI will build the skybox, lighting, and background decorations! Gameplay obstacles will be added automatically.
                             </li>
                             <li>
                                 <strong className="text-white">Cost:</strong> All AI-generated items cost 50 Fireballs by default unless you explicitly tell the AI to make them free in your prompt!
                             </li>
                         </ul>
                     </section>
                 </div>
             </div>
         </div>
      )}

      {status === 'CHOOSE_CHARACTER' && (
         <div className="absolute inset-0 bg-black/80 flex flex-col items-center overflow-y-auto pt-24 pb-12 pointer-events-auto backdrop-blur-md">
             <div className="absolute top-8 left-8">
                 <button onClick={() => { state.status = 'MENU'; setStatus('MENU'); }} className="text-white flex items-center gap-2 font-bold tracking-widest uppercase hover:text-orange-400 transition-colors">
                     <ArrowLeft /> Back
                 </button>
             </div>
             
             <h2 className="text-4xl font-black text-white italic tracking-tighter mb-12">CHOOSE YOUR <span className="text-orange-500">HERO</span></h2>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center w-full max-w-6xl px-8">
                 {ITEMS.chars.map(c => {
                     const isUnlocked = store.unlockedChars.includes(c.id);
                     const isSelected = store.selChar === c.id;
                     return (
                         <div key={c.id} className={`w-full max-w-[280px] p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all shadow-xl ${isSelected ? 'border-orange-500 bg-orange-500/10 scale-105 shadow-[0_0_30px_rgba(249,115,22,0.3)]' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'}`}>
                             <div className="w-full h-32 rounded-lg mb-4 shadow-inner overflow-hidden relative border border-zinc-700/50 flex items-center justify-center bg-zinc-800">
                                 {c.id === "c1" && (
                                     <div className="w-full h-full relative flex items-center justify-center">
                                         <div className="flex flex-col items-center drop-shadow-xl translate-y-2">
                                             <div className="w-6 h-6 bg-[#fcd34d] shadow-inner" />
                                             <div className="flex gap-1 mt-1">
                                                 <div className="w-2 h-8 bg-zinc-400" />
                                                 <div className="w-8 h-10 bg-[#f97316] shadow-inner" />
                                                 <div className="w-2 h-8 bg-zinc-400" />
                                             </div>
                                             <div className="flex gap-2 mt-1">
                                                 <div className="w-3 h-8 bg-zinc-800" />
                                                 <div className="w-3 h-8 bg-zinc-800" />
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 {c.id === "c2" && (
                                     <div className="w-full h-full relative flex items-center justify-center">
                                         <div className="flex flex-col items-center animate-bounce drop-shadow-[0_0_15px_#9333ea]">
                                             <div className="w-6 h-6 bg-purple-900 border border-purple-500 rounded-sm transform rotate-45 mb-1 flex items-center justify-center">
                                                 <div className="w-3 h-1 bg-purple-300 transform -rotate-45" />
                                             </div>
                                             <div className="w-8 h-8 bg-purple-900 border border-purple-500 rounded-sm transform rotate-45 mt-1" />
                                             <div className="flex gap-6 -mt-4 opacity-80">
                                                 <div className="w-3 h-3 bg-purple-900 border border-purple-500 rounded-sm transform rotate-45" />
                                                 <div className="w-3 h-3 bg-purple-900 border border-purple-500 rounded-sm transform rotate-45" />
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 {c.id === "c3" && (
                                     <div className="w-full h-full relative flex items-center justify-center">
                                         <div className="flex flex-col items-center drop-shadow-[0_0_15px_#fcd34d] translate-y-2">
                                             <div className="relative w-10 h-10 bg-yellow-400 rounded-full border border-yellow-200 flex items-center justify-center mb-1">
                                                 <div className="w-full h-full absolute inset-0 blur-sm bg-yellow-300 rounded-full mix-blend-screen" />
                                                 <div className="absolute flex gap-1 z-10 -mt-1">
                                                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                                 </div>
                                                 <div className="absolute -top-3 w-1 h-3 bg-yellow-200 rounded-full" />
                                                 <div className="absolute top-0 -right-2 w-3 h-1 bg-yellow-200 rounded-full rotate-[30deg]" />
                                                 <div className="absolute top-0 -left-2 w-3 h-1 bg-yellow-200 rounded-full -rotate-[30deg]" />
                                             </div>
                                             <div className="flex gap-4 z-10">
                                                 <div className="w-2 h-6 bg-orange-600 rounded-full" /> 
                                                 <div className="w-2 h-6 bg-orange-600 rounded-full" /> 
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 {c.id === "c4" && (
                                     <div className="w-full h-full relative flex items-center justify-center">
                                         <div className="w-12 h-16 bg-white rounded-t-full relative drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] flex justify-center animate-pulse">
                                             <div className="absolute top-5 left-2 w-2 h-3 bg-black rounded-full skew-x-6" />
                                             <div className="absolute top-5 right-2 w-2 h-3 bg-black rounded-full -skew-x-6" />
                                             <div className="absolute top-10 w-3 h-2 bg-black rounded-full" />
                                             <div className="absolute -bottom-1 w-full flex justify-around">
                                                 <div className="w-3 h-3 bg-white rounded-full" />
                                                 <div className="w-3 h-3 bg-white rounded-full" />
                                                 <div className="w-3 h-3 bg-white rounded-full" />
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 {c.id === "c5" && (
                                     <div className="w-full h-full relative flex items-center justify-center">
                                         <div className="flex flex-col items-center drop-shadow-[0_0_10px_#3b82f6] translate-y-2">
                                             <div className="w-8 h-6 bg-[#60a5fa] rounded-sm border-2 border-[#1d4ed8] flex justify-center items-center gap-1">
                                                 <div className="w-3 h-1 bg-red-400 shadow-[0_0_5px_red]" />
                                             </div>
                                             <div className="flex gap-1 mt-1">
                                                 <div className="w-3 h-10 bg-[#93c5fd] border-2 border-[#2563eb]" /> 
                                                 <div className="w-10 h-10 bg-[#3b82f6] border-2 border-[#1e40af] flex items-center justify-center">
                                                    <div className="w-4 h-4 rounded-full bg-cyan-400 blur-sm mix-blend-screen animate-pulse" />
                                                 </div> 
                                                 <div className="w-3 h-10 bg-[#93c5fd] border-2 border-[#2563eb]" /> 
                                             </div>
                                             <div className="flex gap-3 mt-1">
                                                 <div className="w-4 h-6 bg-zinc-600 border border-zinc-900" /> 
                                                 <div className="w-4 h-6 bg-zinc-600 border border-zinc-900" /> 
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 {c.id.startsWith("gen-c") && (
                                     <div className="w-full h-full relative flex items-center justify-center">
                                         <div className="flex flex-col items-center drop-shadow-xl translate-y-2 animate-pulse">
                                             <div className="w-8 h-8 rounded-full shadow-inner border border-white/20" style={{backgroundColor: c.color}} />
                                             <div className="flex gap-1 mt-1">
                                                 <div className="w-2 h-10 shadow-inner rounded" style={{backgroundColor: c.color, filter: 'brightness(0.6)'}} /> 
                                                 <div className="w-10 h-12 shadow-inner border border-white/20 rounded-md" style={{backgroundColor: c.color}} /> 
                                                 <div className="w-2 h-10 shadow-inner rounded" style={{backgroundColor: c.color, filter: 'brightness(0.6)'}} /> 
                                             </div>
                                             <div className="flex gap-3 mt-1">
                                                 <div className="w-3 h-8 shadow-inner rounded" style={{backgroundColor: c.color, filter: 'brightness(0.4)'}} /> 
                                                 <div className="w-3 h-8 shadow-inner rounded" style={{backgroundColor: c.color, filter: 'brightness(0.4)'}} /> 
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                             </div>
                             <h3 className="text-xl font-bold text-white mb-2">{c.name}</h3>
                             <p className="text-zinc-400 text-sm mb-6 min-h-[3rem] flex items-center justify-center">{c.desc}</p>
                             
                             <button
                               onClick={() => handlePurchaseChar(c.id, c.cost)}
                               disabled={!isUnlocked && store.fireballs < c.cost}
                               className={`w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm ${isSelected ? 'bg-orange-500 text-white' : isUnlocked ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : store.fireballs >= c.cost ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                             >
                                 {isSelected ? 'Selected' : isUnlocked ? 'Select' : `Unlock (${c.cost})`}
                             </button>
                         </div>
                     )
                 })}
             </div>
             <p className="mt-8 flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-widest"><Flame className="text-orange-500"/> Energy Available: {store.fireballs}</p>
         </div>
      )}

      {status === 'CHOOSE_MAP' && (
         <div className="absolute inset-0 bg-black/80 flex flex-col items-center overflow-y-auto pt-24 pb-12 pointer-events-auto backdrop-blur-md">
             <div className="absolute top-8 left-8">
                 <button onClick={() => { state.status = 'MENU'; setStatus('MENU'); }} className="text-white flex items-center gap-2 font-bold tracking-widest uppercase hover:text-orange-400 transition-colors">
                     <ArrowLeft /> Back
                 </button>
             </div>
             
             <h2 className="text-4xl font-black text-white italic tracking-tighter mb-12">CHOOSE <span className="text-orange-500">REALM</span></h2>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center w-full max-w-6xl px-8">
                 {ITEMS.maps.map(m => {
                     const isUnlocked = store.unlockedMaps.includes(m.id);
                     const isSelected = store.selMap === m.id;
                     return (
                         <div key={m.id} className={`w-full max-w-[280px] p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all shadow-xl ${isSelected ? 'border-orange-500 bg-orange-500/10 scale-105 shadow-[0_0_30px_rgba(249,115,22,0.3)]' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'}`}>
                             <div className="w-full h-32 rounded-lg mb-4 shadow-inner overflow-hidden relative border border-zinc-700/50 flex items-center justify-center bg-zinc-900 group">
                                 {["m1", "m2", "m3"].includes(m.id) && (
                                     <img src={`${import.meta.env.BASE_URL}maps/${m.id}.png`} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                 )}
                                 {m.id === "m4" && (
                                     <div className="w-full h-full relative group-hover:scale-110 transition-transform flex">
                                         <img src={`${import.meta.env.BASE_URL}maps/m1.png`} className="w-1/3 h-full object-cover grayscale-[30%]" />
                                         <img src={`${import.meta.env.BASE_URL}maps/m2.png`} className="w-1/3 h-full object-cover border-l-2 border-r-2 border-orange-500/50" />
                                         <img src={`${import.meta.env.BASE_URL}maps/m3.png`} className="w-1/3 h-full object-cover hue-rotate-90" />
                                     </div>
                                 )}
                                 {m.id.startsWith("gen-m") && (
                                     <div className="w-full h-full relative group-hover:scale-110 transition-transform flex flex-col justify-between overflow-hidden" style={{backgroundColor: (m as any).fogColor || "#222"}}>
                                         <div className="absolute top-4 left-4 w-10 h-10 rounded-full blur-sm" style={{backgroundColor: (m as any).dirColor || '#fff'}} />
                                         <div className="w-full h-1/3 mt-auto" style={{backgroundColor: (m as any).ambientColor || "#111"}} />
                                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-b-[40px] border-b-black/50 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent w-4" />
                                     </div>
                                 )}
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                             </div>
                             <h3 className="text-xl font-bold text-white mb-2">{m.name}</h3>
                             <p className="text-zinc-400 text-sm mb-6 min-h-[3rem] flex items-center justify-center">{m.desc}</p>
                             
                             <button
                               onClick={() => handlePurchaseMap(m.id, m.cost)}
                               disabled={!isUnlocked && store.fireballs < m.cost}
                               className={`w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm ${isSelected ? 'bg-orange-500 text-white' : isUnlocked ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : store.fireballs >= m.cost ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                             >
                                 {isSelected ? 'Selected' : isUnlocked ? 'Select' : `Unlock (${m.cost})`}
                             </button>
                         </div>
                     )
                 })}
             </div>
             <p className="mt-8 flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-widest"><Flame className="text-orange-500"/> Energy Available: {store.fireballs}</p>
         </div>
      )}

      {status === 'SKILLS' && (
         <div className="absolute inset-0 bg-black/80 flex flex-col items-center overflow-y-auto pt-24 pb-12 pointer-events-auto backdrop-blur-md">
             <div className="absolute top-8 left-8">
                 <button onClick={() => { state.status = 'MENU'; setStatus('MENU'); }} className="text-white flex items-center gap-2 font-bold tracking-widest uppercase hover:text-orange-400 transition-colors">
                     <ArrowLeft /> Back
                 </button>
             </div>
             
             <h2 className="text-4xl font-black text-white italic tracking-tighter mb-12">UPGRADE <span className="text-orange-500">SKILLS</span></h2>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center w-full max-w-6xl px-8">
                 {ITEMS.skills.map(s => {
                     const currentLvl = store.getSkillLevel(s.id);
                     const isMax = currentLvl >= s.maxLevel;
                     const nextCost = s.baseCost * (currentLvl + 1);
                     return (
                         <div key={s.id} className="w-full max-w-[280px] p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all border-zinc-800 bg-zinc-900/50 hover:border-orange-500/50 shadow-xl">
                             <div className="w-full h-32 rounded-lg mb-4 shadow-lg overflow-hidden relative border border-zinc-700/50 flex items-center justify-center bg-zinc-900">
                                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/20 to-transparent pointer-events-none" />
                                 <Target size={48} className="text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] relative z-10" />
                             </div>
                             <h3 className="text-xl font-bold text-white mb-2">{s.name}</h3>
                             <p className="text-zinc-400 text-sm mb-4 min-h-[3rem] flex items-center justify-center">{s.desc}</p>
                             
                             <div className="flex gap-1 mb-6">
                                {Array.from({ length: s.maxLevel }).map((_, i) => (
                                    <div key={i} className={`w-6 h-2 rounded-full ${i < currentLvl ? 'bg-orange-500' : 'bg-zinc-800'}`} />
                                ))}
                             </div>

                             <button
                               onClick={() => handlePurchaseSkill(s.id, s.baseCost)}
                               disabled={isMax || store.fireballs < nextCost}
                               className={`w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm ${isMax ? 'bg-zinc-800 text-orange-500' : store.fireballs >= nextCost ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                             >
                                 {isMax ? 'Max Level' : `Upgrade (${nextCost})`}
                             </button>
                         </div>
                     )
                 })}
             </div>
             <p className="mt-8 flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-widest"><Flame className="text-orange-500"/> Energy Available: {store.fireballs}</p>
         </div>
      )}

      {status === 'AI_FORGE' && (
         <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center overflow-y-auto pointer-events-auto backdrop-blur-xl px-4 py-8">
             <div className="absolute top-8 left-8">
                 <button onClick={() => { state.status = 'MENU'; setStatus('MENU'); }} className="text-white flex items-center gap-2 font-bold tracking-widest uppercase hover:text-orange-400 transition-colors">
                     <ArrowLeft /> Back
                 </button>
             </div>
             
             <h2 className="text-4xl font-black text-white italic tracking-tighter mb-8"><span className="text-orange-500">AI</span> FORGE</h2>
             
             <div className="bg-zinc-900 border border-orange-500/30 p-8 rounded-2xl w-full max-w-xl shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                <p className="text-zinc-400 mb-6 text-sm text-center">Enter your Gemini API key and write a prompt to generate custom game content.</p>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-zinc-300 font-bold uppercase tracking-widest text-sm flex items-center gap-2"><Key size={14}/> Gemini API Key</label>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">Get Free API Key</a>
                    </div>
                    <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-orange-500 transition-colors" />
                </div>

                <div className="mb-6">
                    <label className="block text-zinc-300 font-bold uppercase tracking-widest text-sm mb-2">Forge Type</label>
                    <div className="flex bg-black rounded-lg p-1 border border-zinc-700">
                        {['chars', 'maps', 'skills', 'controls'].map(t => (
                            <button key={t} onClick={() => setForgeType(t as any)} className={`flex-1 py-2 rounded-md font-bold uppercase tracking-wide text-sm transition-colors ${forgeType === t ? 'bg-orange-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-zinc-300 font-bold uppercase tracking-widest text-sm mb-2">Prompt</label>
                    <textarea value={forgePrompt} onChange={e => setForgePrompt(e.target.value)} placeholder="A blazing fire demon..." className="w-full h-24 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors resize-none" />
                </div>

                <button onClick={handleForge} disabled={isForging} className="w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-50 transition-all">
                    {isForging ? 'Forging...' : 'Initiate Sequence'}
                </button>

                {forgeResult && (
                    <div className="mt-6 p-4 rounded-lg bg-black border border-zinc-700 text-zinc-300 text-sm text-center">
                        {forgeResult}
                    </div>
                )}
             </div>
         </div>
      )}

      {status === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-xl animate-in fade-in duration-500">
          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800 tracking-tighter italic mb-8 pr-4 drop-shadow-[0_5px_15px_rgba(220,38,38,0.5)] animate-in slide-in-from-top-10 duration-700">
            WASTED
          </h1>
          <div className="flex flex-col items-center gap-4 bg-black/60 p-8 rounded-3xl mb-12 border border-red-900/50 shadow-[0_0_50px_rgba(153,27,27,0.3)] animate-in zoom-in-95 duration-700 delay-150 fill-mode-both hover:-translate-y-2 hover:shadow-[0_0_80px_rgba(220,38,38,0.4)] transition-all">
            <div className="text-center group">
              <p className="text-red-300 font-bold uppercase tracking-[0.3em] text-sm mb-1 group-hover:text-red-200 transition-colors">Final Distance</p>
              <div className="flex items-baseline justify-center gap-1 group-hover:scale-110 transition-transform origin-bottom">
                <p className="text-6xl font-mono font-black text-white">{score}</p>
                <p className="text-2xl font-mono font-bold text-red-500">m</p>
              </div>
            </div>
            <div className="h-px w-3/4 bg-gradient-to-r from-transparent via-red-900/50 to-transparent my-4" />
            <div className="text-center group">
              <p className="flex items-center justify-center gap-2 text-orange-500/80 font-bold uppercase tracking-[0.2em] text-sm mb-1 group-hover:text-orange-400 transition-colors">
                <Flame size={16} /> Fireballs Extracted
              </p>
              <p className="text-4xl font-mono font-black text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] group-hover:scale-110 transition-transform">{coins}</p>
            </div>
          </div>
          <div className="flex gap-4">
              <button
                onClick={() => resetGame()}
                className="group relative px-12 py-5 bg-red-600 hover:bg-red-500 text-white font-black text-xl rounded-full shadow-[0_0_40px_rgba(220,38,38,0.5)] overflow-hidden transition-all transform hover:-translate-y-1 active:translate-y-2 active:shadow-none tracking-[0.2em] uppercase animate-in slide-in-from-bottom-10 duration-700 delay-300 fill-mode-both"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Run Again
                  <Target size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                </span>
                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              </button>
              <button onClick={() => { state.status = 'MENU'; setStatus('MENU'); }} className="px-8 py-5 bg-black/50 hover:bg-black text-white font-bold tracking-widest uppercase rounded-full border border-red-900/50 hover:border-red-500 transition-all">
                  Menu
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
