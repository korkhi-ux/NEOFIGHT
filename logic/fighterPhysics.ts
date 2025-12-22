
import { 
  GROUND_Y, GRAVITY, FRICTION, AIR_RESISTANCE,
  WORLD_WIDTH, GRAPPLE_COOLDOWN
} from '../config/physics';
import { ATTACK_DURATIONS, ATTACK_COOLDOWN, COMBO_WINDOW, CLASS_STATS } from '../config/balance';
import { Fighter, GameState } from '../types';
import { createParticles, createShockwave } from './effectSpawners';
import { AudioManager } from '../core/AudioManager';

// Import Class Logic
import { updateVolt } from './fighters/voltLogic';
import { updateKinetic } from './fighters/kineticLogic';
import { updateSlinger } from './fighters/slingerLogic';
import { updateVortex } from './fighters/vortexLogic';

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
    const opponent = f.id === 'player' ? gameState.enemy : gameState.player;

    // Detect Fresh Inputs
    const freshAttack = input.attack && !prevAttackInput[f.id];
    const freshSpecial = input.special && !prevAttackInput[f.id + '_special'];

    // Save previous state
    const justChangedDir = (Math.sign(f.prevVx) !== Math.sign(f.vx)) && Math.abs(f.vx) > 1;
    const justLanded = !f.prevGrounded && f.isGrounded;

    f.prevVx = f.vx;
    f.prevGrounded = f.isGrounded;

    // --- DELEGATE CLASS SPECIFIC LOGIC ---
    switch(f.classType) {
        case 'VOLT':
            updateVolt(f, gameState, freshSpecial, opponent, audio);
            break;
        case 'KINETIC':
            updateKinetic(f, gameState, freshSpecial, opponent, audio);
            break;
        case 'SLINGER':
            updateSlinger(f, gameState, freshSpecial, opponent);
            break;
        case 'VORTEX':
            updateVortex(f, gameState, freshSpecial, audio);
            break;
    }
    
    // --- Trails ---
    const isHighSpeed = Math.abs(f.vx) > 5 || f.isDashing || f.isAttacking || f.isGrappling || f.isDiving;
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
    
    if (input.dash && f.dashCooldown <= 0 && !f.isDiving) {
      if (f.isGrappling) {
          f.isGrappling = false;
          f.grapplePoint = null;
          f.grappleTargetId = null;
          f.grappleCooldownTimer = GRAPPLE_COOLDOWN;
      }
      f.isAttacking = false;
      f.isDashing = true;
      f.dashTimer = stats.dashDuration;
      f.dashCooldown = stats.dashCooldown;
      
      const dashDir = input.x !== 0 ? Math.sign(input.x) : f.facing;
      f.facing = dashDir as 1 | -1;

      if (f.classType === 'KINETIC') {
          gameState.shake += 5; 
          audio?.playDash();
      }

      if (f.classType === 'VORTEX') {
          f.scaleX = 0.1; f.scaleY = 0.1;
          audio?.playGlitch();
          f.vx = 0; f.vy = 0;
      } else {
          if (f.classType !== 'KINETIC') audio?.playDash();
          f.scaleX = 1.7; f.scaleY = 0.4; 
      }
    }

    if (input.jump && (f.isGrounded || (f.classType === 'SLINGER' && f.isGrappling)) && !f.isDiving) {
       if (f.isGrappling) {
           f.isGrappling = false;
           f.grapplePoint = null;
           f.grappleTargetId = null;
           f.grappleCooldownTimer = GRAPPLE_COOLDOWN;
           f.vy = stats.jumpForce * 1.2; 
           f.vx *= 1.1; 
       } else {
           f.vy = stats.jumpForce;
       }
       f.isAttacking = false;
       f.isGrounded = false;
       f.scaleX = 0.6;
       f.scaleY = 1.5;
       createParticles(gameState, f.x + f.width/2, f.y + f.height, 5, '#fff', 3);
       audio?.playJump();
    }

    if (freshAttack && !f.isDashing && !f.isDiving) {
        if (f.isGrappling) {
             f.isGrappling = false;
             f.grapplePoint = null;
             f.grappleTargetId = null;
             f.grappleCooldownTimer = GRAPPLE_COOLDOWN;
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
    
    if (f.isDashing) {
      f.dashTimer -= timeScale;
      
      if (f.classType === 'VORTEX') {
          f.vx = 0; f.vy = 0;
          const teleportFrame = stats.dashDuration - 5;
          if (f.dashTimer <= teleportFrame && f.dashTimer > teleportFrame - timeScale) {
               f.x += f.facing * 350;
               if (f.x < 0) f.x = 0;
               if (f.x + f.width > WORLD_WIDTH) f.x = WORLD_WIDTH - f.width;
               f.scaleX = 1.6; f.scaleY = 0.6;
               gameState.shake += 5;
               audio?.playGlitch();
               createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.primary);
          }
          if (f.dashTimer > teleportFrame) {
              f.scaleX = 0.1; f.scaleY = 0.1;
          }
      } else {
          f.vx = f.facing * stats.dashSpeed;
          f.vy = 0; 
      }

      if (f.dashTimer <= 0) {
        f.isDashing = false;
        if (f.classType !== 'VORTEX') f.vx *= 0.5;
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
        if (!f.isGrappling && !f.isDiving) {
            const accel = f.isGrounded ? stats.speed : stats.speed * 0.8;
            f.vx += input.x * accel * timeScale; 
            if (Math.abs(f.vx) > stats.maxSpeed) f.vx = Math.sign(f.vx) * stats.maxSpeed;
            if (input.x === 0) f.vx *= (f.isGrounded ? FRICTION : AIR_RESISTANCE);
        }
    }

    if (!f.isDashing && !f.isDiving) {
        const gMult = f.isGrappling ? 0.05 : stats.gravityScale;
        f.vy += GRAVITY * gMult * timeScale;
    }

    f.x += f.vx * timeScale;
    f.y += f.vy * timeScale;

    if (f.y + f.height >= GROUND_Y) {
      f.y = GROUND_Y - f.height;
      if (!f.isGrappling && !f.isDiving) {
          f.vy = 0;
          f.isGrounded = true;
      } 
    } else {
        f.isGrounded = false;
    }

    if (f.x < 0) { 
        if (f.vx < -5) {
            createParticles(gameState, 0, f.y + f.height/2, 5, '#ffffff', 5);
            f.scaleX = 0.8; 
        }
        f.x = 0; f.vx = 0; 
        if (f.isGrappling || f.isDiving) {
            f.isGrappling = false; f.isDiving = false; f.grapplePoint = null; f.grappleTargetId = null; f.grappleCooldownTimer = GRAPPLE_COOLDOWN; 
        }
    }
    if (f.x + f.width > WORLD_WIDTH) { 
        if (f.vx > 5) {
            createParticles(gameState, WORLD_WIDTH, f.y + f.height/2, 5, '#ffffff', 5);
            f.scaleX = 0.8; 
        }
        f.x = WORLD_WIDTH - f.width; f.vx = 0; 
        if (f.isGrappling || f.isDiving) { 
            f.isGrappling = false; f.isDiving = false; f.grapplePoint = null; f.grappleTargetId = null; f.grappleCooldownTimer = GRAPPLE_COOLDOWN; 
        }
    }

    if (input.x !== 0 && !f.isDashing && !f.isAttacking && !f.isGrappling && !f.isDiving) {
      f.facing = Math.sign(input.x) as 1 | -1;
    }

    f.scaleX += (1 - f.scaleX) * 0.15 * timeScale;
    f.scaleY += (1 - f.scaleY) * 0.15 * timeScale;

    if (Math.abs(f.vx) < 1.0) {
        f.rotation *= 0.7; 
    } else {
        const leanAmount = f.isGrappling ? 0.4 : 0.25; 
        const targetRot = (f.vx / stats.maxSpeed) * leanAmount; 
        f.rotation += (targetRot - f.rotation) * 0.2 * timeScale;
    }
    
    prevAttackInput[f.id] = input.attack;
    prevAttackInput[f.id + '_special'] = input.special;
};
