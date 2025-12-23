
import { ATTACK_RANGE, ATTACK_DURATIONS, ATTACK_DAMAGES, ATTACK_KNOCKBACKS, CLASS_STATS } from '../config/balance';
import { HIT_FLASH_DURATION } from '../config/settings';
import { Fighter, GameState } from '../types';
import { AudioManager } from '../core/AudioManager';
import { createImpact, createParticles, createShockwave, createFlare } from './effectSpawners';

export const checkCollisions = (
    gameState: GameState, 
    audio: AudioManager | null, 
    onGameOver: (winner: 'player' | 'enemy', playerScore: number, enemyScore: number) => void
) => {
    const { player, enemy } = gameState;

    const checkHit = (attacker: Fighter, defender: Fighter) => {
      if (attacker.isAttacking) {
        const frameToHit = Math.floor(ATTACK_DURATIONS[attacker.comboCount] / 2);
        
        // Ensure we haven't already hit with this specific attack
        if (!attacker.hasHit && attacker.attackTimer <= frameToHit && attacker.attackTimer > frameToHit - gameState.slowMoFactor * 1.5) {
            let range = ATTACK_RANGE;
            let heightMod = 0;
            
            if (attacker.comboCount === 1) { range = ATTACK_RANGE * 1.2; heightMod = 20; }
            if (attacker.comboCount === 2) { range = ATTACK_RANGE * 2.0; heightMod = 40; }

            const hitboxX = attacker.facing === 1 ? attacker.x + attacker.width : attacker.x - range;
            const hitboxW = range;
            const hitboxY = attacker.y - heightMod;
            const hitboxH = attacker.height + heightMod * 2;

            if (
              hitboxX < defender.x + defender.width &&
              hitboxX + hitboxW > defender.x &&
              hitboxY < defender.y + defender.height &&
              hitboxY + hitboxH > defender.y
            ) {
               attacker.hasHit = true; // Mark as hit to prevent multi-frame damage
               handleHit(attacker, defender, gameState, audio, onGameOver);
            }
        }
      }
    };

    checkHit(player, enemy);
    checkHit(enemy, player);
};

const handleHit = (
    attacker: Fighter, 
    defender: Fighter, 
    gameState: GameState, 
    audio: AudioManager | null, 
    onGameOver: (winner: 'player' | 'enemy', pScore: number, eScore: number) => void
) => {
    if (defender.isDashing) return; 

    // --- VOLT MECHANIC: STATIC FLOW (DASH RESET) ---
    if (attacker.classType === 'VOLT') {
        attacker.dashCooldown = 0; // RESET
        attacker.hitFlashTimer = 2; // Brief flash to confirm reset
        
        // Use standardized audio method
        if (audio && audio.ctx.state === 'running') {
            audio.playVoltReset();
        }
    }

    const impactX = defender.x + defender.width/2;
    const impactY = defender.y + defender.height/2;

    // Visuals
    defender.hitFlashTimer = HIT_FLASH_DURATION; 
    
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    gameState.shakeX = (dx/dist) * 20;
    gameState.shakeY = (dy/dist) * 10;
    
    createImpact(gameState, impactX, impactY, '#ffffff');

    // --- DAMAGE CALCULATION ---
    let baseDamage = ATTACK_DAMAGES[attacker.comboCount];
    
    // Apply Class Multiplier OR Dynamic Velocity Multiplier
    const multiplier = CLASS_STATS[attacker.classType].damageMult;
    let finalDamage = baseDamage * multiplier;

    // KINETIC VELOCITY BONUS
    if (attacker.classType === 'KINETIC' && attacker.dynamicDamageMult) {
        finalDamage = baseDamage * attacker.dynamicDamageMult;
    }

    // --- DAMAGE BASED FEEDBACK ---
    // Proportional Shake: Scale shake based on damage (capped at 40)
    // Typical damages: Light (5-8), Medium (10-15), Heavy (20-30+)
    gameState.shake = Math.min(40, finalDamage * 0.8);

    const isHeavyHit = finalDamage > 20 || attacker.comboCount === 2;

    if (isHeavyHit) {
        gameState.chromaticAberration = 8;
        createFlare(gameState, impactX, impactY, attacker.color.glow); 
        audio?.playHit(true); // Heavy Sound
    } else {
        audio?.playHit(false); // Light Sound
    }

    // Physics Application
    const knockback = ATTACK_KNOCKBACKS[attacker.comboCount];

    defender.health -= finalDamage;
    defender.vx = attacker.facing * knockback;
    defender.vy = -5;
    
    defender.scaleX = 0.5;
    defender.scaleY = 1.5;

    createParticles(gameState, impactX, impactY, 15, '#fff', 12);
    createParticles(gameState, impactX, impactY, 10, attacker.color.glow, 15);
    createShockwave(gameState, impactX, impactY, attacker.color.glow);

    // --- GAME OVER ---
    if (defender.health <= 0 && !defender.isDead) {
        defender.isDead = true;
        defender.health = 0;
        attacker.score += 1;
        gameState.winner = attacker.id;
        
        gameState.slowMoFactor = 0.1; 
        gameState.slowMoTimer = 180; 
        createFlare(gameState, impactX, impactY, '#ffffff');
        
        audio?.playKO();

        const pScore = (attacker.id === 'player' ? attacker.score : defender.score);
        const eScore = (attacker.id === 'enemy' ? attacker.score : defender.score);

        setTimeout(() => onGameOver(attacker.id, pScore, eScore), 3000); 
    }
};
