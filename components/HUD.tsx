import React, { useEffect, useRef, useState } from 'react';
import { GameState, FighterClass } from '../types';
import { COLORS } from '../config/colors';

interface HUDProps {
    gameStateRef: React.MutableRefObject<GameState>;
    gameActive: boolean;
    playerClass: FighterClass;
    enemyClass: FighterClass;
}

export const HUD: React.FC<HUDProps> = ({ gameStateRef, gameActive, playerClass, enemyClass }) => {
    const hpPlayerRef = useRef<HTMLDivElement>(null);
    const hpPlayerGhostRef = useRef<HTMLDivElement>(null);
    const specialPlayerRef = useRef<HTMLDivElement>(null);
    
    const hpEnemyRef = useRef<HTMLDivElement>(null);
    const hpEnemyGhostRef = useRef<HTMLDivElement>(null);
    const specialEnemyRef = useRef<HTMLDivElement>(null);

    const hpContainerPlayerRef = useRef<HTMLDivElement>(null);
    const hpContainerEnemyRef = useRef<HTMLDivElement>(null);
    
    const comboContainerRef = useRef<HTMLDivElement>(null);
    const comboTextRef = useRef<HTMLSpanElement>(null);

    // Initial state setup
    const [hudState, setHudState] = useState({
        pName: 'VOLT', eName: 'KINETIC',
        pScore: 0, eScore: 0,
        pColor: COLORS.volt, eColor: COLORS.kinetic
    });

    // Helper to extract strict class color
    const getBarColor = (classType: FighterClass) => {
        const key = classType.toLowerCase() as keyof typeof COLORS;
        return (COLORS as any)[key] || COLORS.volt;
    };

    useEffect(() => {
        // We initialize/update static HUD elements (Names, Colors) from Props
        // We initialize Scores from the Ref (as they might persist)
        const { player, enemy } = gameStateRef.current;
        
        setHudState({
            pName: playerClass,
            eName: enemyClass,
            pScore: player.score,
            eScore: enemy.score,
            pColor: getBarColor(playerClass),
            eColor: getBarColor(enemyClass)
        });

        if (!gameActive) return;

        const uiLoop = () => {
            if (!gameStateRef.current.gameActive) return;

            const { player, enemy } = gameStateRef.current;

            // Ghost Health Logic
            if (player.ghostHealth > player.health) player.ghostHealth -= 0.5; else player.ghostHealth = player.health;
            if (enemy.ghostHealth > enemy.health) enemy.ghostHealth -= 0.5; else enemy.ghostHealth = enemy.health;

            // Health Bar Updates
            const pHealthPct = (player.health / player.maxHealth) * 100;
            const pGhostPct = (player.ghostHealth / player.maxHealth) * 100;
            const eHealthPct = (enemy.health / enemy.maxHealth) * 100;
            const eGhostPct = (enemy.ghostHealth / enemy.maxHealth) * 100;

            if (hpPlayerRef.current) hpPlayerRef.current.style.width = `${Math.max(0, pHealthPct)}%`;
            if (hpPlayerGhostRef.current) hpPlayerGhostRef.current.style.width = `${Math.max(0, pGhostPct)}%`;
            if (hpEnemyRef.current) hpEnemyRef.current.style.width = `${Math.max(0, eHealthPct)}%`;
            if (hpEnemyGhostRef.current) hpEnemyGhostRef.current.style.width = `${Math.max(0, eGhostPct)}%`;

            // Special Bar Logic
            const pSpecialPct = Math.max(0, 100 - (player.grappleCooldownTimer * 1.5));
            const eSpecialPct = Math.max(0, 100 - (enemy.grappleCooldownTimer * 1.5));
            
            if (specialPlayerRef.current) specialPlayerRef.current.style.width = `${pSpecialPct}%`;
            if (specialEnemyRef.current) specialEnemyRef.current.style.width = `${eSpecialPct}%`;

            // Shake UI on hit
            if (player.hitFlashTimer > 0 && hpContainerPlayerRef.current) {
                const offset = Math.random() * 8;
                hpContainerPlayerRef.current.style.transform = `skewX(-20deg) translate(${offset}px, ${offset}px)`;
            } else if (hpContainerPlayerRef.current) {
                hpContainerPlayerRef.current.style.transform = `skewX(-20deg)`;
            }

            if (enemy.hitFlashTimer > 0 && hpContainerEnemyRef.current) {
                const offset = Math.random() * 8;
                hpContainerEnemyRef.current.style.transform = `skewX(20deg) translate(${offset}px, ${offset}px)`;
            } else if (hpContainerEnemyRef.current) {
                hpContainerEnemyRef.current.style.transform = `skewX(20deg)`;
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

            requestAnimationFrame(uiLoop);
        };

        const id = requestAnimationFrame(uiLoop);
        return () => cancelAnimationFrame(id);
    }, [gameActive, playerClass, enemyClass]); // Re-run when classes change

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 p-8">
            <div className="flex justify-between items-start w-full relative">
                
                {/* PLAYER HUD */}
                <div className="w-[42%] flex flex-col items-start gap-1">
                    <div className="flex items-end gap-2 mb-1 pl-4">
                        <span 
                            className="text-4xl font-black italic drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] tracking-tighter"
                            style={{ color: hudState.pColor.primary }}
                        >
                            {hudState.pName}
                        </span>
                        <div 
                            className="text-xs font-mono mb-1 px-2 py-0.5 border rounded"
                            style={{ 
                                color: hudState.pColor.glow, 
                                borderColor: hudState.pColor.secondary,
                                backgroundColor: 'rgba(0,0,0,0.5)' 
                            }}
                        >
                            PLAYER 1
                        </div>
                    </div>

                    {/* Health Bar Container */}
                    <div ref={hpContainerPlayerRef} className="w-full h-8 bg-gray-900/80 border-2 border-white/10 relative overflow-hidden backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ transform: 'skewX(-20deg)' }}>
                         {/* Ghost Bar */}
                         <div ref={hpPlayerGhostRef} className="absolute h-full bg-white transition-all duration-300 ease-out" style={{ width: '100%', opacity: 0.7 }}></div>
                         {/* Main HP Bar */}
                         <div ref={hpPlayerRef} className="absolute h-full transition-all duration-75 ease-out" 
                              style={{ 
                                  width: '100%', 
                                  backgroundColor: hudState.pColor.primary,
                                  background: `linear-gradient(90deg, ${hudState.pColor.secondary} 0%, ${hudState.pColor.primary} 60%, white 100%)`,
                                  boxShadow: `0 0 10px ${hudState.pColor.primary}`
                              }}>
                         </div>
                    </div>

                    {/* Special Bar */}
                    <div className="w-[80%] h-2 bg-gray-900/80 border border-white/20 mt-1 relative overflow-hidden" style={{ transform: 'skewX(-20deg)' }}>
                         <div ref={specialPlayerRef} className="absolute h-full bg-yellow-400 shadow-[0_0_8px_#fbbf24] transition-all duration-100" style={{ width: '0%' }}></div>
                    </div>
                </div>

                {/* CENTER SCORE HEXAGON */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center">
                     <div className="w-24 h-20 bg-black/80 border-2 border-white/20 flex items-center justify-center relative backdrop-blur-sm" 
                          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                        <div className="flex gap-4 text-3xl font-black italic text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                            <span style={{ color: hudState.pColor.primary }}>{hudState.pScore}</span>
                            <span className="text-white/20">-</span>
                            <span style={{ color: hudState.eColor.primary }}>{hudState.eScore}</span>
                        </div>
                     </div>
                     <div className="text-[10px] tracking-[0.5em] text-white/40 mt-1 font-mono">VS</div>
                </div>

                {/* ENEMY HUD */}
                <div className="w-[42%] flex flex-col items-end gap-1">
                    <div className="flex items-end gap-2 mb-1 pr-4">
                        <div 
                            className="text-xs font-mono mb-1 px-2 py-0.5 border rounded"
                            style={{ 
                                color: hudState.eColor.glow, 
                                borderColor: hudState.eColor.secondary,
                                backgroundColor: 'rgba(0,0,0,0.5)' 
                            }}
                        >
                            CPU
                        </div>
                        <span 
                            className="text-4xl font-black italic drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] tracking-tighter"
                            style={{ color: hudState.eColor.primary }}
                        >
                            {hudState.eName}
                        </span>
                    </div>

                    {/* Health Bar Container */}
                    <div ref={hpContainerEnemyRef} className="w-full h-8 bg-gray-900/80 border-2 border-white/10 relative overflow-hidden backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ transform: 'skewX(20deg)' }}>
                         {/* Ghost Bar */}
                         <div ref={hpEnemyGhostRef} className="absolute right-0 h-full bg-white transition-all duration-300 ease-out" style={{ width: '100%', opacity: 0.7 }}></div>
                         {/* Main HP Bar */}
                         <div ref={hpEnemyRef} className="absolute right-0 h-full transition-all duration-75 ease-out" 
                              style={{ 
                                  width: '100%', 
                                  backgroundColor: hudState.eColor.primary,
                                  background: `linear-gradient(-90deg, ${hudState.eColor.secondary} 0%, ${hudState.eColor.primary} 60%, white 100%)`,
                                  boxShadow: `0 0 10px ${hudState.eColor.primary}`
                              }}>
                         </div>
                    </div>

                    {/* Special Bar */}
                    <div className="w-[80%] h-2 bg-gray-900/80 border border-white/20 mt-1 relative overflow-hidden" style={{ transform: 'skewX(20deg)' }}>
                         <div ref={specialEnemyRef} className="absolute right-0 h-full bg-red-400 shadow-[0_0_8px_#f87171] transition-all duration-100" style={{ width: '0%' }}></div>
                    </div>
                </div>
            </div>

            {/* Floating Combo Text */}
            <div ref={comboContainerRef} className="absolute top-[40%] left-[10%] transition-all duration-100 ease-out opacity-0 origin-center pointer-events-none">
                 <span ref={comboTextRef} className="text-6xl font-black italic text-yellow-400 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] tracking-tighter stroke-black" 
                       style={{ WebkitTextStroke: '2px black' }}>
                 </span>
                 <div className="text-white font-mono text-sm tracking-widest mt-2 ml-2">SUPER HIT</div>
            </div>
        </div>
    );
};