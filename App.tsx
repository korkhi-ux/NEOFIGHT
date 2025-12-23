
import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Play, RotateCcw, Keyboard, Sword, Shield, Zap, Wind } from 'lucide-react';
import { FighterClass } from './types';
import { COLORS } from './config/colors';

const CLASSES: { id: FighterClass; name: string; desc: string; icon: any }[] = [
    { id: 'VOLT', name: 'VOLT', desc: 'VITESSE ÉCLAIR', icon: Zap },
    { id: 'SLINGER', name: 'SLINGER', desc: 'AÉRIEN & AGILE', icon: Wind },
    { id: 'VORTEX', name: 'VORTEX', desc: 'MAÎTRE ESPACE', icon: Zap },
    { id: 'KINETIC', name: 'KINETIC', desc: 'FORCE IMPACT', icon: Shield },
];

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [scores, setScores] = useState({ player: 0, enemy: 0 });
  
  const [playerClass, setPlayerClass] = useState<FighterClass>('VOLT');
  const [enemyClass, setEnemyClass] = useState<FighterClass>('KINETIC');

  const startGame = () => {
    setGameState('playing');
    setWinner(null);
  };

  const handleGameOver = (win: 'player' | 'enemy', pScore: number, eScore: number) => {
    setWinner(win);
    setScores({ player: pScore, enemy: eScore });
    setGameState('gameover');
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
        
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; text-shadow: 0 0 10px currentColor; }
          20%, 24%, 55% { opacity: 0.5; text-shadow: none; }
        }

        .animate-flicker { animation: flicker 2s infinite; }
        
        .neon-box {
            box-shadow: 0 0 10px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.5);
            background: linear-gradient(145deg, rgba(20,20,30,0.9), rgba(10,10,15,0.95));
        }

        .class-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .class-card:hover {
            transform: translateY(-5px) scale(1.02);
            z-index: 10;
        }
        .class-card.active {
            transform: scale(1.05);
            box-shadow: 0 0 25px var(--glow-color);
            border-color: var(--glow-color);
            background: rgba(255,255,255,0.05);
        }
      `}</style>
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] z-0"></div>
         <div className="absolute top-0 left-0 w-full h-full opacity-20" 
              style={{ backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
         </div>
      </div>

      {gameState === 'menu' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm p-8">
          
          {/* HEADER */}
          <div className="text-center mb-10 relative z-10">
            <h1 className="text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_20px_rgba(0,255,255,0.5)] animate-flicker font-orbitron transform -skew-x-6">
              NEON BLITZ
            </h1>
            <div className="flex items-center justify-center gap-4 mt-2">
                <div className="h-[2px] w-20 bg-cyan-500/50"></div>
                <p className="text-blue-200 font-mono tracking-[0.5em] text-sm uppercase">Cyber Duel Arena</p>
                <div className="h-[2px] w-20 bg-purple-500/50"></div>
            </div>
          </div>

          <div className="flex gap-16 w-full max-w-6xl relative z-10">
               
               {/* PLAYER SELECT */}
               <div className="flex-1 neon-box border border-cyan-500/30 rounded-xl p-6 relative">
                   <div className="absolute -top-3 left-6 px-4 bg-black text-cyan-400 font-bold tracking-widest text-sm border border-cyan-500/50">
                       JOUEUR 1
                   </div>
                   <div className="grid grid-cols-1 gap-4 mt-4">
                       {CLASSES.map((c) => (
                           <button 
                                key={`p-${c.id}`}
                                onClick={() => setPlayerClass(c.id)}
                                style={{ '--glow-color': getClassColor(c.id) } as any}
                                className={`class-card w-full p-4 border border-white/10 rounded flex items-center gap-4 group text-left ${playerClass === c.id ? 'active' : 'opacity-60 hover:opacity-100'}`}
                           >
                               <div className="p-3 bg-black/40 rounded border border-white/10 group-hover:border-white/30 transition-colors">
                                    <c.icon size={24} style={{ color: getClassColor(c.id) }} />
                               </div>
                               <div>
                                   <div className="font-orbitron font-bold text-lg leading-none mb-1" style={{ color: getClassColor(c.id) }}>{c.name}</div>
                                   <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider">{c.desc}</div>
                               </div>
                           </button>
                       ))}
                   </div>
               </div>

               {/* VS SEPARATOR */}
               <div className="flex flex-col items-center justify-center">
                   <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-white/20 to-transparent absolute"></div>
                   <div className="bg-black border border-white/20 p-4 rounded-full z-10 rotate-45 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                       <div className="-rotate-45 font-black text-2xl italic text-white/80">VS</div>
                   </div>
               </div>

               {/* ENEMY SELECT */}
               <div className="flex-1 neon-box border border-red-500/30 rounded-xl p-6 relative">
                   <div className="absolute -top-3 right-6 px-4 bg-black text-red-400 font-bold tracking-widest text-sm border border-red-500/50">
                       ADVERSAIRE (CPU)
                   </div>
                   <div className="grid grid-cols-1 gap-4 mt-4">
                       {CLASSES.map((c) => (
                           <button 
                                key={`e-${c.id}`}
                                onClick={() => setEnemyClass(c.id)}
                                style={{ '--glow-color': getClassColor(c.id) } as any}
                                className={`class-card w-full p-4 border border-white/10 rounded flex flex-row-reverse items-center gap-4 group text-right ${enemyClass === c.id ? 'active' : 'opacity-60 hover:opacity-100'}`}
                           >
                               <div className="p-3 bg-black/40 rounded border border-white/10 group-hover:border-white/30 transition-colors">
                                    <c.icon size={24} style={{ color: getClassColor(c.id) }} />
                               </div>
                               <div>
                                   <div className="font-orbitron font-bold text-lg leading-none mb-1" style={{ color: getClassColor(c.id) }}>{c.name}</div>
                                   <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider">{c.desc}</div>
                               </div>
                           </button>
                       ))}
                   </div>
               </div>

          </div>
          
          {/* START BUTTON */}
          <button 
            onClick={startGame}
            className="mt-12 group relative px-20 py-6 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-2xl skew-x-[-10deg] transition-all duration-300 shadow-[0_0_30px_rgba(8,145,178,0.4)] hover:shadow-[0_0_50px_rgba(8,145,178,0.8)] hover:scale-110 active:scale-95"
          >
            <div className="absolute inset-0 border-2 border-white/20 skew-x-[10deg]"></div>
            <span className="flex items-center gap-4 skew-x-[10deg] tracking-widest font-orbitron">
              <Play className="fill-current" size={28} /> COMBATTRE
            </span>
          </button>
          
          <div className="absolute bottom-8 text-white/30 text-xs font-mono flex gap-8">
             <span className="flex items-center gap-2"><Keyboard size={14}/> ZQSD / WASD</span>
             <span className="flex items-center gap-2"><Sword size={14}/> CLICK GAUCHE</span>
             <span className="flex items-center gap-2"><Wind size={14}/> ESPACE (DASH)</span>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <h2 className={`text-9xl leading-none font-black italic mb-2 font-orbitron ${winner === 'player' ? 'text-cyan-400 drop-shadow-[0_0_50px_cyan]' : 'text-red-500 drop-shadow-[0_0_50px_red]'}`}>
                {winner === 'player' ? 'VICTOIRE' : 'DÉFAITE'}
            </h2>
            
            <p className="text-white/60 font-mono mb-12 text-xl tracking-[0.5em] uppercase border-y border-white/10 py-4 px-12">
                {winner === 'player' ? 'ADVERSAIRE ÉLIMINÉ' : 'SYSTÈME CRITIQUE'}
            </p>
            
            <div className="mb-16 flex gap-20 font-mono text-4xl">
                <div className="flex flex-col items-center p-6 border border-cyan-500/30 bg-cyan-900/10 rounded-lg min-w-[150px]">
                    <span className="text-xs text-cyan-400 mb-2 tracking-widest">JOUEUR</span>
                    <span className="text-white font-bold">{scores.player}</span>
                </div>
                <div className="flex flex-col items-center p-6 border border-red-500/30 bg-red-900/10 rounded-lg min-w-[150px]">
                    <span className="text-xs text-red-400 mb-2 tracking-widest">CPU</span>
                    <span className="text-white font-bold">{scores.enemy}</span>
                </div>
            </div>

            <button 
                onClick={() => setGameState('menu')}
                className="group px-12 py-5 bg-white text-black font-black text-xl hover:bg-pink-500 hover:text-white transition-all flex items-center gap-3 skew-x-[-10deg] shadow-2xl hover:scale-105"
            >
                <RotateCcw className="w-6 h-6" /> <span className="skew-x-[10deg] font-orbitron tracking-wider">RETOUR MENU</span>
            </button>
        </div>
      )}

      {/* GAME LAYER */}
      <div className="flex-1 relative z-10">
         <GameCanvas 
            gameActive={gameState === 'playing'} 
            onGameOver={handleGameOver} 
            onRestart={startGame}
            playerClass={playerClass}
            enemyClass={enemyClass}
        />
      </div>
    </div>
  );
}
