
import { WORLD_WIDTH, GROUND_Y } from '../config/physics';
import { ATTACK_RANGE } from '../config/balance';
import { Fighter, GameState } from '../types';

interface AIInput {
    x: number;
    jump: boolean;
    dash: boolean;
    attack: boolean;
    special: boolean;
}

const chance = (pct: number) => Math.random() < pct;

/**
 * STRATEGY DISPATCHER
 * Calculates the ideal move based on class archetype
 */
const getClassAction = (me: Fighter, opp: Fighter, dist: number, dx: number, gameState: GameState): AIInput => {
    const inputs: AIInput = { x: 0, jump: false, dash: false, attack: false, special: false };
    const facingOpp = Math.sign(dx) === me.facing;

    switch (me.classType) {
        // ============================================================
        // A. VOLT (THE HARASSER)
        // Style: Glue to target, Dash Reset on hit, Interrupts
        // ============================================================
        case 'VOLT':
            // 1. MOVEMENT: Never retreat if close
            if (dist < 100) {
                inputs.x = Math.sign(dx); // Force forward
            } else {
                inputs.x = Math.sign(dx); // Chase
            }

            // 2. DASH RESET (Signature Mechanic)
            // If we are attacking (or just finished), DASH immediately to cancel recovery/chase knockback
            if ((me.isAttacking || me.comboCount > 0) && me.dashCooldown <= 0) {
                 inputs.dash = true;
            }
            // Gap Close
            else if (dist > 150 && dist < 400 && me.dashCooldown <= 0 && chance(0.1)) {
                inputs.dash = true;
            }

            // 3. SPECIAL (Thunderclap)
            // Only point-blank interrupt
            if (me.grappleCooldownTimer <= 0 && dist < 120) {
                // High probability if opponent is pressing buttons
                if (opp.isAttacking || chance(0.2)) {
                    inputs.special = true;
                }
            }
            break;

        // ============================================================
        // B. KINETIC (THE BATTERING RAM)
        // Style: Momentum, Air Dives, Pre-shot attacks
        // ============================================================
        case 'KINETIC':
            // 1. MOVEMENT: Always run to keep damage mult up
            inputs.x = Math.sign(dx);

            // 2. SPECIAL: COMET DIVE (Air)
            // If in air, moving up or down, and above player -> SMASH
            const isAbove = (me.y + me.height) < opp.y;
            if (!me.isGrounded && isAbove && Math.abs(dx) < 150 && me.grappleCooldownTimer <= 0) {
                inputs.special = true; 
            }

            // 3. SPECIAL: BLAST JUMP (Ground)
            // Use to launch at opponent from mid-range
            else if (me.isGrounded && dist > 250 && dist < 600 && me.grappleCooldownTimer <= 0) {
                inputs.special = true;
            }

            // 4. PRE-SHOT ATTACK
            // Because Kinetic is fast, swing BEFORE reaching the target
            const speed = Math.abs(me.vx);
            if (speed > 10 && dist < ATTACK_RANGE * 1.5) {
                inputs.attack = true;
            }
            break;

        // ============================================================
        // C. SLINGER (THE AERIALIST)
        // Style: "The Floor is Lava", Offensive Grapple
        // ============================================================
        case 'SLINGER':
            // 1. FLOOR IS LAVA
            if (me.isGrounded) {
                if (chance(0.8)) inputs.jump = true; // Almost always jump immediately
            }

            // 2. MOVEMENT
            inputs.x = Math.sign(dx);

            // 3. GRAPPLE (Offensive)
            if (me.grappleCooldownTimer <= 0 && !me.isGrappling) {
                // Close range snatch
                if (dist < 300 && facingOpp) {
                    inputs.special = true;
                }
                // If opponent is in air, try to catch them
                else if (!opp.isGrounded && dist < 500 && facingOpp && chance(0.5)) {
                    inputs.special = true;
                }
            }

            // 4. GRAPPLE FOLLOW-UP
            // If we hooked someone, ATTACK immediately
            if (me.isGrappling && me.grappleTargetId === opp.id) {
                inputs.attack = true;
            }
            
            // 5. MIX-UP
            // Cross up jump
            if (dist < 100 && chance(0.1)) {
                inputs.jump = true;
                inputs.x = Math.sign(dx); // Jump over
            }
            break;

        // ============================================================
        // D. VORTEX (THE TRICKSTER)
        // Style: Confusion, Delayed Teleport, Cross-ups
        // ============================================================
        case 'VORTEX':
            inputs.x = Math.sign(dx);

            // 1. DASH CROSS-UP
            // If close, dash THROUGH opponent
            if (dist < 150 && me.dashCooldown <= 0 && chance(0.3)) {
                inputs.dash = true;
                inputs.x = Math.sign(dx); 
            }

            // 2. VOID ORB COMBO
            if (me.grappleCooldownTimer <= 0) {
                if (!me.voidOrb?.active) {
                    // Phase A: Throw Orb
                    if (dist > 200 && chance(0.15)) inputs.special = true;
                } else {
                    // Phase B: Teleport Logic
                    // Wait a bit (simulate reading setup) then teleport
                    const orbDist = Math.abs(me.voidOrb.x - opp.x);
                    
                    // If orb is behind opponent (Cross-up setup)
                    const isCrossUp = (me.x < opp.x && me.voidOrb.x > opp.x) || (me.x > opp.x && me.voidOrb.x < opp.x);
                    
                    if (isCrossUp || orbDist < 100) {
                         inputs.special = true; // TELEPORT
                         inputs.attack = true;  // AMBUSH
                    }
                }
            }
            break;
    }

    return inputs;
};

