export interface Vector {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  facing: 1 | -1;
  alpha: number; // Opacity
  color: string;
}

export interface Shockwave {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  width: number; // Stroke width
  alpha: number;
}

export interface AIState {
  mode: 'neutral' | 'aggressive' | 'defensive' | 'showoff';
  actionTimer: number; // Frames to hold current decision
  reactionCooldown: number; // Artificial lag (Human reaction time)
  recoveryTimer: number; // Forced pause after combos
  difficulty: number; // 0.0 to 1.0 (1.0 is expert)
  targetDistance: number; // Desired spacing
  nextMove?: { x: number, jump: boolean, dash: boolean, attack: boolean }; // Buffer
}

export interface Fighter {
  id: 'player' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  facing: 1 | -1; // 1 = right, -1 = left
  
  // HUD
  ghostHealth: number; // For the white delayed bar

  // AI Brain
  aiState?: AIState;

  // States
  isGrounded: boolean;
  isDashing: boolean;
  isAttacking: boolean;
  isDead: boolean;

  // Previous Frame State (for friction/landing particles)
  prevVx: number;
  prevGrounded: boolean;

  // Visuals
  trail: TrailPoint[]; // For afterimages
  
  // Combo System
  comboCount: number; // 0, 1, 2
  comboTimer: number; // Window to hit next attack
  
  // Visuals / Feedback
  hitFlashTimer: number; // For white flash on hit
  isStunned: boolean; // Kept only for flag purposes, no logic blocking
  
  // Timers
  dashTimer: number;
  dashCooldown: number;
  attackTimer: number; // Duration of current attack
  attackCooldown: number; // Global cooldown
  
  // Animation
  scaleX: number;
  scaleY: number;
  color: {
    primary: string;
    secondary: string;
    glow: string;
  };
  score: number;
}

export interface GameState {
  player: Fighter;
  enemy: Fighter;
  particles: Particle[];
  shockwaves: Shockwave[];
  shake: number; // Screen shake intensity
  chromaticAberration: number; // Intensity of RGB split
  cameraZoom: number;
  winner: 'player' | 'enemy' | null;
  gameActive: boolean;
  frameCount: number; // For flicker math
  
  // Time Control
  slowMoFactor: number; // 1.0 = normal, 0.5 = slow
  slowMoTimer: number; // How long to stay in slow mo
}