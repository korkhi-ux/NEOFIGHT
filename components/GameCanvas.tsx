import React, { useEffect, useRef } from 'react';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_WIDTH, GROUND_Y, GRAVITY, FRICTION, 
  PLAYER_SPEED, JUMP_FORCE, MAX_SPEED, DASH_SPEED, DASH_DURATION, 
  DASH_COOLDOWN, ATTACK_DURATIONS, ATTACK_DAMAGES, ATTACK_KNOCKBACKS, 
  ATTACK_RANGE, ATTACK_COOLDOWN, COMBO_WINDOW, HIT_FLASH_DURATION,
  PLAYER_WIDTH, PLAYER_HEIGHT, COLORS, AIR_RESISTANCE, TRAIL_LENGTH, MAX_ZOOM, MIN_ZOOM,
  CAMERA_SMOOTHING, CAMERA_LOOKAHEAD, CAMERA_TILT_MAX
} from '../constants';
import { Fighter, GameState, TrailPoint, Shockwave, ImpactEffect, LensFlare } from '../types';

// --- AUDIO SYSTEM ---
class AudioManager {
  ctx: AudioContext;
  masterGain: GainNode;
  analyser: AnalyserNode;
  bufferNoise: AudioBuffer | null = null;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Global volume
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    
    this.createNoiseBuffer();
  }

  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.bufferNoise = buffer;
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDash() {
    if (!this.bufferNoise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.bufferNoise;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    src.start();
    src.stop(this.ctx.currentTime + 0.15);
  }

  playHit(isHeavy: boolean) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = isHeavy ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isHeavy ? 100 : 200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHeavy ? 800 : 1500, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(isHeavy ? 0.8 : 0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isHeavy ? 0.3 : 0.1));
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playKO() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 1.5);
    
    // Vibrato
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 15;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
    lfo.stop(this.ctx.currentTime + 1.5);
  }

  getWaveform(array: Uint8Array) {
    this.analyser.getByteTimeDomainData(array);
  }
}

