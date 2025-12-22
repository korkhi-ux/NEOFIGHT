
import { ATTACK_RANGE, ATTACK_DURATIONS, ATTACK_DAMAGES, ATTACK_KNOCKBACKS, HIT_FLASH_DURATION } from '../constants';
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
      // 1. STANDARD ATTACKS
      if (attacker.isAttacking) {
        const frameToHit = Math.floor(ATTACK_DURATIONS[attacker.comboCount] / 2);
        
        if (attacker.attackTimer <= frameToHit && attacker.attackTimer > frameToHit - gameState.slowMoFactor * 1.5) {
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
               handleHit(attacker, defender, gameState, audio, onGameOver);
            }
        }
      }

      // 2. KINETIC DASH RAM (Collision Logic)
      if (attacker.classType === 'KINETIC' && attacker.isDashing) {
          if (
              attacker.x < defender.x + defender.width &&
              attacker.x + attacker.width > defender.x &&
              attacker.y < defender.y + defender.height &&
              attacker.y + attacker.height > defender.y
          ) {
              // Only hit if we haven't hit recently (using dashTimer as a throttle is tricky, better use hitFlash)
              if (defender.hitFlashTimer <= 0) {
                  // Minor Impact
                  defender.health -= 5;
                  defender.hitFlashTimer = 5;
                  defender.vx = attacker.facing * 10;
                  defender.vy = -5;
                  
                  // Stop the Kinetic
                  attacker.vx = 0;
                  attacker.dashTimer = 0; // End dash
                  
                  createImpact(gameState, defender.x + defender.width/2, defender.y + defender.height/2, attacker.color.glow);
                  audio?.playHit(false);
                  gameState.shake += 5;
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
    // STANDARD DASH INVULNERABILITY (Except Kinetic Ram handled above)
    if (defender.isDashing && defender.classType !== 'KINETIC') return; 

    // KINETIC SUPER ARMOR DURING DASH
    const isKineticArmor = defender.classType === 'KINETIC' && defender.isDashing;

    const impactX = defender.x + defender.width/2;
    const impactY = defender.y + defender.height/2;

    // Visuals
    defender.hitFlashTimer = HIT_FLASH_DURATION; 
    audio?.playHit(attacker.comboCount === 2);

    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    gameState.shakeX = (dx/dist) * 20;
    gameState.shakeY = (dy/dist) * 10;
    
    createImpact(gameState, impactX, impactY, '#ffffff');

    if (attacker.comboCount === 2) {
        gameState.chromaticAberration = 8; // Reduced noise (was 15)
        gameState.shake = 30;
        createFlare(gameState, impactX, impactY, attacker.color.glow); 
    } else {
        gameState.shake = 10;
    }

    // Physics
    let damage = ATTACK_DAMAGES[attacker.comboCount];
    
    // Kinetic Overheat Damage Bonus
    if (attacker.classType === 'KINETIC' && attacker.heat && attacker.heat > 80) {
        damage *= 1.5;
    }

    const knockback = ATTACK_KNOCKBACKS[attacker.comboCount];

    defender.health -= damage;
    
    // Kinetic Passive: Heat on Damage Taken
    if (defender.classType === 'KINETIC' && defender.heat !== undefined) {
        defender.heat += damage * 2;
        defender.heat = Math.min(100, defender.heat);
    }

    if (!isKineticArmor) {
        defender.vx = attacker.facing * knockback;
        defender.vy = -5;
        defender.scaleX = 0.5;
        defender.scaleY = 1.5;
    } else {
        // Armor Visual Feedback
        createParticles(gameState, defender.x + defender.width/2, defender.y, 5, '#ffffff', 5);
    }

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
