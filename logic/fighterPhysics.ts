
import { 
  GROUND_Y, GRAVITY, FRICTION, AIR_RESISTANCE,
  ATTACK_DURATIONS, ATTACK_COOLDOWN, COMBO_WINDOW, WORLD_WIDTH,
  CLASS_STATS
} from '../constants';
import { Fighter, GameState } from '../types';
import { createParticles, createGrappleImpact } from './effectSpawners';
import { AudioManager } from '../core/AudioManager';

interface FighterInput {
    x: number;
    jump: boolean;
    dash: boolean;
    attack: boolean;
    special: boolean;
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
    
    if (justLanded) {
        createParticles(gameState, f.x + f.width/2, f.y + f.height, 8, '#ffffff', 3);
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

    // --- SLINGER SPECIAL: GRAPPLE HOOK ---
    if (f.classType === 'SLINGER') {
        if (input.special && !f.isGrappling) {
            // Initiate Grapple
            const range = 400;
            const angle = -Math.PI / 4; // 45 degrees up
            
            // Calculate theoretical anchor point
            let targetX = f.x + f.width/2 + (f.facing * range * Math.cos(angle));
            let targetY = f.y + (range * Math.sin(angle));

            // Clamp to world bounds (Walls or Ceiling)
            if (targetX < 0) targetX = 0;
            if (targetX > WORLD_WIDTH) targetX = WORLD_WIDTH;
            if (targetY < 50) targetY = 50; // Ceiling anchor
            
            f.isGrappling = true;
            f.grapplePoint = { x: targetX, y: targetY };
            
            // Elastic Snap Visual
            f.scaleX = 1.5; // Stretch towards point
            f.scaleY = 0.6;
            
            createGrappleImpact(gameState, targetX, targetY, f.color.glow);
            // Optional: audio?.playGrapple();

        } else if (input.special && f.isGrappling && f.grapplePoint) {
            // Sustain Grapple (Spring Physics)
            const dx = f.grapplePoint.x - (f.x + f.width/2);
            const dy = f.grapplePoint.y - f.y;
            // const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Spring Force (Hooke's Law approx)
            const tension = 0.08;
            f.vx += dx * tension * timeScale;
            f.vy += dy * tension * timeScale;
            
            // Air drag while grappling to prevent infinite orbit
            f.vx *= 0.96;
            f.vy *= 0.96;
            
            f.isGrounded = false; // Lift off
            
        } else if (!input.special && f.isGrappling) {
            // Release
            f.isGrappling = false;
            f.grapplePoint = null;
            // Slingshot boost
            f.vx *= 1.1;
            f.vy *= 1.1;
        }
    } else {
        // Reset if class changed for some reason
        f.isGrappling = false;
    }

    // --- Trails ---
    const isHighSpeed = Math.abs(f.vx) > 5 || f.isDashing || f.isAttacking || f.isGrappling;
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

    // Dash
    if (input.dash && f.dashCooldown <= 0) {
      if (f.isAttacking) {
          isCanceling = true;
          f.isAttacking = false;
      }
      // Break grapple on dash
      if (f.isGrappling) {
          f.isGrappling = false;
          f.grapplePoint = null;
      }

      f.isDashing = true;
      f.dashTimer = stats.dashDuration;
      f.dashCooldown = stats.dashCooldown;
      audio?.playDash();
      
      const dashDir = input.x !== 0 ? Math.sign(input.x) : f.facing;
      f.facing = dashDir as 1 | -1;
      
      f.scaleX = 1.7; 
      f.scaleY = 0.4; 
      gameState.shake += 2;
    }

    // Jump
    if (input.jump && (f.isGrounded || (f.classType === 'SLINGER' && f.isGrappling))) {
       // Slinger can jump out of grapple
       if (f.isGrappling) {
           f.isGrappling = false;
           f.grapplePoint = null;
           f.vy = stats.jumpForce * 1.2; // Super jump off hook
       } else {
           f.vy = stats.jumpForce;
       }

       if (f.isAttacking) {
           isCanceling = true;
           f.isAttacking = false;
       }
       
       f.isGrounded = false;
       f.scaleX = 0.6;
       f.scaleY = 1.5;
       createParticles(gameState, f.x + f.width/2, f.y + f.height, 5, '#fff', 3);
       audio?.playJump();
    }

    // Attack
    const freshAttack = input.attack && !prevAttackInput[f.id];
    
    if (freshAttack && !f.isDashing) {
        // Break grapple on attack
        if (f.isGrappling) {
             f.isGrappling = false;
             f.grapplePoint = null;
        }

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
    
    // Physics Update
    if (f.isDashing) {
      f.dashTimer -= timeScale;
      f.vx = f.facing * stats.dashSpeed;
      f.vy = 0; 

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
        // Normal Movement (Modified if grappling)
        if (!f.isGrappling) {
            const accel = f.isGrounded ? stats.speed : stats.speed * 0.8;
            f.vx += input.x * accel * timeScale; 

            if (Math.abs(f.vx) > stats.maxSpeed) f.vx = Math.sign(f.vx) * stats.maxSpeed;

            if (input.x === 0) {
            f.vx *= (f.isGrounded ? FRICTION : AIR_RESISTANCE);
            }
        }
    }

    // Apply Gravity (Scaled by class, and disabled during dash)
    if (!f.isDashing) {
        // While grappling, gravity is reduced to allow swinging
        const gMult = f.isGrappling ? 0.3 : stats.gravityScale;
        f.vy += GRAVITY * gMult * timeScale;
    }

    f.x += f.vx * timeScale;
    f.y += f.vy * timeScale;

    // Collision with ground/walls
    if (f.y + f.height >= GROUND_Y) {
      f.y = GROUND_Y - f.height;
      f.vy = 0;
      f.isGrounded = true;
      if (f.isGrappling) {
          f.isGrappling = false;
          f.grapplePoint = null;
      }
    } else {
        f.isGrounded = false;
    }

    // --- Wall Physics ---
    if (f.x < 0) { 
        if (f.vx < -5) {
            createParticles(gameState, 0, f.y + f.height/2, 5, '#ffffff', 5);
            f.scaleX = 0.8; 
        }
        f.x = 0; 
        f.vx = 0; 
    }
    if (f.x + f.width > WORLD_WIDTH) { 
        if (f.vx > 5) {
            createParticles(gameState, WORLD_WIDTH, f.y + f.height/2, 5, '#ffffff', 5);
            f.scaleX = 0.8; 
        }
        f.x = WORLD_WIDTH - f.width; 
        f.vx = 0; 
    }

    if (input.x !== 0 && !f.isDashing && !f.isAttacking && !f.isGrappling) {
      f.facing = Math.sign(input.x) as 1 | -1;
    }

    // Animation Spring
    f.scaleX += (1 - f.scaleX) * 0.15 * timeScale;
    f.scaleY += (1 - f.scaleY) * 0.15 * timeScale;

    // Lean
    if (Math.abs(f.vx) < 1.0) {
        f.rotation *= 0.7; 
    } else {
        const leanAmount = f.isGrappling ? 0.5 : 0.25; // Lean more when grappling
        const targetRot = (f.vx / stats.maxSpeed) * leanAmount; 
        f.rotation += (targetRot - f.rotation) * 0.2 * timeScale;
    }
    
    if (Math.abs(f.vx) > 1 && f.isGrounded) {
        f.scaleY = 1 + Math.sin(gameState.frameCount * 0.5) * 0.05;
        f.scaleX = 1 - Math.sin(gameState.frameCount * 0.5) * 0.05;
    }

    prevAttackInput[f.id] = input.attack;
};
