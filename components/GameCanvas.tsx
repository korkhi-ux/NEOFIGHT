import React, { useEffect, useRef } from 'react';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, GRAVITY, FRICTION, 
  PLAYER_SPEED, JUMP_FORCE, MAX_SPEED, DASH_SPEED, DASH_DURATION, 
  DASH_COOLDOWN, ATTACK_DURATIONS, ATTACK_DAMAGES, ATTACK_KNOCKBACKS, 
  ATTACK_RANGE, ATTACK_COOLDOWN, COMBO_WINDOW, HIT_FLASH_DURATION,
  PLAYER_WIDTH, PLAYER_HEIGHT, COLORS, AIR_RESISTANCE, TRAIL_LENGTH, MAX_ZOOM, MIN_ZOOM
} from '../constants';
import { Fighter, GameState, TrailPoint, Shockwave } from '../types';

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
  color: colorSet,
  score: 0
});

interface GameCanvasProps {
  onGameOver: (winner: 'player' | 'enemy') => void;
  onRestart: () => void;
  gameActive: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const prevAttackInput = useRef<{player: boolean, enemy: boolean}>({ player: false, enemy: false });

  const gameState = useRef<GameState>({
    player: createFighter('player', 200, COLORS.player),
    enemy: createFighter('enemy', CANVAS_WIDTH - 250, COLORS.enemy),
    particles: [],
    shockwaves: [],
    shake: 0,
    chromaticAberration: 0,
    cameraZoom: 1,
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
    // Cleanup on unmount is handled by browser for AudioContext usually, 
    // but good to close if we were strict.
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
        enemy: createFighter('enemy', CANVAS_WIDTH - 250, COLORS.enemy),
        particles: [],
        shockwaves: [],
        shake: 0,
        chromaticAberration: 0,
        cameraZoom: 1,
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

    // --- Friction Particles ---
    if (f.isGrounded && justChangedDir) {
        createParticles(f.x + f.width/2, f.y + f.height, 5, f.color.glow, 4);
    }
    if (justLanded) {
        createParticles(f.x + f.width/2, f.y + f.height, 8, '#ffffff', 3);
        f.scaleX = 1.3; 
        f.scaleY = 0.7;
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

    // --- Ghosting / Trail Logic ---
    const isHighSpeed = f.isDashing || (f.isAttacking && f.comboCount === 2);
    if (isHighSpeed && gameState.current.frameCount % (Math.ceil(3/timeScale)) === 0) {
        f.trail.push({
            x: f.x,
            y: f.y,
            scaleX: f.scaleX,
            scaleY: f.scaleY,
            facing: f.facing,
            alpha: 0.6,
            color: f.color.glow
        });
    }
    for (let i = f.trail.length - 1; i >= 0; i--) {
        f.trail[i].alpha -= 0.05 * timeScale;
        if (f.trail[i].alpha <= 0) f.trail.splice(i, 1);
    }


    // --- Input Handling (Cancels, etc) ---
    let isCanceling = false;

    // Dash
    if (input.dash && f.dashCooldown <= 0) {
      if (f.isAttacking) {
          isCanceling = true;
          f.isAttacking = false;
          createParticles(f.x + f.width/2, f.y + f.height/2, 5, '#fff', 2);
      }
      f.isDashing = true;
      f.dashTimer = DASH_DURATION;
      f.dashCooldown = DASH_COOLDOWN;
      audioRef.current?.playDash();
      
      const dashDir = input.x !== 0 ? Math.sign(input.x) : f.facing;
      f.facing = dashDir as 1 | -1;
      
      f.scaleX = 1.4;
      f.scaleY = 0.6;
      gameState.current.shake += 2; // Micro shake on dash
    }

    // Jump
    if (input.jump && f.isGrounded) {
       if (f.isAttacking) {
           isCanceling = true;
           f.isAttacking = false;
       }
       f.vy = JUMP_FORCE;
       f.isGrounded = false;
       f.scaleX = 0.7;
       f.scaleY = 1.4;
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
            
            // Heavy lunge
            if (f.comboCount === 2) {
                f.vx = f.facing * 35; // increased lunge
                f.scaleX = 1.5;
                f.scaleY = 0.5;
                gameState.current.shake += 4;
            } else {
                f.vx = f.facing * 8; 
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
        if (f.isGrounded) f.vx *= 0.9;
        else f.vx *= 0.95;

        if (f.attackTimer <= 0) {
            f.isAttacking = false;
            f.attackCooldown = ATTACK_COOLDOWN; 
            
            // AI Hook: If AI finishes a full combo (Heavy hit), trigger recovery
            if (f.id === 'enemy' && f.comboCount === 2 && f.aiState) {
                f.aiState.recoveryTimer = 30; // 0.5s pause
            }
        }
    }
    else {
        const accel = f.isGrounded ? PLAYER_SPEED : PLAYER_SPEED * 0.8;
        f.vx += input.x * accel * timeScale; // Apply Time Scale to Accel

        if (Math.abs(f.vx) > MAX_SPEED) f.vx = Math.sign(f.vx) * MAX_SPEED;

        if (input.x === 0) {
           f.vx *= (f.isGrounded ? FRICTION : AIR_RESISTANCE);
        }
    }

    if (!f.isDashing) f.vy += GRAVITY * timeScale; // Apply Time Scale to Gravity

    // Apply Velocity with Time Scale
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

    // Wall Collision
    if (f.x < 0) { f.x = 0; f.vx = 0; }
    if (f.x + f.width > CANVAS_WIDTH) { f.x = CANVAS_WIDTH - f.width; f.vx = 0; }

    // Facing
    if (input.x !== 0 && !f.isDashing && !f.isAttacking) {
      f.facing = Math.sign(input.x) as 1 | -1;
    }

    // Anim Recovery
    f.scaleX += (1 - f.scaleX) * 0.15 * timeScale;
    f.scaleY += (1 - f.scaleY) * 0.15 * timeScale;
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

      for(let i=0; i<8; i++) {
         const angle = (Math.PI * 2 / 8) * i;
         gameState.current.particles.push({
             id: Math.random().toString(),
             x: x,
             y: y,
             vx: Math.cos(angle) * 15,
             vy: Math.sin(angle) * 15,
             life: 10,
             maxLife: 10,
             color: '#ffffff',
             size: 3
         });
      }
  };

  const updateParticlesAndWaves = () => {
    const { particles, shockwaves, slowMoFactor } = gameState.current;
    
    // Slow mo affects particles too!
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
        s.radius += 15 * timeScale;
        s.alpha -= 0.1 * timeScale;
        s.width *= 0.8;
        if (s.alpha <= 0) shockwaves.splice(i, 1);
    }
  };

  const checkCollisions = () => {
    const { player, enemy } = gameState.current;

    const checkHit = (attacker: Fighter, defender: Fighter) => {
      if (attacker.isAttacking) {
        const frameToHit = Math.floor(ATTACK_DURATIONS[attacker.comboCount] / 2);
        
        // We use Math.abs(current - target) < 0.6 because of float logic in slowmo
        if (Math.abs(attacker.attackTimer - frameToHit) < 1.0 * gameState.current.slowMoFactor) {
             // Only hit once per attack phase. We check if we are "around" the frame.
             // But simpler: just check if we haven't hit yet this attack?
             // Actually, the timer decrements. Logic: check if we just passed the threshold.
        }

        // Logic fix for floating point timers: 
        // We trigger hit if attackTimer crosses the threshold.
        // Since we don't store "hasHit", we rely on the specific frame check.
        // With slowmo, this might be skipped or triggered twice.
        // Better: hit if attackTimer <= frameToHit && attackTimer > frameToHit - timeScale
        if (attacker.attackTimer <= frameToHit && attacker.attackTimer > frameToHit - gameState.current.slowMoFactor) {
            let range = ATTACK_RANGE;
            let heightMod = 0;
            
            if (attacker.comboCount === 1) { range = ATTACK_RANGE * 1.2; heightMod = 20; }
            if (attacker.comboCount === 2) { range = ATTACK_RANGE * 1.5; heightMod = 40; }

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

    // Visuals
    defender.hitFlashTimer = HIT_FLASH_DURATION;
    audioRef.current?.playHit(attacker.comboCount === 2);
    
    if (attacker.comboCount === 2) {
        gameState.current.chromaticAberration = 10;
        gameState.current.shake = 25;
    } else {
        gameState.current.shake = 8 + (attacker.comboCount * 5);
    }

    // Physics
    const damage = ATTACK_DAMAGES[attacker.comboCount];
    const knockback = ATTACK_KNOCKBACKS[attacker.comboCount];

    defender.health -= damage;
    defender.vx = attacker.facing * knockback;
    defender.vy = -5;
    
    defender.scaleX = 0.7;
    defender.scaleY = 1.3;

    // FX Spawning
    const impactX = defender.x + defender.width/2;
    const impactY = defender.y + defender.height/2;
    
    createParticles(impactX, impactY, 15, '#fff', 8);
    createParticles(impactX, impactY, 10, attacker.color.glow, 10);
    createShockwave(impactX, impactY, attacker.color.glow);

    // --- GAME OVER & SLOW MO FINISH ---
    if (defender.health <= 0 && !defender.isDead) {
        defender.isDead = true;
        defender.health = 0;
        attacker.score += 1;
        gameState.current.winner = attacker.id;
        
        // SLOW MO TRIGGER
        gameState.current.slowMoFactor = 0.2; // 5x slower
        gameState.current.slowMoTimer = 120; // 2 seconds @ 60fps
        
        audioRef.current?.playKO();

        setTimeout(() => onGameOver(attacker.id), 2000); // Wait for slow mo
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
    const { player, enemy, particles, shockwaves, shake, frameCount } = gameState.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // --- Dynamic Camera ---
    const midX = (player.x + enemy.x + PLAYER_WIDTH) / 2;
    const midY = (player.y + enemy.y + PLAYER_HEIGHT) / 2;
    const dist = Math.abs(player.x - enemy.x);

    const targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, 1 + (1 - (dist / (CANVAS_WIDTH * 0.7))) * 0.3));
    gameState.current.cameraZoom += (targetZoom - gameState.current.cameraZoom) * 0.1;
    const zoom = gameState.current.cameraZoom;

    let shakeX = 0; 
    let shakeY = 0;
    const baseShake = 0.5; 
    const activeShake = shake + baseShake; 
    
    shakeX = (Math.random() - 0.5) * activeShake;
    shakeY = (Math.random() - 0.5) * activeShake;

    ctx.save();
    ctx.translate(width/2, height/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-width/2, -height/2);
    
    const offsetX = (width/2 - midX) * 0.5;
    const offsetY = (height/2 - midY) * 0.2 + 50;
    
    ctx.translate(offsetX + shakeX, offsetY + shakeY);


    // --- Background ---
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(-100, -100, width + 200, height + 200); 
    
    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const horizon = height * 0.4;
    for (let i = -500; i < width + 500; i += 50) {
        ctx.moveTo(width/2 + (i - width/2) * 0.2, horizon);
        ctx.lineTo(i, height + 100);
    }
    for (let i = horizon; i < height + 100; i += 40) {
        ctx.moveTo(-100, i);
        ctx.lineTo(width + 100, i);
    }
    ctx.stroke();

    // Floor
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.moveTo(-1000, GROUND_Y);
    ctx.lineTo(width + 1000, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;


    // --- Entities Helper ---
    const drawFighter = (f: Fighter) => {
        if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
             f.scaleY *= 0.9;
             f.scaleX *= 1.1;
             f.color.glow = '#000';
        }

        f.trail.forEach(t => {
            ctx.save();
            ctx.translate(t.x + f.width / 2, t.y + f.height);
            ctx.scale(t.scaleX, t.scaleY);
            ctx.globalAlpha = t.alpha * 0.5;
            ctx.fillStyle = t.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = t.color;
            const bW = f.width; const bH = f.height;
            ctx.beginPath();
            ctx.roundRect(-bW/2, -bH, bW, bH, 8);
            ctx.fill();
            ctx.restore();
        });

        ctx.save();
        ctx.translate(f.x + f.width / 2, f.y + f.height);
        ctx.scale(f.scaleX, f.scaleY);
        
        if (f.hitFlashTimer > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#ffffff';
            
            if (gameState.current.chromaticAberration > 0) {
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-f.width/2 + 4, -f.height + 4, f.width, f.height);
                ctx.fillStyle = '#0000ff';
                ctx.fillRect(-f.width/2 - 4, -f.height - 4, f.width, f.height);
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#ffffff'; 
            }

        } else {
            ctx.fillStyle = f.color.primary;
            const flicker = Math.abs(Math.sin(frameCount * 0.2)) * 10 + 20;
            ctx.shadowBlur = flicker;
            ctx.shadowColor = f.color.glow;
        }

        const bodyW = f.width;
        const bodyH = f.height;

        ctx.beginPath();
        ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
        ctx.fill();

        if (f.hitFlashTimer <= 0) {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            const eyeOffset = f.facing === 1 ? bodyW/4 : -bodyW/4 - 10;
            ctx.fillRect(eyeOffset, -bodyH + 20, 15, 5);
        }

        if (f.isAttacking) {
            ctx.fillStyle = f.color.glow;
            ctx.shadowBlur = 40;
            ctx.beginPath();
            const swingX = f.facing === 1 ? bodyW/2 : -bodyW/2;
            
            if (f.comboCount === 0) {
                ctx.rect(swingX, -bodyH/2 - 10, f.facing * 60, 20);
            } else if (f.comboCount === 1) {
                ctx.moveTo(swingX, -bodyH);
                ctx.lineTo(swingX + f.facing * 80, -bodyH/2);
                ctx.lineTo(swingX, 0);
            } else {
                ctx.arc(swingX, -bodyH/2, 90, f.facing === 1 ? -1 : Math.PI - 1, f.facing === 1 ? 1 : Math.PI + 1, false);
            }
            ctx.fill();
        }
        
        ctx.restore();
    };

    drawFighter(enemy);
    drawFighter(player);

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

    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
    });

    ctx.restore(); // Restore Camera transform

    // --- OSCILLOSCOPE (Screen Space) ---
    if (audioRef.current && gameActive) {
        const bufferLength = audioRef.current.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        audioRef.current.getWaveform(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00ffaa';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffaa';
        ctx.globalAlpha = 0.5;

        ctx.beginPath();
        const sliceWidth = width * 1.0 / bufferLength;
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * (height/10) + (height - 50); // Bottom 50px

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
      gameState.current.shake *= 0.9;
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
      updateParticlesAndWaves();

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) draw(ctx);

      if (gameState.current.gameActive) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameActive, onGameOver]);

  // UI Loop (Ghost Health Logic)
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

         // Lerp Ghost Health
         if (player.ghostHealth > player.health) {
             player.ghostHealth -= 0.5; // slow drain
         } else {
             player.ghostHealth = player.health;
         }

         if (enemy.ghostHealth > enemy.health) {
             enemy.ghostHealth -= 0.5; 
         } else {
             enemy.ghostHealth = enemy.health;
         }

         // Update Widths
         if (hpPlayerRef.current) hpPlayerRef.current.style.width = `${Math.max(0, player.health)}%`;
         if (hpPlayerGhostRef.current) hpPlayerGhostRef.current.style.width = `${Math.max(0, player.ghostHealth)}%`;

         if (hpEnemyRef.current) hpEnemyRef.current.style.width = `${Math.max(0, enemy.health)}%`;
         if (hpEnemyGhostRef.current) hpEnemyGhostRef.current.style.width = `${Math.max(0, enemy.ghostHealth)}%`;

         // Shake UI if recently hit
         if (player.hitFlashTimer > 0 && hpContainerPlayerRef.current) {
             const offset = Math.random() * 5;
             hpContainerPlayerRef.current.style.transform = `translate(${offset}px, ${offset}px)`;
         } else if (hpContainerPlayerRef.current) {
             hpContainerPlayerRef.current.style.transform = `none`;
         }

         if (enemy.hitFlashTimer > 0 && hpContainerEnemyRef.current) {
             const offset = Math.random() * 5;
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
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
            <div className="w-1/3">
                <div className="flex justify-between text-cyan-400 font-bold mb-1 text-xl tracking-wider">
                    <span>PLAYER</span>
                </div>
                <div ref={hpContainerPlayerRef} className="h-6 w-full bg-gray-800 border-2 border-cyan-500 skew-x-[-15deg] overflow-hidden relative">
                    <div ref={hpPlayerGhostRef} className="absolute h-full bg-white transition-none" style={{ width: '100%', opacity: 0.5 }}></div>
                    <div ref={hpPlayerRef} className="absolute h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                </div>
            </div>
            <div className="text-white text-4xl font-black italic tracking-widest text-shadow-neon">VS</div>
            <div className="w-1/3">
                 <div className="flex justify-between text-rose-500 font-bold mb-1 text-xl tracking-wider flex-row-reverse">
                    <span>CPU</span>
                </div>
                <div ref={hpContainerEnemyRef} className="h-6 w-full bg-gray-800 border-2 border-rose-500 skew-x-[15deg] overflow-hidden relative">
                     <div ref={hpEnemyGhostRef} className="absolute right-0 h-full bg-white transition-none" style={{ width: '100%', opacity: 0.5 }}></div>
                     <div ref={hpEnemyRef} className="absolute right-0 h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] float-right transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                </div>
            </div>
        </div>
        <div className="absolute bottom-4 left-4 text-white/50 text-sm font-mono pointer-events-none">
            WASD/ZQSD: Move | SPACE: Dash | L-CLICK: 3-Hit Combo
        </div>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-auto max-w-7xl border-2 border-slate-800 shadow-2xl bg-black" />
    </div>
  );
};

export default GameCanvas;