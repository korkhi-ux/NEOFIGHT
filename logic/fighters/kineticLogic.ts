
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
    // Visual feedback: Shows how much potential energy Kinetic currently has.
    const currentSpeed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
    f.dynamicDamageMult = 1.0 + (currentSpeed / 30); 

    // 2. SPECIAL ACTIVATION
    if (freshSpecial && f.grappleCooldownTimer <= 0 && !f.isDiving) {
        f.grappleCooldownTimer = 90;
        
        if (f.isGrounded) {
             // --- VARIANT A: BLAST JUMP (Ground) ---
             // Used for initiation / spacing. Fixed physics.
             f.vy = -28;
             f.vx = f.facing * 18;
             f.isGrounded = false;
             f.scaleX = 0.5; f.scaleY = 1.5; 
             
             // Reset Charge for ground jump (no run-up bonus yet)
             f.specialPowerCharge = 10; 

             createShockwave(gameState, f.x + f.width/2, f.y + f.height, f.color.primary);
             createParticles(gameState, f.x + f.width/2, f.y + f.height, 15, '#fbbf24', 5);
             audio?.playDash();
        } 
        else {
             // --- VARIANT B: COMET DIVE (Air) ---
             // PHILOSOPHY: "Snapshot Mechanics"
             // Damage is determined by the MOMENTUM built up BEFORE activation.
             
             // 1. SNAPSHOT INERTIA
             // Calculate total speed vector at the moment of button press.
             // Running Jump (vx: ~20) -> High Charge.
             // Standing Jump (vx: 0) -> Low Charge.
             const entrySpeed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
             f.specialPowerCharge = entrySpeed;

             // 2. ACTIVATE STATE
             f.isDiving = true;
             
             // 3. PHYSICS APPLICATION
             // DO NOT touch f.vx. We must preserve the run-up trajectory.
             // Set downward thrust to start the "Engine".
             f.vy = 10; 
             
             // Visuals
             createParticles(gameState, f.x + f.width/2, f.y, 10, '#ffffff', 2);
             f.scaleY = 0.8; f.scaleX = 1.2;
             audio?.playDash();
        }
    }

    // 3. COMET DIVE FLIGHT LOOP
    if (f.isDiving) {
         // --- GRAVITY ASSIST ---
         // Apply Bonus Gravity to simulate thrusters pushing down.
         // This adds the "Weight" to the impact (the 20% factor).
         f.vy += 2.0 * timeScale;

         // --- VISUALS ---
         // Particle intensity is based on the STORED CHARGE, not just current speed.
         // This tells the player "You are charged up!" even if falling slowly at start.
         if (gameState.frameCount % 2 === 0) {
             const chargeVisual = f.specialPowerCharge || 10;
             createParticles(gameState, f.x + f.width/2, f.y, 2, f.color.glow, 4 + (chargeVisual / 5));
         }

         // --- IMPACT LOGIC ---
         if (f.isGrounded || f.y >= GROUND_Y - f.height) {
             f.isDiving = false;
             
             // 1. GATHER DATA
             // Calculate the speed at impact for the minor damage factor
             const fallSpeed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
             
             // Stop movement
             f.vx = 0;
             f.vy = 0; 
             
             // 2. CALCULATE DAMAGES (The Formula)
             // Damage = Base + (StoredInertia * 0.8) + (FallSpeed * 0.2)
             // This heavily favors the Run-Up (StoredInertia).
             const inertiaDamage = (f.specialPowerCharge || 0) * 0.8;
             const gravityDamage = fallSpeed * 0.2;
             
             let totalDamage = 5 + inertiaDamage + gravityDamage;
             
             // Cap damage to prevent one-shots (Max ~35)
             totalDamage = Math.floor(Math.min(35, Math.max(8, totalDamage)));

             // 3. IMPACT VFX
             // Shake proportional to damage
             gameState.shake += totalDamage; 
             
             createShockwave(gameState, f.x + f.width/2, f.y + f.height, '#ffffff'); 
             createShockwave(gameState, f.x + f.width/2, f.y + f.height, f.color.primary);
             createParticles(gameState, f.x + f.width/2, f.y + f.height, 20, '#f97316', 10);
             
             // 4. HIT DETECTION
             const dist = Math.sqrt(Math.pow((f.x + f.width/2) - (opponent.x + opponent.width/2), 2) + Math.pow((f.y + f.height) - (opponent.y + opponent.height), 2));
             
             if (dist < 250) {
                 opponent.health -= totalDamage;
                 opponent.lastDamageFrame = gameState.frameCount;
                 
                 // Show floating numbers in Sandbox
                 if (gameState.gameMode === 'SANDBOX') {
                     createDamageText(gameState, opponent.x + opponent.width/2, opponent.y, totalDamage);
                 }

                 // Physics Reaction
                 // Knockback scales with how hard the hit was
                 opponent.vx = Math.sign(opponent.x - f.x) * (10 + (totalDamage * 0.5));
                 opponent.vy = -10;
                 opponent.hitFlashTimer = 5;
                 
                 // Audio Feedback based on intensity
                 if (totalDamage >= 25) {
                     audio?.playHit(true); // CRITICAL SOUND
                     createShockwave(gameState, f.x, f.y, f.color.glow); // Extra Ring
                 } else {
                     audio?.playHit(false);
                 }
             } else {
                 // Whiff (Heavy Thud)
                 audio?.playHit(true); 
             }
             
             // Reset Charge
             f.specialPowerCharge = 0;
         }
    }

    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= gameState.slowMoFactor;
};
