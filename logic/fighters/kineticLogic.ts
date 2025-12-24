
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
    // 1. VELOCITY CONVERTER
    // Formula: 1.0 + (Speed / 40). Uncapped for maximum kinetic potential.
    const currentSpeed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
    f.dynamicDamageMult = 1.0 + (currentSpeed / 40);

    // 2. SPECIAL: BLAST ENGINE
    if (freshSpecial && f.grappleCooldownTimer <= 0 && !f.isDiving) {
        f.grappleCooldownTimer = 90;
        
        if (f.isGrounded) {
             f.vy = -28;
             f.vx = f.facing * 18;
             f.isGrounded = false;
             f.scaleX = 0.5; f.scaleY = 1.5; 
             createShockwave(gameState, f.x + f.width/2, f.y + f.height, f.color.primary);
             createParticles(gameState, f.x + f.width/2, f.y + f.height, 15, '#fbbf24', 5);
             audio?.playDash();
        } 
        else {
             f.isDiving = true;
             f.vx = f.facing * 12; 
             f.vy = 45; 
             createParticles(gameState, f.x + f.width/2, f.y, 10, '#ffffff', 2);
        }
    }

    // 3. COMET DIVE LANDING
    if (f.isDiving) {
         if (gameState.frameCount % 2 === 0) {
             createParticles(gameState, f.x + f.width/2, f.y, 2, f.color.glow, 4);
         }

         if (f.isGrounded || f.y >= GROUND_Y - f.height) {
             f.isDiving = false;
             f.vx = 0;
             gameState.shake += 12;
             createShockwave(gameState, f.x + f.width/2, f.y + f.height, '#ffffff'); 
             createShockwave(gameState, f.x + f.width/2, f.y + f.height, f.color.primary);
             createParticles(gameState, f.x + f.width/2, f.y + f.height, 20, '#f97316', 10);
             
             const dist = Math.sqrt(Math.pow((f.x + f.width/2) - (opponent.x + opponent.width/2), 2) + Math.pow((f.y + f.height) - (opponent.y + opponent.height), 2));
             
             if (dist < 250) {
                 // Base Damage set to 12 as requested.
                 const diveDamage = 12 * (f.dynamicDamageMult ?? 1.0);
                 opponent.health -= diveDamage;
                 opponent.lastDamageFrame = gameState.frameCount;
                 
                 if (gameState.gameMode === 'SANDBOX') {
                     createDamageText(gameState, opponent.x + opponent.width/2, opponent.y, diveDamage);
                 }

                 opponent.vx = Math.sign(opponent.x - f.x) * 20;
                 opponent.vy = -10;
                 opponent.hitFlashTimer = 5;
                 
                 if (diveDamage > 25) {
                     gameState.shake += 15;
                     audio?.playHit(true);
                 } else {
                     audio?.playHit(false);
                 }
             }
             audio?.playHit(true); 
         }
    }

    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= gameState.slowMoFactor;
};
