
import { Fighter, GameState } from '../../types';
import { createShockwave } from '../effectSpawners';
import { AudioManager } from '../../core/AudioManager';
import { WORLD_WIDTH } from '../../config/physics';

export const updateVortex = (
    f: Fighter, 
    gameState: GameState, 
    freshSpecial: boolean, 
    audio?: AudioManager
) => {
    const timeScale = gameState.slowMoFactor;

    if (f.voidOrb) {
        if (f.voidOrb.active) {
            f.voidOrb.life -= timeScale;
            f.voidOrb.x += f.voidOrb.vx * timeScale;
            f.voidOrb.y += f.voidOrb.vy * timeScale;
            
            if (f.voidOrb.x < 0) f.voidOrb.x = 0;
            if (f.voidOrb.x > WORLD_WIDTH) f.voidOrb.x = WORLD_WIDTH;
            if (f.voidOrb.life <= 0) f.voidOrb.active = false;
        }

        if (freshSpecial && f.grappleCooldownTimer <= 0) {
            if (!f.voidOrb.active) {
                f.voidOrb.active = true;
                f.voidOrb.life = 120;
                f.voidOrb.x = f.x + f.width/2;
                f.voidOrb.y = f.y + f.height/2;
                f.voidOrb.vx = f.facing * 15;
                f.voidOrb.vy = 0;
                audio?.playGlitch();
            } else {
                createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.primary);
                f.x = f.voidOrb.x - f.width/2;
                f.y = f.voidOrb.y - f.height/2;
                f.vx = 0; f.vy = 0; f.isGrounded = false;
                f.scaleX = 0.2; f.scaleY = 1.8;
                f.voidOrb.active = false;
                f.grappleCooldownTimer = 120; 
                createShockwave(gameState, f.x + f.width/2, f.y + f.height/2, f.color.glow);
                audio?.playGlitch();
                gameState.shake += 5;
            }
        }
    }
    
    if (f.grappleCooldownTimer > 0) f.grappleCooldownTimer -= timeScale;
};
