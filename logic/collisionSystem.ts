
import { ATTACK_RANGE, ATTACK_DURATIONS, ATTACK_DAMAGES, ATTACK_KNOCKBACKS, CLASS_STATS } from '../config/balance';
import { HIT_FLASH_DURATION } from '../config/settings';
import { Fighter, GameState } from '../types';
import { AudioManager } from '../core/AudioManager';
import { createImpact, createParticles, createShockwave, createFlare, createDamageText } from './effectSpawners';

// --- CENTRALIZED DEATH LOGIC (THE ARBITER) ---
const triggerDeath = (
    victim: Fighter, 
    killer: Fighter, 
    gameState: GameState, 
    audio: AudioManager | null, 
    onGameOver: (winner: 'player' | 'enemy', pScore: number, eScore: number) => void
) => {
    if (victim.isDead) return; // Prevent double trigger

    victim.isDead = true;
    victim.health = 0;
    killer.score += 1;
    gameState.winner = killer.id;
    
    // Dramatic Finish Effects
    gameState.slowMoFactor = 0.1; 
    gameState.slowMoTimer = 180; 
    
    const impactX = victim.x + victim.width / 2;
    const impactY = victim.y + victim.height / 2;
    createFlare(gameState, impactX, impactY, '#ffffff');
    
    audio?.playKO();

    // Determine current scores directly from state (killer score was just incremented)
    const pScore = gameState.player.score;
    const eScore = gameState.enemy.score;

    setTimeout(() => onGameOver(gameState.winner!, pScore, eScore), 3000); 
};

export const checkCollisions = (
    gameState: GameState, 
    audio: AudioManager | null, 
    onGameOver: (winner: 'player' | 'enemy', playerScore: number, enemyScore: number) => void
) => {
    const { player, enemy } = gameState;

    const checkHit = (attacker: Fighter, defender: Fighter) => {
      // 1. STANDARD ATTACK
      if (attacker.isAttacking) {
        const frameToHit = Math.floor(ATTACK_DURATIONS[attacker.comboCount] / 2);
        
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
               attacker.hasHit = true; 
               handleHit(attacker, defender, gameState, audio, onGameOver);
            }
        }
      }

      // 2. SLINGER METEOR KICK (Collision Body Slam)
      if (attacker.classType === 'SLINGER' && attacker.isGrappleAttacking) {
          // Check simple body overlap
          const overlap = (
              attacker.x < defender.x + defender.width &&
              attacker.x + attacker.width > defender.x &&
              attacker.y < defender.y + defender.height &&
              attacker.y + attacker.height > defender.y
          );

          if (overlap) {
              handleHit(attacker, defender, gameState, audio, onGameOver, true); // true = forced critical
              
              // Slinger Specific Cleanup
              attacker.isGrappleAttacking = false;
              attacker.isGrappling = false;
              attacker.grapplePoint = null;
              attacker.grappleTargetId = null;
              attacker.grappleCooldownTimer = 0; // RESET COOLDOWN (Reward)
              
              // Bounce Slinger back slightly
              attacker.vx = -attacker.facing * 10;
              attacker.vy = -15; 
              gameState.shake += 10;
          }
      }
    };

    // Run Standard Collision Checks
    checkHit(player, enemy);
    checkHit(enemy, player);

    // --- GLOBAL DEATH CHECK (Catch-all) ---
    // Catches deaths from Special Abilities (Orb, Dive), DoTs, or Traps
    // that happen outside the standard handleHit function.
    if (player.health <= 0 && !player.isDead) {
        triggerDeath(player, enemy, gameState, audio, onGameOver);
    }
    if (enemy.health <= 0 && !enemy.isDead) {
        triggerDeath(enemy, player, gameState, audio, onGameOver);
    }
};

const handleHit = (
    attacker: Fighter, 
    defender: Fighter, 
    gameState: GameState, 
    audio: AudioManager | null, 
    onGameOver: (winner: 'player' | 'enemy', pScore: number, eScore: number) => void,
    forceCritical: boolean = false
) => {
    if (defender.isDashing) return; 

    // --- VOLT MECHANIC: STATIC FLOW (DASH RESET) ---
    if (attacker.classType === 'VOLT') {
        attacker.dashCooldown = 0; 
        attacker.hitFlashTimer = 2; 
        if (audio && audio.ctx.state === 'running') audio.playVoltReset();
    }

    const impactX = defender.x + defender.width/2;
    const impactY = defender.y + defender.height/2;

    defender.hitFlashTimer = HIT_FLASH_DURATION; 
    defender.lastDamageFrame = gameState.frameCount; // TRACK DAMAGE TIME
    
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    gameState.shakeX = (dx/dist) * 20;
    gameState.shakeY = (dy/dist) * 10;
    
    createImpact(gameState, impactX, impactY, '#ffffff');

    // --- DAMAGE CALCULATION ---
    let baseDamage = ATTACK_DAMAGES[attacker.comboCount] || 8; // Default to 8 if not comboing (e.g. Kick)
    
    const multiplier = CLASS_STATS[attacker.classType].damageMult;
    let finalDamage = baseDamage * multiplier;

    // KINETIC VELOCITY BONUS
    if (attacker.classType === 'KINETIC' && attacker.dynamicDamageMult) {
        finalDamage = baseDamage * attacker.dynamicDamageMult;
    }

    // SLINGER AERIAL ACE PASSIVE
    if (attacker.classType === 'SLINGER' && !attacker.isGrounded) {
        finalDamage *= 1.2;
    }

    // SLINGER METEOR KICK CRIT
    if (forceCritical) {
        finalDamage *= 1.5;
        createFlare(gameState, impactX, impactY, attacker.color.glow);
    }

    // --- DAMAGE BASED FEEDBACK ---
    // Proportional shake, uncapped for massive impact feel
    gameState.shake = finalDamage * 0.8;

    const isHeavyHit = finalDamage > 20 || attacker.comboCount === 2 || forceCritical;

    if (isHeavyHit) {
        gameState.chromaticAberration = 8;
        createFlare(gameState, impactX, impactY, attacker.color.glow); 
        audio?.playHit(true); 
    } else {
        audio?.playHit(false); 
    }

    // Physics Application
    let knockback = ATTACK_KNOCKBACKS[attacker.comboCount] || 15;
    let verticalKnock = -5;

    if (forceCritical) {
        knockback = 10; // Less horizontal push
        verticalKnock = -30; // HUGE Vertical Launch (Juggling potential)
    }

    defender.health -= finalDamage;
    defender.vx = attacker.facing * knockback;
    defender.vy = verticalKnock;

    // --- DAMAGE TEXT VISUAL (SANDBOX ONLY) ---
    if (gameState.gameMode === 'SANDBOX') {
        createDamageText(gameState, defender.x + defender.width/2, defender.y, finalDamage);
    }
    
    defender.scaleX = 0.5;
    defender.scaleY = 1.5;

    createParticles(gameState, impactX, impactY, 15, '#fff', 12);
    createParticles(gameState, impactX, impactY, 10, attacker.color.glow, 15);
    createShockwave(gameState, impactX, impactY, attacker.color.glow);

    // --- IMMEDIATE DEATH CHECK (Optional optimization) ---
    if (defender.health <= 0 && !defender.isDead) {
        triggerDeath(defender, attacker, gameState, audio, onGameOver);
    }
};
