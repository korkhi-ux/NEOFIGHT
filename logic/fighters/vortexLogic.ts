
import { Fighter, GameState } from '../../types';
import { createShockwave, createFlare, createImpact, createParticles, createDamageText } from '../effectSpawners';
import { AudioManager } from '../../core/AudioManager';
import { WORLD_WIDTH } from '../../config/physics';

export const updateVortex = (
    f: Fighter, 
    gameState: GameState, 
    freshSpecial: boolean, 
    opponent: Fighter, 
    audio?: AudioManager
) => {
    const timeScale = gameState.slowMoFactor;

    if (f.voidOrb) {
        // --- ORB PROJECTILE LOGIC ---
        if (f.voidOrb.active) {
            f.voidOrb.life -= timeScale;
            f.voidOrb.x += f.voidOrb.vx * timeScale;
            f.voidOrb.y += f.voidOrb.vy * timeScale;
            
            // Decelerate orb to park it in space (CONTROL ZONE)
            f.voidOrb.vx *= 0.96;

            // Orb Bounds
            if (f.voidOrb.x < 0) f.voidOrb.x = 0;
            if (f.voidOrb.x > WORLD_WIDTH) f.voidOrb.x = WORLD_WIDTH;
            if (f.voidOrb.life <= 0) f.voidOrb.active = false;

            const centerX = f.voidOrb.x;
            const centerY = f.voidOrb.y;

            // --- 1. GRAVITATIONAL PULL (Visuals) ---
            // Pull existing particles towards the orb (The Black Hole Effect)
            const pullRadius = 250;
            gameState.particles.forEach(p => {
                const dx = centerX - p.x;
                const dy = centerY - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < pullRadius && dist > 10) {
                    const force = (1 - dist/pullRadius) * 2.5 * timeScale;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            });

            // --- 2. INSTABILITY (Visual Distortion) ---
            // As life fades, the orb becomes unstable
            if (f.voidOrb.life < 60 && gameState.frameCount % 5 === 0) {
                 createParticles(gameState, centerX, centerY, 1, f.color.glow, 2);
                 if (gameState.frameCount % 10 === 0) {
                     createImpact(gameState, centerX + (Math.random()-0.5)*20, centerY + (Math.random()-0.5)*20, '#ffffff');
                 }
            }

            // --- 3. RADIATION FIELD (Continuous DoT) ---
            const damageRadius = 70;
            const oppCenterX = opponent.x + opponent.width / 2;
            const oppCenterY = opponent.y + opponent.height / 2;
            const distToOpp = Math.sqrt(Math.pow(centerX - oppCenterX, 2) + Math.pow(centerY - oppCenterY, 2));

            if (distToOpp < damageRadius) {
                // Continuous Health Drain (No hitstun, just melting)
                // 0.3 hp per frame ~ 18 DPS. Dangerous territory.
                opponent.health -= 0.3 * timeScale;
                opponent.lastDamageFrame = gameState.frameCount; // IMPORTANT: Stop regen
                
                // Slight suction on opponent
                opponent.vx += ((centerX - oppCenterX) / distToOpp) * 0.5 * timeScale;
                opponent.vy += ((centerY - oppCenterY) / distToOpp) * 0.5 * timeScale;

                // Visual feedback for burning
                if (gameState.frameCount % 4 === 0) {
                    createParticles(gameState, oppCenterX, oppCenterY, 1, f.color.primary, 4);
                    // Minimal audio tick
                    if (Math.random() > 0.7) audio?.playHit(false);
                }
            }
        }

        // --- SPECIAL ACTIVATION ---
        if (freshSpecial && f.grappleCooldownTimer <= 0) {
            if (!f.voidOrb.active) {
                // PHASE A: SPAWN SINGULARITY
                f.voidOrb.active = true;
                f.voidOrb.life = 240; // 4 seconds duration
                f.voidOrb.x = f.x + f.width/2;
                f.voidOrb.y = f.y + f.height/2;
                f.voidOrb.vx = f.facing * 22; // High initial velocity
                f.voidOrb.vy = 0;
                
                createShockwave(gameState, f.voidOrb.x, f.voidOrb.y, f.color.glow);
                audio?.playGlitch();
            } else {
                // PHASE B: REALITY COLLAPSE (Teleport Explosion)
                createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.primary);
                
                // Teleport Logic
                let targetX = f.voidOrb.x - f.width/2;
                targetX = Math.max(0, Math.min(targetX, WORLD_WIDTH - f.width));
                
                f.x = targetX;
                f.y = f.voidOrb.y - f.height/2;
                
                f.vx = 0; f.vy = 0; f.isGrounded = false;
                
                // --- EXPLOSION ---
                gameState.shake += 25; 
                createFlare(gameState, f.x + f.width/2, f.y + f.height/2, '#ffffff');
                createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.glow);
                audio?.playGlitch(); 
                audio?.playHit(true);

                // AOE DAMAGE
                const oppCenterX = opponent.x + opponent.width / 2;
                const oppCenterY = opponent.y + opponent.height / 2;
                const burstRadius = 180; 
                const distToOpp = Math.sqrt(Math.pow((f.x + f.width/2) - oppCenterX, 2) + Math.pow((f.y + f.height/2) - oppCenterY, 2));

                if (distToOpp < burstRadius) {
                    opponent.health -= 15; 
                    opponent.lastDamageFrame = gameState.frameCount;
                    
                    if (gameState.gameMode === 'SANDBOX') {
                        createDamageText(gameState, opponent.x + opponent.width/2, opponent.y, 15);
                    }
                    
                    opponent.hitFlashTimer = 10;
                    // Knockback away from center
                    const dx = oppCenterX - (f.x + f.width/2);
                    const dy = oppCenterY - (f.y + f.height/2);
                    const angle = Math.atan2(dy, dx);
                    
                    opponent.vx = Math.cos(angle) * 35;
                    opponent.vy = Math.sin(angle) * 35; 
                    
                    createImpact(gameState, oppCenterX, oppCenterY, f.color.primary);
                }

                f.voidOrb.active = false;
                f.grappleCooldownTimer = 80; // Reduced Cooldown (was 120) -> Aggressive play
            }
        }
    }
    
    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= timeScale;
};
