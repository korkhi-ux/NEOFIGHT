
import React, { useEffect, useRef } from 'react';
import { GameState } from '../types';

interface HUDProps {
    gameStateRef: React.MutableRefObject<GameState>;
    gameActive: boolean;
}

export const HUD: React.FC<HUDProps> = ({ gameStateRef, gameActive }) => {
    const hpPlayerRef = useRef<HTMLDivElement>(null);
    const hpPlayerGhostRef = useRef<HTMLDivElement>(null);
    const hpEnemyRef = useRef<HTMLDivElement>(null);
    const hpEnemyGhostRef = useRef<HTMLDivElement>(null);
    const hpContainerPlayerRef = useRef<HTMLDivElement>(null);
    const hpContainerEnemyRef = useRef<HTMLDivElement>(null);
    
    const comboContainerRef = useRef<HTMLDivElement>(null);
    const comboTextRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!gameActive) return;

        const uiLoop = () => {
            const { player, enemy } = gameStateRef.current;

            // Ghost Health Logic
            if (player.ghostHealth > player.health) player.ghostHealth -= 0.5; else player.ghostHealth = player.health;
            if (enemy.ghostHealth > enemy.health) enemy.ghostHealth -= 0.5; else enemy.ghostHealth = enemy.health;

            // DOM Updates
            if (hpPlayerRef.current) hpPlayerRef.current.style.width = `${Math.max(0, player.health)}%`;
            if (hpPlayerGhostRef.current) hpPlayerGhostRef.current.style.width = `${Math.max(0, player.ghostHealth)}%`;
            if (hpEnemyRef.current) hpEnemyRef.current.style.width = `${Math.max(0, enemy.health)}%`;
            if (hpEnemyGhostRef.current) hpEnemyGhostRef.current.style.width = `${Math.max(0, enemy.ghostHealth)}%`;

            // Shake UI
            if (player.hitFlashTimer > 0 && hpContainerPlayerRef.current) {
                const offset = Math.random() * 10;
                hpContainerPlayerRef.current.style.transform = `translate(${offset}px, ${offset}px)`;
            } else if (hpContainerPlayerRef.current) {
                hpContainerPlayerRef.current.style.transform = `none`;
            }

            if (enemy.hitFlashTimer > 0 && hpContainerEnemyRef.current) {
                const offset = Math.random() * 10;
                hpContainerEnemyRef.current.style.transform = `translate(${offset}px, ${offset}px)`;
            } else if (hpContainerEnemyRef.current) {
                hpContainerEnemyRef.current.style.transform = `none`;
            }

            // Combo Counter (Player only)
            if (comboContainerRef.current && comboTextRef.current) {
                if (player.comboCount > 0 && player.comboTimer > 0) {
                    comboContainerRef.current.style.opacity = '1';
                    comboContainerRef.current.style.transform = 'scale(1.2) rotate(-5deg)';
                    comboTextRef.current.innerText = `COMBO x${player.comboCount}`;
                } else {
                    comboContainerRef.current.style.opacity = '0';
                    comboContainerRef.current.style.transform = 'scale(1)';
                }
            }

            if (gameStateRef.current.gameActive) {
                requestAnimationFrame(uiLoop);
            }
        };

        const id = requestAnimationFrame(uiLoop);
        return () => cancelAnimationFrame(id);
    }, [gameActive]);

    return (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-10">
            {/* Player Bar */}
            <div className="w-1/3 relative">
                {/* Combo Indicator Floating */}
                <div ref={comboContainerRef} className="absolute -bottom-8 left-0 transition-all duration-100 ease-out opacity-0 origin-left">
                     <span ref={comboTextRef} className="text-yellow-400 font-black italic text-2xl drop-shadow-[0_0_5px_rgba(255,200,0,0.8)] tracking-wider">
                     </span>
                </div>

                <div ref={hpContainerPlayerRef} className="h-8 w-full bg-gray-900/90 border-2 border-cyan-500 skew-x-[-15deg] overflow-hidden relative backdrop-blur-sm group">
                    <div ref={hpPlayerGhostRef} className="absolute h-full bg-white transition-none" style={{ width: '100%', opacity: 0.5 }}></div>
                    <div ref={hpPlayerRef} className="absolute h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                    
                    {/* Name Inside */}
                    <div className="absolute inset-0 flex items-center px-4 skew-x-[15deg]">
                         <span className="text-[10px] font-mono font-bold text-white/80 tracking-[0.2em] bg-black/20 px-1">PLAYER_01</span>
                    </div>
                </div>
            </div>

            {/* Timer / Middle (Optional placeholder for future) */}
            
            {/* Enemy Bar */}
            <div className="w-1/3 relative">
                <div ref={hpContainerEnemyRef} className="h-8 w-full bg-gray-900/90 border-2 border-indigo-500 skew-x-[15deg] overflow-hidden relative backdrop-blur-sm">
                     <div ref={hpEnemyGhostRef} className="absolute right-0 h-full bg-white transition-none" style={{ width: '100%', opacity: 0.5 }}></div>
                     <div ref={hpEnemyRef} className="absolute right-0 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] float-right transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                    
                    {/* Name Inside */}
                    <div className="absolute inset-0 flex items-center justify-end px-4 skew-x-[-15deg]">
                         <span className="text-[10px] font-mono font-bold text-white/80 tracking-[0.2em] bg-black/20 px-1">CPU_SYSTEM</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
