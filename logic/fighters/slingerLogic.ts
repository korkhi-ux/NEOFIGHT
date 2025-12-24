
import { Fighter, GameState } from '../../types';
import { createShockwave, createParticles, createDamageText, createImpact, createFlare } from '../effectSpawners';
import { GROUND_Y, WORLD_WIDTH, GRAPPLE_COOLDOWN, GRAPPLE_MAX_SPEED, GRAPPLE_RANGE } from '../../config/physics';

const MISSED_COOLDOWN = 60; // Reduced penalty to encourage aggression

export const updateSlinger = (
    f: Fighter, 
    gameState: GameState, 
    freshSpecial: boolean, 
    opponent: Fighter
) => {
    const timeScale = gameState.slowMoFactor;

    // --- COLLISION LOGIC: METEOR KICK ---
    // Moved from collisionSystem.ts to allow local velocity calculation and state reset
    if (f.isGrappleAttacking) {
        const overlap = (
            f.x < opponent.x + opponent.width &&
            f.x + f.width > opponent.x &&
            f.y < opponent.y + opponent.height &&
            f.y + f.height > opponent.y
        );

        if (overlap) {
            // 1. CALCULATE DAMAGE (Speed Based)
            const speed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
            // Formula: Speed * 0.6, Hard Cap at 15
            const damage = Math.min(15, Math.floor(speed * 0.6));

            opponent.health -= damage;
            opponent.lastDamageFrame = gameState.frameCount;
            opponent.hitFlashTimer = 5;

            const impactX = opponent.x + opponent.width/2;
            const impactY = opponent.y + opponent.height/2;

            // 2. VISUALS (ENHANCED)
            if (gameState.gameMode === 'SANDBOX') {
                createDamageText(gameState, impactX, opponent.y, damage);
            }
            
            // Neon Green Sonic Boom
            createShockwave(gameState, impactX, impactY, '#bef264'); // Lime Green
            createShockwave(gameState, impactX, impactY, '#ffffff'); // Inner White

            // Directional Debris (Sparks flying forward from impact)
            const angle = Math.atan2(f.vy, f.vx);
            for(let i=0; i<8; i++) {
                const spread = (Math.random() - 0.5) * 1.5;
                const particleSpeed = 10 + Math.random() * 10;
                gameState.particles.push({
                    id: Math.random().toString(),
                    x: impactX, 
                    y: impactY,
                    vx: Math.cos(angle + spread) * particleSpeed,
                    vy: Math.sin(angle + spread) * particleSpeed,
                    life: 20 + Math.random() * 10,
                    maxLife: 30,
                    color: i % 2 === 0 ? '#bef264' : '#ffffff',
                    size: 4 + Math.random() * 4
                });
            }

            createImpact(gameState, impactX, impactY, f.color.glow);
            createFlare(gameState, impactX, impactY, f.color.glow);
            gameState.shake += damage * 0.8; // Heavy Shake

            // 3. RECOIL & RESET (Reward)
            f.isGrappling = false;
            f.isGrappleAttacking = false;
            f.grapplePoint = null;
            f.grappleTargetId = null;
            f.grappleCooldownTimer = 0; // INSTANT RESET REWARD
            
            // Bounce Back Physics
            f.vx = -f.facing * 10;
            f.vy = -15; // Pop up
            
            // Animation Squash (Heavy Impact Feel)
            f.scaleX = 1.5; f.scaleY = 0.5;

            // 4. OPPONENT PHYSICS
            opponent.vx = f.facing * (10 + damage * 0.5);
            opponent.vy = -5;
            opponent.scaleX = 0.6; opponent.scaleY = 1.4; // Opponent squeezes

            // Prevent further processing this frame
            return;
        }
    }

    // 1. MANUAL RELEASE
    if (freshSpecial && f.isGrappling) {
        f.isGrappling = false;
        f.isGrappleAttacking = false;
        f.grapplePoint = null;
        f.grappleTargetId = null;
        f.grappleCooldownTimer = MISSED_COOLDOWN; 
        f.vx *= 1.2; f.vy *= 1.2;
        createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.glow);
    }
    // 2. FIRE GRAPPLE
    else if (freshSpecial && !f.isGrappling && f.grappleCooldownTimer <= 0) {
        const originX = f.x + f.width / 2;
        const originY = f.y + f.height * 0.55; 
        const angleRad = (f.facing === 1 ? 0.1 : Math.PI - 0.1); 
        const dirX = Math.cos(angleRad);
        
        let hitPoint: {x: number, y: number} | null = null;
        let hitTargetId: string | null = null;
        
        const distOpp = Math.sqrt(Math.pow(opponent.x - f.x, 2) + Math.pow(opponent.y - f.y, 2));
        const inRange = distOpp < GRAPPLE_RANGE;
        const dxOpp = opponent.x - f.x;
        const inFront = Math.sign(dxOpp) === f.facing;

        if (inFront && inRange) {
            hitPoint = { x: opponent.x + opponent.width/2, y: opponent.y + opponent.height/2 };
            hitTargetId = opponent.id;
        } else {
            const targetWallX = f.facing === 1 ? WORLD_WIDTH : 0;
            const distToWallX = targetWallX - originX;
            hitPoint = { x: targetWallX, y: originY + (distToWallX * Math.tan(angleRad)) };
            if (hitPoint.y > GROUND_Y) hitPoint.y = GROUND_Y;
        }

        if (hitPoint) {
            f.isGrappling = true;
            f.grapplePoint = hitPoint;
            f.grappleTargetId = hitTargetId;
            f.isGrounded = false;
            
            // ACTIVATE METEOR KICK STATE IF ENEMY HIT
            if (hitTargetId === opponent.id) {
                f.isGrappleAttacking = true;
            }

            createShockwave(gameState, hitPoint.x, hitPoint.y, f.color.glow);
            createParticles(gameState, hitPoint.x, hitPoint.y, 12, f.color.glow, 8);
            
            // High Initial Jerk (Projectile Speed simulation)
            f.vx += dirX * 12; // Buffed from 5 to 12 for instant snap
            f.vy -= 10; 
        } else {
            f.grappleCooldownTimer = 15; // Quick reset on pure miss
        }
    } 
    // 3. GRAPPLE PHYSICS
    else if (f.isGrappling && f.grapplePoint) {
        if (f.grappleTargetId) {
            f.grapplePoint = { x: opponent.x + opponent.width/2, y: opponent.y + opponent.height/2 };
        }
        const dx = f.grapplePoint.x - (f.x + f.width/2);
        const dy = f.grapplePoint.y - f.y; 
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 50) {
            f.isGrappling = false;
            f.isGrappleAttacking = false;
            f.grapplePoint = null;
            f.grappleTargetId = null;
            f.grappleCooldownTimer = MISSED_COOLDOWN; 
            f.vx *= 0.8; f.vy *= 0.8;
        } else {
            // Aggressive Pull Force: Doubles if attacking
            const baseForce = 5.0; // Buffed: 4.0 -> 5.0
            const pullForce = (f.isGrappleAttacking ? baseForce * 2.0 : baseForce) * timeScale;
            
            const angle = Math.atan2(dy, dx);
            f.vx += Math.cos(angle) * pullForce;
            f.vy += Math.sin(angle) * pullForce;
            
            const maxS = f.isGrappleAttacking ? GRAPPLE_MAX_SPEED * 1.5 : GRAPPLE_MAX_SPEED;
            
            const speed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
            if (speed > maxS) {
                const r = maxS / speed;
                f.vx *= r; f.vy *= r;
            }
        }
    }
    
    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= timeScale;
};
