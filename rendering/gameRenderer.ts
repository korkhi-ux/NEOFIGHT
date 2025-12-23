
import { GameState, Fighter } from '../types';
import { COLORS } from '../config/colors';
import { drawBackground } from './drawBackground';
import { drawFighter } from './drawFighter';
import { drawEffects, drawSpeedLines, drawOscilloscope } from './drawEffects';
import { AudioManager } from '../core/AudioManager';

// Easing function for the bounce effect (OutBack)
const easeOutBack = (x: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export const renderGame = (
    ctx: CanvasRenderingContext2D, 
    gameState: GameState, 
    audio: AudioManager | null
) => {
    const { player, enemy, shake, shakeX, shakeY, cameraX, cameraY, cameraZoom, matchState, introStep, introTimer } = gameState;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Shake
    const activeShake = shake + 0.5; 
    const noiseX = (Math.random() - 0.5) * activeShake;
    const noiseY = (Math.random() - 0.5) * activeShake;
    const totalShakeX = noiseX + shakeX;
    const totalShakeY = noiseY + shakeY;

    // --- RENDER PASS ---
    ctx.save();
    
    // Hit Flash
    if (player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,width,height);
        ctx.globalCompositeOperation = 'difference';
    } else {
        ctx.fillStyle = COLORS.backgroundFar;
        ctx.fillRect(0, 0, width, height);
    }

    // Camera Transform
    ctx.translate(width/2, height/2);
    ctx.rotate(gameState.cameraTilt);
    ctx.scale(cameraZoom, cameraZoom);
    ctx.translate(-width/2, -height/2);
    ctx.translate(-cameraX + totalShakeX / cameraZoom, -cameraY + totalShakeY / cameraZoom);

    // Background
    if (!(player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0)) {
        drawBackground(ctx, gameState, width / cameraZoom, cameraX);
    }

    // Entities
    // In Intro, draw active one on top/last
    if (matchState === 'intro' && introStep === 'p1') {
        drawFighter(ctx, enemy, gameState);
        drawFighter(ctx, player, gameState);
    } else if (matchState === 'intro' && introStep === 'p2') {
        drawFighter(ctx, player, gameState);
        drawFighter(ctx, enemy, gameState);
    } else {
        drawFighter(ctx, enemy, gameState);
        drawFighter(ctx, player, gameState);
    }

    // World Effects
    drawEffects(ctx, gameState, width, height, audio);

    // Screen Space Effects (Pop Camera)
    if (Math.abs(player.vx) > 10 || player.isDashing) {
         ctx.restore(); 
         ctx.save();
         drawSpeedLines(ctx, width, height, COLORS.speedLine);
    } else {
        ctx.restore(); 
    }

    // --- CINEMATIC POST PROCESS (UI & INTRO) ---
    if (matchState === 'intro') {
        // 1. Cinemascope Bars (Always draw these first)
        ctx.fillStyle = '#000000';
        const barHeight = height * 0.12;
        ctx.fillRect(0, 0, width, barHeight);
        ctx.fillRect(0, height - barHeight, width, barHeight);

        // 2. Class Insignias (Namecards)
        if (introStep !== 'both') {
            const isP1 = introStep === 'p1';
            const fighter = isP1 ? player : enemy;
            
            // Calculate Timer Progress for current step (0 to 1)
            // Intro is 300 total. P1: 300->200. P2: 200->100.
            let localTimer = 0;
            if (isP1) localTimer = introTimer - 200;
            else localTimer = introTimer - 100;

            // Normalize 100->0 to 0->1
            const rawProgress = 1 - (Math.max(0, localTimer) / 100);
            // Apply Bounce Easing
            const animProgress = easeOutBack(Math.min(1, rawProgress));

            drawInsignia(ctx, fighter, isP1, width, height, animProgress, gameState.frameCount);
        }

        // 3. READY / FIGHT OVERLAY
        // Triggers when timer gets low
        if (introTimer < 70 && introTimer > 0) {
            drawReadyFight(ctx, width, height, introTimer);
        }
    }

    // Oscilloscope (UI Layer)
    if (audio) {
        drawOscilloscope(ctx, width, height, audio);
    }

    // Restore Hit Flash Mode
    if (player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'source-over';
    }
};

/**
 * Draws the stylized Class Insignia (Namecard)
 */