/**
 * MAIN AI CONTROLLER
 */
export const updateAI = (enemy: Fighter, player: Fighter, gameState: GameState): AIInput => {
    // 0. Safety Checks
    if (enemy.isDead || !enemy.aiState) {
        return { x: 0, jump: false, dash: false, attack: false, special: false };
    }

    const ai = enemy.aiState;
    const timeScale = gameState.slowMoFactor;
    const dx = player.x - enemy.x;
    const dist = Math.abs(dx);

    // --- 1. KILL MODE (Zero Latency CQC) ---
    // If the enemy is in your face, NO HESITATION. Frame 1 decisions.
    if (dist < ATTACK_RANGE + 20) {
        ai.actionTimer = 0;
        ai.reactionCooldown = 0;
    }

    // --- 2. REACTION LAG (Difficulty Scaling) ---
    // Only applies if outside "Kill Mode" range.
    // Simulates realization time ("Oh, he jumped").
    const significantChange = player.isAttacking || player.isDashing || (player.prevGrounded !== player.isGrounded);
    
    if (significantChange && ai.reactionCooldown <= 0 && dist >= ATTACK_RANGE + 20) {
        // Difficulty 1.0 = 0 frames lag (Godlike)
        // Difficulty 0.5 = 10 frames lag
        ai.reactionCooldown = 20 * (1 - ai.difficulty);
    }

    if (ai.reactionCooldown > 0) {
        ai.reactionCooldown -= timeScale;
        // Keep doing previous thing while brain lags
        if (ai.nextMove) return ai.nextMove;
    }

    // --- 3. INPUT HOLDING (Action Timer) ---
    // Prevents epileptic jittering at range, makes movement look committed.
    if (ai.actionTimer > 0) {
        ai.actionTimer -= timeScale;
        // Allow interrupting movement for attacks/blocks/techs
        if (enemy.hitFlashTimer <= 0 && ai.nextMove) {
             // If we suddenly get in range while walking, break the hold to attack
             if (dist < ATTACK_RANGE && !ai.nextMove.attack) {
                 ai.actionTimer = 0;
             } else {
                 return ai.nextMove;
             }
        }
    }

    // --- 4. DECISION MAKING ---
    
    // Get Class Specific Strategy
    const inputs = getClassAction(enemy, player, dist, dx, gameState);

    // --- 5. GLOBAL AGGRESSION OVERRIDE ---
    // Priority Rule: If in range, 95% chance to mash attack.
    if (dist < ATTACK_RANGE) {
        if (chance(0.95)) {
            inputs.attack = true;
            // WE REMOVED THE FORCED STOP HERE to allow sticky attacks
        }
    }

    // --- 6. COMBO CHAINING ---
    // If currently attacking, try to queue next hit
    if (enemy.isAttacking && enemy.comboCount < 2) {
        if (dist < ATTACK_RANGE + 50) inputs.attack = true;
    }

    // --- 7. RECOVERY MANAGEMENT ---
    // If we just whiffed a big combo, maybe pause briefly (unless Volt/High Diff)
    if (enemy.attackCooldown > 0 && ai.difficulty < 0.7) {
        inputs.attack = false;
        if (chance(0.5)) inputs.x = -Math.sign(dx); // Back off
    }

    // --- 8. COMMIT & RETURN ---
    // Randomize hold time slightly (5-15 frames) to feel organic
    ai.actionTimer = 5 + Math.random() * 10;
    ai.nextMove = inputs;

    return inputs;
};
