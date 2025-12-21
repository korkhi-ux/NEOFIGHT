import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, GRAVITY, FRICTION, 
  PLAYER_SPEED, JUMP_FORCE, MAX_SPEED, DASH_SPEED, DASH_DURATION, 
  DASH_COOLDOWN, ATTACK_DURATION, ATTACK_COOLDOWN, ATTACK_RANGE, 
  ATTACK_DAMAGE, KNOCKBACK_FORCE, HIT_STOP_DURATION, HIT_STUN_DURATION,
  PLAYER_WIDTH, PLAYER_HEIGHT, COLORS, AIR_RESISTANCE 
} from '../constants';
import { Fighter, GameState, Particle } from '../types';

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
  facing: id === 'player' ? 1 : -1,
  isGrounded: false,
  isDashing: false,
  isAttacking: false,
  isStunned: false,
  isDead: false,
  dashTimer: 0,
  dashCooldown: 0,
  attackTimer: 0,
  attackCooldown: 0,
  stunTimer: 0,
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
  
  // Inputs
  const keys = useRef<{ [key: string]: boolean }>({});
  
  // Game State Ref (Mutable for performance loop)
  const gameState = useRef<GameState>({
    player: createFighter('player', 200, COLORS.player),
    enemy: createFighter('enemy', CANVAS_WIDTH - 250, COLORS.enemy),
    particles: [],
    hitStop: 0,
    shake: 0,
    winner: null,
    gameActive: false
  });

  // Re-initialize game state when gameActive toggles to true
  useEffect(() => {
    if (gameActive) {
      gameState.current = {
        player: createFighter('player', 200, COLORS.player),
        enemy: createFighter('enemy', CANVAS_WIDTH - 250, COLORS.enemy),
        particles: [],
        hitStop: 0,
        shake: 0,
        winner: null,
        gameActive: true
      };
    }
  }, [gameActive]);

  // Input Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Map ZQSD/WASD to physical codes
      // Z/W = KeyW, Q/A = KeyA, S = KeyS, D = KeyD
      keys.current[e.code] = true; 
      
      if (e.code === 'Space') {
        // Trigger Dash intent immediately if not handled in loop
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) keys.current['MouseLeft'] = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) keys.current['MouseLeft'] = false;
    };

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

    // Hit Stun Logic
    if (f.stunTimer > 0) {
      f.stunTimer--;
      f.isStunned = true;
      // Friction applies during stun
      if (f.isGrounded) f.vx *= FRICTION;
      else f.vx *= AIR_RESISTANCE;
      
      // Gravity always applies
      f.vy += GRAVITY;
      f.y += f.vy;
      
      // Ground collision
      if (f.y + f.height >= GROUND_Y) {
        f.y = GROUND_Y - f.height;
        f.vy = 0;
        f.isGrounded = true;
      }
      return; // Skip other inputs
    } else {
      f.isStunned = false;
    }

    // Cooldowns
    if (f.dashCooldown > 0) f.dashCooldown--;
    if (f.attackCooldown > 0) f.attackCooldown--;

    // Dash Logic
    if (f.isDashing) {
      f.dashTimer--;
      if (f.dashTimer <= 0) {
        f.isDashing = false;
        f.vx *= 0.5; // Slow down after dash
      } else {
        // While dashing, ignore gravity, fixed high velocity
        f.vx = f.facing * DASH_SPEED;
        f.vy = 0;
        
        // Dash trail particles
        if (Math.random() > 0.5) {
             gameState.current.particles.push({
                id: Math.random().toString(),
                x: f.x + f.width/2,
                y: f.y + f.height/2,
                vx: -f.facing * Math.random() * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 10,
                maxLife: 10,
                color: f.color.glow,
                size: Math.random() * 10 + 5
             });
        }
      }
      // Update position
      f.x += f.vx;
      
      // Bounds check
      if (f.x < 0) f.x = 0;
      if (f.x + f.width > CANVAS_WIDTH) f.x = CANVAS_WIDTH - f.width;
      
      return; // Skip normal movement
    }

    // Attack Logic
    if (f.isAttacking) {
        f.attackTimer--;
        if (f.attackTimer <= 0) {
            f.isAttacking = false;
        }
    } else if (input.attack && f.attackCooldown <= 0) {
        f.isAttacking = true;
        f.attackTimer = ATTACK_DURATION;
        f.attackCooldown = ATTACK_COOLDOWN;
        f.vx = 0; // Stop momentarily to attack (nervous feel)
        
        // Attack Lunge (optional)
        f.vx = f.facing * 5; 
        
        // Squash/Stretch Attack
        f.scaleX = 1.3;
        f.scaleY = 0.8;
    }

    // Initiate Dash
    if (input.dash && f.dashCooldown <= 0 && !f.isAttacking) {
      f.isDashing = true;
      f.dashTimer = DASH_DURATION;
      f.dashCooldown = DASH_COOLDOWN;
      
      // Determine dash direction based on input or facing
      const dashDir = input.x !== 0 ? Math.sign(input.x) : f.facing;
      f.facing = dashDir as 1 | -1;
      
      f.scaleX = 1.4;
      f.scaleY = 0.6;
      
      // Screen Shake small
      gameState.current.shake = 5;
    }

    // Movement Physics
    if (!f.isAttacking) {
        f.vx += input.x * PLAYER_SPEED;
        // Cap Speed
        if (Math.abs(f.vx) > MAX_SPEED) f.vx = Math.sign(f.vx) * MAX_SPEED;
    }

    // Friction
    if (input.x === 0 || f.isAttacking) {
      if (f.isGrounded) f.vx *= FRICTION;
      else f.vx *= AIR_RESISTANCE;
    }

    // Gravity
    f.vy += GRAVITY;

    // Jump
    if (input.jump && f.isGrounded && !f.isAttacking) {
      f.vy = JUMP_FORCE;
      f.isGrounded = false;
      f.scaleX = 0.7;
      f.scaleY = 1.4; // Stretch
      
      // Jump particles
      for(let i=0; i<5; i++) {
        gameState.current.particles.push({
            id: Math.random().toString(),
            x: f.x + f.width/2,
            y: f.y + f.height,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * -2,
            life: 20,
            maxLife: 20,
            color: '#ffffff',
            size: 4
        });
      }
    }

    // Apply Velocity
    f.x += f.vx;
    f.y += f.vy;

    // Ground Collision
    if (f.y + f.height >= GROUND_Y) {
      if (!f.isGrounded) {
        // Just landed
        f.scaleX = 1.3;
        f.scaleY = 0.7; // Squash
      }
      f.y = GROUND_Y - f.height;
      f.vy = 0;
      f.isGrounded = true;
    } else {
        f.isGrounded = false;
    }

    // Wall Collision
    if (f.x < 0) { f.x = 0; f.vx = 0; }
    if (f.x + f.width > CANVAS_WIDTH) { f.x = CANVAS_WIDTH - f.width; f.vx = 0; }

    // Facing Direction logic
    if (input.x !== 0 && !f.isDashing && !f.isAttacking) {
      f.facing = Math.sign(input.x) as 1 | -1;
    }
    
    // Procedural Animation (Squash/Stretch recovery)
    f.scaleX += (1 - f.scaleX) * 0.1;
    f.scaleY += (1 - f.scaleY) * 0.1;
  };

  const checkCollisions = () => {
    const { player, enemy } = gameState.current;

    // Simple AABB Hitbox for Attack
    const checkHit = (attacker: Fighter, defender: Fighter) => {
      if (attacker.isAttacking && attacker.attackTimer > 0 && attacker.attackTimer < ATTACK_DURATION - 2) {
        // Define hitbox in front of attacker
        const reach = ATTACK_RANGE;
        const hitboxX = attacker.facing === 1 ? attacker.x + attacker.width : attacker.x - reach;
        const hitboxW = reach;
        const hitboxY = attacker.y + 20;
        const hitboxH = attacker.height - 40;

        // Check intersection with defender body
        if (
          hitboxX < defender.x + defender.width &&
          hitboxX + hitboxW > defender.x &&
          hitboxY < defender.y + defender.height &&
          hitboxY + hitboxH > defender.y
        ) {
          // HIT!
          // Only register hit if not already processed for this specific attack instance? 
          // For simplicity, we use the timer to limit it, but ideally we need an ID. 
          // We'll just check if defender is NOT stunned (to prevent multi-hit in one swing for now)
          // Or strictly check a frame window. Let's check frame window.
          if (attacker.attackTimer === Math.floor(ATTACK_DURATION / 2)) {
             handleHit(attacker, defender);
          }
        }
      }
    };

    checkHit(player, enemy);
    checkHit(enemy, player);
  };

  const handleHit = (attacker: Fighter, defender: Fighter) => {
    if (defender.isDashing) return; // Invulnerability while dashing (optional)

    gameState.current.hitStop = HIT_STOP_DURATION;
    gameState.current.shake = 15;

    defender.health -= ATTACK_DAMAGE;
    defender.isStunned = true;
    defender.stunTimer = HIT_STUN_DURATION;
    defender.vx = attacker.facing * KNOCKBACK_FORCE;
    defender.vy = -5; // Small hop on hit
    defender.scaleX = 0.8;
    defender.scaleY = 1.2;

    // Visuals
    // Blood/Sparks
    for (let i = 0; i < 15; i++) {
        gameState.current.particles.push({
            id: Math.random().toString(),
            x: defender.x + defender.width/2,
            y: defender.y + defender.height/2,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 30,
            maxLife: 30,
            color: attacker.color.glow,
            size: Math.random() * 8 + 2
        });
    }

    if (defender.health <= 0 && !defender.isDead) {
        defender.isDead = true;
        defender.health = 0;
        attacker.score += 1;
        gameState.current.winner = attacker.id;
        setTimeout(() => onGameOver(attacker.id), 1000); // Delay game over screen
    }
  };

  const updateAI = (enemy: Fighter, player: Fighter): { x: number, jump: boolean, dash: boolean, attack: boolean } => {
    // Basic AI
    if (enemy.isDead || enemy.isStunned) return { x: 0, jump: false, dash: false, attack: false };

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.abs(dx);
    const facingPlayer = Math.sign(dx) === enemy.facing;

    let inputX = 0;
    let jump = false;
    let dash = false;
    let attack = false;

    // Aggression Logic
    if (dist < ATTACK_RANGE && facingPlayer) {
      // Chance to attack
      if (Math.random() < 0.1) attack = true;
    } else {
      // Move towards player
      inputX = Math.sign(dx);
    }

    // Jump if player is above
    if (dy < -100 && Math.random() < 0.05) jump = true;

    // Dash randomly for nervousness
    if (Math.random() < 0.01 && dist > 200) dash = true;

    // Dash away if player is attacking (Dodge)
    if (player.isAttacking && dist < 150 && Math.random() < 0.2) {
        dash = true;
        inputX = -Math.sign(dx); // Dash away
    }

    return { x: inputX, jump, dash, attack };
  };

  const updateParticles = () => {
    const { particles } = gameState.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vx *= 0.9;
      p.vy *= 0.9;
      if (p.life <= 0) particles.splice(i, 1);
    }
  };

  // --- RENDER ---

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { player, enemy, particles, shake } = gameState.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Clear with shake
    ctx.save();
    
    // Apply Shake
    let shakeX = 0;
    let shakeY = 0;
    if (shake > 0) {
        shakeX = (Math.random() - 0.5) * shake;
        shakeY = (Math.random() - 0.5) * shake;
        gameState.current.shake *= 0.9; // Decay shake
        if (gameState.current.shake < 1) gameState.current.shake = 0;
    }
    ctx.translate(shakeX, shakeY);

    // Background (Cyber Grid)
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(-shakeX, -shakeY, width, height); // Fill slightly larger to cover shake
    
    // Draw Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Perspective Grid effect
    const horizon = height * 0.4;
    for (let i = 0; i < width; i += 50) {
        // Vertical lines fanning out
        ctx.moveTo(width/2 + (i - width/2) * 0.2, horizon);
        ctx.lineTo(i, height);
    }
    // Horizontal lines
    for (let i = horizon; i < height; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
    }
    ctx.stroke();

    // Draw Sun (Retro feel)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2a2a40');
    gradient.addColorStop(1, COLORS.background);
    
    // Draw Floor Line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(width, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Helper to draw fighter
    const drawFighter = (f: Fighter) => {
        if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
             // Death shrink effect
             f.scaleY *= 0.9;
             f.scaleX *= 1.1;
             f.color.glow = '#000';
        }

        ctx.save();
        
        // Pivot at bottom center for squash/stretch
        ctx.translate(f.x + f.width / 2, f.y + f.height);
        ctx.scale(f.scaleX, f.scaleY);
        
        // Glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = f.color.glow;
        ctx.fillStyle = f.color.primary;

        // Determine Body Shape
        const bodyW = f.width;
        const bodyH = f.height;

        // Draw Main Body (Rounded Rect)
        ctx.beginPath();
        // Adjust for translate
        ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
        ctx.fill();

        // Eyes / Visor
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        const eyeX = f.facing === 1 ? 5 : -bodyW + 15; // Offset based on facing
        // Actually, since we are centered at -bodyW/2
        // Facing Right (1): Eye should be on right side.
        // Facing Left (-1): Eye should be on left side.
        const eyeOffset = f.facing === 1 ? bodyW/4 : -bodyW/4 - 10;
        
        ctx.fillRect(eyeOffset, -bodyH + 20, 15, 5);

        // Weapon / Attack Visual
        if (f.isAttacking) {
            ctx.fillStyle = f.color.glow;
            ctx.shadowBlur = 40;
            // Draw a "Blade" swing
            ctx.beginPath();
            const swingX = f.facing === 1 ? bodyW/2 : -bodyW/2;
            ctx.arc(swingX, -bodyH/2, 60, f.facing === 1 ? -0.5 : Math.PI - 0.5, f.facing === 1 ? 1.5 : Math.PI + 1.5, false);
            // Arc only stroke? Or Fill?
            // Let's make it a sword slash shape
            ctx.lineTo(swingX + f.facing * 80, -bodyH/2);
            ctx.fill();
        }

        // Stun stars
        if (f.isStunned) {
            ctx.fillStyle = '#ff0';
            ctx.font = '20px monospace';
            ctx.fillText('⚡', -10, -bodyH - 20);
        }
        
        ctx.restore();
    };

    // Draw Entities
    drawFighter(enemy);
    drawFighter(player);

    // Draw Particles
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

    ctx.restore(); // Restore shake
  };

  // --- GAME LOOP ---

  useEffect(() => {
    if (!gameActive) return;
    
    let animationFrameId: number;

    const loop = () => {
      const { player, enemy, hitStop } = gameState.current;

      // HitStop Logic (Freeze frame)
      if (hitStop > 0) {
        gameState.current.hitStop--;
        gameState.current.shake = 5; // Sustain shake during hitstop
        draw(canvasRef.current!.getContext('2d')!);
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      // Input Gathering
      // ZQSD / WASD Logic:
      // Z/Up: KeyW
      // Q/Left: KeyA
      // S/Down: KeyS
      // D/Right: KeyD
      const playerInput = {
        x: (keys.current['KeyD'] ? 1 : 0) - (keys.current['KeyA'] ? 1 : 0),
        jump: keys.current['KeyW'] || keys.current['KeyZ'] || keys.current['Space'], // Allow Z too for french layout specifically if using KeyZ
        dash: keys.current['Space'], // Dash is also mapped to space in prompt
        attack: keys.current['MouseLeft']
      };

      // Player update
      updateFighter(player, playerInput, enemy);

      // AI update
      const aiInput = updateAI(enemy, player);
      updateFighter(enemy, aiInput, player);

      // Collisions
      checkCollisions();

      // Particles
      updateParticles();

      // Draw
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) draw(ctx);

      if (gameState.current.gameActive) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameActive, onGameOver]);

  // UI Overlay rendering helper (Updates efficiently via React State separate from canvas loop if needed, 
  // but simpler to force re-render of a HUD component using a ref callback or just use a useFrame loop hook.
  // We will use a separate `raf` in a HUD component or just simple polling? 
  // Actually, let's just use a fast `useState` for HP bars or render HP bars in Canvas?
  // Rendering in Canvas is smoother for 60fps. Rendering in DOM is easier for styling.
  // Let's use a `useRef` based update for DOM elements if possible, or just render HP in Canvas.
  // PROMPT REQUEST: "Style arcade/rétro". DOM UI is easier to style with Tailwind.
  // I will use a callback `onUpdate` to pass state to parent for UI? No, that causes re-renders.
  // I will Render the UI inside this component but using a `requestAnimationFrame` that updates refs bound to DOM elements manually?
  // React State update at 60fps is bad.
  // Solution: I'll expose the state via a method or just draw UI on canvas.
  // Let's draw UI on HTML overlays and update them via direct DOM manipulation for performance.

  const hpPlayerRef = useRef<HTMLDivElement>(null);
  const hpEnemyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     if (!gameActive) return;
     const uiLoop = () => {
         if (hpPlayerRef.current) hpPlayerRef.current.style.width = `${gameState.current.player.health}%`;
         if (hpEnemyRef.current) hpEnemyRef.current.style.width = `${gameState.current.enemy.health}%`;
         requestAnimationFrame(uiLoop);
     };
     const id = requestAnimationFrame(uiLoop);
     return () => cancelAnimationFrame(id);
  }, [gameActive]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
            {/* Player HP */}
            <div className="w-1/3">
                <div className="flex justify-between text-cyan-400 font-bold mb-1 text-xl tracking-wider">
                    <span>PLAYER</span>
                </div>
                <div className="h-6 w-full bg-gray-800 border-2 border-cyan-500 skew-x-[-15deg] overflow-hidden relative">
                    <div ref={hpPlayerRef} className="h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                </div>
            </div>

            {/* Timer / Logo */}
            <div className="text-white text-4xl font-black italic tracking-widest text-shadow-neon">
                VS
            </div>

            {/* Enemy HP */}
            <div className="w-1/3">
                 <div className="flex justify-between text-rose-500 font-bold mb-1 text-xl tracking-wider flex-row-reverse">
                    <span>CPU</span>
                </div>
                <div className="h-6 w-full bg-gray-800 border-2 border-rose-500 skew-x-[15deg] overflow-hidden relative">
                     <div ref={hpEnemyRef} className="h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] float-right transition-all duration-75 ease-out" style={{ width: '100%' }}></div>
                </div>
            </div>
        </div>

        {/* Controls Hint */}
        <div className="absolute bottom-4 left-4 text-white/50 text-sm font-mono pointer-events-none">
            WASD/ZQSD: Move | SPACE: Dash | L-CLICK: Attack
        </div>

        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-auto max-w-7xl border-2 border-slate-800 shadow-2xl bg-black"
        />
    </div>
  );
};

export default GameCanvas;