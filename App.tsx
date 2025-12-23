import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Play, RotateCcw, Keyboard, Sword, Shield, Zap, Wind, MousePointer, Pause, Users } from 'lucide-react';
import { FighterClass } from './types';
import { COLORS } from './config/colors';

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

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [scores, setScores] = useState({ player: 0, enemy: 0 });
  
  const [playerClass, setPlayerClass] = useState<FighterClass>('VOLT');
  const [enemyClass, setEnemyClass] = useState<FighterClass>('KINETIC');

  // --- CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Escape' && gameState === 'playing') {
            setIsPaused(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    setGameState('playing');
    setIsPaused(false);
    setWinner(null);
  };

  const handleGameOver = (win: 'player' | 'enemy', pScore: number, eScore: number) => {
    setWinner(win);
    setScores({ player: pScore, enemy: eScore });
    // Wait a tiny bit before showing the screen for dramatic effect
    setTimeout(() => {
        setGameState('gameover');
        setIsPaused(false);
    }, 500);
  };

  const handleRematch = () => {
      startGame();
  };

  const getClassColor = (id: FighterClass) => {
      const key = id.toLowerCase() as keyof typeof COLORS;
      return (COLORS as any)[key]?.primary || '#fff';
  };

  // --- RENDER HELPERS ---
  const renderStatBar = (label: string, value: number, color: string) => (
      <div className="flex items-center gap-2 text-[10px] font-mono mb-1">
          <span className="w-12 text-white/60">{label}</span>
          <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full transition-all duration-500" 
                style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 5px ${color}` }} 
              />
          </div>
      </div>
  );

  return (
    <div className="w-full h-screen bg-[#020205] overflow-hidden flex flex-col relative text-slate-100 font-sans selection:bg-pink-500 selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        .font-orbitron { font-family: 'Orbitron', sans-serif; }
        
        /* CRT SCANLINES & VIGNETTE */
        .scanlines {
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 4px, 6px 100%;
            pointer-events: none;
        }
        .vignette {
            background: radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.8) 100%);
            pointer-events: none;
        }

        /* ANIMATIONS */
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; text-shadow: 0 0 10px currentColor; }
          20%, 24%, 55% { opacity: 0.5; text-shadow: none; }
        }
        .animate-flicker { animation: flicker 3s infinite; }

        @keyframes slam {
            0% { transform: scale(3); opacity: 0; }
            40% { transform: scale(0.9); opacity: 1; }
            60% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        .animate-slam { animation: slam 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

        @keyframes grid-scroll {
            0% { background-position: 0 0; }
            100% { background-position: 0 40px; }
        }
        .perspective-grid {
            transform: perspective(600px) rotateX(60deg) scale(2);
            background-image: linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
            background-size: 40px 40px;
            animation: grid-scroll 1s linear infinite;
        }

        .neon-box {
            box-shadow: 0 0 15px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.8);
            background: linear-gradient(145deg, rgba(20,20,30,0.8), rgba(5,5,10,0.9));
            backdrop-filter: blur(10px);
        }

        .class-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .class-card:hover {
            transform: translateY(-5px) scale(1.02);
            z-index: 10;
            background: rgba(255,255,255,0.08);
            border-color: var(--glow-color);
            box-shadow: 0 0 15px var(--glow-color);
        }
        .class-card.active {
            transform: scale(1.02);
            box-shadow: 0 0 30px var(--glow-color), inset 0 0 20px rgba(255,255,255,0.1);
            border-color: var(--glow-color);
            background: rgba(255,255,255,0.05);
        }
        
        .glitch-text {
            position: relative;
        }
        .glitch-text::before, .glitch-text::after {
            content: attr(data-text);
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
        }
        .glitch-text::before {
            left: 2px; text-shadow: -1px 0 red; animation: glitch-anim-1 2s infinite linear alternate-reverse; clip-path: inset(0 0 0 0);
        }
        .glitch-text::after {
            left: -2px; text-shadow: -1px 0 blue; animation: glitch-anim-2 3s infinite linear alternate-reverse; clip-path: inset(0 0 0 0);
        }
        @keyframes glitch-anim-1 {
            0% { clip-path: inset(20% 0 80% 0); } 20% { clip-path: inset(60% 0 10% 0); } 40% { clip-path: inset(40% 0 50% 0); } 60% { clip-path: inset(80% 0 5% 0); } 80% { clip-path: inset(10% 0 70% 0); } 100% { clip-path: inset(30% 0 20% 0); }
        }
        @keyframes glitch-anim-2 {
            0% { clip-path: inset(10% 0 60% 0); } 20% { clip-path: inset(30% 0 20% 0); } 40% { clip-path: inset(70% 0 20% 0); } 60% { clip-path: inset(20% 0 60% 0); } 80% { clip-path: inset(50% 0 30% 0); } 100% { clip-path: inset(0% 0 80% 0); }
        }
      `}</style>
      
      {/* GLOBAL FX LAYERS */}
      <div className="absolute inset-0 pointer-events-none z-50 scanlines opacity-40"></div>
      <div className="absolute inset-0 pointer-events-none z-50 vignette"></div>

      {/* DYNAMIC BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden bg-black z-0">
          {/* Animated Floor Grid */}
          <div className="absolute bottom-[-50%] left-[-50%] w-[200%] h-[100%] perspective-grid opacity-30"></div>
          {/* Ambient Spotlight */}
          <div className="absolute top-[-50%] left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(20,50,100,0.4)_0%,_transparent_70%)]"></div>
      </div>

      {/* ==================== MENU SCREEN ==================== */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-8 overflow-y-auto">
          
          {/* LOGO */}
          <div className="text-center mb-8 relative z-10 scale-125">
            <h1 data-text="NEON BLITZ" className="glitch-text text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 drop-shadow-[0_0_30px_rgba(0,255,255,0.6)] font-orbitron transform -skew-x-6">
              NEON BLITZ
            </h1>
            <div className="flex items-center justify-center gap-4 mt-2 opacity-80">
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-cyan-500"></div>
                <p className="text-cyan-200 font-mono tracking-[0.6em] text-xs uppercase shadow-black drop-shadow-md">Hyper Combat Simulator</p>
                <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-cyan-500"></div>
            </div>
          </div>

          <div className="flex gap-12 w-full max-w-7xl relative z-10 items-stretch h-[500px]">
               
               {/* PLAYER SELECT */}
               <div className="flex-1 neon-box border-t-2 border-cyan-500 rounded-xl p-6 relative flex flex-col">
                   <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                        <span className="text-cyan-400 font-bold tracking-widest text-sm flex items-center gap-2">
                             <MousePointer size={14}/> PLAYER 1
                        </span>
                        <span className="text-xs font-mono text-white/40">SELECT CLASS</span>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                       {CLASSES.map((c) => (
                           <button 
                                key={`p-${c.id}`}
                                onClick={() => setPlayerClass(c.id)}
                                style={{ '--glow-color': getClassColor(c.id) } as any}
                                className={`class-card w-full p-3 border border-white/5 rounded flex items-center gap-4 group text-left relative overflow-hidden ${playerClass === c.id ? 'active' : 'opacity-70'}`}
                           >
                               <div className="p-3 bg-black/40 rounded border border-white/10 group-hover:border-white/30 transition-colors z-10">
                                    <c.icon size={20} style={{ color: getClassColor(c.id) }} />
                               </div>
                               <div className="flex-1 z-10">
                                   <div className="flex justify-between items-baseline">
                                        <div className="font-orbitron font-bold text-lg leading-none" style={{ color: getClassColor(c.id) }}>{c.name}</div>
                                        <div className="text-[10px] text-white/30 font-mono">{c.stats.difficulty}</div>
                                   </div>
                                   <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider mb-2">{c.desc}</div>
                                   
                                   {/* STAT BARS */}
                                   <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                       {renderStatBar('SPD', c.stats.speed, getClassColor(c.id))}
                                       {renderStatBar('PWR', c.stats.power, getClassColor(c.id))}
                                   </div>
                               </div>
                               
                               {/* Background Glow */}
                               {playerClass === c.id && (
                                   <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[var(--glow-color)] to-transparent opacity-10 pointer-events-none"></div>
                               )}
                           </button>
                       ))}
                   </div>
               </div>

               {/* VS COLUMN */}
               <div className="flex flex-col items-center justify-center w-24 shrink-0">
                   <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-white/20 to-transparent absolute"></div>
                   <button 
                        onClick={startGame}
                        className="group relative w-32 h-32 bg-black border border-white/20 rounded-full z-10 flex items-center justify-center hover:scale-110 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] cursor-pointer"
                   >
                       <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20"></div>
                       <div className="font-black text-4xl italic text-white/80 group-hover:text-cyan-400 transition-colors font-orbitron">VS</div>
                       <div className="absolute -bottom-10 text-xs font-mono text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity tracking-widest whitespace-nowrap">START FIGHT</div>
                   </button>
               </div>

               {/* ENEMY SELECT */}
               <div className="flex-1 neon-box border-t-2 border-red-500 rounded-xl p-6 relative flex flex-col">
                   <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                        <span className="text-xs font-mono text-white/40">OPPONENT</span>
                        <span className="text-red-400 font-bold tracking-widest text-sm flex items-center gap-2">
                             CPU (AI) <Users size={14}/> 
                        </span>
                   </div>

                   <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto pl-2 custom-scrollbar">
                       {CLASSES.map((c) => (
                           <button 
                                key={`e-${c.id}`}
                                onClick={() => setEnemyClass(c.id)}
                                style={{ '--glow-color': getClassColor(c.id) } as any}
                                className={`class-card w-full p-3 border border-white/5 rounded flex flex-row-reverse items-center gap-4 group text-right relative overflow-hidden ${enemyClass === c.id ? 'active' : 'opacity-70'}`}
                           >
                               <div className="p-3 bg-black/40 rounded border border-white/10 group-hover:border-white/30 transition-colors z-10">
                                    <c.icon size={20} style={{ color: getClassColor(c.id) }} />
                               </div>
                               <div className="flex-1 z-10">
                                   <div className="flex flex-row-reverse justify-between items-baseline">
                                        <div className="font-orbitron font-bold text-lg leading-none" style={{ color: getClassColor(c.id) }}>{c.name}</div>
                                        <div className="text-[10px] text-white/30 font-mono">{c.stats.difficulty}</div>
                                   </div>
                                   <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider mb-2">{c.desc}</div>
                                   
                                   {/* STAT BARS (Reversed for enemy side logic if we wanted, but standard is fine) */}
                                   <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-end">
                                       {renderStatBar('SPD', c.stats.speed, getClassColor(c.id))}
                                       {renderStatBar('PWR', c.stats.power, getClassColor(c.id))}
                                   </div>
                               </div>
                               
                               {/* Background Glow */}
                               {enemyClass === c.id && (
                                   <div className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-[var(--glow-color)] to-transparent opacity-10 pointer-events-none"></div>
                               )}
                           </button>
                       ))}
                   </div>
               </div>
          </div>
          
          <div className="mt-8 text-white/30 text-[10px] font-mono flex gap-8 uppercase tracking-widest">
             <span className="flex items-center gap-2"><Keyboard size={12}/> Controls: WASD to Move</span>
             <span className="flex items-center gap-2"><Sword size={12}/> Click to Attack</span>
             <span className="flex items-center gap-2"><Wind size={12}/> Space to Dash</span>
          </div>
        </div>
      )}

      {/* ==================== GAME OVER SCREEN ==================== */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
            {/* GIANT TEXT */}
            <div className="relative mb-8 animate-slam">
                <h2 className={`text-[12rem] leading-none font-black italic font-orbitron transform -skew-x-12 select-none 
                    ${winner === 'player' 
                        ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-400 to-cyan-600 drop-shadow-[0_0_60px_cyan]' 
                        : 'text-transparent bg-clip-text bg-gradient-to-b from-white via-red-500 to-red-700 drop-shadow-[0_0_60px_red]'}`}>
                    {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
                </h2>
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white mix-blend-overlay"></div>
            </div>
            
            <p className="text-white/80 font-mono mb-12 text-xl tracking-[0.8em] uppercase border-y border-white/20 py-4 px-20 bg-black/50">
                {winner === 'player' ? 'OPPONENT NEUTRALIZED' : 'SYSTEM CRITICAL FAILURE'}
            </p>
            
            {/* STATS ROW */}
            <div className="mb-16 flex gap-8 font-mono">
                 {/* MOCK STATS FOR FLAVOR */}
                 <div className="p-4 border border-white/10 bg-white/5 rounded text-center min-w-[120px]">
                     <div className="text-[10px] text-white/40 mb-1">MAX COMBO</div>
                     <div className="text-2xl font-bold text-yellow-400">{Math.floor(Math.random() * 5 + 3)}x</div>
                 </div>
                 <div className="p-4 border border-white/10 bg-white/5 rounded text-center min-w-[120px]">
                     <div className="text-[10px] text-white/40 mb-1">DAMAGE DEALT</div>
                     <div className="text-2xl font-bold text-green-400">{Math.floor(Math.random() * 2000 + 1000)}</div>
                 </div>
                 <div className="p-4 border border-white/10 bg-white/5 rounded text-center min-w-[120px]">
                     <div className="text-[10px] text-white/40 mb-1">FINAL SCORE</div>
                     <div className="text-4xl font-black text-white">{scores.player} - {scores.enemy}</div>
                 </div>
            </div>

            <div className="flex gap-6">
                <button 
                    onClick={handleRematch}
                    className="group px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl transition-all flex items-center gap-3 skew-x-[-10deg] shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:scale-105 hover:shadow-[0_0_40px_rgba(8,145,178,0.8)]"
                >
                    <RotateCcw className="w-5 h-5 skew-x-[10deg]" /> 
                    <span className="skew-x-[10deg] font-orbitron tracking-wider">REMATCH</span>
                </button>
                
                <button 
                    onClick={() => setGameState('menu')}
                    className="group px-10 py-4 border border-white/20 hover:bg-white/10 text-white/80 font-bold text-xl transition-all skew-x-[-10deg] hover:text-white"
                >
                    <span className="skew-x-[10deg] font-orbitron tracking-wider">CHANGE FIGHTER</span>
                </button>
            </div>
        </div>
      )}

      {/* ==================== PAUSE OVERLAY ==================== */}
      {gameState === 'playing' && isPaused && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="neon-box border-y-2 border-yellow-500 p-12 min-w-[400px] flex flex-col items-center gap-6 transform -skew-x-6">
                 <h2 className="text-6xl font-black italic font-orbitron text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] mb-4">PAUSED</h2>
                 
                 <button onClick={() => setIsPaused(false)} className="w-full py-4 bg-white/10 hover:bg-yellow-500 hover:text-black font-bold tracking-widest transition-colors">
                     RESUME
                 </button>
                 <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/50 cursor-not-allowed font-bold tracking-widest">
                     OPTIONS (LOCKED)
                 </button>
                 <button onClick={() => setGameState('menu')} className="w-full py-4 bg-red-900/20 hover:bg-red-600 border border-red-500/30 font-bold tracking-widest transition-colors text-red-200 hover:text-white">
                     ABANDON FIGHT
                 </button>
             </div>
        </div>
      )}

      {/* ==================== GAME LAYER ==================== */}
      <div className="flex-1 relative z-10">
         <GameCanvas 
            gameActive={gameState === 'playing'}
            isPaused={isPaused} 
            onGameOver={handleGameOver} 
            onRestart={startGame}
            playerClass={playerClass}
            enemyClass={enemyClass}
        />
      </div>
    </div>
  );
}
