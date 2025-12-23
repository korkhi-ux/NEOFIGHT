
import { GameState, Fighter } from '../types';
import { GROUND_Y } from '../config/physics';
import { createImpact, createParticles, createShockwave, createLightningBolt } from './effectSpawners';
import { AudioManager } from '../core/AudioManager';

export const INTRO_DURATION = 150; // Total frames for intro

/**
 * Handles the cinematic entrance of fighters before the match starts.
 */
export const updateIntro = (gameState: GameState, audio: AudioManager | null) => {
    const { player, enemy, introTimer } = gameState;
    const progress = 1 - (introTimer / INTRO_DURATION); // 0.0 to 1.0

    // Handle Camera
    // Zoom out slightly then zoom in to fight position
    gameState.cameraZoom = 0.8 + (Math.sin(progress * Math.PI) * 0.1);

    const updateFighterIntro = (f: Fighter) => {
        const targetY = GROUND_Y - f.height;
        const centerX = f.x + f.width / 2;

        switch (f.classType) {
            // --- KINETIC: ORBITAL DROP ---
            // Falls from the sky, massive impact
            case 'KINETIC': {
                if (progress < 0.6) {
                    // Falling phase
                    // Start high up
                    const startY = -1000;
                    // Ease in cubic
                    const fallT = Math.min(1, progress / 0.6);
                    f.y = startY + (targetY - startY) * (fallT * fallT * fallT);
                    f.isGrounded = false;
                    f.scaleY = 1.5; // Stretch
                    f.scaleX = 0.5;
                } else if (progress >= 0.6 && f.y < targetY) {
                    // Snap to ground if missed due to frame skip
                    f.y = targetY;
                } else if (progress >= 0.6) {
                    // Impact Phase (Just happened)
                    if (f.vy !== 0) { // Using vy as a flag that we haven't landed yet logic-wise
                        f.y = targetY;
                        f.vx = 0; f.vy = 0;
                        f.isGrounded = true;
                        f.scaleY = 0.4; f.scaleX = 1.6; // Squash
                        
                        // Impact FX
                        gameState.shake += 20;
                        createShockwave(gameState, centerX, targetY + f.height, f.color.primary);
                        createParticles(gameState, centerX, targetY + f.height, 20, '#ffffff', 8);
                        audio?.playHit(true);
                    }
                    // Recovery
                    f.scaleX += (1 - f.scaleX) * 0.1;
                    f.scaleY += (1 - f.scaleY) * 0.1;
                } else {
                    f.vy = 1; // Flag for falling
                }
                break;
            }

            // --- VOLT: LIGHTNING STRIKE ---
            // Invisible, then lightning bolt strikes, he appears
            case 'VOLT': {
                const strikeTime = 0.7;
                
                if (progress < strikeTime) {
                    f.y = -5000; // Hide offscreen
                    // Pre-strike flicker
                    if (progress > 0.5 && gameState.frameCount % 5 === 0) {
                        createParticles(gameState, f.x + f.width/2 + (Math.random()-0.5)*100, targetY, 1, f.color.glow, 2);
                    }
                } else {
                    if (f.y < 0) { // First frame of appearance
                        f.y = targetY;
                        f.vx = 0; f.vy = 0;
                        f.isGrounded = true;
                        
                        createLightningBolt(gameState, centerX, targetY + f.height/2);
                        gameState.shake += 10;
                        createShockwave(gameState, centerX, targetY + f.height, f.color.glow);
                        audio?.playVoltReset(); // Zap sound
                    }
                }
                break;
            }

            // --- SLINGER: RAPPERL & FLIP ---
            // Lowers on grapple, then detaches
            case 'SLINGER': {
                const landTime = 0.7;
                if (progress < landTime) {
                    const startY = -400;
                    f.y = startY + (targetY - startY) * (progress / landTime);
                    
                    // Visual Hack: Set grappling state so drawFighter draws the rope
                    f.isGrappling = true;
                    f.grapplePoint = { x: centerX, y: -1000 };
                    f.isGrounded = false;
                } else {
                    if (f.isGrappling) {
                        // Landing frame
                        f.isGrappling = false;
                        f.grapplePoint = null;
                        f.y = targetY;
                        f.isGrounded = true;
                        f.vy = -10; // Little hop
                        f.vx = f.facing * -5; // Backflip movement
                        createParticles(gameState, centerX, targetY + f.height, 5, '#ffffff', 2);
                    }
                    // Settle
                    if (f.y < targetY) f.vy += 0.8;
                    f.y += f.vy;
                    f.x += f.vx;
                    if (f.y > targetY) { f.y = targetY; f.vy = 0; f.vx = 0; }
                }
                break;
            }

            // --- VORTEX: REALITY PHASE ---
            // Scale 0 -> 1, glitch effects, implosion
            case 'VORTEX': {
                f.y = targetY;
                f.vx = 0; f.vy = 0;
                f.isGrounded = true;

                if (progress < 0.2) {
                    f.scaleX = 0; f.scaleY = 0;
                } else if (progress < 0.8) {
                    // Glitchy growth
                    const growT = (progress - 0.2) / 0.6;
                    f.scaleX = growT + (Math.random() - 0.5) * 0.2;
                    f.scaleY = growT + (Math.random() - 0.5) * 0.2;
                    
                    if (gameState.frameCount % 4 === 0) {
                        // Implosion particles
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 100;
                        gameState.particles.push({
                            id: Math.random().toString(),
                            x: centerX + Math.cos(angle) * dist,
                            y: (targetY + f.height/2) + Math.sin(angle) * dist,
                            vx: -Math.cos(angle) * 8,
                            vy: -Math.sin(angle) * 8,
                            life: 15, maxLife: 15,
                            color: f.color.glow, size: 3
                        });
                    }
                } else {
                    if (f.scaleX < 0.9) { // Snap finish
                        f.scaleX = 1.2; f.scaleY = 0.8;
                        createShockwave(gameState, centerX, targetY + f.height/2, f.color.primary);
                        audio?.playGlitch();
                    }
                    f.scaleX += (1 - f.scaleX) * 0.1;
                    f.scaleY += (1 - f.scaleY) * 0.1;
                }
                break;
            }
        }
    };

    updateFighterIntro(player);
    updateFighterIntro(enemy);

    gameState.introTimer--;
};
