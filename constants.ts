
import { FighterClass } from './types';

export const CANVAS_WIDTH = 1280; // Viewport Width
export const CANVAS_HEIGHT = 720;
export const WORLD_WIDTH = 4000; // XXL Map for tactical spacing
export const GROUND_Y = 600;

// Base Physics Constants
export const GRAVITY = 0.8;
export const FRICTION = 0.85;
export const AIR_RESISTANCE = 0.95;

export const PLAYER_SPEED = 3.5; 
export const MAX_SPEED = 18; 
export const JUMP_FORCE = -22;
export const DASH_SPEED = 32; 
export const DASH_DURATION = 9; 
export const DASH_COOLDOWN = 25; 

// Class System Configuration
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
    VOLT: { // Glass Cannon Speedster (Replaces STANDARD)
        speed: 4.0, // Top Tier Speed
        maxSpeed: 20, // Very agile
        jumpForce: JUMP_FORCE,
        dashSpeed: 40, // Instant snap dash
        dashDuration: 9,
        dashCooldown: 25, // Mid cooldown, relying on Reset Mechanic
        health: 90, // Fragile
        damageMult: 1.0,
        gravityScale: 1.0
    },
    SLINGER: { // High Mobility
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
    VORTEX: { // Floaty, tech-based
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
    KINETIC: { // Velocity Berserker
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

// Combo System Configuration
export const ATTACK_RANGE = 120;
export const ATTACK_COOLDOWN = 10; 
export const COMBO_WINDOW = 30; 

export const ATTACK_DURATIONS = [8, 10, 15]; 
export const ATTACK_DAMAGES = [3, 6, 10]; 
export const ATTACK_KNOCKBACKS = [5, 8, 25]; 

export const KNOCKBACK_FORCE = 15;
export const HIT_FLASH_DURATION = 2; 

export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 100;

export const TRAIL_LENGTH = 3; 

// Camera Dynamics
export const MAX_ZOOM = 1.3; 
export const MIN_ZOOM = 0.65; 
export const CAMERA_SMOOTHING = 0.12; 
export const CAMERA_LOOKAHEAD = 80; 
export const CAMERA_TILT_MAX = 0.015;

// Slinger Mechanics
export const GRAPPLE_COOLDOWN = 180; 
export const GRAPPLE_MAX_SPEED = 45; 
export const GRAPPLE_RANGE = WORLD_WIDTH; 

export const COLORS = {
  player: {
    primary: '#00f0ff', 
    secondary: '#0080ff',
    glow: '#00ffff',
  },
  volt: {
    primary: '#06b6d4', // Cyan Électrique
    secondary: '#0891b2', // Bleu Orage
    glow: '#67e8f9',      // Blanc Électrique
  },
  slinger: {
    primary: '#22c55e', 
    secondary: '#15803d', 
    glow: '#a3e635',      
  },
  vortex: {
    primary: '#8b5cf6', 
    secondary: '#6d28d9', 
    glow: '#d946ef',      
  },
  kinetic: {
    primary: '#f97316', 
    secondary: '#475569', 
    glow: '#fbbf24',      
  },
  enemy: {
    primary: '#4f46e5', 
    secondary: '#312e81',
    glow: '#6366f1',
  },
  background: '#050510', 
  backgroundFar: '#020205',
  grid: '#0f172a', 
  gridHighlight: '#3b82f6', 
  speedLine: 'rgba(255, 255, 255, 0.1)',
};
