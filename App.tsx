
import React, { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Play, RotateCcw, Keyboard, Sword, Shield, Zap, Wind, MousePointer, Pause, Users, Crosshair, Skull, Box } from 'lucide-react';
import { FighterClass, GameMode } from './types';
import { COLORS } from './config/colors';
import { useGameLoop } from './hooks/useGameLoop';
import { HUD } from './components/HUD';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config/physics';

// --- DATA & STATS ---
const CLASSES: { 
    id: FighterClass; 
    name: string; 
    desc: string; 
    icon: any;
    stats: { speed: number; power: number; defense: number; difficulty: string } 
}[] = [
    { 
        id: 'VOLT', 
        name: 'VOLT', 
        desc: 'SPEED DEMON', 
        icon: Zap,
        stats: { speed: 95, power: 60, defense: 30, difficulty: 'HARD' }
    },
    { 
        id: 'SLINGER', 
        name: 'SLINGER', 
        desc: 'AERIAL ASSASSIN', 
        icon: Wind,
        stats: { speed: 85, power: 50, defense: 50, difficulty: 'MED' }
    },
    { 
        id: 'VORTEX', 
        name: 'VORTEX', 
        desc: 'SPACE CONTROL', 
        icon: Zap, // Reusing Zap but visually distinct in game
        stats: { speed: 40, power: 95, defense: 40, difficulty: 'EXPERT' }
    },
    { 
        id: 'KINETIC', 
        name: 'KINETIC', 
        desc: 'HEAVY IMPACT', 
        icon: Shield,
        stats: { speed: 60, power: 85, defense: 90, difficulty: 'EASY' }
    },
];

const MODES: { id: GameMode; name: string; desc: string; icon: any; color: string }[] = [
    { id: 'VERSUS', name: 'NEON RIOT', desc: 'CLASSIC 1V1 DUEL', icon: Crosshair, color: 'text-cyan-400' },
    { id: 'SURVIVAL', name: 'SURVIVAL', desc: 'ENDLESS WAVES', icon: Skull, color: 'text-red-500' },
    { id: 'SANDBOX', name: 'SANDBOX', desc: 'TRAINING DUMMY', icon: Box, color: 'text-green-400' },
];

