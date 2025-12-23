
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

// Random helper
const chance = (pct: number) => Math.random() < pct;

/**
 * MAIN AI CONTROLLER
 * Acts as the central nervous system handling reaction time, state buffering,
 * and dispatching specific strategies based on class.
 */
export const updateAI = (enemy: Fighter, player: Fighter, gameState: GameState): AIInput => {
    // 0. Dead Check
    if (enemy.isDead || !enemy.aiState) {
        return { x: 0, jump: false, dash: false, attack: false, special: false };
    }

    const ai = enemy.aiState;
    const timeScale = gameState.slowMoFactor;

    // --- 1. REACTION LATENCY SYSTEM ---
    // Simulates human reaction time. The AI cannot react instantly to new player states
    // unless it predicted them or is on max difficulty.
    
    // Detect significant player state change (Start of attack or dash)
    const playerThreat = player.isAttacking || player.isDashing;
    
    if (playerThreat && ai.reactionCooldown <= 0) {
        // Difficulty 0.0 -> 20 frames lag (333ms)
        // Difficulty 1.0 -> 4 frames lag (66ms)
        ai.reactionCooldown = 20 - (ai.difficulty * 16);
    }

    // While 'reacting', keep doing the previous move (Mental buffer)
    if (ai.reactionCooldown > 0) {
        ai.reactionCooldown -= timeScale;
        if (ai.nextMove) return ai.nextMove;
    }

    // --- 2. ACTION COMMITMENT (Anti-Jitter) ---
    // Humans don't switch inputs every frame. We commit to an action for a split second.
    if (ai.actionTimer > 0) {
        ai.actionTimer -= timeScale;
        
        // Exception: Teching/Combo Breaking allowed if hit
        if (enemy.hitFlashTimer > 0) ai.actionTimer = 0;
        else if (ai.nextMove) return ai.nextMove;
    }

    // --- 3. WHIFF & ERROR SYSTEM ---
    // Low difficulty AIs sometimes just mess up or stand still.
    if (ai.difficulty < 0.8 && chance(0.01)) {
        ai.actionTimer = 20;
        return { x: 0, jump: false, dash: false, attack: false, special: false };
    }

    // --- 4. STRATEGIC DISPATCH ---
    let move: AIInput;

    switch (enemy.classType) {
        case 'VOLT':
            move = getVoltAI(enemy, player, ai.difficulty);
            break;
        case 'KINETIC':
            move = getKineticAI(enemy, player, ai.difficulty);
            break;
        case 'VORTEX':
            move = getVortexAI(enemy, player, ai.difficulty);
            break;
        case 'SLINGER':
            move = getSlingerAI(enemy, player, ai.difficulty);
            break;
        default:
            move = { x: 0, jump: false, dash: false, attack: false, special: false };
    }

    // --- 5. GLOBAL AGGRESSION OVERLAY ---
    // Logic applicable to all classes (Combo Chaining)
    
    // Auto-Combo: If attacking and close, mash attack
    const dist = Math.abs(enemy.x - player.x);
    if (enemy.isAttacking && enemy.comboCount < 2 && dist < ATTACK_RANGE + 40) {
        move.attack = true;
    }

    // Commit to this decision
    // Aggressive AI commits for shorter times (more reactive)
    ai.actionTimer = 10 - (ai.difficulty * 5); 
    ai.nextMove = move;

    return move;
};

// ============================================================================
// ⚡ VOLT: THE RUSH_DOWN
// Archetype: Fox (Smash) / Chipp (Guilty Gear)
// Logic: Dash Reset, Interrupts, Glue to target
// ============================================================================
const getVoltAI = (me: Fighter, opp: Fighter, diff: number): AIInput => {
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const input: AIInput = { x: 0, jump: false, dash: false, attack: false, special: false };

    // 1. AGGRESSIVE MOVEMENT
    // Always move towards opponent
    input.x = Math.sign(dx);

    // 2. DASH RESET MECHANIC (Signature)
    // Volt's cooldown resets on hit. If we just hit (attackTimer active) and cooldown is 0,
    // DASH IMMEDIATELY to chase the knockback.
    if (me.isAttacking && me.dashCooldown <= 0 && chance(0.9 * diff)) {
        input.dash = true;
    }
    // Gap Closer Dash
    else if (dist > 150 && dist < 400 && me.dashCooldown <= 0 && chance(0.1)) {
        input.dash = true;
    }

    // 3. SPECIAL: THUNDERCLAP (Interruption)
    // Use strictly for short-range checks or combo filler
    if (me.grappleCooldownTimer <= 0) {
        // If opponent is winding up an attack and is close -> STUN THEM
        if (dist < 140 && opp.isAttacking && chance(diff)) {
            input.special = true;
        }
        // Or randomly during pressure
        else if (dist < 100 && chance(0.05)) {
            input.special = true;
        }
    }

    // 4. ATTACK
    if (dist < ATTACK_RANGE) {
        input.attack = true;
        // Don't move while attacking to prevent sliding past
        input.x = 0; 
    }

    return input;
};

