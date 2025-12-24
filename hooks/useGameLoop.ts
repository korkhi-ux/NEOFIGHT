
import React, { useEffect, useRef } from 'react';
import { GameState, Fighter, FighterClass, GameMode } from '../types';
import { COLORS } from '../config/colors';
import { WORLD_WIDTH, GROUND_Y, PLAYER_HEIGHT, PLAYER_WIDTH } from '../config/physics';
import { CLASS_STATS } from '../config/balance';
import { InputManager } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { updateFighter } from '../logic/fighterPhysics';
import { updateAI } from '../logic/aiBrain';
import { checkCollisions } from '../logic/collisionSystem';
import { updateCamera } from '../rendering/cameraSystem';
import { renderGame } from '../rendering/gameRenderer';
import { updateIntro, INTRO_DURATION } from '../logic/introSystem';
import { DEFAULT_GAME_MODE, DEFAULT_WAVE, IS_MENU_OPEN_DEFAULT } from '../config/settings';
import { updateFloatingTexts } from '../logic/effectSpawners';

const CLASSES: FighterClass[] = ['VOLT', 'SLINGER', 'VORTEX', 'KINETIC'];

const createFighter = (id: 'player' | 'enemy', x: number, classType: FighterClass = 'VOLT'): Fighter => {
  const stats = CLASS_STATS[classType];
  const classKey = classType.toLowerCase() as keyof typeof COLORS;
  const targetColor = COLORS[classKey] as { primary: string; secondary: string; glow: string; };
  const finalColor = targetColor || COLORS.volt;

  return {
    id,
    classType,
    x,
    y: GROUND_Y - PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    health: stats.health,
    maxHealth: stats.health,
    ghostHealth: stats.health,
    facing: id === 'player' ? 1 : -1,
    
    specialPowerCharge: 0,
    isGrappling: false,
    isGrappleAttacking: false,
    grapplePoint: null,
    grappleTargetId: null,
    grappleCooldownTimer: 0,
    hasHit: false,
    
    voidOrb: classType === 'VORTEX' ? {
        active: false,
        x: 0, y: 0, vx: 0, vy: 0, life: 0, lastHitTimer: 0
    } : undefined,
    
    isDiving: false,
    dynamicDamageMult: 1.0,
    
    aiState: id === 'enemy' ? {
        mode: 'neutral', 
        actionTimer: 0,
        reactionCooldown: 0,
        recoveryTimer: 0,
        difficulty: 0.8, 
        targetDistance: 80 
    } : undefined,

    isGrounded: false,
    isDashing: false,
    isAttacking: false,
    isStunned: false,
    isDead: false,
    lastDamageFrame: 0,
    prevVx: 0,
    prevGrounded: false,
    trail: [],
    comboCount: 0,
    comboTimer: 0,
    hitFlashTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    attackTimer: 0,
    attackCooldown: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    color: finalColor,
    score: 0
  };
};

