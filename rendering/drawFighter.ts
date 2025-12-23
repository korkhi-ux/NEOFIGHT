
import { Fighter, GameState } from '../types';
import { drawVolt } from './fighters/drawVolt';
import { drawKinetic } from './fighters/drawKinetic';
import { drawSlinger } from './fighters/drawSlinger';
import { drawVortex } from './fighters/drawVortex';

export const drawFighter = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    
    // --- Trails (Volt Neon or Standard) ---
    if (f.trail.length > 1) {
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); const last = f.trail[f.trail.length-1];
        ctx.moveTo(last.x + f.width/2, last.y + f.height/2);
        for(let i=f.trail.length-2; i>=0; i--) { const t = f.trail[i]; ctx.lineTo(t.x + f.width/2, t.y + f.height/2); }
        ctx.lineTo(f.x + f.width/2, f.y + f.height/2);
        
        ctx.lineWidth = f.width * 0.6; 
        ctx.strokeStyle = f.color.glow; 
        
        // VOLT TRAIL: Lighter, brighter
        if (f.classType === 'VOLT') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.4;
        } else {
            ctx.globalAlpha = 0.15;
        }
        
        ctx.stroke();
        ctx.restore();
    }

    // --- Death Squash ---
    if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
            f.scaleY *= 0.9; f.scaleX *= 1.1; f.color.glow = '#000';
    }

    // --- Character Body Transform ---
    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height);
    ctx.rotate(f.rotation); 
    ctx.scale(f.scaleX, f.scaleY);
    
    // --- DELEGATE DRAWING ---
    switch(f.classType) {
        case 'VOLT': drawVolt(ctx, f, gameState); break;
        case 'KINETIC': drawKinetic(ctx, f, gameState); break;
        case 'SLINGER': drawSlinger(ctx, f, gameState); break;
        case 'VORTEX': drawVortex(ctx, f, gameState); break;
    }
    
    // --- INTRO SPECIFIC VISUALS ---
    if (gameState.matchState === 'intro') {
        drawIntroVisuals(ctx, f, gameState);
    }

    // --- REACTOR EYES / DASH INDICATOR ---
    // Only draw if not hit-flashing (generic hit flash overrides eyes)
    if (f.hitFlashTimer <= 0) {
        const isReady = f.dashCooldown <= 0;
        const isBlinking = !isReady && f.dashCooldown < 15 && Math.floor(Date.now() / 50) % 2 === 0;

        ctx.save();
        
        if (isReady || isBlinking) {
            // READY STATE: Pure White Hot
            ctx.fillStyle = '#ffffff'; 
            ctx.shadowBlur = 15; 
            ctx.shadowColor = '#ffffff';
        } else {
            // RECHARGE STATE: Industrial Amber
            ctx.fillStyle = '#fbbf24'; 
            ctx.shadowBlur = 0;
        }

        const eyeOffset = f.facing === 1 ? f.width/4 : -f.width/4 - 10;
        // Draw the "Common" eye which acts as a pupil/status light on top of class visuals
        ctx.fillRect(eyeOffset, -f.height + 20, 15, 4);
        
        ctx.restore();
    }

    // --- ANIME NEEDLE BLADES ---
    if (f.isAttacking) {
        const bodyH = f.height;
        ctx.translate(0, -bodyH * 0.55);
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 0; 
        const bladeColor = f.color.glow; 
        const jitter = Math.sin(gameState.frameCount * 0.8) * 0.02; 
        let baseAngle = 0; let bladeLength = 280; let bladeThickness = 12; 
        if (f.comboCount === 0) { baseAngle = -0.18; bladeLength = 280; bladeThickness = 14; } 
        else if (f.comboCount === 1) { baseAngle = 0.18; bladeLength = 300; bladeThickness = 16; } 
        else { baseAngle = 0; bladeLength = 550; bladeThickness = 22; }

        ctx.save(); ctx.scale(f.facing, 1); ctx.rotate(baseAngle + jitter); 
        const grad = ctx.createLinearGradient(0, 0, bladeLength, 0);
        grad.addColorStop(0, bladeColor); grad.addColorStop(0.3, bladeColor); grad.addColorStop(1, 'rgba(0,0,0,0)'); 
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(bladeLength * 0.4, -bladeThickness, bladeLength, 0);
        ctx.quadraticCurveTo(bladeLength * 0.4, bladeThickness, 0, 0);
        ctx.fillStyle = grad; ctx.globalAlpha = 0.8; ctx.fill();
        drawNeedle(ctx, bladeLength * 0.95, bladeThickness * 0.25, '#ffffff', 1.0);
        ctx.restore(); 
        ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.restore();
};

const drawNeedle = (ctx: CanvasRenderingContext2D, len: number, thick: number, color: string, alpha: number) => {
    ctx.beginPath(); ctx.moveTo(0, 0); 
    ctx.quadraticCurveTo(len * 0.4, -thick, len, 0);
    ctx.quadraticCurveTo(len * 0.4, thick, 0, 0);
    ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fill();
};

const drawIntroVisuals = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    // Note: Context is transformed to (f.x + f.width/2, f.y + f.height), rotated, scaled.
    // (0, 0) is bottom-center of fighter. (0, -f.height) is top-center.

    if (f.classType === 'KINETIC' && !f.isGrounded) {
        // --- ORBITAL DROP HEAT SHIELD ---
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const vibration = (Math.random() - 0.5) * 8;
        
        // Heat Cone Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, -f.height * 1.2);
        grad.addColorStop(0, 'rgba(255, 150, 0, 0)');
        grad.addColorStop(1, 'rgba(255, 50, 0, 0.5)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 10); // Tip slightly below feet
        ctx.lineTo(-f.width * 1.2 + vibration, -f.height * 1.5);
        ctx.lineTo(f.width * 1.2 + vibration, -f.height * 1.5);
        ctx.fill();

        // Mach Cone Shockwave
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Draw an upward arc
        ctx.arc(0, -f.height * 1.2, f.width * 1.5, Math.PI * 0.8, Math.PI * 2.2);
        ctx.stroke();

        ctx.restore();
    }
    else if (f.classType === 'VORTEX') {
        // --- DATA MATERIALIZATION ---
        // While scaling up (appearing), draw digital noise
        if (f.scaleX < 0.9) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            
            // Random Horizontal Glitch Lines
            ctx.fillStyle = f.color.glow;
            for(let i=0; i<3; i++) {
                const y = -Math.random() * f.height;
                const h = Math.random() * 4 + 2;
                const w = f.width * (1 + Math.random());
                const x = -w/2;
                ctx.fillRect(x, y, w, h);
            }

            // Wireframe-ish Outline overlay
            ctx.strokeStyle = f.color.primary;
            ctx.lineWidth = 1;
            ctx.strokeRect(-f.width/2, -f.height, f.width, f.height);
            
            ctx.restore();
        }
    }
    else if (f.classType === 'VOLT') {
        // --- LIGHTNING ARRIVAL ---
        // Just landed (checking a small window of groundedness/timer would be ideal, 
        // but just drawing residual static when grounded in intro is good)
        if (f.isGrounded) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            
            // Static discharge ground arcs
            for(let i=0; i<3; i++) {
                if(Math.random() > 0.5) continue;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const angle = -Math.PI/2 + (Math.random()-0.5) * Math.PI;
                const len = 40 + Math.random() * 40;
                ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
                ctx.stroke();
            }
            
            // Body glow flash
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 30 + Math.random() * 20;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(-f.width/2, -f.height, f.width, f.height);
            
            ctx.restore();
        }
    }
};
