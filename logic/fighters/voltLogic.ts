
import { Fighter, GameState } from '../../types';
import { createShockwave, createParticles, createImpact } from '../effectSpawners';
import { AudioManager } from '../../core/AudioManager';

export const updateVolt = (
    f: Fighter, 
    gameState: GameState, 
    freshSpecial: boolean, 
    opponent: Fighter,
    audio?: AudioManager
) => {
    // SPECIAL: THUNDERCLAP (AOE Stun)
    if (freshSpecial && f.grappleCooldownTimer <= 0) {
        f.grappleCooldownTimer = 60; // 1 second cooldown
        
        // Visuals
        createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.glow);
        createParticles(gameState, f.x + f.width/2, f.y + f.height/2, 20, f.color.primary, 10);
        gameState.shake += 10;
        audio?.playGlitch(); // Electrical sound

        // AOE Logic
        const centerX = f.x + f.width/2;
        const centerY = f.y + f.height/2;
        const oppCenterX = opponent.x + opponent.width/2;
        const oppCenterY = opponent.y + opponent.height/2;

        const dist = Math.sqrt(Math.pow(centerX - oppCenterX, 2) + Math.pow(centerY - oppCenterY, 2));
        
        // Radius 140px
        if (dist < 140) {
            opponent.health -= 10;
            opponent.hitFlashTimer = 5;
            // Micro-Stun: Stop momentum
            opponent.vx = 0;
            opponent.vy = -2; // Tiny hop
            // Pushback away from Volt
            opponent.x += Math.sign(opponent.x - f.x) * 30;
            createImpact(gameState, oppCenterX, oppCenterY, '#ffffff');
        }
    }

    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= gameState.slowMoFactor;
};
