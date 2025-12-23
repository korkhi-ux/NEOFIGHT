
import { Fighter, GameState } from '../../types';
import { createShockwave, createFlare, createImpact } from '../effectSpawners';
import { AudioManager } from '../../core/AudioManager';
import { WORLD_WIDTH } from '../../config/physics';

export const updateVortex = (
    f: Fighter, 
    gameState: GameState, 
    freshSpecial: boolean, 
    opponent: Fighter, // Added opponent for interaction logic
    audio?: AudioManager
) => {
    const timeScale = gameState.slowMoFactor;

    if (f.voidOrb) {
        // --- ORB PROJECTILE LOGIC ---
        if (f.voidOrb.active) {
            f.voidOrb.life -= timeScale;
            f.voidOrb.x += f.voidOrb.vx * timeScale;
            f.voidOrb.y += f.voidOrb.vy * timeScale;
            
            if (f.voidOrb.lastHitTimer && f.voidOrb.lastHitTimer > 0) {
                f.voidOrb.lastHitTimer -= timeScale;
            }

            // Orb Bounds
            if (f.voidOrb.x < 0) f.voidOrb.x = 0;
            if (f.voidOrb.x > WORLD_WIDTH) f.voidOrb.x = WORLD_WIDTH;
            if (f.voidOrb.life <= 0) f.voidOrb.active = false;

            // Orb Contact Damage (Nuisance Damage)
            const orbRadius = 20;
            const oppCenterX = opponent.x + opponent.width / 2;
            const oppCenterY = opponent.y + opponent.height / 2;
            const dist = Math.sqrt(Math.pow(f.voidOrb.x - oppCenterX, 2) + Math.pow(f.voidOrb.y - oppCenterY, 2));

            if (dist < 40 + orbRadius && (!f.voidOrb.lastHitTimer || f.voidOrb.lastHitTimer <= 0)) {
                opponent.health -= 5; // Light damage
                opponent.hitFlashTimer = 3;
                opponent.vx = f.voidOrb.vx * 0.2; // Slight push
                
                f.voidOrb.lastHitTimer = 20; // Hit cooldown (approx 1/3 sec)
                
                audio?.playHit(false);
                createImpact(gameState, f.voidOrb.x, f.voidOrb.y, f.color.glow);
            }
        }

        // --- SPECIAL ACTIVATION ---
        if (freshSpecial && f.grappleCooldownTimer <= 0) {
            if (!f.voidOrb.active) {
                // PHASE A: SPAWN ORB
                f.voidOrb.active = true;
                f.voidOrb.life = 180; // Increased duration
                f.voidOrb.x = f.x + f.width/2;
                f.voidOrb.y = f.y + f.height/2;
                f.voidOrb.vx = f.facing * 16; // Slightly faster
                f.voidOrb.vy = 0;
                f.voidOrb.lastHitTimer = 0;
                audio?.playGlitch();
            } else {
                // PHASE B: DIMENSIONAL NUKE (Teleport Explosion)
                createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.primary);
                
                // Teleport and Clamp to Screen Bounds
                let targetX = f.voidOrb.x - f.width/2;
                targetX = Math.max(0, Math.min(targetX, WORLD_WIDTH - f.width));
                
                f.x = targetX;
                f.y = f.voidOrb.y - f.height/2;
                
                f.vx = 0; f.vy = 0; f.isGrounded = false;
                f.scaleX = 0.2; f.scaleY = 1.8;
                
                // EXPLOSION LOGIC
                gameState.shake += 15;
                createFlare(gameState, f.x + f.width/2, f.y + f.height/2, '#ffffff');
                createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.glow);
                audio?.playGlitch(); // Needs a heavier sound ideally, reuse glitch for now
                audio?.playHit(true);

                // AOE Check
                const oppCenterX = opponent.x + opponent.width / 2;
                const oppCenterY = opponent.y + opponent.height / 2;
                const burstRadius = 150;
                const distToOpp = Math.sqrt(Math.pow((f.x + f.width/2) - oppCenterX, 2) + Math.pow((f.y + f.height/2) - oppCenterY, 2));

                if (distToOpp < burstRadius) {
                    opponent.health -= 15;
                    opponent.hitFlashTimer = 10;
                    // Knockback away from explosion
                    opponent.vx = Math.sign(opponent.x - f.x) * 25;
                    opponent.vy = -15;
                    createImpact(gameState, oppCenterX, oppCenterY, f.color.primary);
                }

                f.voidOrb.active = false;
                f.grappleCooldownTimer = 120; 
            }
        }
    }
    
    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= timeScale;
};
