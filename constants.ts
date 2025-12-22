
import { FighterClass } from './types';

export const CANVAS_WIDTH = 1280; // Viewport Width
export const CANVAS_HEIGHT = 720;
export const WORLD_WIDTH = 4000; // XXL Map for tactical spacing
export const GROUND_Y = 600;

// Base Physics Constants (Used as default for STANDARD class)
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
    gravityScale: number; // New prop for floatiness
}

export const CLASS_STATS: Record<FighterClass, ClassStats> = {
    STANDARD: {
        speed: PLAYER_SPEED,
        maxSpeed: MAX_SPEED,
        jumpForce: JUMP_FORCE,
        dashSpeed: DASH_SPEED,
        dashDuration: DASH_DURATION,
        dashCooldown: DASH_COOLDOWN,
        health: 100,
        damageMult: 1.0,
        gravityScale: 1.0
    },
    SLINGER: { // High Mobility, Standard Physics (Rebalanced)
        speed: PLAYER_SPEED * 1.2,
        maxSpeed: MAX_SPEED * 1.3,
        jumpForce: JUMP_FORCE, // Standardized Jump
        dashSpeed: DASH_SPEED * 1.1,
        dashDuration: DASH_DURATION * 0.8,
        dashCooldown: DASH_COOLDOWN * 0.7,
        health: 80,
        damageMult: 0.8,
        gravityScale: 1.0 // Standardized Gravity (No longer floaty)
    },
    VORTEX: { // Floaty, tech-based
        speed: PLAYER_SPEED * 1.0,
        maxSpeed: MAX_SPEED * 1.1,
        jumpForce: JUMP_FORCE * 1.1, 
        dashSpeed: 0, // Teleport logic overrides speed
        dashDuration: DASH_DURATION,
        dashCooldown: 40, // Longer cooldown for teleport
        health: 90,
        damageMult: 0.9,
        gravityScale: 0.6 // Very floaty
    },
    KINETIC: { // THERMAL TANK (Replaces HEAVY)
        speed: 3.0, // Slow
        maxSpeed: 14, // Cap low
        jumpForce: JUMP_FORCE * 0.9, // Heavy jump
        dashSpeed: 45, // EXPLOSIVE short dash
        dashDuration: 6, // Very short dash
        dashCooldown: 30,
        health: 140, // Tanky
        damageMult: 1.5, // Huge damage
        gravityScale: 1.3 // Falls like a rock
    }
};

// Combo System Configuration
export const ATTACK_RANGE = 120;
export const ATTACK_COOLDOWN = 10; 
export const COMBO_WINDOW = 30; 

// [Light, Medium, Heavy]
export const ATTACK_DURATIONS = [8, 10, 15]; 
export const ATTACK_DAMAGES = [5, 8, 15];
export const ATTACK_KNOCKBACKS = [5, 8, 25]; 

export const KNOCKBACK_FORCE = 15;

export const HIT_FLASH_DURATION = 2; // Reduced for sharper impact

export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 100;

// Visuals
export const TRAIL_LENGTH = 3; // Shortened trails

// --- CAMERA CONFIGURATION ---
// Visibilité avant tout : 
export const MAX_ZOOM = 1.3; // Zoom max un peu moins serré pour voir l'action
export const MIN_ZOOM = 0.65; // Zoom min limité pour ne pas voir des fourmis

// Camera Dynamics
export const CAMERA_SMOOTHING = 0.12; 
export const CAMERA_LOOKAHEAD = 80; 
export const CAMERA_TILT_MAX = 0.015;

// Slinger Mechanics
export const GRAPPLE_COOLDOWN = 180; // 3 Seconds @ 60 FPS
export const GRAPPLE_MAX_SPEED = 45; // FLASH SPEED
export const GRAPPLE_RANGE = WORLD_WIDTH; // Infinite Range

export const COLORS = {
  player: {
    primary: '#00f0ff', // Electric Cyan
    secondary: '#0080ff',
    glow: '#00ffff',
  },
  slinger: {
    primary: '#22c55e', // Neon Green (Pure)
    secondary: '#15803d', // Darker Green
    glow: '#a3e635',      // Electric Lime Glow
  },
  vortex: {
    primary: '#8b5cf6', // Violet Neon
    secondary: '#6d28d9', // Deep Purple
    glow: '#d946ef',      // Electric Magenta
  },
  kinetic: {
    primary: '#f97316', // Orange Brûlé
    secondary: '#ea580c', // Rouille
    glow: '#ffedd5',      // Blanc Chaud incandescent
  },
  enemy: {
    primary: '#4f46e5', // Electric Indigo
    secondary: '#312e81',
    glow: '#6366f1',
  },
  background: '#050510', // Deep Night
  backgroundFar: '#020205',
  grid: '#0f172a', // Slate 900
  gridHighlight: '#3b82f6', // Blue 500
  speedLine: 'rgba(255, 255, 255, 0.1)',
};