const drawInsignia = (
    ctx: CanvasRenderingContext2D, 
    fighter: Fighter, 
    isP1: boolean, 
    w: number, 
    h: number, 
    progress: number,
    frameCount: number
) => {
    const cardW = 600;
    const cardH = 180;
    
    // Slide in from sides. P1 from Left (-W), P2 from Right (+W)
    // Target X for P1 is 50. Target X for P2 is w - 50 - cardW.
    const targetX = isP1 ? 50 : w - 50 - cardW;
    const startX = isP1 ? -cardW - 50 : w + 50;
    
    const currentX = startX + (targetX - startX) * progress;
    const currentY = h - 180; // Sitting on top of bottom bar

    ctx.save();
    ctx.translate(currentX, currentY);

    // --- CLASS SPECIFIC DESIGNS ---
    switch (fighter.classType) {
        
        // --- 1. VOLT: THE ELECTRIC PHANTOM ---
        case 'VOLT': {
            // Background: Digital Plate with Scanlines
            ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(cardW - 40, 0);
            ctx.lineTo(cardW, 40); // Cut corner
            ctx.lineTo(cardW, cardH);
            ctx.lineTo(0, cardH);
            ctx.fill();
            ctx.stroke();

            // Scanlines
            ctx.save();
            ctx.clip();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for(let i=0; i<cardH; i+=4) {
                ctx.fillRect(0, i, cardW, 1);
            }
            ctx.restore();

            // Background Lightning (Flickering)
            if (Math.random() > 0.8) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(Math.random() * cardW, 0);
                ctx.lineTo(Math.random() * cardW, cardH);
                ctx.stroke();
            }

            // Text
            ctx.textAlign = isP1 ? 'left' : 'right';
            const textX = isP1 ? 20 : cardW - 20;
            
            // Glitchy Flicker Text
            const flicker = Math.random() > 0.9 ? 0.5 : 1;
            ctx.globalAlpha = flicker;
            
            ctx.font = '900 italic 80px Orbitron';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 20;
            ctx.fillText(fighter.classType, textX, 100);
            
            ctx.font = '400 24px monospace';
            ctx.fillStyle = '#67e8f9';
            ctx.shadowBlur = 0;
            ctx.fillText("HIGH VOLTAGE INTERCEPTOR", textX, 135);
            break;
        }

        // --- 2. KINETIC: THE MAGMA BEHEMOTH ---
        case 'KINETIC': {
            // Background: Heavy Metal Plate
            const grad = ctx.createLinearGradient(0, 0, cardW, 0);
            grad.addColorStop(0, '#7c2d12'); // Rust/Red
            grad.addColorStop(1, '#000000');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(cardW, 0);
            ctx.lineTo(cardW - 20, cardH);
            ctx.lineTo(0, cardH);
            ctx.fill();

            // Heavy Frame
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#f97316'; // Orange
            ctx.stroke();

            // Embers (Static for bg)
            ctx.fillStyle = '#fbbf24';
            for(let i=0; i<10; i++) {
                const ex = (frameCount * (i+1) * 2) % cardW;
                const ey = cardH - ((frameCount * (i+1)) % cardH);
                ctx.beginPath();
                ctx.arc(ex, ey, i % 3 + 1, 0, Math.PI*2);
                ctx.fill();
            }

            // Text
            ctx.textAlign = isP1 ? 'left' : 'right';
            const textX = isP1 ? 40 : cardW - 40;

            ctx.font = '900 80px Orbitron';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#ea580c'; // Dark Orange Stroke
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 30; // Heat Glow
            
            ctx.strokeText(fighter.classType, textX, 100);
            ctx.fillText(fighter.classType, textX, 100);

            ctx.font = '700 24px Orbitron';
            ctx.fillStyle = '#fbbf24';
            ctx.shadowBlur = 0;
            ctx.fillText("HEAVY IMPACT UNIT", textX, 135);
            break;
        }

        // --- 3. VORTEX: THE VOID ARCHITECT ---
        case 'VORTEX': {
            // Background: Fragmented Void
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, cardW, cardH);

            // Glitch Blocks
            ctx.fillStyle = '#d946ef'; // Magenta
            for(let i=0; i<5; i++) {
                if (Math.random() > 0.5) {
                    const bx = Math.random() * cardW;
                    const by = Math.random() * cardH;
                    const bw = Math.random() * 100;
                    const bh = Math.random() * 20;
                    ctx.fillRect(bx, by, bw, bh);
                }
            }
            
            // Border (Broken)
            ctx.strokeStyle = '#8b5cf6'; // Violet
            ctx.lineWidth = 2;
            ctx.setLineDash([20, 10, 5, 10]);
            ctx.strokeRect(5, 5, cardW - 10, cardH - 10);
            ctx.setLineDash([]);

            // Text with Exclusion Effect
            ctx.save();
            ctx.globalCompositeOperation = 'exclusion'; // Inverts colors
            
            ctx.textAlign = isP1 ? 'left' : 'right';
            const textX = isP1 ? 30 : cardW - 30;

            // Jitter Text X
            const jitter = (Math.random() - 0.5) * 4;
            
            ctx.font = '900 80px Orbitron';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(fighter.classType, textX + jitter, 100);
            
            ctx.font = '400 24px monospace';
            ctx.fillText("REALITY BENDER", textX - jitter, 135);
            
            ctx.restore();
            break;
        }

        // --- 4. SLINGER: THE AERO ASSASSIN ---
        case 'SLINGER': {
            // Transform: Skew for Speed
            ctx.transform(1, 0, -0.2, 1, 0, 0);

            // Background: Aerodynamic Green Panel
            const grad = ctx.createLinearGradient(0, 0, cardW, 0);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.2, 'rgba(34, 197, 94, 0.2)'); // Green
            grad.addColorStop(0.8, 'rgba(34, 197, 94, 0.2)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad;
            ctx.fillRect(0, 10, cardW, cardH - 20);

            // Wind Lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 30);
            ctx.bezierCurveTo(cardW*0.3, 30, cardW*0.6, 50, cardW, 20);
            ctx.moveTo(0, 140);
            ctx.bezierCurveTo(cardW*0.4, 140, cardW*0.7, 120, cardW, 150);
            ctx.stroke();

            // Text
            ctx.transform(1, 0, 0.2, 1, 0, 0); // Undo skew for text reading, or keep it? Let's undo slighly.
            
            ctx.textAlign = isP1 ? 'left' : 'right';
            const textX = isP1 ? 60 : cardW - 20;

            // Drop Shadow Offset
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.font = 'italic 900 80px Orbitron';
            ctx.fillText(fighter.classType, textX + 5, 100 + 5);

            ctx.fillStyle = '#a3e635'; // Lime
            ctx.fillText(fighter.classType, textX, 100);

            ctx.font = 'italic 700 24px Orbitron';
            ctx.fillStyle = '#ffffff';
            ctx.fillText("AERIAL SPECIALIST", textX, 135);
            break;
        }
    }

    ctx.restore();
};