export default function App() {
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [scores, setScores] = useState({ player: 0, enemy: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  // Selection State
  const [selectedMode, setSelectedMode] = useState<GameMode>('VERSUS');
  const [playerClass, setPlayerClass] = useState<FighterClass>('VOLT');
  const [enemyClass, setEnemyClass] = useState<FighterClass>('KINETIC');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- GAME LOOP HOOK ---
  const handleGameOver = (win: 'player' | 'enemy', pScore: number, eScore: number) => {
      // Logic handled in loop but we need to trigger UI
      // In Survival mode, we don't trigger "Game Over" on Enemy death, only on Player death
      if (selectedMode === 'SURVIVAL' && win === 'player') return;

      setWinner(win);
      setScores({ player: pScore, enemy: eScore });
      setTimeout(() => {
          setIsMenuOpen(false); // Keep menu closed, show Game Over Overlay
      }, 500);
  };

  const { gameState: gameStateRef, startGame, togglePause } = useGameLoop(canvasRef, handleGameOver);

  // Sync menu state with game loop logic
  useEffect(() => {
     gameStateRef.current.isMenuOpen = isMenuOpen;
  }, [isMenuOpen]);

  // --- CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Escape') {
            if (!isMenuOpen && !winner) {
                togglePause();
                setIsPaused(prev => !prev);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, winner]);

  const handleStart = () => {
      startGame(selectedMode, playerClass, enemyClass);
      setIsMenuOpen(false);
      setWinner(null);
      setIsPaused(false);
  };

  const getClassColor = (id: FighterClass) => {
      const key = id.toLowerCase() as keyof typeof COLORS;
      return (COLORS as any)[key]?.primary || '#fff';
  };

  return (
    <div className="w-full h-screen bg-[#020205] overflow-hidden flex flex-col relative text-slate-100 font-sans selection:bg-pink-500 selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        .font-orbitron { font-family: 'Orbitron', sans-serif; }
        
        /* GLITCH & NEON UTILS */
        .glass-panel {
            background: rgba(10, 10, 15, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 0 40px rgba(0,0,0,0.5);
        }
        .neon-border {
            border: 1px solid rgba(0, 255, 255, 0.3);
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.1), inset 0 0 20px rgba(0, 255, 255, 0.05);
        }
        .scanlines {
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 4px, 6px 100%;
            pointer-events: none;
        }
        
        @keyframes neon-pulse {
            0%, 100% { box-shadow: 0 0 5px var(--glow-color), inset 0 0 5px var(--glow-color); border-color: var(--glow-color); }
            50% { box-shadow: 0 0 20px var(--glow-color), inset 0 0 10px var(--glow-color); border-color: #fff; }
        }
        .class-card.active {
            animation: neon-pulse 1.5s infinite ease-in-out;
            background: rgba(255,255,255,0.05);
        }
      `}</style>
      
      {/* GLOBAL FX */}
      <div className="absolute inset-0 pointer-events-none z-50 scanlines opacity-40"></div>
      
      {/* MAIN MENU OVERLAY */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="flex flex-col w-full max-w-6xl h-[90vh] glass-panel rounded-2xl overflow-hidden relative">
                
                {/* HEADER */}
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/40">
                    <div>
                        <h1 className="text-5xl font-black italic font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                            NEOFIGHT
                        </h1>
                        <p className="text-xs font-mono text-cyan-500/60 tracking-[0.5em] mt-2">TACTICAL CYBER COMBAT SIMULATOR</p>
                    </div>
                    <div className="flex gap-4">
                        {MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id)}
                                className={`px-6 py-3 rounded border font-bold font-orbitron transition-all duration-200 flex flex-col items-center gap-1 w-32
                                    ${selectedMode === mode.id 
                                        ? `bg-white/10 border-white/40 ${mode.color} shadow-[0_0_15px_rgba(255,255,255,0.1)]` 
                                        : 'border-transparent text-white/30 hover:bg-white/5 hover:text-white/60'}`}
                            >
                                <mode.icon size={20} />
                                <span className="text-[10px] tracking-wider">{mode.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* PLAYER SELECTION */}
                    <div className="flex-1 p-8 border-r border-white/10 flex flex-col gap-4 overflow-y-auto">
                        <div className="text-xs font-mono text-white/40 mb-2 flex items-center gap-2">
                             <div className="w-1 h-1 bg-cyan-400"></div> OPERATOR SELECTION
                        </div>
                        {CLASSES.map((c) => (
                           <button 
                                key={`p-${c.id}`}
                                onClick={() => setPlayerClass(c.id)}
                                style={{ '--glow-color': getClassColor(c.id) } as any}
                                className={`class-card w-full p-4 border border-white/5 rounded-lg flex items-center gap-4 group text-left relative overflow-hidden transition-all ${playerClass === c.id ? 'active' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}
                           >
                               <div className="p-3 bg-black/40 rounded border border-white/10 group-hover:border-white/30 z-10">
                                    <c.icon size={24} style={{ color: getClassColor(c.id) }} />
                               </div>
                               <div className="flex-1 z-10">
                                   <div className="font-orbitron font-bold text-xl leading-none mb-1" style={{ color: getClassColor(c.id) }}>{c.name}</div>
                                   <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider">{c.desc}</div>
                               </div>
                           </button>
                        ))}
                    </div>

                    {/* CENTER ACTION */}
                    <div className="w-80 flex flex-col items-center justify-center p-8 bg-black/20 relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent"></div>
                        
                        <div className="text-center mb-8">
                            <div className="text-6xl font-black italic text-white/10 font-orbitron select-none">VS</div>
                        </div>

                        <button 
                            onClick={handleStart}
                            className="group relative px-12 py-6 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-2xl transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.8)] skew-x-[-10deg] hover:scale-105"
                        >
                            <span className="skew-x-[10deg] block font-orbitron tracking-widest">INITIATE</span>
                        </button>
                        
                        <div className="mt-8 text-center">
                            <p className="text-[10px] font-mono text-white/30 mb-2">TARGET SYSTEM</p>
                            <div className="text-xl font-bold font-orbitron text-red-500">{selectedMode} MODE</div>
                        </div>
                    </div>

                    {/* ENEMY SELECTION */}
                    <div className={`flex-1 p-8 border-l border-white/10 flex flex-col gap-4 overflow-y-auto ${selectedMode === 'SURVIVAL' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                         <div className="text-xs font-mono text-white/40 mb-2 flex items-center gap-2 justify-end">
                             TARGET SELECTION <div className="w-1 h-1 bg-red-500"></div>
                        </div>
                        {selectedMode === 'SURVIVAL' && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center">
                                <span className="bg-black/80 px-4 py-2 text-red-500 font-mono text-xs border border-red-500/30">RANDOMIZED TARGETS</span>
                            </div>
                        )}
                        {CLASSES.map((c) => (
                           <button 
                                key={`e-${c.id}`}
                                onClick={() => setEnemyClass(c.id)}
                                style={{ '--glow-color': getClassColor(c.id) } as any}
                                className={`class-card w-full p-4 border border-white/5 rounded-lg flex flex-row-reverse items-center gap-4 group text-right relative overflow-hidden transition-all ${enemyClass === c.id ? 'active' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}
                           >
                               <div className="p-3 bg-black/40 rounded border border-white/10 group-hover:border-white/30 z-10">
                                    <c.icon size={24} style={{ color: getClassColor(c.id) }} />
                               </div>
                               <div className="flex-1 z-10">
                                   <div className="font-orbitron font-bold text-xl leading-none mb-1" style={{ color: getClassColor(c.id) }}>{c.name}</div>
                                   <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider">{c.desc}</div>
                               </div>
                           </button>
                        ))}
                    </div>

                </div>
            </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {!isMenuOpen && winner && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
             <h2 className={`text-[8rem] leading-none font-black italic font-orbitron transform -skew-x-6 select-none mb-4
                    ${winner === 'player' ? 'text-cyan-500 drop-shadow-[0_0_40px_rgba(0,255,255,0.6)]' : 'text-red-600 drop-shadow-[0_0_40px_rgba(220,38,38,0.6)]'}`}>
                    {winner === 'player' ? 'MISSION ACCOMPLISHED' : 'CRITICAL FAILURE'}
            </h2>
            
            <div className="flex gap-12 font-mono text-xl mb-12">
                 <div className="text-center">
                     <div className="text-white/40 text-xs mb-1">FINAL SCORE</div>
                     <div className="text-4xl font-bold">{scores.player}</div>
                 </div>
                 {selectedMode === 'SURVIVAL' && (
                     <div className="text-center">
                        <div className="text-white/40 text-xs mb-1">WAVES CLEARED</div>
                        <div className="text-4xl font-bold text-yellow-400">{gameStateRef.current.wave}</div>
                     </div>
                 )}
            </div>

            <button 
                onClick={() => { setWinner(null); setIsMenuOpen(true); }}
                className="px-10 py-4 border border-white/20 hover:bg-white/10 text-white font-bold font-orbitron tracking-widest transition-all hover:scale-105"
            >
                RETURN TO BASE
            </button>
        </div>
      )}

      {/* PAUSE MENU */}
      {!isMenuOpen && isPaused && !winner && (
         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="glass-panel p-12 min-w-[400px] flex flex-col items-center gap-6 transform -skew-x-6">
                 <h2 className="text-6xl font-black italic font-orbitron text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] mb-4">SYSTEM PAUSED</h2>
                 <button onClick={() => { setIsPaused(false); togglePause(); }} className="w-full py-4 bg-white/10 hover:bg-yellow-500 hover:text-black font-bold tracking-widest transition-colors font-mono">RESUME</button>
                 <button onClick={() => { setIsPaused(false); togglePause(); setIsMenuOpen(true); }} className="w-full py-4 bg-red-900/20 hover:bg-red-600 border border-red-500/30 font-bold tracking-widest transition-colors text-red-200 hover:text-white font-mono">ABORT MISSION</button>
             </div>
        </div>
      )}

      {/* GAME RENDERER & HUD */}
      <div className="flex-1 relative z-10">
         <HUD 
            gameStateRef={gameStateRef} 
            gameActive={!isMenuOpen} 
            playerClass={playerClass}
            enemyClass={enemyClass}
        />
        <div className="absolute bottom-4 left-4 text-white/30 text-xs font-mono pointer-events-none flex gap-4 z-20">
            <span>[ ESC ] PAUSE</span>
            <span>[ WASD ] MOVE</span>
            <span>[ SPACE ] DASH</span>
            <span>[ CLICK ] ATTACK</span>
        </div>
        <div className="relative w-full h-full flex items-center justify-center">
            <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT} 
                className="w-full h-auto max-w-7xl shadow-2xl bg-[#020205]" 
            />
        </div>
      </div>
    </div>
  );
}