// ============================================================================
// ☄️ KINETIC: THE JUGGERNAUT
// Archetype: Captain Falcon / Potemkin
// Logic: Build Momentum, Dive Bomb, never stop moving
// ============================================================================
const getKineticAI = (me: Fighter, opp: Fighter, diff: number): AIInput => {
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const input: AIInput = { x: 0, jump: false, dash: false, attack: false, special: false };

    // 1. MOMENTUM PRESERVATION
    // If moving fast, prefer maintaining direction to keep Damage Mult high
    const speed = Math.abs(me.vx);
    if (speed > 10 && Math.sign(me.vx) !== Math.sign(dx) && dist > 200) {
        // We are going fast the wrong way, but maybe we loop around the world? 
        // No, turn around but it takes time due to friction
        input.x = Math.sign(dx);
    } else {
        input.x = Math.sign(dx);
    }

    // 2. SPECIAL: COMET DIVE (Aerial)
    // Trigger if above opponent and horizontal distance is close
    const isAbove = (me.y + me.height) < opp.y;
    if (!me.isGrounded && isAbove && dist < 120 && me.grappleCooldownTimer <= 0) {
        input.special = true; // SMASH
    }

    // 3. SPECIAL: BLAST JUMP (Grounded)
    // Use to launch at opponent from mid-range
    if (me.isGrounded && dist > 350 && dist < 700 && me.grappleCooldownTimer <= 0) {
        if (chance(0.2 * diff)) input.special = true;
    }

    // 4. MOVEMENT VARIATION
    // Bunny hop to build speed (Wavedash style simulation)
    if (me.isGrounded && chance(0.05)) {
        input.jump = true;
    }
    // Dash to start momentum
    if (me.isGrounded && speed < 5 && me.dashCooldown <= 0) {
        input.dash = true;
    }

    // 5. ATTACK (Drive-by)
    if (dist < ATTACK_RANGE * 1.5) { // Kinetic has huge hitboxes, swing early
        input.attack = true;
    }

    return input;
};

// ============================================================================
// 🔮 VORTEX: THE TRICKSTER
// Archetype: Zelda / Mewtwo
// Logic: Setups, Cross-ups, Teleports
// ============================================================================
const getVortexAI = (me: Fighter, opp: Fighter, diff: number): AIInput => {
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const input: AIInput = { x: 0, jump: false, dash: false, attack: false, special: false };

    // 1. MOVEMENT
    // erratic, changes direction often
    input.x = Math.sign(dx);

    // 2. DEFENSIVE BLINK (Dash)
    // If opponent attacks, blink THROUGH them
    if (opp.isAttacking && dist < 150 && me.dashCooldown <= 0) {
        input.dash = true;
        // Force direction towards opponent to cross up
        input.x = Math.sign(dx); 
    }

    // 3. ORB LOGIC (The Core Loop)
    if (me.grappleCooldownTimer <= 0) {
        if (!me.voidOrb?.active) {
            // STEP A: Launch Orb
            if (dist > 300 && chance(0.1)) {
                input.special = true;
            }
        } else {
            // STEP B: Teleport Logic
            const orb = me.voidOrb;
            
            // Calculate if Orb is in a "Cross-up" position (Behind opponent)
            // Player is between Me and Orb
            const isCrossUp = (me.x < opp.x && orb.x > opp.x) || (me.x > opp.x && orb.x < opp.x);
            
            if (isCrossUp && chance(0.5 * diff)) {
                input.special = true; // TELEPORT BEHIND
                input.attack = true; // ATTACK INSTANTLY
            }
            // Timeout safety: Teleport if orb is about to expire to reset
            else if (orb.life < 20) {
                input.special = true;
            }
        }
    }

    // 4. ATTACK
    if (dist < ATTACK_RANGE) {
        input.attack = true;
    }

    return input;
};

// ============================================================================
// 🕷️ SLINGER: THE AERIAL SNIPER
// Archetype: Spider-Man / Spencer
// Logic: Air supremacy, Grapple hooks
// ============================================================================
const getSlingerAI = (me: Fighter, opp: Fighter, diff: number): AIInput => {
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const input: AIInput = { x: 0, jump: false, dash: false, attack: false, special: false };

    // 1. AERIAL BIAS
    // Slinger hates the ground.
    if (me.isGrounded && chance(0.3)) {
        input.jump = true;
    }
    
    // 2. MOVEMENT
    input.x = Math.sign(dx);

    // 3. SPECIAL: GRAPPLE HOOK
    if (me.grappleCooldownTimer <= 0 && !me.isGrappling) {
        
        // Scenario A: Opponent is jumping (Anti-Air Snatch)
        if (opp.y < GROUND_Y - 100 && dist < 600) {
            if (Math.sign(dx) === me.facing) { // Must face target
                input.special = true;
            } else {
                input.x = Math.sign(dx); // Turn around first
            }
        }
        
        // Scenario B: Gap Close (If far away)
        else if (dist > 500 && chance(0.2)) {
             input.special = true;
        }

        // Scenario C: Wall Escape (If Cornered)
        const isCornered = me.x < 100 || me.x > WORLD_WIDTH - 100;
        if (isCornered && dist < 200) {
            // Grapple wall behind us? Or ceiling?
            // Simplified: Just jump and grapple
            input.jump = true;
            input.special = true;
        }
    }

    // 4. ATTACK
    if (dist < ATTACK_RANGE) {
        input.attack = true;
    }

    return input;
};
