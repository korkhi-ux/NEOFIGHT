
import { 
  GROUND_Y, GRAVITY, FRICTION, AIR_RESISTANCE,
  ATTACK_DURATIONS, ATTACK_COOLDOWN, COMBO_WINDOW, WORLD_WIDTH,
  CLASS_STATS
} from '../constants';
import { Fighter, GameState } from '../types';
import { createParticles } from './effectSpawners';
import { AudioManager } from '../core/AudioManager';

interface FighterInput {
    x: number;
    jump: boolean;
    dash: boolean;
    attack: boolean;
}

export const updateFighter = (
    f: Fighter, 
    input: FighterInput, 
    gameState: GameState,
    prevAttackInput: { [key: string]: boolean },
    audio?: AudioManager
) => {
    if (f.isDead) return;

    const timeScale = gameState.slowMoFactor;
    
    // Retrieve Class Stats
    const stats = CLASS_STATS[f.classType];

    // Save previous state
    const justChangedDir = (Math.sign(f.prevVx) !== Math.sign(f.vx)) && Math.abs(f.vx) > 1;
    const justLanded = !f.prevGrounded && f.isGrounded;

    f.prevVx = f.vx;
    f.prevGrounded = f.isGrounded;

    // --- Effects: Friction & Landing ---
    if (f.isGrounded && justChangedDir) {
        createParticles(gameState, f.x + f.width/2, f.y + f.height, 5, f.color.glow, 4);
    }
    
    // Directive 4: Accentuate Jiggle on Landing
    if (justLanded) {
        createParticles(gameState, f.x + f.width/2, f.y + f.height, 8, '#ffffff', 3);
        // More extreme squash (was 1.4/0.6)
        f.scaleX = 1.5; 
        f.scaleY = 0.5; 
    }

    // --- Timers ---
    if (f.dashCooldown > 0) f.dashCooldown -= timeScale;
    if (f.attackCooldown > 0) f.attackCooldown -= timeScale;
    if (f.comboTimer > 0) f.comboTimer -= timeScale;
    if (f.hitFlashTimer > 0) f.hitFlashTimer -= timeScale;

    if (f.comboTimer <= 0 && !f.isAttacking) {
        f.comboCount = 0;
    }

    // --- Trails ---
    const isHighSpeed = Math.abs(f.vx) > 5 || f.isDashing || f.isAttacking;
    if (isHighSpeed && gameState.frameCount % (Math.ceil(2/timeScale)) === 0) {
        f.trail.push({
            x: f.x,
            y: f.y,
            scaleX: f.scaleX,
            scaleY: f.scaleY,
            rotation: f.rotation,
            facing: f.facing,
            alpha: 0.3, 
            color: f.color.glow
        });
    }
    for (let i = f.trail.length - 1; i >= 0; i--) {
        f.trail[i].alpha -= 0.1 * timeScale;
        if (f.trail[i].alpha <= 0) f.trail.splice(i, 1);
    }

    // --- Action Logic ---
    let isCanceling = false;

    // Dash Logic (Class Switched)
    if (input.dash && f.dashCooldown <= 0) {
      // Future logic: Different dash start behaviors could go here
      if (f.isAttacking) {
          isCanceling = true;
          f.isAttacking = false;
      }
      f.isDashing = true;
      f.dashTimer = stats.dashDuration;
      f.dashCooldown = stats.dashCooldown;
      audio?.playDash();
      
      const dashDir = input.x !== 0 ? Math.sign(input.x) : f.facing;
      f.facing = dashDir as 1 | -1;
      
      // Extreme Stretch for Dash
      f.scaleX = 1.7; 
      f.scaleY = 0.4; 
      gameState.shake += 2;
    }

    // Jump Logic (Class Switched)
    if (input.jump && f.isGrounded) {
       switch(f.classType) {
           case 'VORTEX':
               // Placeholder: Vortex might have a floatier jump start?
               f.vy = stats.jumpForce;
               break;
           case 'HEAVY':
               // Placeholder: Heavy might shake ground on jump?
               f.vy = stats.jumpForce;
               break;
           case 'STANDARD':
           case 'SLINGER':
           default:
               f.vy = stats.jumpForce;
               break;
       }

       if (f.isAttacking) {
           isCanceling = true;
           f.isAttacking = false;
       }
       
       f.isGrounded = false;
       // Stretch Up
       f.scaleX = 0.6;
       f.scaleY = 1.5;
       createParticles(gameState, f.x + f.width/2, f.y + f.height, 5, '#fff', 3);
       audio?.playJump();
    }

    // Attack
    const freshAttack = input.attack && !prevAttackInput[f.id];
    
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
            
            f.scaleX = 1.3;
            f.scaleY = 0.8;
            
            if (f.comboCount === 2) {
                f.vx = f.facing * 40; 
                f.scaleX = 1.8; 
                f.scaleY = 0.5;
                gameState.shake += 4;
            } else {
                f.vx = f.facing * 10; 
            }
        }
    }
    
    // Physics
    if (f.isDashing) {
      f.dashTimer -= timeScale;
      
      // Class Specific Dash Execution
      switch (f.classType) {
          case 'VORTEX':
              // Example: Teleport dash? (Not implemented yet)
              f.vx = f.facing * stats.dashSpeed;
              f.vy = 0;
              break;
          default:
              f.vx = f.facing * stats.dashSpeed;
              f.vy = 0; 
              break;
      }

      if (f.dashTimer <= 0) {
        f.isDashing = false;
        f.vx *= 0.5;
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
        // Normal Movement
        const accel = f.isGrounded ? stats.speed : stats.speed * 0.8;
        f.vx += input.x * accel * timeScale; 

        if (Math.abs(f.vx) > stats.maxSpeed) f.vx = Math.sign(f.vx) * stats.maxSpeed;

        if (input.x === 0) {
           f.vx *= (f.isGrounded ? FRICTION : AIR_RESISTANCE);
        }
    }

    if (!f.isDashing) f.vy += GRAVITY * timeScale;

    f.x += f.vx * timeScale;
    f.y += f.vy * timeScale;

    // Collision with ground/walls
    if (f.y + f.height >= GROUND_Y) {
      f.y = GROUND_Y - f.height;
      f.vy = 0;
      f.isGrounded = true;
    } else {
        f.isGrounded = false;
    }

    // --- Wall Physics with Particle Effect ---
    if (f.x < 0) { 
        if (f.vx < -5) {
            createParticles(gameState, 0, f.y + f.height/2, 5, '#ffffff', 5);
            f.scaleX = 0.8; // Squash against wall
        }
        f.x = 0; 
        f.vx = 0; 
    }
    if (f.x + f.width > WORLD_WIDTH) { 
        if (f.vx > 5) {
            createParticles(gameState, WORLD_WIDTH, f.y + f.height/2, 5, '#ffffff', 5);
            f.scaleX = 0.8; // Squash against wall
        }
        f.x = WORLD_WIDTH - f.width; 
        f.vx = 0; 
    }

    if (input.x !== 0 && !f.isDashing && !f.isAttacking) {
      f.facing = Math.sign(input.x) as 1 | -1;
    }

    // Animation Spring (Jiggle Dynamics)
    f.scaleX += (1 - f.scaleX) * 0.15 * timeScale;
    f.scaleY += (1 - f.scaleY) * 0.15 * timeScale;

    // Lean / Rotation Logic
    if (Math.abs(f.vx) < 1.0) {
        f.rotation *= 0.7; 
    } else {
        const targetRot = (f.vx / stats.maxSpeed) * 0.25; 
        f.rotation += (targetRot - f.rotation) * 0.2 * timeScale;
    }
    
    // Run Bounce
    if (Math.abs(f.vx) > 1 && f.isGrounded) {
        f.scaleY = 1 + Math.sin(gameState.frameCount * 0.5) * 0.05;
        f.scaleX = 1 - Math.sin(gameState.frameCount * 0.5) * 0.05;
    }

    // Update Input Ref check
    prevAttackInput[f.id] = input.attack;
};
