
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
        speed: 4.0, 
        maxSpeed: 20, 
        jumpForce: JUMP_FORCE,
        dashSpeed: 40, 
        dashDuration: 9,
        dashCooldown: 25, 
        health: 90, 
        damageMult: 1.0,
        gravityScale: 1.0
    },
    SLINGER: { 
        speed: PLAYER_SPEED * 1.2,
        maxSpeed: MAX_SPEED * 1.3,
        jumpForce: JUMP_FORCE, 
        dashSpeed: DASH_SPEED * 1.1,
        dashDuration: DASH_DURATION * 0.8,
        dashCooldown: DASH_COOLDOWN * 0.7,
        health: 80,
        damageMult: 0.8,
        gravityScale: 1.0 
    },
    VORTEX: { 
        speed: PLAYER_SPEED * 1.0,
        maxSpeed: MAX_SPEED * 1.1,
        jumpForce: JUMP_FORCE * 1.1, 
        dashSpeed: 0, 
        dashDuration: DASH_DURATION,
        dashCooldown: 40, 
        health: 90,
        damageMult: 0.9,
        gravityScale: 0.6 
    },
    KINETIC: { 
        speed: 4.0, 
        maxSpeed: 22, 
        jumpForce: JUMP_FORCE, 
        dashSpeed: 50, 
        dashDuration: 8,
        dashCooldown: 30,
        health: 120, 
        damageMult: 1.0, 
        gravityScale: 1.4 
    }
};

// Combo System
export const ATTACK_RANGE = 120;
export const ATTACK_COOLDOWN = 10; 
export const COMBO_WINDOW = 30; 

export const ATTACK_DURATIONS = [8, 10, 15]; 
export const ATTACK_DAMAGES = [3, 6, 10]; 
export const ATTACK_KNOCKBACKS = [5, 8, 25]; 

export const KNOCKBACK_FORCE = 15;
