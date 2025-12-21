
export const CANVAS_WIDTH = 1280; // Viewport Width
export const CANVAS_HEIGHT = 720;
export const WORLD_WIDTH = 2560; // The actual map size (Double the viewport)
export const GROUND_Y = 600;

export const GRAVITY = 0.8;
export const FRICTION = 0.85;
export const AIR_RESISTANCE = 0.95;

export const PLAYER_SPEED = 3.5; 
export const MAX_SPEED = 18; 
export const JUMP_FORCE = -22;
export const DASH_SPEED = 32; 
export const DASH_DURATION = 9; 
export const DASH_COOLDOWN = 25; 

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
export const MAX_ZOOM = 1.35; 
export const MIN_ZOOM = 0.85; 

// Camera Dynamics
export const CAMERA_SMOOTHING = 0.12; // Increased for more stability (less floaty)
export const CAMERA_LOOKAHEAD = 150;
export const CAMERA_TILT_MAX = 0.015; // Reduced tilt by half for clarity

export const COLORS = {
  player: {
    primary: '#00f0ff', // Electric Cyan
    secondary: '#0080ff',
    glow: '#00ffff',
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
