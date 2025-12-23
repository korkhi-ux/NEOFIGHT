import React, { useEffect, useRef } from 'react';
import { GameState, Fighter, FighterClass } from '../types';
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

const createFighter = (id: 'player' | 'enemy', x: number, classType: FighterClass = 'VOLT'): Fighter => {
  const stats = CLASS_STATS[classType];
  
  // --- COLOR LOGIC FIX ---
  // Strictly use the class color for identity consistency.
  // Kinetic is always Orange, Volt is always Cyan, etc.
  const classKey = classType.toLowerCase() as keyof typeof COLORS;
  const targetColor = COLORS[classKey] as { primary: string; secondary: string; glow: string; };
  
  // Fallback to Volt colors if something goes wrong, but never generic 'enemy' purple unless the class is unknown
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
    
    // Initializing new mechanics fields
    specialPowerCharge: 0,
    isGrappling: false,
    isGrappleAttacking: false, // New Slinger State
    grapplePoint: null,
    grappleTargetId: null,
    grappleCooldownTimer: 0,
    
    // Multi-Hit Fix
    hasHit: false,
    
    // VORTEX
    voidOrb: classType === 'VORTEX' ? {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        lastHitTimer: 0
    } : undefined,
    
    // KINETIC
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
    color: finalColor, // Applied specific class color
    score: 0
  };
};

export const useGameLoop = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    gameActive: boolean,
    isPaused: boolean,
    onGameOver: (winner: 'player' | 'enemy', pScore: number, eScore: number) => void,
    playerClass: FighterClass = 'VOLT',
    enemyClass: FighterClass = 'KINETIC'
) => {
    const inputManager = useRef(new InputManager());
    const audioManager = useRef<AudioManager | null>(null);
    const prevAttackInput = useRef<{ [key: string]: boolean }>({});
    
    const gameState = useRef<GameState>({
        // START POSITIONS: Center of map +/- 200px (Closer start)
        player: createFighter('player', WORLD_WIDTH / 2 - 200, playerClass),
        enemy: createFighter('enemy', WORLD_WIDTH / 2 + 200, enemyClass), 
        particles: [],
        shockwaves: [],
        impacts: [],
        flares: [],
        shake: 0,
        shakeX: 0,
        shakeY: 0,
        chromaticAberration: 0,
        cameraZoom: 1,
        cameraX: 0,
        cameraY: 0,
        cameraLookAhead: 0,
        cameraTilt: 0,
        winner: null,
        gameActive: false,
        frameCount: 0,
        slowMoFactor: 1.0,
        slowMoTimer: 0
    });

    // We use a ref to track paused state inside the loop closure without restarting it
    const isPausedRef = useRef(isPaused);
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        if (!gameActive) return;

        inputManager.current.mount();
        if (!audioManager.current) audioManager.current = new AudioManager();
        audioManager.current.resume();

        // Preserve Scores when restarting
        const currentPScore = gameState.current.player.score;
        const currentEScore = gameState.current.enemy.score;

        // Reset State with Selected Class
        gameState.current = {
            ...gameState.current,
            player: { ...createFighter('player', WORLD_WIDTH / 2 - 200, playerClass), score: currentPScore },
            enemy: { ...createFighter('enemy', WORLD_WIDTH / 2 + 200, enemyClass), score: currentEScore },
            gameActive: true,
            winner: null,
            slowMoFactor: 1.0,
            slowMoTimer: 0,
            particles: [],
            shockwaves: [],
            impacts: [],
            flares: []
        };

        let animationFrameId: number;

        const loop = () => {
            const state = gameState.current;
            
            // Only update logic if NOT paused
            if (!isPausedRef.current) {
                state.frameCount++;
                
                // Time & Env decay
                if (state.slowMoTimer > 0) {
                    state.slowMoTimer--;
                    if (state.slowMoTimer <= 0) state.slowMoFactor = 1.0;
                }
                state.shake *= 0.8;
                state.shakeX *= 0.8;
                state.shakeY *= 0.8;
                state.chromaticAberration = Math.max(0, state.chromaticAberration * 0.8);

                // Logic
                const playerInput = inputManager.current.getPlayerInput();
                const aiInput = updateAI(state.enemy, state.player, state);

                updateFighter(state.player, playerInput, state, prevAttackInput.current, audioManager.current!);
                updateFighter(state.enemy, aiInput, state, prevAttackInput.current, audioManager.current!);

                checkCollisions(state, audioManager.current, onGameOver);

                // Effect cleanup
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
            }

            // Always Render (even when paused, to show the freeze frame)
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
                // If paused, we don't update camera smoothing to prevent drift
                if (!isPausedRef.current) {
                    updateCamera(state, canvasRef.current.width, canvasRef.current.height);
                }
                renderGame(ctx, state, audioManager.current);
            }

            if (state.gameActive) {
                animationFrameId = requestAnimationFrame(loop);
            }
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animationFrameId);
            inputManager.current.unmount();
            audioManager.current?.suspend();
        };
    }, [gameActive, onGameOver, playerClass, enemyClass]);

    return gameState;
};