
import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Play, RotateCcw, Keyboard, Sword } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [scores, setScores] = useState({ player: 0, enemy: 0 });

  const startGame = () => {
    setGameState('playing');
    setWinner(null);
  };

  const handleGameOver = (win: 'player' | 'enemy', pScore: number, eScore: number) => {
    setWinner(win);
    setScores({ player: pScore, enemy: eScore });
    setGameState('gameover');
  };

  return (
    <div className="w-full h-screen bg-[#020205] overflow-hidden flex flex-col relative">
      <style>{`
        @keyframes glitch {
          0% { text-shadow: 2px 2px 0px #0000ff, -2px -2px 0px #00ffff; transform: translate(0,0) skewX(0deg); clip-path: inset(0 0 0 0); }
          20% { text-shadow: 2px -2px 0px #0000ff, -2px 2px 0px #00ffff; transform: translate(-2px,2px) skewX(10deg); clip-path: inset(10% 0 30% 0); }
          40% { text-shadow: -2px 2px 0px #0000ff, 2px -2px 0px #00ffff; transform: translate(2px,-2px) skewX(-10deg); clip-path: inset(40% 0 10% 0); }
          60% { text-shadow: 2px 2px 0px #0000ff, -2px -2px 0px #00ffff; transform: translate(0,0) skewX(0deg); clip-path: inset(0 0 0 0); }
          80% { text-shadow: -1px -1px 0px #0000ff, 1px 1px 0px #00ffff; transform: translate(1px,1px) skewX(5deg); clip-path: inset(20% 0 20% 0); }
          100% { text-shadow: 2px 2px 0px #0000ff, -2px -2px 0px #00ffff; transform: translate(0,0) skewX(0deg); clip-path: inset(0 0 0 0); }
        }
        
        @keyframes pulse-neon {
          0% { box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff inset; }
          50% { box-shadow: 0 0 20px #00ffff, 0 0 30px #00ffff inset; }
          100% { box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff inset; }
        }

        @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        
        @keyframes glow-swipe {
            0% { left: -100%; }
            100% { left: 200%; }
        }

        .glitch-text {
          animation: glitch 0.3s infinite linear alternate-reverse;
        }
        
        .glitch-text-sm {
            animation: glitch 0.5s infinite linear alternate-reverse;
        }
        
        .pulse-btn:hover {
          animation: pulse-neon 1s infinite;
        }
        
        .glow-swipe-el {
            animation: glow-swipe 3s infinite linear;
        }

        .scanlines {
            background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
            background-size: 100% 4px;
        }
        
        .key-cap {
            display: inline-flex;
            width: 24px;
            height: 24px;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(0, 255, 255, 0.4);
            border-radius: 4px;
            font-family: monospace;
            background: rgba(0,0,0,0.5);
            margin: 0 2px;
            box-shadow: 0 2px 0 rgba(0, 255, 255, 0.2);
            font-size: 10px;
        }
      `}</style>
      
      {/* GLOBAL HUD OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
         {/* Scanlines */}
         <div className="absolute inset-0 scanlines opacity-50"></div>
         
         {/* Corner Brackets */}
         <svg className="absolute top-4 left-4 w-32 h-32 text-cyan-500/50" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
             <path d="M0 20 V0 H20 M0 20 L5 25" />
         </svg>
         <svg className="absolute top-4 right-4 w-32 h-32 text-cyan-500/50 rotate-90" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
             <path d="M0 20 V0 H20" />
         </svg>
         <svg className="absolute bottom-4 left-4 w-32 h-32 text-cyan-500/50 -rotate-90" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
             <path d="M0 20 V0 H20" />
         </svg>
         <svg className="absolute bottom-4 right-4 w-32 h-32 text-cyan-500/50 rotate-180" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
             <path d="M0 20 V0 H20" />
         </svg>
         
         {/* Deco Text */}
         <div className="absolute top-1/2 left-4 text-[10px] text-cyan-500/40 font-mono rotate-[-90deg] origin-left">
            SYSTEM_DIAGNOSTIC // ONLINE
         </div>
         <div className="absolute top-1/2 right-4 text-[10px] text-cyan-500/40 font-mono rotate-[90deg] origin-right">
            THREAT_LEVEL // CRITICAL
         </div>
      </div>

      {gameState === 'menu' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
          {/* Heavy Overlay Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0)0%,rgba(0,0,0,0.8)100%)] pointer-events-none"></div>

          <div className="text-center relative z-10 mb-12">
            <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 italic transform -skew-x-12 filter drop-shadow-[0_0_20px_rgba(0,100,255,0.6)] glitch-text">
              NEON BLITZ
            </h1>
            <p className="text-2xl text-blue-200 mt-6 font-mono tracking-[0.8em] opacity-80 uppercase">
                 Cyber Duel Protocol
            </p>
          </div>
          
          <button 
            onClick={startGame}
            className="group relative px-16 py-5 bg-black overflow-hidden border border-cyan-500/50 text-cyan-400 font-bold text-2xl hover:text-white hover:border-cyan-400 transition-all duration-300 shadow-[0_0_15px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.6)]"
          >
            {/* Swipe Animation */}
            <span className="absolute top-0 bottom-0 w-12 bg-white/20 skew-x-[-20deg] blur-md glow-swipe-el"></span>
            
            <span className="relative flex items-center gap-3 tracking-widest">
              <Play className="w-6 h-6 fill-current" /> INITIALIZE
            </span>
          </button>
          
          <div className="mt-16 grid grid-cols-2 gap-16 text-white/50 text-sm font-mono z-10">
             <div className="flex flex-col items-center gap-2">
                <span className="flex items-center gap-2 text-cyan-400 mb-2 border-b border-cyan-500/30 pb-1 w-full justify-center">
                    <Keyboard size={16}/> MOVEMENT
                </span>
                <span className="flex items-center gap-2">
                     <span className="key-cap">Z</span><span className="key-cap">W</span> JUMP
                </span>
                <span className="flex items-center gap-2">
                     <span className="key-cap">Q</span><span className="key-cap">A</span> LEFT
                </span>
                <span className="flex items-center gap-2">
                     <span className="key-cap">D</span> RIGHT
                </span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <span className="flex items-center gap-2 text-indigo-400 mb-2 border-b border-indigo-500/30 pb-1 w-full justify-center">
                    <Sword size={16}/> COMBAT
                </span>
                <span className="flex items-center gap-2">
                    L-CLICK : ATTACK
                </span>
                <span className="flex items-center gap-2">
                    <span className="key-cap" style={{width: '60px'}}>SPACE</span> DASH
                </span>
             </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md">
            <h2 className={`text-[10rem] leading-none font-black italic transform -skew-x-12 mb-4 ${winner === 'player' ? 'text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]' : 'text-indigo-600 drop-shadow-[0_0_30px_rgba(79,70,229,0.8)]'} glitch-text`}>
                {winner === 'player' ? 'VICTORY' : 'DEFEATED'}
            </h2>
            
            <p className="text-white/60 font-mono mb-12 text-xl tracking-widest uppercase border-y border-white/10 py-2">
                {winner === 'player' ? 'TARGET ELIMINATED' : 'SYSTEM FAILURE'}
            </p>
            
            <div className="mb-12 flex gap-12 font-mono text-3xl">
                <div className="flex flex-col items-center">
                    <span className="text-xs text-cyan-500 mb-1 tracking-widest">PLAYER</span>
                    <span className="text-white font-bold">{scores.player}</span>
                </div>
                <div className="text-white/20 font-thin">/</div>
                <div className="flex flex-col items-center">
                    <span className="text-xs text-indigo-500 mb-1 tracking-widest">CPU</span>
                    <span className="text-white font-bold">{scores.enemy}</span>
                </div>
            </div>

            <button 
                onClick={startGame}
                className="group px-10 py-4 bg-white text-black font-black text-xl hover:bg-cyan-400 hover:text-black transition-all flex items-center gap-3 skew-x-[-10deg] pulse-btn shadow-xl"
            >
                <RotateCcw className="w-6 h-6" /> <span className="skew-x-[10deg]">REBOOT SYSTEM</span>
            </button>
        </div>
      )}

      <div className="flex-1 relative z-10">
         <GameCanvas 
            gameActive={gameState === 'playing'} 
            onGameOver={handleGameOver} 
            onRestart={startGame}
        />
      </div>
    </div>
  );
}
