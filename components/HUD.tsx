
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

            if (gameStateRef.current.gameActive) {
                requestAnimationFrame(uiLoop);
            }
        };

        const id = requestAnimationFrame(uiLoop);
        return () => cancelAnimationFrame(id);
    }, [gameActive]);

    return (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
            <div className="w-1/3">
                <div className="flex justify-between text-cyan-400 font-bold mb-1 text-xl tracking-wider">
                    <span>PLAYER</span>
                </div>
                <div ref={hpContainerPlayerRef} className="h-6 w-full bg-gray-900/80 border-2 border-cyan-500 skew-x-[-15deg] overflow-hidden relative backdrop-blur-sm">
                    <div ref={hpPlayerGhostRef} className="absolute h-full bg-white transition-none" style={{ width: '100%', opacity: 0.5 }}></div>
                    <div ref={hpPlayerRef} className="absolute h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                </div>
            </div>
            <div className="w-1/3">
                 <div className="flex justify-between text-indigo-400 font-bold mb-1 text-xl tracking-wider flex-row-reverse">
                    <span>CPU</span>
                </div>
                <div ref={hpContainerEnemyRef} className="h-6 w-full bg-gray-900/80 border-2 border-indigo-500 skew-x-[15deg] overflow-hidden relative backdrop-blur-sm">
                     <div ref={hpEnemyGhostRef} className="absolute right-0 h-full bg-white transition-none" style={{ width: '100%', opacity: 0.5 }}></div>
                     <div ref={hpEnemyRef} className="absolute right-0 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] float-right transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                </div>
            </div>
        </div>
    );
};
