
import { Fighter, GameState } from '../../types';
import { createShockwave, createParticles, createImpact, createFlare, createLightningBolt, createDamageText } from '../effectSpawners';
import { AudioManager } from '../../core/AudioManager';
import { WORLD_WIDTH } from '../../config/physics';

export const updateVolt = (
    f: Fighter, 
    gameState: GameState, 
    freshSpecial: boolean, 
    opponent: Fighter,
    audio?: AudioManager
) => {
    const timeScale = gameState.slowMoFactor;

    // --- 1. LIGHTNING TRAIL UPDATE ---
    if (f.lightningTrail && f.lightningTrail.active) {
        f.lightningTrail.life -= timeScale;
        
        // Add residual sparks along the path
        if (gameState.frameCount % 2 === 0 && f.lightningTrail.life > 5) {
            const t = Math.random();
            const lx = f.lightningTrail.startX + (f.lightningTrail.endX - f.lightningTrail.startX) * t;
            const ly = f.lightningTrail.startY + (f.lightningTrail.endY - f.lightningTrail.startY) * t;
            createParticles(gameState, lx, ly, 1, f.color.glow, 2);
        }

        if (f.lightningTrail.life <= 0) {
            f.lightningTrail.active = false;
        }
    }

    // --- 2. ACTIVATION: THUNDER CUT (Supercharged) ---
    if (freshSpecial && f.grappleCooldownTimer <= 0) {
        
        // Save Start Position for Ghost
        const startX = f.x;
        const startY = f.y;

        // 1. Calculate Destination
        const dashDist = 250;
        let targetX = f.x + (f.facing * dashDist);
        
        // Clamp to map bounds
        targetX = Math.max(0, Math.min(targetX, WORLD_WIDTH - f.width));

        // 2. Collision Detection (Line Check)
        // We check if the opponent is roughly on the line between start and end
        const minX = Math.min(f.x, targetX);
        const maxX = Math.max(f.x, targetX);
        
        const oppLeft = opponent.x;
        const oppRight = opponent.x + opponent.width;
        const oppCenterY = opponent.y + opponent.height / 2;
        const myCenterY = f.y + f.height / 2;

        // Check horizontal overlap and vertical proximity
        const horizontalHit = (oppRight > minX && oppLeft < maxX);
        const verticalHit = Math.abs(oppCenterY - myCenterY) < 60; // Close enough in height

        if (horizontalHit && verticalHit) {
            // --- HIT CONFIRMED ---
            // BALANCING: Reduced from 20 to 18 (Precision Strike, not Heavy Hit)
            const dmg = 18;
            opponent.health -= dmg;
            opponent.lastDamageFrame = gameState.frameCount;

            if (gameState.gameMode === 'SANDBOX') {
                createDamageText(gameState, opponent.x + opponent.width/2, opponent.y, dmg);
            }
            
            // Stun effect (Freeze velocity)
            opponent.vx = 0;
            opponent.vy = 0;
            opponent.hitFlashTimer = 5;
            
            // NEW: Vertical Thunder
            createLightningBolt(gameState, opponent.x + opponent.width/2, opponent.y + opponent.height/2);
            
            // NEW: Hit Stop (Freeze Frame)
            gameState.hitStop = 5;

            // VFX
            createImpact(gameState, opponent.x + opponent.width/2, opponent.y + opponent.height/2, f.color.glow);
            createFlare(gameState, opponent.x + opponent.width/2, opponent.y + opponent.height/2, '#ffffff');
            audio?.playHit(true);
            gameState.shake += 15; // More shake
        }

        // 3. Movement & Effects
        
        // NEW: Gravity Stall - Stop all momentum at destination
        f.vx = 0;
        f.vy = 0;

        // Initialize Trail with Ghost
        f.lightningTrail = {
            active: true,
            startX: startX + f.width/2,
            startY: startY + f.height/2,
            endX: targetX + f.width/2,
            endY: startY + f.height/2, // Keep trail horizontal from start height
            life: 20, // Longer life for Ghost
            ghostX: startX,
            ghostY: startY,
            ghostFacing: f.facing
        };

        // VFX at Start
        createShockwave(gameState, startX + f.width/2, startY + f.height/2, f.color.secondary);
        audio?.playDash();

        // TELEPORT
        f.x = targetX;
        
        // Reward / Mechanic
        f.dashCooldown = 0; // The cut counts as a movement, allowing instant follow-up
        f.grappleCooldownTimer = 90; // 1.5s Cooldown
        
        // VFX at End
        createParticles(gameState, f.x + f.width/2, f.y + f.height/2, 8, f.color.glow, 5);
    }

    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= gameState.slowMoFactor;
};
