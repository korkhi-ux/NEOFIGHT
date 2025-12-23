
import { GameState, Fighter } from '../types';
import { GROUND_Y } from '../config/physics';
import { createImpact, createParticles, createShockwave, createLightningBolt } from './effectSpawners';
import { AudioManager } from '../core/AudioManager';

export const INTRO_DURATION = 300; // 5 Seconds @ 60fps

export const updateIntro = (gameState: GameState, audio: AudioManager | null) => {
    const { introTimer } = gameState;

    // --- 1. DETERMINE STEP ---
    if (introTimer > 200) {
        gameState.introStep = 'p1';
        gameState.enemy.y = -5000;
        updateFighterEntrance(gameState.player, introTimer - 200, gameState, audio);
    } 
    else if (introTimer > 100) {
        gameState.introStep = 'p2';
        gameState.player.y = GROUND_Y - gameState.player.height;
        gameState.player.isGrounded = true;
        gameState.player.vx = 0; gameState.player.vy = 0;
        gameState.player.scaleX = 1; gameState.player.scaleY = 1;
        gameState.player.rotation = 0;
        
        updateFighterEntrance(gameState.enemy, introTimer - 100, gameState, audio);
    } 
    else {
        gameState.introStep = 'both';
        gameState.player.y = GROUND_Y - gameState.player.height;
        gameState.enemy.y = GROUND_Y - gameState.enemy.height;
        gameState.enemy.isGrounded = true;
        gameState.enemy.rotation = 0;
    }

    gameState.introTimer--;
};

