
import { ATTACK_RANGE, ATTACK_DURATIONS } from '../config/balance';
import { Fighter, GameState } from '../types';

export const updateAI = (enemy: Fighter, player: Fighter, gameState: GameState): { x: number, jump: boolean, dash: boolean, attack: boolean, special: boolean } => {
    if (enemy.isDead || !enemy.aiState) return { x: 0, jump: false, dash: false, attack: false, special: false };

    const ai = enemy.aiState;
    const dx = player.x - enemy.x;
    const dist = Math.abs(dx);
    const facingPlayer = Math.sign(dx) === enemy.facing;
    const timeScale = gameState.slowMoFactor;
    
    // Recovery State
    if (ai.recoveryTimer > 0) {
        ai.recoveryTimer -= timeScale;
        return { 
            x: -Math.sign(dx), 
            jump: ai.recoveryTimer % 15 === 0, 
            dash: false, 
            attack: false,
            special: false
        };
    }

    // Reaction Delay
    if (player.isDashing && ai.reactionCooldown <= 0) {
        ai.reactionCooldown = 12; 
    }

    if (ai.reactionCooldown > 0) {
        ai.reactionCooldown -= timeScale;
        if (ai.nextMove) return ai.nextMove;
        return { x: 0, jump: false, dash: false, attack: false, special: false };
    }

    // Context Analysis
    if (player.health < 20 && enemy.health > 50) {
        ai.mode = 'showoff'; 
    } else if (enemy.health > player.health + 40) {
        ai.targetDistance = ATTACK_RANGE + 60; 
        ai.mode = 'neutral';
    } else {
        ai.mode = 'aggressive';
        ai.targetDistance = 40;
    }

    let inputX = 0;
    let jump = false;
    let dash = false;
    let attack = false;
    let special = false;

    // Action Timer
    if (ai.actionTimer > 0) {
        ai.actionTimer -= timeScale;
        if (ai.nextMove) return ai.nextMove;
    }

    // Combo Chaining Logic
    if (enemy.isAttacking) {
         if (enemy.attackTimer < ATTACK_DURATIONS[enemy.comboCount] * 0.5) {
             if (enemy.comboCount === 1 && Math.random() < 0.1) return { x: 0, jump: false, dash: false, attack: false, special: false };
             attack = true; 
         }
         
         if (!facingPlayer && Math.random() < 0.2) {
             dash = true;
             inputX = Math.sign(dx);
         }
         
         const move = { x: inputX, jump, dash, attack, special: false };
         ai.nextMove = move;
         return move;
    }

    const isError = Math.random() < 0.2;

    if (ai.mode === 'showoff') {
        if (dist > 100) {
            dash = Math.random() < 0.1;
            jump = Math.random() < 0.1;
            inputX = Math.random() > 0.5 ? 1 : -1;
        } else {
            if (Math.random() < 0.5) attack = true;
        }
    } 
    else {
        inputX = Math.sign(dx);
        
        if (dist < ai.targetDistance) {
            if (!isError) inputX = -Math.sign(dx); 
            else inputX = 0; 
        }

        if (dist < ATTACK_RANGE + 10 && facingPlayer) {
            if (isError && dist > ATTACK_RANGE - 10) {
                attack = true;
            } else if (!isError) {
                attack = true;
            }
        }

        if (player.isAttacking && dist < ATTACK_RANGE + 50) {
            if (Math.random() < ai.difficulty) {
                dash = true;
                if (Math.random() < 0.5) inputX = Math.sign(dx); 
                else inputX = -Math.sign(dx);
                if (isError) inputX = -inputX; 
            }
        } else if (dist > 300) {
            if (Math.random() < 0.05) {
                dash = true;
                inputX = Math.sign(dx);
            }
        }
    }

    ai.actionTimer = 5; 
    const result = { x: inputX, jump, dash, attack, special };
    ai.nextMove = result;
    return result;
};
