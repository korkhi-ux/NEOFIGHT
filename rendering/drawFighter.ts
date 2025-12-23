
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
