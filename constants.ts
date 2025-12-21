export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const GROUND_Y = 600;

export const GRAVITY = 0.8;
export const FRICTION = 0.85;
export const AIR_RESISTANCE = 0.95;

export const PLAYER_SPEED = 2; // Acceleration
export const MAX_SPEED = 12;
export const JUMP_FORCE = -20;
export const DASH_SPEED = 25;
export const DASH_DURATION = 10; // Frames
export const DASH_COOLDOWN = 40; // Frames

export const ATTACK_RANGE = 120;
export const ATTACK_COOLDOWN = 20; // Frames
export const ATTACK_DURATION = 10; // Frames
export const ATTACK_DAMAGE = 10;
export const KNOCKBACK_FORCE = 15;

export const HIT_STOP_DURATION = 5; // Frames to freeze on impact
export const HIT_STUN_DURATION = 20; // Frames stunned

export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 100;

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