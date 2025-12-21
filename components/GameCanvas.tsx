
import React, { useRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { useGameLoop } from '../hooks/useGameLoop';
import { HUD } from './HUD';

interface GameCanvasProps {
  onGameOver: (winner: 'player' | 'enemy') => void;
  onRestart: () => void;
  gameActive: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useGameLoop(canvasRef, gameActive, onGameOver);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
        <HUD gameStateRef={gameStateRef} gameActive={gameActive} />
        
        <div className="absolute bottom-4 left-4 text-white/30 text-sm font-mono pointer-events-none">
            WASD/ZQSD: Move | SPACE: Dash | L-CLICK: 3-Hit Combo
        </div>
        
        <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT} 
            className="w-full h-auto max-w-7xl border border-blue-900/30 shadow-2xl bg-[#020205]" 
        />
    </div>
  );
};
