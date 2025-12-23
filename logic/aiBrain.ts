
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
    const oppCenterX = opp.x + opp.width / 2;
    const oppCenterY = opp.y + opp.height / 2;

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
        // C. SLINGER (THE AERIAL PREDATOR)
        // Style: Never touches ground, Snipes with Grapple, Commits to Impact
        // ============================================================
        case 'SLINGER':
            // 1. AERIAL PRIORITY (The Floor is Lava)
            if (me.isGrounded) {
                // 90% chance to jump immediately if grounded
                if (chance(0.9)) inputs.jump = true; 
            }

            // 2. MOVEMENT & TARGETING
            inputs.x = Math.sign(dx);

            // 3. GRAPPLE LOGIC (Meteor Kick Setup)
            if (me.grappleCooldownTimer <= 0 && !me.isGrappling) {
                // If we are AIRBORNE and facing opponent -> FIRE
                if (!me.isGrounded && facingOpp && dist < 600) {
                    inputs.special = true;
                }
                // Ground panic button if close
                else if (dist < 200 && facingOpp) {
                    inputs.special = true;
                }
            }

            // 4. METEOR KICK COMMITMENT
            // If we are flying towards them (Grapple Active), ensure we connect hard
            if (me.isGrappling || me.isGrappleAttacking) {
                inputs.x = Math.sign(dx); // Force direction towards enemy
                inputs.attack = true;     // Spam attack to trigger crit on impact
                
                // If we hooked a wall above, jump to release momentum
                if (!me.grappleTargetId && me.y < opp.y && chance(0.1)) {
                     inputs.jump = true; 
                }
            }
            
            // 5. CROSS UP
            if (dist < 100 && me.isGrounded && chance(0.2)) {
                inputs.jump = true;
                inputs.x = Math.sign(dx); // Jump over
            }
            break;

        // ============================================================
        // D. VORTEX (THE SPACE CONTROL NUKE)
        // Style: Kiting, Radiation Trap, Teleport Execution
        // ============================================================
        case 'VORTEX':
            // 1. MOVEMENT & KITING
            // Vortex is fast (4.5 speed). If special is down and enemy is close, RUN.
            if (dist < 100 && me.grappleCooldownTimer > 20) {
                inputs.x = -Math.sign(dx); // Retreat
                if (chance(0.1)) inputs.dash = true; // Panic dash away
            } else {
                inputs.x = Math.sign(dx); // Approach normally
            }

            // 2. VOID ORB STRATEGY
            if (me.grappleCooldownTimer <= 0) {
                if (!me.voidOrb?.active) {
                    // PHASE A: DEPLOY TRAP
                    // Ideal range: 200-450px. Throw it to create the radiation field.
                    if (dist > 180 && dist < 450 && facingOpp) {
                        inputs.special = true;
                    }
                } else {
                    // PHASE B: EXECUTE (THE NUKE)
                    // Calculate distance from ORB to ENEMY (Not AI to Enemy)
                    const orbX = me.voidOrb.x;
                    const orbY = me.voidOrb.y;
                    const distOrbPlayer = Math.sqrt(Math.pow(orbX - oppCenterX, 2) + Math.pow(orbY - oppCenterY, 2));

                    // If player is trapped in the singularity (< 160px), DETONATE.
                    if (distOrbPlayer < 160) {
                         inputs.special = true; // Teleport & Boom
                         inputs.attack = true;  // Buffer attack frame 1
                    }
                }
            }

            // 3. OPPORTUNISTIC DASH
            // If enemy is far and we are safe, dash to close gap or cross up
            if (dist > 400 && me.dashCooldown <= 0 && chance(0.05)) {
                inputs.dash = true;
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
    
    // --- HUMAN ERROR FACTOR ---
    // Expert (1.0) has 5% error rate, Easy (0.0) has 20% error rate.
    const errorChance = 0.20 - (ai.difficulty * 0.15); 

    // --- 1. KILL MODE (Zero Latency CQC) ---
    // If the enemy is in your face, NO HESITATION. Frame 1 decisions.
    // However, we introduce a tiny confusion chance even here for "whiffing".
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
             } 
             // Slinger/Vortex special handling: interrupt movement to fire special
             else if ((enemy.classType === 'SLINGER' || enemy.classType === 'VORTEX') && !ai.nextMove.special && enemy.grappleCooldownTimer <= 0) {
                 ai.actionTimer = 0;
             }
             else {
                 return ai.nextMove;
             }
        }
    }

    // --- 4. DECISION MAKING ---
    
    // Get Class Specific Strategy
    const inputs = getClassAction(enemy, player, dist, dx, gameState);

    // --- 5. GLOBAL AGGRESSION & WHIFFING LOGIC ---
    // Priority Rule: If in range, high chance to attack.
    // HUMANIZER: We artificially extend the attack range by random amount to simulate bad spacing (whiffing)
    const whiffRange = ATTACK_RANGE + (Math.random() * 80 * errorChance); // Can overshoot by up to 80px on low difficulty
    
    if (dist < whiffRange) {
        // 95% chance to mash attack if perceived in range
        if (chance(0.95)) {
            inputs.attack = true;
        }
    }

    // --- 6. MOVEMENT MIS-INPUT (Panic Dash) ---
    // HUMANIZER: Chance to dash in the wrong direction
    if (inputs.dash) {
        // If we trigger the error chance, flip the X input or dash randomly
        if (chance(errorChance * 0.5)) { // 5-10% chance
            inputs.x = -inputs.x; // Dash backwards/wrong way
        }
    }

    // --- 7. SPECIAL MOVE HESITATION ---
    // HUMANIZER: If logic says "Special", we roll a confidence check.
    // If failed, we don't fire THIS frame. Since this runs every frame, 
    // it effectively creates a variable delay (Hesitation) before execution.
    if (inputs.special) {
        // 15% chance to hesitate per frame
        if (chance(0.15)) {
            inputs.special = false;
        }
    }

    // --- 8. COMBO CHAINING ---
    // If currently attacking, try to queue next hit
    if (enemy.isAttacking && enemy.comboCount < 2) {
        if (dist < ATTACK_RANGE + 50) inputs.attack = true;
    }

    // --- 9. RECOVERY MANAGEMENT ---
    // If we just whiffed a big combo, maybe pause briefly (unless Volt/High Diff)
    if (enemy.attackCooldown > 0 && ai.difficulty < 0.7) {
        inputs.attack = false;
        if (chance(0.5)) inputs.x = -Math.sign(dx); // Back off
    }

    // --- 10. COMMIT & RETURN ---
    // Randomize hold time slightly (5-15 frames) to feel organic
    ai.actionTimer = 5 + Math.random() * 10;
    ai.nextMove = inputs;

    return inputs;
};