/**
 * High Impact READY / FIGHT Text Overlay
 */
const drawReadyFight = (ctx: CanvasRenderingContext2D, w: number, h: number, timer: number) => {
    ctx.save();
    ctx.translate(w/2, h/2);
    
    // Timer 70->20 : READY
    // Timer 20->0  : FIGHT
    
    let text = "";
    let color = "";
    let scale = 1;
    let alpha = 1;

    if (timer > 20) {
        text = "READY";
        color = "#fbbf24"; // Amber
        // Subtle Zoom In
        const t = (70 - timer) / 50; // 0 to 1
        scale = 1 + t * 0.5; // 1.0 to 1.5
        alpha = Math.min(1, t * 5); // Fade in quickly
    } else {
        text = "FIGHT";
        color = "#ef4444"; // Red
        // Violent Slam
        const t = (20 - timer) / 20; // 0 to 1
        // Start HUGE (3.0) and slam to 1.0
        scale = 3.0 - (t * 2.0); 
        if (scale < 1.0) scale = 1.0;
        
        // Shake the text
        if (timer > 15) {
            ctx.translate((Math.random()-0.5)*20, (Math.random()-0.5)*20);
        }
    }

    ctx.scale(scale, scale);
    
    ctx.font = "900 italic 150px Orbitron";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Stroke
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#000";
    ctx.strokeText(text, 0, 0);
    
    // Glow
    ctx.shadowBlur = 50;
    ctx.shadowColor = color;
    
    // Fill
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillText(text, 0, 0);
    
    // Additional "White Flash" inside text
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillText(text, 0, 0);

    ctx.restore();
};
