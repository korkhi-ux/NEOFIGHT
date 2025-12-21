export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const GROUND_Y = 600;

export const GRAVITY = 0.8;
export const FRICTION = 0.85;
export const AIR_RESISTANCE = 0.95;

export const PLAYER_SPEED = 2.5; // Increased acceleration
export const MAX_SPEED = 15; // Increased by ~20% (was 12)
export const JUMP_FORCE = -22;
export const DASH_SPEED = 28;
export const DASH_DURATION = 8; // Faster dashes
export const DASH_COOLDOWN = 25; // Lower cooldown

// Combo System Configuration
export const ATTACK_RANGE = 120;
export const ATTACK_COOLDOWN = 10; // Frames before you can restart a chain if dropped
export const COMBO_WINDOW = 30; // Frames allowed to input next combo hit

// [Light, Medium, Heavy]
export const ATTACK_DURATIONS = [8, 10, 15]; 
export const ATTACK_DAMAGES = [5, 8, 15];
export const ATTACK_KNOCKBACKS = [5, 8, 25]; // Heavy hits hard

export const KNOCKBACK_FORCE = 15;

// Removed Hit Stop/Stun duration constants as requested for frictionless play
export const HIT_FLASH_DURATION = 4; // Visual only

export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 100;

// Visuals
export const TRAIL_LENGTH = 4;
export const MAX_ZOOM = 1.15;
export const MIN_ZOOM = 0.9;

export const COLORS = {
  player: {
    primary: '#00f0ff', // Cyan
    secondary: '#0080ff',
    glow: '#00ffff',
  },
  enemy: {
    primary: '#ff0055', // Magenta/Red
    secondary: '#aa0033',
    glow: '#ff00aa',
  },
  background: '#0a0a12',
  grid: '#1a1a2e',
};