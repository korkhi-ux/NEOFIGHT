
import { Fighter, GameState } from '../../types';
import { createShockwave, createParticles, createDamageText } from '../effectSpawners';
import { AudioManager } from '../../core/AudioManager';
import { GROUND_Y } from '../../config/physics';

export const updateKinetic = (
    f: Fighter, 
    gameState: GameState, 
    freshSpecial: boolean, 
    opponent: Fighter,
    audio?: AudioManager
) => {
    const timeScale = gameState.slowMoFactor;

    // 1. VELOCITY CONVERTER (PASSIVE)
    // Updates visual intensity based on current speed
    const currentSpeed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
    f.dynamicDamageMult = 1.0 + (currentSpeed / 30); // Scaled for visual feedback

    // 2. SPECIAL: BLAST ENGINE
    if (freshSpecial && f.grappleCooldownTimer <= 0 && !f.isDiving) {
        f.grappleCooldownTimer = 90;
        
        if (f.isGrounded) {
             // BLAST JUMP (Ground Variant)
             f.vy = -28;
             f.vx = f.facing * 18;
             f.isGrounded = false;
             f.scaleX = 0.5; f.scaleY = 1.5; 
             createShockwave(gameState, f.x + f.width/2, f.y + f.height, f.color.primary);
             createParticles(gameState, f.x + f.width/2, f.y + f.height, 15, '#fbbf24', 5);
             audio?.playDash();
        } 
        else {
             // COMET DIVE (Air Variant) - PHASE 1: IGNITION
             f.isDiving = true;
             
             // Conserve momentum but ensure forward engagement
             f.vx = f.facing * Math.max(12, Math.abs(f.vx)); 
             
             // HEAVY START: Start slow, accelerate fast (Thrusters)
             f.vy = 15; 
             
             createParticles(gameState, f.x + f.width/2, f.y, 10, '#ffffff', 2);
             // Initial "Pop"
             f.scaleY = 0.8; f.scaleX = 1.2;
             audio?.playDash();
        }
    }

    // 3. COMET DIVE LOGIC
    if (f.isDiving) {
         // PHASE 2: ACCELERATION (THRUSTERS)
         // Apply Bonus Gravity to simulate jetpack propulsion downward
         // Normal gravity is handled in fighterPhysics, but isDiving disables standard gravity there.
         // We apply a stronger force here (+2.0 per frame is huge acceleration)
         f.vy += 2.0 * timeScale;

         // Visuals: Trail Intensity increases with speed
         if (gameState.frameCount % 2 === 0) {
             createParticles(gameState, f.x + f.width/2, f.y, 2, f.color.glow, 4 + (f.vy / 10));
         }

         // PHASE 3: IMPACT
         if (f.isGrounded || f.y >= GROUND_Y - f.height) {
             f.isDiving = false;
             
             // CALCULATE KINETIC ENERGY
             // Pythagorean theorem for total velocity at moment of impact
             const impactSpeed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
             
             f.vx = 0;
             f.vy = 0; // Stop
             
             // --- DAMAGE FORMULA ---
             // Min Speed (Spam): ~20 -> 8 Dmg
             // Mid Speed (Jump): ~35 -> 18 Dmg
             // Terminal Velocity (High fall): ~50+ -> 30 Dmg
             const diveDamage = Math.floor(Math.min(30, Math.max(8, impactSpeed * 0.6)));

             // Impact VFX
             gameState.shake += Math.min(30, impactSpeed * 0.5); // Shake based on speed
             createShockwave(gameState, f.x + f.width/2, f.y + f.height, '#ffffff'); 
             createShockwave(gameState, f.x + f.width/2, f.y + f.height, f.color.primary);
             createParticles(gameState, f.x + f.width/2, f.y + f.height, 20, '#f97316', 10);
             
             // Hit Detection
             const dist = Math.sqrt(Math.pow((f.x + f.width/2) - (opponent.x + opponent.width/2), 2) + Math.pow((f.y + f.height) - (opponent.y + opponent.height), 2));
             
             if (dist < 250) {
                 opponent.health -= diveDamage;
                 opponent.lastDamageFrame = gameState.frameCount;
                 
                 // Show floating numbers in Sandbox
                 if (gameState.gameMode === 'SANDBOX') {
                     createDamageText(gameState, opponent.x + opponent.width/2, opponent.y, diveDamage);
                 }

                 // Physics Reaction
                 opponent.vx = Math.sign(opponent.x - f.x) * (15 + (diveDamage * 0.5));
                 opponent.vy = -10;
                 opponent.hitFlashTimer = 5;
                 
                 if (diveDamage >= 20) {
                     audio?.playHit(true); // Heavy Hit Sound
                 } else {
                     audio?.playHit(false); // Weak Hit Sound
                 }
             } else {
                 // Whiff sound (heavy thud)
                 audio?.playHit(true); 
             }
         }
    }

    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= gameState.slowMoFactor;
};
