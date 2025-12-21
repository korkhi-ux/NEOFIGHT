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
  
  // States
  isGrounded: boolean;
  isDashing: boolean;
  isAttacking: boolean;
  isStunned: boolean;
  isDead: boolean;

  // Timers
  dashTimer: number;
  dashCooldown: number;
  attackTimer: number;
  attackCooldown: number;
  stunTimer: number;
  
  // Animation / Visuals
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
  hitStop: number; // Frames remaining of hitstop (freeze frame)
  shake: number; // Screen shake intensity
  winner: 'player' | 'enemy' | null;
  gameActive: boolean;
}