// Utility: Create initial fighter state
const createFighter = (id: 'player' | 'enemy', x: number, colorSet: typeof COLORS.player): Fighter => ({
  id,
  x,
  y: GROUND_Y - PLAYER_HEIGHT,
  vx: 0,
  vy: 0,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  health: 100,
  maxHealth: 100,
  ghostHealth: 100,
  facing: id === 'player' ? 1 : -1,
  
  // Initialize AI for enemy
  aiState: id === 'enemy' ? {
      mode: 'neutral', 
      actionTimer: 0,
      reactionCooldown: 0,
      recoveryTimer: 0,
      difficulty: 0.8, // Balanced
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
  color: colorSet,
  score: 0
});

interface GameCanvasProps {
  onGameOver: (winner: 'player' | 'enemy') => void;
  onRestart: () => void;
  gameActive: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const prevAttackInput = useRef<{player: boolean, enemy: boolean}>({ player: false, enemy: false });

  const gameState = useRef<GameState>({
    player: createFighter('player', 200, COLORS.player),
    enemy: createFighter('enemy', WORLD_WIDTH - 250, COLORS.enemy),
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

  // Init Audio
  useEffect(() => {
    if (gameActive && !audioRef.current) {
        audioRef.current = new AudioManager();
    }
    if (gameActive && audioRef.current) {
        audioRef.current.resume();
    }
    return () => {
        if (!gameActive && audioRef.current) {
            audioRef.current.ctx.suspend();
        }
    }
  }, [gameActive]);

  useEffect(() => {
    if (gameActive) {
      gameState.current = {
        player: createFighter('player', 200, COLORS.player),
        enemy: createFighter('enemy', WORLD_WIDTH - 250, COLORS.enemy),
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
        gameActive: true,
        frameCount: 0,
        slowMoFactor: 1.0,
        slowMoTimer: 0
      };
      if (audioRef.current) audioRef.current.resume();
    }
  }, [gameActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const handleMouseDown = (e: MouseEvent) => { if (e.button === 0) keys.current['MouseLeft'] = true; };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 0) keys.current['MouseLeft'] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // --- PHYSICS & LOGIC ---

  const updateFighter = (f: Fighter, input: { x: number, jump: boolean, dash: boolean, attack: boolean }, target: Fighter) => {
    if (f.isDead) return;

    const timeScale = gameState.current.slowMoFactor;

    // Save previous state for detection
    const justChangedDir = (Math.sign(f.prevVx) !== Math.sign(f.vx)) && Math.abs(f.vx) > 1;
    const justLanded = !f.prevGrounded && f.isGrounded;

    f.prevVx = f.vx;
    f.prevGrounded = f.isGrounded;

    // --- Friction Particles & Land Squash ---
    if (f.isGrounded && justChangedDir) {
        createParticles(f.x + f.width/2, f.y + f.height, 5, f.color.glow, 4);
    }
    if (justLanded) {
        createParticles(f.x + f.width/2, f.y + f.height, 8, '#ffffff', 3);
        // Deep Impact Squash
        f.scaleX = 1.4; 
        f.scaleY = 0.6;
    }

    // --- Timers (Scaled by Time) ---
    if (f.dashCooldown > 0) f.dashCooldown -= timeScale;
    if (f.attackCooldown > 0) f.attackCooldown -= timeScale;
    if (f.comboTimer > 0) f.comboTimer -= timeScale;
    if (f.hitFlashTimer > 0) f.hitFlashTimer -= timeScale;

    // If combo window expires
    if (f.comboTimer <= 0 && !f.isAttacking) {
        f.comboCount = 0;
    }

    // --- Kinetic Trails ---
    // Only trail if moving fast, attacking or dashing
    const isHighSpeed = Math.abs(f.vx) > 5 || f.isDashing || f.isAttacking;
    if (isHighSpeed && gameState.current.frameCount % (Math.ceil(2/timeScale)) === 0) {
        f.trail.push({
            x: f.x,
            y: f.y,
            scaleX: f.scaleX,
            scaleY: f.scaleY,
            rotation: f.rotation,
            facing: f.facing,
            alpha: 0.5,
            color: f.color.glow
        });
    }
    for (let i = f.trail.length - 1; i >= 0; i--) {
        f.trail[i].alpha -= 0.08 * timeScale; // Faster fade
        if (f.trail[i].alpha <= 0) f.trail.splice(i, 1);
    }


    // --- Input Handling (Cancels, etc) ---
    let isCanceling = false;

    // Dash
    if (input.dash && f.dashCooldown <= 0) {
      if (f.isAttacking) {
          isCanceling = true;
          f.isAttacking = false;
      }
      f.isDashing = true;
      f.dashTimer = DASH_DURATION;
      f.dashCooldown = DASH_COOLDOWN;
      audioRef.current?.playDash();
      
      const dashDir = input.x !== 0 ? Math.sign(input.x) : f.facing;
      f.facing = dashDir as 1 | -1;
      
      // Extreme Stretch
      f.scaleX = 1.6;
      f.scaleY = 0.5;
      gameState.current.shake += 2;
    }

    // Jump
    if (input.jump && f.isGrounded) {
       if (f.isAttacking) {
           isCanceling = true;
           f.isAttacking = false;
       }
       f.vy = JUMP_FORCE;
       f.isGrounded = false;
       // Stretch Up
       f.scaleX = 0.6;
       f.scaleY = 1.5;
       createParticles(f.x + f.width/2, f.y + f.height, 5, '#fff', 3);
       audioRef.current?.playJump();
    }

    // Attack
    const freshAttack = input.attack && !prevAttackInput.current[f.id];
    
    if (freshAttack && !f.isDashing) {
        let canChain = false;
        
        if (!f.isAttacking && f.attackCooldown <= 0) {
            canChain = true;
        } 
        else if (f.isAttacking && f.attackTimer < ATTACK_DURATIONS[f.comboCount] * 0.5) {
            canChain = true;
        }

        if (canChain) {
            if (f.comboTimer > 0 && f.comboCount < 2) {
                f.comboCount++;
            } else {
                f.comboCount = 0;
            }
            
            f.isAttacking = true;
            f.attackTimer = ATTACK_DURATIONS[f.comboCount];
            f.comboTimer = COMBO_WINDOW; 
            
            // Attack Impulse Stretch
            f.scaleX = 1.3;
            f.scaleY = 0.8;
            
            // Heavy lunge
            if (f.comboCount === 2) {
                f.vx = f.facing * 40; 
                f.scaleX = 1.8; // Huge stretch for finisher
                f.scaleY = 0.5;
                gameState.current.shake += 4;
            } else {
                f.vx = f.facing * 10; 
            }
        }
    }
    
    prevAttackInput.current[f.id] = input.attack;


    // --- Physics ---
    
    if (f.isDashing) {
      f.dashTimer -= timeScale;
      if (f.dashTimer <= 0) {
        f.isDashing = false;
        f.vx *= 0.5;
      } else {
        f.vx = f.facing * DASH_SPEED;
        f.vy = 0; 
      }
    } 
    else if (f.isAttacking) {
        f.attackTimer -= timeScale;
        if (f.isGrounded) f.vx *= 0.85;
        else f.vx *= 0.95;

        if (f.attackTimer <= 0) {
            f.isAttacking = false;
            f.attackCooldown = ATTACK_COOLDOWN; 
            if (f.id === 'enemy' && f.comboCount === 2 && f.aiState) {
                f.aiState.recoveryTimer = 30; 
            }
        }
    }
    else {
        const accel = f.isGrounded ? PLAYER_SPEED : PLAYER_SPEED * 0.8;
        f.vx += input.x * accel * timeScale; 

        if (Math.abs(f.vx) > MAX_SPEED) f.vx = Math.sign(f.vx) * MAX_SPEED;

        if (input.x === 0) {
           f.vx *= (f.isGrounded ? FRICTION : AIR_RESISTANCE);
        }
    }

    if (!f.isDashing) f.vy += GRAVITY * timeScale;

    f.x += f.vx * timeScale;
    f.y += f.vy * timeScale;

    // Ground Collision
    if (f.y + f.height >= GROUND_Y) {
      f.y = GROUND_Y - f.height;
      f.vy = 0;
      f.isGrounded = true;
    } else {
        f.isGrounded = false;
    }

    // World Boundary
    if (f.x < 0) { f.x = 0; f.vx = 0; }
    if (f.x + f.width > WORLD_WIDTH) { f.x = WORLD_WIDTH - f.width; f.vx = 0; }

    // Facing
    if (input.x !== 0 && !f.isDashing && !f.isAttacking) {
      f.facing = Math.sign(input.x) as 1 | -1;
    }

    // --- Organic Animation (Squash/Stretch/Tilt) ---
    // Spring back to 1
    f.scaleX += (1 - f.scaleX) * 0.2 * timeScale;
    f.scaleY += (1 - f.scaleY) * 0.2 * timeScale;

    // Tilt based on speed
    const targetRot = (f.vx / MAX_SPEED) * 0.2; // Max 0.2 rads
    f.rotation += (targetRot - f.rotation) * 0.2 * timeScale;
    
    // Run Bounce
    if (Math.abs(f.vx) > 1 && f.isGrounded) {
        f.scaleY = 1 + Math.sin(gameState.current.frameCount * 0.5) * 0.05;
        f.scaleX = 1 - Math.sin(gameState.current.frameCount * 0.5) * 0.05;
    }

  };

  // --- Effects Systems ---

  const createParticles = (x: number, y: number, count: number, color: string, speed: number) => {
      for(let i=0; i<count; i++) {
        gameState.current.particles.push({
            id: Math.random().toString(),
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * speed * 2,
            vy: (Math.random() - 0.5) * speed * 2,
            life: 20 + Math.random() * 10,
            maxLife: 30,
            color: color,
            size: Math.random() * 6 + 2
        });
      }
  };

  const createImpact = (x: number, y: number, color: string) => {
      gameState.current.impacts.push({
          id: Math.random().toString(),
          x, y,
          life: 15, // Short life
          color,
          rotation: Math.random() * Math.PI
      });
  };

  const createFlare = (x: number, y: number, color: string) => {
      gameState.current.flares.push({
          id: Math.random().toString(),
          x, y,
          life: 20,
          color
      });
  };

  const createShockwave = (x: number, y: number, color: string) => {
      gameState.current.shockwaves.push({
          id: Math.random().toString(),
          x, y,
          radius: 10,
          maxRadius: 150,
          color,
          width: 5,
          alpha: 1
      });
  };

  const updateEffects = () => {
    const { particles, shockwaves, impacts, flares, slowMoFactor } = gameState.current;
    const timeScale = slowMoFactor;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * timeScale;
      p.y += p.vy * timeScale;
      p.life -= timeScale;
      p.vx *= 0.9; 
      p.vy *= 0.9;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.radius += 20 * timeScale;
        s.alpha -= 0.1 * timeScale;
        s.width *= 0.8;
        if (s.alpha <= 0) shockwaves.splice(i, 1);
    }
    for (let i = impacts.length - 1; i >= 0; i--) {
        const imp = impacts[i];
        imp.life -= timeScale;
        if (imp.life <= 0) impacts.splice(i, 1);
    }
    for (let i = flares.length - 1; i >= 0; i--) {
        const f = flares[i];
        f.life -= timeScale;
        if (f.life <= 0) flares.splice(i, 1);
    }
  };

  const checkCollisions = () => {
    const { player, enemy } = gameState.current;

    const checkHit = (attacker: Fighter, defender: Fighter) => {
      if (attacker.isAttacking) {
        const frameToHit = Math.floor(ATTACK_DURATIONS[attacker.comboCount] / 2);
        
        // Relaxed window for slow mo
        if (attacker.attackTimer <= frameToHit && attacker.attackTimer > frameToHit - gameState.current.slowMoFactor * 1.5) {
            let range = ATTACK_RANGE;
            let heightMod = 0;
            
            if (attacker.comboCount === 1) { range = ATTACK_RANGE * 1.2; heightMod = 20; }
            if (attacker.comboCount === 2) { range = ATTACK_RANGE * 2.0; heightMod = 40; } // Big Heavy Range

            const hitboxX = attacker.facing === 1 ? attacker.x + attacker.width : attacker.x - range;
            const hitboxW = range;
            const hitboxY = attacker.y - heightMod;
            const hitboxH = attacker.height + heightMod * 2;

            if (
              hitboxX < defender.x + defender.width &&
              hitboxX + hitboxW > defender.x &&
              hitboxY < defender.y + defender.height &&
              hitboxY + hitboxH > defender.y
            ) {
               handleHit(attacker, defender);
            }
        }
      }
    };

    checkHit(player, enemy);
    checkHit(enemy, player);
  };

  const handleHit = (attacker: Fighter, defender: Fighter) => {
    if (defender.isDashing) return; 

    const impactX = defender.x + defender.width/2;
    const impactY = defender.y + defender.height/2;

    // Visuals
    defender.hitFlashTimer = HIT_FLASH_DURATION; // Used for global inversion effect
    audioRef.current?.playHit(attacker.comboCount === 2);

    // Directional Shake Logic
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    // Shake screen IN direction of impact
    gameState.current.shakeX = (dx/dist) * 20;
    gameState.current.shakeY = (dy/dist) * 10;
    
    // Impact Lines
    createImpact(impactX, impactY, '#ffffff');

    if (attacker.comboCount === 2) {
        // Heavy Hit
        gameState.current.chromaticAberration = 15;
        gameState.current.shake = 30;
        createFlare(impactX, impactY, attacker.color.glow); // Cinematic Flare
    } else {
        gameState.current.shake = 10;
    }

    // Physics
    const damage = ATTACK_DAMAGES[attacker.comboCount];
    const knockback = ATTACK_KNOCKBACKS[attacker.comboCount];

    defender.health -= damage;
    defender.vx = attacker.facing * knockback;
    defender.vy = -5;
    
    // Impact Squash
    defender.scaleX = 0.5;
    defender.scaleY = 1.5;

    // FX Spawning
    createParticles(impactX, impactY, 15, '#fff', 12);
    createParticles(impactX, impactY, 10, attacker.color.glow, 15);
    createShockwave(impactX, impactY, attacker.color.glow);

    // --- GAME OVER & SLOW MO FINISH ---
    if (defender.health <= 0 && !defender.isDead) {
        defender.isDead = true;
        defender.health = 0;
        attacker.score += 1;
        gameState.current.winner = attacker.id;
        
        // SLOW MO TRIGGER
        gameState.current.slowMoFactor = 0.1; 
        gameState.current.slowMoTimer = 180; 
        createFlare(impactX, impactY, '#ffffff');
        
        audioRef.current?.playKO();

        setTimeout(() => onGameOver(attacker.id), 3000); 
    }
  };

  const updateAI = (enemy: Fighter, player: Fighter): { x: number, jump: boolean, dash: boolean, attack: boolean } => {
    if (enemy.isDead || !enemy.aiState) return { x: 0, jump: false, dash: false, attack: false };

    const ai = enemy.aiState;
    const dx = player.x - enemy.x;
    const dist = Math.abs(dx);
    const facingPlayer = Math.sign(dx) === enemy.facing;
    const timeScale = gameState.current.slowMoFactor;
    
    // Recovery State
    if (ai.recoveryTimer > 0) {
        ai.recoveryTimer -= timeScale;
        return { 
            x: -Math.sign(dx), 
            jump: ai.recoveryTimer % 15 === 0, 
            dash: false, 
            attack: false 
        };
    }

    // Reaction Delay
    if (player.isDashing && ai.reactionCooldown <= 0) {
        ai.reactionCooldown = 12; 
    }

    if (ai.reactionCooldown > 0) {
        ai.reactionCooldown -= timeScale;
        if (ai.nextMove) return ai.nextMove;
        return { x: 0, jump: false, dash: false, attack: false };
    }

    // Context Analysis
    if (player.health < 20 && enemy.health > 50) {
        ai.mode = 'showoff'; 
    } else if (enemy.health > player.health + 40) {
        ai.targetDistance = ATTACK_RANGE + 60; 
        ai.mode = 'neutral';
    } else {
        ai.mode = 'aggressive';
        ai.targetDistance = 40;
    }

    let inputX = 0;
    let jump = false;
    let dash = false;
    let attack = false;

    // Action Timer
    if (ai.actionTimer > 0) {
        ai.actionTimer -= timeScale;
        if (ai.nextMove) return ai.nextMove;
    }

    // Combo Chaining Logic
    if (enemy.isAttacking) {
         if (enemy.attackTimer < ATTACK_DURATIONS[enemy.comboCount] * 0.5) {
             if (enemy.comboCount === 1 && Math.random() < 0.1) return { x: 0, jump: false, dash: false, attack: false };
             attack = true; 
         }
         
         if (!facingPlayer && Math.random() < 0.2) {
             dash = true;
             inputX = Math.sign(dx);
         }
         
         const move = { x: inputX, jump, dash, attack };
         ai.nextMove = move;
         return move;
    }

    const isError = Math.random() < 0.2;

    if (ai.mode === 'showoff') {
        if (dist > 100) {
            dash = Math.random() < 0.1;
            jump = Math.random() < 0.1;
            inputX = Math.random() > 0.5 ? 1 : -1;
        } else {
            if (Math.random() < 0.5) attack = true;
        }
    } 
    else {
        inputX = Math.sign(dx);
        
        if (dist < ai.targetDistance) {
            if (!isError) inputX = -Math.sign(dx); 
            else inputX = 0; 
        }

        if (dist < ATTACK_RANGE + 10 && facingPlayer) {
            if (isError && dist > ATTACK_RANGE - 10) {
                attack = true;
            } else if (!isError) {
                attack = true;
            }
        }

        if (player.isAttacking && dist < ATTACK_RANGE + 50) {
            if (Math.random() < ai.difficulty) {
                dash = true;
                if (Math.random() < 0.5) inputX = Math.sign(dx); 
                else inputX = -Math.sign(dx);
                if (isError) inputX = -inputX; 
            }
        } else if (dist > 300) {
            if (Math.random() < 0.05) {
                dash = true;
                inputX = Math.sign(dx);
            }
        }
    }

    ai.actionTimer = 5; 
    const result = { x: inputX, jump, dash, attack };
    ai.nextMove = result;
    return result;
  };

  // --- DRAWING ---

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { player, enemy, particles, shockwaves, impacts, flares, shake, shakeX, shakeY, frameCount } = gameState.current;
    const width = ctx.canvas.width;   
    const height = ctx.canvas.height; 

    // --- Predictive Camera Dynamics ---
    const midX = (player.x + enemy.x + PLAYER_WIDTH) / 2;
    const midY = (player.y + enemy.y + PLAYER_HEIGHT) / 2;
    const dist = Math.abs(player.x - enemy.x);

    const desiredZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (width * 0.55) / dist));
    gameState.current.cameraZoom += (desiredZoom - gameState.current.cameraZoom) * CAMERA_SMOOTHING;
    const zoom = gameState.current.cameraZoom;

    // Look Ahead
    const playerVel = player.isDashing ? player.vx * 1.5 : player.vx;
    const lookAheadTarget = playerVel * 10;
    gameState.current.cameraLookAhead += (lookAheadTarget - gameState.current.cameraLookAhead) * 0.05;

    // Dynamic Tilt
    const targetTilt = (player.vx / MAX_SPEED) * CAMERA_TILT_MAX;
    gameState.current.cameraTilt += (targetTilt - gameState.current.cameraTilt) * 0.1;

    const viewW = width / zoom;
    const viewH = height / zoom;
    let targetCamX = midX - viewW / 2 + gameState.current.cameraLookAhead;
    let targetCamY = GROUND_Y - viewH * 0.75; 
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));
    targetCamY = Math.max(-200, Math.min(targetCamY, GROUND_Y + 100 - viewH));

    gameState.current.cameraX += (targetCamX - gameState.current.cameraX) * CAMERA_SMOOTHING;
    gameState.current.cameraY += (targetCamY - gameState.current.cameraY) * CAMERA_SMOOTHING;

    const camX = gameState.current.cameraX;
    const camY = gameState.current.cameraY;

    // Noise Shake + Directional Shake
    const activeShake = shake + 0.5; 
    const noiseX = (Math.random() - 0.5) * activeShake;
    const noiseY = (Math.random() - 0.5) * activeShake;
    const totalShakeX = noiseX + shakeX;
    const totalShakeY = noiseY + shakeY;

    // --- RENDER PASS ---
    ctx.save();
    
    // Hit Frame: Invert Colors
    if (player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,width,height);
        ctx.globalCompositeOperation = 'difference';
    } else {
        ctx.fillStyle = COLORS.backgroundFar;
        ctx.fillRect(0, 0, width, height);
    }

    // Apply Camera Transform
    ctx.translate(width/2, height/2);
    ctx.rotate(gameState.current.cameraTilt);
    ctx.scale(zoom, zoom);
    ctx.translate(-width/2, -height/2);
    ctx.translate(-camX + totalShakeX / zoom, -camY + totalShakeY / zoom);

    // --- Background Layers ---
    if (!(player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0)) {
        // Sky
        ctx.save();
        ctx.translate(camX * 0.1, 0); 
        ctx.fillStyle = COLORS.background;
        for (let i = 0; i < 5; i++) {
            const x = (i * 800) % WORLD_WIDTH;
            ctx.fillStyle = 'rgba(10, 20, 50, 0.5)';
            ctx.fillRect(x + 200, GROUND_Y - 600, 300, 600);
        }
        ctx.restore();

        // Mid
        ctx.save();
        ctx.translate(camX * 0.4, 0); 
        ctx.fillStyle = 'rgba(20, 40, 100, 0.2)';
        for (let i = 0; i < 20; i++) {
            const x = (i * 400) % (WORLD_WIDTH * 1.5);
            const y = GROUND_Y - 200 - (i % 3) * 100;
            const size = 40 + (i % 4) * 20;
            ctx.fillRect(x, y, size, size);
        }
        ctx.restore();

        // Floor Grid
        ctx.lineWidth = 2;
        const startX = Math.floor(camX / 100) * 100;
        const endX = Math.min(WORLD_WIDTH, camX + viewW + 100);
        const startY = GROUND_Y;
        const endY = GROUND_Y + 300;

        for (let x = startX; x <= endX; x += 100) {
            for (let y = startY; y <= endY; y += 100) {
                const centerX = x + 50;
                const distToP = Math.abs(centerX - player.x);
                const distToE = Math.abs(centerX - enemy.x);
                const minD = Math.min(distToP, distToE);
                
                let alpha = 0.05;
                let color = COLORS.grid;
                if (minD < 200) {
                    alpha = 0.3 + (1 - minD / 200) * 0.5;
                    color = COLORS.gridHighlight;
                }
                ctx.strokeStyle = color;
                ctx.globalAlpha = alpha;
                ctx.strokeRect(x, y, 100, 100);
                if (minD < 150) {
                    ctx.fillStyle = color;
                    ctx.globalAlpha = alpha * 0.2;
                    ctx.fillRect(x, y, 100, 100);
                }
            }
        }
        ctx.globalAlpha = 1.0;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.player.glow;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(WORLD_WIDTH, GROUND_Y);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }


    // --- Entities ---
    const drawFighter = (f: Fighter) => {
        if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
             f.scaleY *= 0.9;
             f.scaleX *= 1.1;
             f.color.glow = '#000';
        }

        // Kinetic Blur Trails (Connected Lines)
        if (f.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            // Draw a simplified path connecting trails
            ctx.beginPath();
            const last = f.trail[f.trail.length-1];
            ctx.moveTo(last.x + f.width/2, last.y + f.height/2);
            
            for(let i=f.trail.length-2; i>=0; i--) {
                const t = f.trail[i];
                ctx.lineTo(t.x + f.width/2, t.y + f.height/2);
            }
            ctx.lineTo(f.x + f.width/2, f.y + f.height/2);
            
            ctx.lineWidth = f.width * 0.8;
            ctx.strokeStyle = f.color.glow;
            ctx.globalAlpha = 0.2;
            ctx.stroke();
            ctx.restore();
        }

        // Body
        ctx.save();
        ctx.translate(f.x + f.width / 2, f.y + f.height);
        
        // Apply Tilt Rotation
        ctx.rotate(f.rotation * f.facing); 
        
        ctx.scale(f.scaleX, f.scaleY);
        
        ctx.fillStyle = f.color.primary;
        const flicker = Math.abs(Math.sin(frameCount * 0.2)) * 10 + 20;
        ctx.shadowBlur = flicker;
        ctx.shadowColor = f.color.glow;

        const bodyW = f.width;
        const bodyH = f.height;

        ctx.beginPath();
        ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
        ctx.fill();
        
        if (f.hitFlashTimer <= 0) {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 5;
            const eyeOffset = f.facing === 1 ? bodyW/4 : -bodyW/4 - 10;
            ctx.fillRect(eyeOffset, -bodyH + 20, 15, 4);
        }

        // --- ANIME SLASHES (Light Ovals) ---
        if (f.isAttacking) {
            ctx.save();
            // Position flash relative to body center
            ctx.translate(0, -bodyH/2);
            
            const slashColor = f.color.glow;
            const coreColor = '#ffffff';
            
            // Setup Gradient
            // We draw a huge ellipse and use gradient
            
            if (f.comboCount === 0) {
                // Diagonal Quick Slash
                ctx.rotate(f.facing * Math.PI / 4);
                ctx.translate(f.facing * 40, 0);
            } else if (f.comboCount === 1) {
                // Vertical Wide Slash
                ctx.rotate(f.facing * Math.PI / 8); 
                ctx.translate(f.facing * 60, -20);
            } else {
                // Heavy Horizontal Thrust
                ctx.translate(f.facing * 80, 0);
            }

            // Dimensions
            let len = 100;
            let thick = 15;
            if (f.comboCount === 1) { len = 140; thick = 25; }
            if (f.comboCount === 2) { len = 250; thick = 40; } // Massive heavy

            const grad = ctx.createRadialGradient(0, 0, thick * 0.2, 0, 0, len * 0.6);
            grad.addColorStop(0, coreColor);
            grad.addColorStop(0.3, slashColor);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.shadowBlur = 30;
            ctx.shadowColor = slashColor;
            
            ctx.beginPath();
            ctx.ellipse(0, 0, len, thick, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
        
        ctx.restore();
    };

    drawFighter(enemy);
    drawFighter(player);

    // --- Impacts & Shockwaves ---
    shockwaves.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.globalAlpha = s.alpha;
        ctx.shadowBlur = 20;
        ctx.shadowColor = s.color;
        ctx.stroke();
        ctx.restore();
    });

    // --- IMPACT LINES (Cross/Star) ---
    impacts.forEach(imp => {
        ctx.save();
        ctx.translate(imp.x, imp.y);
        ctx.rotate(imp.rotation);
        
        ctx.strokeStyle = imp.color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = imp.color;
        
        const size = 60 * (imp.life / 15);
        
        ctx.beginPath();
        // Cross
        ctx.moveTo(-size, 0); ctx.lineTo(size, 0);
        ctx.moveTo(0, -size); ctx.lineTo(0, size);
        // Diagonals (smaller)
        ctx.moveTo(-size*0.5, -size*0.5); ctx.lineTo(size*0.5, size*0.5);
        ctx.moveTo(size*0.5, -size*0.5); ctx.lineTo(-size*0.5, size*0.5);
        
        ctx.stroke();
        ctx.restore();
    });

    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        // Elongated sparks
        const len = p.size * (1 + Math.abs(p.vx)*0.2);
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);
        ctx.fillRect(-len/2, -p.size/2, len, p.size);
        ctx.restore();
    });

    // --- CINEMATIC LENS FLARES ---
    flares.forEach(f => {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.globalCompositeOperation = 'screen';
        
        const opacity = Math.min(1, f.life / 10);
        ctx.globalAlpha = opacity;
        
        // Main horizontal streak
        const grad = ctx.createLinearGradient(-300, 0, 300, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, f.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-300, -2, 600, 4);
        
        // Center glow
        const rad = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
        rad.addColorStop(0, '#ffffff');
        rad.addColorStop(0.2, f.color);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(0, 0, 100, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    });

    // --- Speed Lines ---
    if (Math.abs(player.vx) > 10 || player.isDashing) {
         ctx.save();
         // Screen Space Overlay
         ctx.restore(); 
         ctx.save();
         ctx.strokeStyle = COLORS.speedLine;
         ctx.lineWidth = 2;
         for(let i=0; i<4; i++) {
             const lx = Math.random() * width; 
             const ly = Math.random() * height;
             const len = Math.random() * 300 + 100;
             ctx.beginPath();
             ctx.moveTo(lx, ly);
             ctx.lineTo(lx + len, ly);
             ctx.globalAlpha = 0.2;
             ctx.stroke();
         }
         ctx.restore();
    } else {
        ctx.restore(); // Pop main cam
    }

    // Restore Hit Flash Mode
    if (player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'source-over';
    }

    // --- OSCILLOSCOPE ---
    if (audioRef.current && gameActive) {
        const bufferLength = audioRef.current.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        audioRef.current.getWaveform(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = COLORS.gridHighlight; 
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.gridHighlight;
        ctx.globalAlpha = 0.6;

        ctx.beginPath();
        const sliceWidth = width * 1.0 / bufferLength;
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * (height/20) + (height - 60); 

            if(i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }
        ctx.lineTo(width, height/2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
  };

  // --- LOOP ---

  useEffect(() => {
    if (!gameActive) return;
    let animationFrameId: number;

    const loop = () => {
      gameState.current.frameCount++;
      gameState.current.shake *= 0.8;
      gameState.current.shakeX *= 0.8; // Decay directional shake
      gameState.current.shakeY *= 0.8;
      gameState.current.chromaticAberration *= 0.8;
      if (gameState.current.chromaticAberration < 0.5) gameState.current.chromaticAberration = 0;

      // Handle Slow Mo Timer
      if (gameState.current.slowMoTimer > 0) {
          gameState.current.slowMoTimer--;
          if (gameState.current.slowMoTimer <= 0) {
              gameState.current.slowMoFactor = 1.0;
          }
      }

      const playerInput = {
        x: (keys.current['KeyD'] ? 1 : 0) - (keys.current['KeyA'] ? 1 : 0),
        jump: keys.current['KeyW'] || keys.current['KeyZ'] || keys.current['Space'],
        dash: keys.current['Space'],
        attack: keys.current['MouseLeft']
      };

      updateFighter(gameState.current.player, playerInput, gameState.current.enemy);
      const aiInput = updateAI(gameState.current.enemy, gameState.current.player);
      updateFighter(gameState.current.enemy, aiInput, gameState.current.player);

      checkCollisions();
      updateEffects();

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) draw(ctx);

      if (gameState.current.gameActive) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameActive, onGameOver]);

  // UI Loop omitted for brevity (same as before)
  const hpPlayerRef = useRef<HTMLDivElement>(null);
  const hpPlayerGhostRef = useRef<HTMLDivElement>(null);
  const hpEnemyRef = useRef<HTMLDivElement>(null);
  const hpEnemyGhostRef = useRef<HTMLDivElement>(null);
  const hpContainerPlayerRef = useRef<HTMLDivElement>(null);
  const hpContainerEnemyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     if (!gameActive) return;
     const uiLoop = () => {
         const { player, enemy } = gameState.current;
         if (player.ghostHealth > player.health) player.ghostHealth -= 0.5; else player.ghostHealth = player.health;
         if (enemy.ghostHealth > enemy.health) enemy.ghostHealth -= 0.5; else enemy.ghostHealth = enemy.health;

         if (hpPlayerRef.current) hpPlayerRef.current.style.width = `${Math.max(0, player.health)}%`;
         if (hpPlayerGhostRef.current) hpPlayerGhostRef.current.style.width = `${Math.max(0, player.ghostHealth)}%`;
         if (hpEnemyRef.current) hpEnemyRef.current.style.width = `${Math.max(0, enemy.health)}%`;
         if (hpEnemyGhostRef.current) hpEnemyGhostRef.current.style.width = `${Math.max(0, enemy.ghostHealth)}%`;

         if (player.hitFlashTimer > 0 && hpContainerPlayerRef.current) {
             const offset = Math.random() * 10;
             hpContainerPlayerRef.current.style.transform = `translate(${offset}px, ${offset}px)`;
         } else if (hpContainerPlayerRef.current) {
             hpContainerPlayerRef.current.style.transform = `none`;
         }

         if (enemy.hitFlashTimer > 0 && hpContainerEnemyRef.current) {
             const offset = Math.random() * 10;
             hpContainerEnemyRef.current.style.transform = `translate(${offset}px, ${offset}px)`;
         } else if (hpContainerEnemyRef.current) {
             hpContainerEnemyRef.current.style.transform = `none`;
         }

         requestAnimationFrame(uiLoop);
     };
     const id = requestAnimationFrame(uiLoop);
     return () => cancelAnimationFrame(id);
  }, [gameActive]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
            <div className="w-1/3">
                <div className="flex justify-between text-cyan-400 font-bold mb-1 text-xl tracking-wider">
                    <span>PLAYER</span>
                </div>
                <div ref={hpContainerPlayerRef} className="h-6 w-full bg-gray-900/80 border-2 border-cyan-500 skew-x-[-15deg] overflow-hidden relative backdrop-blur-sm">
                    <div ref={hpPlayerGhostRef} className="absolute h-full bg-white transition-none" style={{ width: '100%', opacity: 0.5 }}></div>
                    <div ref={hpPlayerRef} className="absolute h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                </div>
            </div>
            <div className="w-1/3">
                 <div className="flex justify-between text-indigo-400 font-bold mb-1 text-xl tracking-wider flex-row-reverse">
                    <span>CPU</span>
                </div>
                <div ref={hpContainerEnemyRef} className="h-6 w-full bg-gray-900/80 border-2 border-indigo-500 skew-x-[15deg] overflow-hidden relative backdrop-blur-sm">
                     <div ref={hpEnemyGhostRef} className="absolute right-0 h-full bg-white transition-none" style={{ width: '100%', opacity: 0.5 }}></div>
                     <div ref={hpEnemyRef} className="absolute right-0 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] float-right transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                </div>
            </div>
        </div>
        <div className="absolute bottom-4 left-4 text-white/30 text-sm font-mono pointer-events-none">
            WASD/ZQSD: Move | SPACE: Dash | L-CLICK: 3-Hit Combo
        </div>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-auto max-w-7xl border border-blue-900/30 shadow-2xl bg-[#020205]" />
    </div>
  );
};