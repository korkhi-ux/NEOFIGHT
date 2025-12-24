import React, { useRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/physics';
import { useGameLoop } from '../hooks/useGameLoop';
import { HUD } from './HUD';
import { FighterClass } from '../types';

interface GameCanvasProps {
  onGameOver: (winner: 'player' | 'enemy', pScore: number, eScore: number) => void;
  onRestart: () => void;
  gameActive: boolean;
  isPaused: boolean;
  playerClass: FighterClass;
  enemyClass: FighterClass;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameActive, isPaused, playerClass, enemyClass }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState } = useGameLoop(canvasRef, onGameOver);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
        {/* HUD receives explicit class props to ensure UI colors match selected characters */}
        <HUD 
            gameStateRef={gameState} 
            gameActive={gameActive} 
            playerClass={playerClass}
            enemyClass={enemyClass}
        />
        
        <div className="absolute bottom-4 left-4 text-white/30 text-xs font-mono pointer-events-none flex gap-4 z-20">
            <span>[ ESC ] PAUSE</span>
            <span>[ WASD/ZQSD ] MOVE</span>
            <span>[ SPACE ] DASH</span>
            <span>[ L-CLICK ] ATTACK</span>
            <span>[ R-CLICK ] SPECIAL</span>
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