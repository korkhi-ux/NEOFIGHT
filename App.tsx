import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { Play, RotateCcw, Swords } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);

  const startGame = () => {
    setGameState('playing');
    setWinner(null);
  };

  const handleGameOver = (win: 'player' | 'enemy') => {
    setWinner(win);
    setGameState('gameover');
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden flex flex-col">
      <style>{`
        @keyframes glitch {
          0% { text-shadow: 2px 2px 0px #ff00ff, -2px -2px 0px #00ffff; transform: translate(0,0) skewX(0deg); }
          20% { text-shadow: 2px -2px 0px #ff00ff, -2px 2px 0px #00ffff; transform: translate(-2px,2px) skewX(10deg); }
          40% { text-shadow: -2px 2px 0px #ff00ff, 2px -2px 0px #00ffff; transform: translate(2px,-2px) skewX(-10deg); }
          60% { text-shadow: 2px 2px 0px #ff00ff, -2px -2px 0px #00ffff; transform: translate(0,0) skewX(0deg); }
          80% { text-shadow: -1px -1px 0px #ff00ff, 1px 1px 0px #00ffff; transform: translate(1px,1px) skewX(5deg); }
          100% { text-shadow: 2px 2px 0px #ff00ff, -2px -2px 0px #00ffff; transform: translate(0,0) skewX(0deg); }
        }
        
        @keyframes pulse-neon {
          0% { box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff inset; }
          50% { box-shadow: 0 0 20px #00ffff, 0 0 30px #00ffff inset; }
          100% { box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff inset; }
        }

        .glitch-text {
          animation: glitch 0.3s infinite linear alternate-reverse;
        }
        
        .pulse-btn:hover {
          animation: pulse-neon 1s infinite;
        }
      `}</style>

      {gameState === 'menu' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center relative">
            <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-500 italic transform -skew-x-12 filter drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] glitch-text">
              NEON BLITZ
            </h1>
            <p className="text-2xl text-cyan-200 mt-4 font-mono tracking-[0.5em] opacity-80">CYBER DUEL PROTOCOL</p>
          </div>
          
          <button 
            onClick={startGame}
            className="mt-12 group relative px-12 py-4 bg-transparent overflow-hidden rounded-none border-2 border-cyan-500 text-cyan-500 font-bold text-xl hover:text-black hover:bg-cyan-500 transition-all duration-300 pulse-btn"
          >
            <span className="absolute w-64 h-0 transition-all duration-300 origin-center rotate-45 -translate-x-20 bg-cyan-500 top-1/2 group-hover:h-64 group-hover:-translate-y-32 ease"></span>
            <span className="relative flex items-center gap-2">
              <Play className="w-6 h-6" /> INITIALIZE COMBAT
            </span>
          </button>
          
          <div className="mt-8 grid grid-cols-2 gap-8 text-white/40 text-sm font-mono">
             <div className="flex flex-col items-center">
                <span className="text-cyan-500 mb-1 border-b border-cyan-500/30">MOVEMENT</span>
                <span>Z / W : JUMP</span>
                <span>Q / A : LEFT</span>
                <span>S : DOWN</span>
                <span>D : RIGHT</span>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-rose-500 mb-1 border-b border-rose-500/30">COMBAT</span>
                <span>L-CLICK : ATTACK</span>
                <span>SPACE : DASH</span>
             </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <h2 className={`text-9xl font-black italic transform -skew-x-12 mb-8 ${winner === 'player' ? 'text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,1)]' : 'text-rose-600 drop-shadow-[0_0_30px_rgba(225,29,72,1)]'} glitch-text`}>
                {winner === 'player' ? 'VICTORY' : 'DEFEATED'}
            </h2>
            
            <p className="text-white/60 font-mono mb-12 text-xl">
                {winner === 'player' ? 'TARGET ELIMINATED' : 'SYSTEM CRITICAL // REBOOT REQUIRED'}
            </p>

            <button 
                onClick={startGame}
                className="group px-8 py-3 bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-2 skew-x-[-10deg] pulse-btn"
            >
                <RotateCcw className="w-5 h-5" /> <span className="skew-x-[10deg]">REBOOT SYSTEM</span>
            </button>
        </div>
      )}

      <div className="flex-1 relative">
         <GameCanvas 
            gameActive={gameState === 'playing'} 
            onGameOver={handleGameOver} 
            onRestart={startGame}
        />
      </div>
    </div>
  );
}