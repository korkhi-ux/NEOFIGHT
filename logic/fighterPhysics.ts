
import { 
  GROUND_Y, GRAVITY, FRICTION, AIR_RESISTANCE,
  ATTACK_DURATIONS, ATTACK_COOLDOWN, COMBO_WINDOW, WORLD_WIDTH,
  CLASS_STATS, GRAPPLE_COOLDOWN, GRAPPLE_MAX_SPEED, GRAPPLE_RANGE
} from '../constants';
import { Fighter, GameState } from '../types';
import { createParticles, createShockwave } from './effectSpawners';
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
    const opponent = f.id === 'player' ? gameState.enemy : gameState.player;

    // Detect Fresh Inputs
    const freshAttack = input.attack && !prevAttackInput[f.id];
    const freshSpecial = input.special && !prevAttackInput[f.id + '_special'];

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
    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= timeScale;

    if (f.comboTimer <= 0 && !f.isAttacking) {
        f.comboCount = 0;
    }

    // --- SLINGER SPECIAL: TACTICAL GRAPPLE ---
    if (f.classType === 'SLINGER') {
        
        // 1. CANCEL (Toggle off)
        if (freshSpecial && f.isGrappling) {
            f.isGrappling = false;
            f.grapplePoint = null;
            f.grappleTargetId = null;
            f.grappleCooldownTimer = GRAPPLE_COOLDOWN;
            f.vx *= 0.5; // Brake inertia
        }
        // 2. FIRE (Raycast)
        else if (freshSpecial && !f.isGrappling && f.grappleCooldownTimer <= 0) {
            
            const originX = f.x + f.width / 2;
            const originY = f.y + f.height / 3; // Shoot from chest/shoulder
            
            // Horizontal shot with slight angle (10 degrees)
            const angleRad = (f.facing === 1 ? 0.17 : Math.PI - 0.17); 
            const dirX = Math.cos(angleRad);
            const dirY = Math.sin(angleRad);

            let hitPoint: {x: number, y: number} | null = null;
            let hitTargetId: string | null = null;
            
            // A. Check Enemy Hit (Priority)
            const dxOpp = opponent.x - f.x;
            const distOpp = Math.sqrt(Math.pow(opponent.x - f.x, 2) + Math.pow(opponent.y - f.y, 2));
            const inFront = Math.sign(dxOpp) === f.facing;
            const inRange = distOpp < GRAPPLE_RANGE;
            const verticalAlign = Math.abs((opponent.y + opponent.height/2) - originY) < 150; // Forgiving vertical aim

            if (inFront && inRange && verticalAlign) {
                hitPoint = { x: opponent.x + opponent.width/2, y: opponent.y + opponent.height/2 };
                hitTargetId = opponent.id;
            } 
            // B. Check Walls (Secondary)
            else {
                const targetWallX = f.facing === 1 ? WORLD_WIDTH : 0;
                const distToWallX = targetWallX - originX;
                
                if (Math.abs(distToWallX) < GRAPPLE_RANGE) {
                     hitPoint = { x: targetWallX, y: originY + (distToWallX * Math.tan(angleRad)) };
                     // Clamp Y to ground to avoid shooting into abyss
                     if (hitPoint.y > GROUND_Y) hitPoint.y = GROUND_Y;
                }
            }

            if (hitPoint) {
                f.isGrappling = true;
                f.grapplePoint = hitPoint;
                f.grappleTargetId = hitTargetId;
                f.isGrounded = false;
                
                // Visuals
                createShockwave(gameState, hitPoint.x, hitPoint.y, f.color.glow);
                createParticles(gameState, hitPoint.x, hitPoint.y, 8, f.color.glow, 5);
                
                // Initial kick
                f.vx += dirX * 5;
                f.vy += dirY * 2;
            } else {
                // Whiff
                f.grappleCooldownTimer = 20; 
            }
        } 
        
        // 3. UPDATE PHYSICS (While grappling)
        else if (f.isGrappling && f.grapplePoint) {
            // Update point if locked to enemy
            if (f.grappleTargetId) {
                f.grapplePoint = { 
                    x: opponent.x + opponent.width/2, 
                    y: opponent.y + opponent.height/2 
                };
            }

            const dx = f.grapplePoint.x - (f.x + f.width/2);
            const dy = f.grapplePoint.y - f.y; 
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 40) {
                // Arrived
                f.isGrappling = false;
                f.grapplePoint = null;
                f.grappleTargetId = null;
                f.grappleCooldownTimer = GRAPPLE_COOLDOWN;
            } else {
                // Elastic Acceleration
                // The closer you are, the less force? No, standard elastic is F=kx
                // But for game feel, we want "Zip" effect. 
                // Constant acceleration works well for "Retract" feel.
                
                const pullForce = 0.8 * timeScale; 
                const angle = Math.atan2(dy, dx);
                
                f.vx += Math.cos(angle) * pullForce;
                f.vy += Math.sin(angle) * pullForce;
                
                // Cap speed
                const speed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
                if (speed > GRAPPLE_MAX_SPEED) {
                    const r = GRAPPLE_MAX_SPEED / speed;
                    f.vx *= r;
                    f.vy *= r;
                }
            }
        }
    } else {
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
    
    // Dash
    if (input.dash && f.dashCooldown <= 0) {
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
      audio?.playDash();
      
      const dashDir = input.x !== 0 ? Math.sign(input.x) : f.facing;
      f.facing = dashDir as 1 | -1;
      
      f.scaleX = 1.7; 
      f.scaleY = 0.4; 
      gameState.shake += 2;
    }

    // Jump
    if (input.jump && (f.isGrounded || (f.classType === 'SLINGER' && f.isGrappling))) {
       if (f.isGrappling) {
           f.isGrappling = false;
           f.grapplePoint = null;
           f.grappleTargetId = null;
           f.grappleCooldownTimer = GRAPPLE_COOLDOWN;
           f.vy = stats.jumpForce * 1.2; 
           f.vx *= 1.2; 
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

    // Attack
    
    if (freshAttack && !f.isDashing) {
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
        // While grappling, gravity is normalized but we still want verticality
        // Actually, if we want "zip" to target, gravity interferes.
        // Let's reduce gravity heavily during grapple pull
        const gMult = f.isGrappling ? 0.2 : stats.gravityScale;
        f.vy += GRAVITY * gMult * timeScale;
    }

    f.x += f.vx * timeScale;
    f.y += f.vy * timeScale;

    // Collision with ground/walls
    if (f.y + f.height >= GROUND_Y) {
      f.y = GROUND_Y - f.height;
      if (!f.isGrappling) {
          f.vy = 0;
          f.isGrounded = true;
      } else {
          // If grappling and hit ground, slide
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
        if (f.isGrappling) { // Release if hit wall
            f.isGrappling = false;
            f.grapplePoint = null;
            f.grappleTargetId = null;
        }
    }
    if (f.x + f.width > WORLD_WIDTH) { 
        if (f.vx > 5) {
            createParticles(gameState, WORLD_WIDTH, f.y + f.height/2, 5, '#ffffff', 5);
            f.scaleX = 0.8; 
        }
        f.x = WORLD_WIDTH - f.width; 
        f.vx = 0; 
        if (f.isGrappling) { // Release if hit wall
            f.isGrappling = false;
            f.grapplePoint = null;
            f.grappleTargetId = null;
        }
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
        const leanAmount = f.isGrappling ? 1.0 : 0.25; // Extreme lean when grappling
        const targetRot = (f.vx / stats.maxSpeed) * leanAmount; 
        f.rotation += (targetRot - f.rotation) * 0.2 * timeScale;
    }
    
    prevAttackInput[f.id] = input.attack;
    prevAttackInput[f.id + '_special'] = input.special;
};