const updateFighterEntrance = (f: Fighter, timer: number, gameState: GameState, audio: AudioManager | null) => {
    // Timer goes from 100 down to 0
    const progress = 1 - (timer / 100); 
    const targetY = GROUND_Y - f.height;
    const centerX = f.x + f.width / 2;

    f.vx = 0; f.vy = 0;

    switch (f.classType) {
        // --- KINETIC: METEOR STRIKE ---
        case 'KINETIC': {
            // 0.0 - 0.75: Falling
            // 0.75: Impact
            const impactTime = 0.75;
            
            if (progress < impactTime) {
                const t = progress / impactTime; 
                const startY = -1000;
                // Cubic easing for heavy feeling
                f.y = startY + (targetY - startY) * (t * t * t);
                f.isGrounded = false;
                f.scaleY = 1.3; f.scaleX = 0.8; 
                
                // Trail of fire
                if (gameState.frameCount % 2 === 0) {
                    createParticles(gameState, centerX + (Math.random()-0.5)*60, f.y - 50, 2, '#f97316', 8);
                    createParticles(gameState, centerX + (Math.random()-0.5)*40, f.y + f.height/2, 1, '#ffffff', 5);
                }
            } else {
                // Impact Frame
                if (!f.isGrounded) {
                    f.isGrounded = true;
                    f.y = targetY;
                    f.scaleY = 0.5; f.scaleX = 1.5; // Heavy squash
                    
                    gameState.shake += 45; // Massive shake (Meteorite)
                    createShockwave(gameState, centerX, targetY + f.height, '#f97316');
                    createShockwave(gameState, centerX, targetY + f.height, '#ffffff');
                    
                    // Magma Explosion
                    for(let i=0; i<30; i++) {
                        createParticles(gameState, centerX, targetY + f.height, 1, i%2===0 ? '#f97316' : '#7c2d12', 8 + Math.random()*10);
                    }
                    audio?.playHit(true);
                } else {
                    // Recovery
                    f.scaleX += (1 - f.scaleX) * 0.1;
                    f.scaleY += (1 - f.scaleY) * 0.1;
                }
            }
            break;
        }

        // --- VOLT: THUNDER GOD ARRIVAL ---
        case 'VOLT': {
            const strikeTime = 0.6;
            
            if (progress < strikeTime) {
                f.y = -5000;
                // Pre-charge static buildup
                if (progress > 0.3 && gameState.frameCount % 3 === 0) {
                     const rx = centerX + (Math.random()-0.5) * 150;
                     const ry = targetY + f.height - Math.random() * 200;
                     createParticles(gameState, rx, ry, 1, '#67e8f9', 0);
                     if (Math.random() > 0.7) createLightningBolt(gameState, rx, ry);
                }
            } else {
                if (f.y < 0) { 
                    f.y = targetY;
                    f.isGrounded = true;
                    // Main Bolt
                    createLightningBolt(gameState, centerX, targetY + f.height);
                    createLightningBolt(gameState, centerX - 30, targetY + f.height);
                    createLightningBolt(gameState, centerX + 30, targetY + f.height);
                    
                    gameState.shake += 20;
                    createShockwave(gameState, centerX, targetY + f.height, f.color.glow);
                    createShockwave(gameState, centerX, targetY + f.height, '#ffffff');
                    audio?.playVoltReset();
                }
                // Overcharged idle
                if (gameState.frameCount % 4 === 0) {
                    createParticles(gameState, centerX + (Math.random()-0.5)*f.width*1.5, targetY + Math.random()*f.height, 1, '#ffffff', 4);
                }
            }
            break;
        }

        // --- SLINGER: TACTICAL FLIP ENTRY ---
        case 'SLINGER': {
            const dropDuration = 0.65;
            
            if (progress < dropDuration) {
                const startY = -600;
                f.y = startY + (targetY - startY) * (progress / dropDuration);
                f.isGrappling = true; 
                f.grapplePoint = { x: centerX, y: -1000 };
                
                // Dynamic swing
                const swing = Math.sin(progress * 8) * 40;
                f.x = (centerX - f.width/2) + swing;
                f.rotation = swing * 0.01;
                f.scaleX = 0.9; f.scaleY = 1.1;
            } else {
                // Release & Flip
                if (f.isGrappling) {
                    f.isGrappling = false;
                    f.grapplePoint = null;
                    f.vy = -18; // Pop up for the flip
                    f.rotation = -Math.PI * 2; // Setup full rotation
                    createParticles(gameState, centerX, f.y, 5, '#ffffff', 2);
                }
                
                // Simulate Physics locally for the flip
                f.vy += 1.2; // Gravity
                f.y += f.vy;
                
                // Spin animation
                if (f.rotation < 0) {
                    f.rotation += 0.35;
                } else {
                    f.rotation = 0;
                }

                // Floor collision
                if (f.y >= targetY) {
                    f.y = targetY;
                    f.vy = 0;
                    f.isGrounded = true;
                    f.rotation = 0;
                    f.scaleX = 1.2; f.scaleY = 0.8; // Landing squash
                    
                    // Only trigger landing FX once
                    if (Math.abs(f.scaleX - 1.2) < 0.01) {
                         createParticles(gameState, centerX, targetY + f.height, 8, '#ffffff', 3);
                    }
                }
                
                // Recover squash
                if (f.isGrounded) {
                    f.scaleX += (1 - f.scaleX) * 0.2;
                    f.scaleY += (1 - f.scaleY) * 0.2;
                }
            }
            break;
        }

        // --- VORTEX: REALITY CORRUPTION ---
        case 'VORTEX': {
            f.y = targetY;
            f.isGrounded = true;
            
            const startPhase = 0.2;
            const endPhase = 0.8;
            
            if (progress < startPhase) {
                f.scaleX = 0; f.scaleY = 0;
            } else if (progress < endPhase) {
                const growth = (progress - startPhase) / (endPhase - startPhase);
                
                // Glitchy position jitter
                const jitterX = (Math.random() - 0.5) * 10 * (1-growth);
                const jitterY = (Math.random() - 0.5) * 5 * (1-growth);
                f.x = (centerX - f.width/2) + jitterX;
                f.y = targetY + jitterY;

                f.scaleX = growth + (Math.random()-0.5) * 0.5;
                f.scaleY = growth + (Math.random()-0.5) * 0.2; 
                
                if (gameState.frameCount % 4 === 0) {
                     audio?.playGlitch();
                     createParticles(gameState, centerX, targetY + f.height/2, 1, f.color.glow, 2);
                }
            } else {
                f.x = centerX - f.width/2;
                f.y = targetY;
                if (f.scaleX < 0.95) {
                    f.scaleX = 1; f.scaleY = 1;
                    createShockwave(gameState, centerX, targetY + f.height/2, f.color.primary);
                    gameState.shake += 5;
                }
            }
            break;
        }
    }
};