export const useGameLoop = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    onGameOver: (winner: 'player' | 'enemy', pScore: number, eScore: number) => void,
) => {
    const inputManager = useRef(new InputManager());
    const audioManager = useRef<AudioManager | null>(null);
    const prevAttackInput = useRef<{ [key: string]: boolean }>({});
    
    const gameState = useRef<GameState>({
        player: createFighter('player', WORLD_WIDTH / 2 - 200, 'VOLT'),
        enemy: createFighter('enemy', WORLD_WIDTH / 2 + 200, 'KINETIC'), 
        particles: [],
        shockwaves: [],
        impacts: [],
        flares: [],
        floatingTexts: [],
        shake: 0,
        shakeX: 0,
        shakeY: 0,
        chromaticAberration: 0,
        cameraZoom: 1,
        cameraX: 0,
        cameraY: 0,
        cameraLookAhead: 0,
        cameraTilt: 0,
        matchState: 'intro',
        introTimer: INTRO_DURATION,
        introStep: 'p1', 
        winner: null,
        gameActive: false,
        frameCount: 0,
        slowMoFactor: 1.0,
        slowMoTimer: 0,
        hitStop: 0,
        gameMode: DEFAULT_GAME_MODE,
        wave: DEFAULT_WAVE,
        isMenuOpen: IS_MENU_OPEN_DEFAULT
    });

    const isPausedRef = useRef(false);

    // EXPOSED ACTION: Start Game
    const startGame = (mode: GameMode, playerClass: FighterClass, enemyClass: FighterClass) => {
        if (!audioManager.current) audioManager.current = new AudioManager();
        audioManager.current.resume();

        // 1. Reset Game State
        gameState.current = {
            ...gameState.current,
            gameMode: mode,
            wave: 1,
            isMenuOpen: false,
            matchState: 'intro',
            introTimer: INTRO_DURATION,
            introStep: 'p1',
            winner: null,
            gameActive: true,
            slowMoFactor: 1.0,
            slowMoTimer: 0,
            hitStop: 0,
            particles: [],
            shockwaves: [],
            impacts: [],
            flares: [],
            floatingTexts: [],
            // Reset Fighters
            player: createFighter('player', WORLD_WIDTH / 2 - 200, playerClass),
            enemy: createFighter('enemy', WORLD_WIDTH / 2 + 200, enemyClass)
        };

        // 2. Configure Mode Specifics
        if (mode === 'SANDBOX') {
            if (gameState.current.enemy.aiState) {
                gameState.current.enemy.aiState.mode = 'dummy';
                gameState.current.enemy.aiState.difficulty = 0;
            }
        } else if (mode === 'SURVIVAL') {
            if (gameState.current.enemy.aiState) {
                gameState.current.enemy.aiState.difficulty = 0.5; // Start easy
            }
        }
    };

    // Toggle Pause
    const togglePause = () => {
        isPausedRef.current = !isPausedRef.current;
    };

    useEffect(() => {
        inputManager.current.mount();
        
        // Initial Audio Setup
        if (!audioManager.current) audioManager.current = new AudioManager();

        let animationFrameId: number;

        const loop = () => {
            const state = gameState.current;
            
            // IF MENU IS OPEN: Just render, no updates
            if (state.isMenuOpen) {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx && canvasRef.current) {
                    renderGame(ctx, state, audioManager.current);
                }
                animationFrameId = requestAnimationFrame(loop);
                return;
            }

            if (!isPausedRef.current) {
                if (state.hitStop > 0) {
                    state.hitStop--;
                    state.shake *= 0.9; 
                } else {
                    state.frameCount++;
                    
                    if (state.slowMoTimer > 0) {
                        state.slowMoTimer--;
                        if (state.slowMoTimer <= 0) state.slowMoFactor = 1.0;
                    }
                    state.shake *= 0.8;
                    state.shakeX *= 0.8;
                    state.shakeY *= 0.8;
                    state.chromaticAberration = Math.max(0, state.chromaticAberration * 0.8);

                    // --- LOGIC BRANCHING ---
                    if (state.matchState === 'intro') {
                        updateIntro(state, audioManager.current);
                        if (state.introTimer <= 0) {
                            state.matchState = 'fight';
                            state.flares.push({id: 'start', x: WORLD_WIDTH/2, y: GROUND_Y - 300, life: 30, color: '#fff'});
                            audioManager.current?.playHit(true);
                        }
                    } 
                    else if (state.matchState === 'fight') {
                        const playerInput = inputManager.current.getPlayerInput();
                        
                        // Handle Dummy AI for Sandbox
                        let aiInput;
                        if (state.gameMode === 'SANDBOX') {
                             aiInput = { x: 0, jump: false, dash: false, attack: false, special: false };
                        } else {
                             aiInput = updateAI(state.enemy, state.player, state);
                        }

                        updateFighter(state.player, playerInput, state, prevAttackInput.current, audioManager.current!);
                        updateFighter(state.enemy, aiInput, state, prevAttackInput.current, audioManager.current!);

                        // Check collisions (this might trigger death)
                        checkCollisions(state, audioManager.current, onGameOver);

                        // --- MODE SPECIFIC LOGIC ---
                        
                        // 1. SURVIVAL MODE: WAVE MANAGEMENT
                        if (state.gameMode === 'SURVIVAL') {
                            if (state.enemy.isDead && state.slowMoTimer < 60) {
                                // Enemy died, wait for slow mo finish then respawn
                                state.wave++;
                                state.player.health = Math.min(state.player.maxHealth, state.player.health + 30); // Heal
                                state.player.score += 500;
                                
                                // Respawn new enemy
                                const randomClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
                                const difficulty = Math.min(1.0, 0.5 + (state.wave * 0.1));
                                
                                state.enemy = createFighter('enemy', WORLD_WIDTH / 2 + 200, randomClass);
                                if(state.enemy.aiState) state.enemy.aiState.difficulty = difficulty;
                                
                                // Mini Intro
                                state.matchState = 'intro';
                                state.introTimer = 150; // Shorter intro
                                state.introStep = 'p2'; // Focus on new challenger
                                
                                // Cancel Game Over trigger from collisionSystem
                                state.winner = null; 
                            }
                        }

                        // 2. SANDBOX MODE: REGEN AFTER 5 SECONDS
                        if (state.gameMode === 'SANDBOX') {
                            const timeSinceHit = state.frameCount - state.enemy.lastDamageFrame;

                            // If more than 5 seconds (300 frames) since last hit
                            if (timeSinceHit > 300 && state.enemy.health < state.enemy.maxHealth) {
                                state.enemy.health += 2; // Fast regen
                                if (state.enemy.health > state.enemy.maxHealth) state.enemy.health = state.enemy.maxHealth;
                                state.enemy.ghostHealth = state.enemy.health; // Sync ghost bar
                            }

                            // Prevent death
                            state.enemy.isDead = false; 
                            if (state.enemy.health <= 0) state.enemy.health = 1;
                        }
                    }

                    // Common Effect cleanup
                    for (let i = state.particles.length - 1; i >= 0; i--) {
                        const p = state.particles[i];
                        p.x += p.vx * state.slowMoFactor;
                        p.y += p.vy * state.slowMoFactor;
                        p.life -= state.slowMoFactor;
                        if (p.life <= 0) state.particles.splice(i, 1);
                    }
                    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
                        const s = state.shockwaves[i];
                        s.radius += 20 * state.slowMoFactor;
                        s.alpha -= 0.1 * state.slowMoFactor;
                        if (s.alpha <= 0) state.shockwaves.splice(i, 1);
                    }
                    for (let i = state.impacts.length - 1; i >= 0; i--) {
                        state.impacts[i].life -= state.slowMoFactor;
                        if (state.impacts[i].life <= 0) state.impacts.splice(i, 1);
                    }
                    for (let i = state.flares.length - 1; i >= 0; i--) {
                        state.flares[i].life -= state.slowMoFactor;
                        if (state.flares[i].life <= 0) state.flares.splice(i, 1);
                    }
                    updateFloatingTexts(state);
                }
            }

            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
                if (!isPausedRef.current) {
                    updateCamera(state, canvasRef.current.width, canvasRef.current.height);
                }
                renderGame(ctx, state, audioManager.current);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animationFrameId);
            inputManager.current.unmount();
            audioManager.current?.suspend();
        };
    }, [onGameOver]); // Removed dependencies that cause full re-renders, state is in Ref

    return { gameState, startGame, togglePause };
};
