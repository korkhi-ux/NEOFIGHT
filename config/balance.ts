
import { FighterClass } from '../types';
import { DASH_SPEED, DASH_DURATION, DASH_COOLDOWN, JUMP_FORCE, MAX_SPEED, PLAYER_SPEED } from './physics';

interface ClassStats {
    speed: number;
    maxSpeed: number;
    jumpForce: number;
    dashSpeed: number;
    dashDuration: number;
    dashCooldown: number;
    health: number;
    damageMult: number;
    gravityScale: number;
}

export const CLASS_STATS: Record<FighterClass, ClassStats> = {
    VOLT: { 
        speed: 4.1, 
        maxSpeed: 20, 
        jumpForce: JUMP_FORCE,
        dashSpeed: 40, 
        dashDuration: 9,
        dashCooldown: 15, // Buffed to 15 (was 20)
        health: 100, 
        damageMult: 1.0,
        gravityScale: 1.0
    },
    SLINGER: { 
        speed: PLAYER_SPEED * 1.3, 
        maxSpeed: 28, 
        jumpForce: JUMP_FORCE, 
        dashSpeed: DASH_SPEED * 1.1,
        dashDuration: DASH_DURATION * 0.8,
        dashCooldown: 35, // Set to 35
        health: 105, 
        damageMult: 0.95,
        gravityScale: 1.0 
    },
    VORTEX: { 
        speed: 4.2, 
        maxSpeed: MAX_SPEED * 1.1,
        jumpForce: JUMP_FORCE * 1.1, 
        dashSpeed: 0, 
        dashDuration: DASH_DURATION,
        dashCooldown: 30, // Set to 30
        health: 100, 
        damageMult: 0.9,
        gravityScale: 0.65 
    },
    KINETIC: { 
        speed: 3.8, 
        maxSpeed: 24, 
        jumpForce: JUMP_FORCE, 
        dashSpeed: 50, 
        dashDuration: 8,
        dashCooldown: 40, // Set to 40 (Heavier feel)
        health: 130, 
        damageMult: 1.0, 
        gravityScale: 1.4 
    }
};

// Combo System
export const ATTACK_RANGE = 120;
export const ATTACK_COOLDOWN = 10; 
export const COMBO_WINDOW = 30; 

export const ATTACK_DURATIONS = [8, 10, 15]; 
export const ATTACK_DAMAGES = [4, 7, 12]; 
export const ATTACK_KNOCKBACKS = [5, 10, 30]; 

export const KNOCKBACK_FORCE = 15;
