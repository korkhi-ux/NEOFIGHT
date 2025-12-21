
import React, { useRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { useGameLoop } from '../hooks/useGameLoop';
import { HUD } from './HUD';
import { FighterClass } from '../types';

interface GameCanvasProps {
  onGameOver: (winner: 'player' | 'enemy', pScore: number, eScore: number) => void;
  onRestart: () => void;
  gameActive: boolean;
  playerClass: FighterClass;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameActive, playerClass }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useGameLoop(canvasRef, gameActive, onGameOver, playerClass);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
        <HUD gameStateRef={gameStateRef} gameActive={gameActive} />
        
        <div className="absolute bottom-4 left-4 text-white/30 text-xs font-mono pointer-events-none flex gap-4">
            <span>[ WASD/ZQSD ] MOVE</span>
            <span>[ SPACE ] DASH</span>
            <span>[ L-CLICK ] ATTACK</span>
            <span className="text-cyan-500 font-bold ml-4">CLASS: {playerClass}</span>
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
