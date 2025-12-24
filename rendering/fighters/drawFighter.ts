
import { Fighter, GameState } from '../../types';
import { drawVolt } from './fighters/drawVolt';
import { drawKinetic } from './fighters/drawKinetic';
import { drawSlinger } from './fighters/drawSlinger';
import { drawVortex } from './fighters/drawVortex';

export const drawFighter = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    
    // --- Death Squash ---
    if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
            f.scaleY *= 0.9; f.scaleX *= 1.1; f.color.glow = '#000';
    }

    // --- Character Body Transform ---
    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height);
    
    // Vortex Glitch Effect (Pre-Rotation)
    if (f.classType === 'VORTEX' && gameState.matchState === 'intro') {
        const offset = (Math.random() - 0.5) * 10 * (1 - f.scaleX);
        ctx.translate(offset, 0);
    }
    
    ctx.rotate(f.rotation); 
    ctx.scale(f.scaleX, f.scaleY);
    
    // --- DELEGATE DRAWING ---
    // Vortex special draw (RGB Split) during intro
    if (f.classType === 'VORTEX' && gameState.matchState === 'intro' && f.scaleX < 0.95) {
        drawVortexIntro(ctx, f, gameState);
    } else {
        switch(f.classType) {
            case 'VOLT': drawVolt(ctx, f, gameState); break;
            case 'KINETIC': drawKinetic(ctx, f, gameState); break;
            case 'SLINGER': drawSlinger(ctx, f, gameState); break;
            case 'VORTEX': drawVortex(ctx, f, gameState); break;
        }
    }
    
    // --- INTRO SPECIFIC VISUALS (Overlays) ---
    if (gameState.matchState === 'intro') {
        drawIntroVisuals(ctx, f, gameState);
    }

    // --- REACTOR EYES ---
    if (f.hitFlashTimer <= 0) {
        const isReady = f.dashCooldown <= 0;
        const isBlinking = !isReady && f.dashCooldown < 15 && Math.floor(Date.now() / 50) % 2 === 0;

        ctx.save();
        if (isReady || isBlinking) {
            ctx.fillStyle = '#ffffff'; 
            ctx.shadowBlur = 15; 
            ctx.shadowColor = '#ffffff';
        } else {
            ctx.fillStyle = '#fbbf24'; 
            ctx.shadowBlur = 0;
        }
        const eyeOffset = f.facing === 1 ? f.width/4 : -f.width/4 - 10;
        ctx.fillRect(eyeOffset, -f.height + 20, 15, 4);
        ctx.restore();
    }

    // --- ATTACK BLADES ---
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

// --- SPECIAL INTRO DRAWERS ---

const drawVortexIntro = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    // RGB Split Effect
    const offsets = [-4, 0, 4];
    const colors = ['#ff0000', '#00ff00', '#0000ff'];
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    offsets.forEach((off, i) => {
        ctx.save();
        ctx.translate(off + (Math.random()-0.5)*5, (Math.random()-0.5)*2);
        
        // Draw Simplified Body
        const bodyW = f.width;
        const bodyH = f.height;
        ctx.fillStyle = colors[i];
        
        // Glitch Slices
        const slices = 6; const sliceH = bodyH / slices;
        for(let s=0; s<slices; s++) {
            const shift = (Math.random() - 0.5) * 10;
            ctx.fillRect((-bodyW/2) + shift, -bodyH + (s*sliceH), bodyW, sliceH - 1);
        }
        ctx.restore();
    });
    ctx.restore();
};

const drawIntroVisuals = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    // KINETIC: METEORITE RE-ENTRY
    if (f.classType === 'KINETIC' && !f.isGrounded) {
        ctx.save();
        
        // Meteorite Glow
        const rad = f.height * 0.8;
        const grad = ctx.createRadialGradient(0, -f.height/2, rad * 0.5, 0, -f.height/2, rad * 1.5);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#fbbf24'); // Amber
        grad.addColorStop(0.6, '#f97316'); // Orange
        grad.addColorStop(1, 'rgba(249, 115, 22, 0)');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -f.height/2, rad * 1.5, 0, Math.PI*2);
        ctx.fill();

        // Heat Distortion / Mach Rings
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const scale = 1 + (gameState.frameCount % 20) / 20 + i * 0.5;
            const alpha = 1 - ((gameState.frameCount % 20) / 20);
            ctx.globalAlpha = alpha * 0.5;
            ctx.beginPath();
            ctx.ellipse(0, -f.height/2 - 20, f.width * scale, f.height * 0.5 * scale, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Fire Trail (Upwards)
        ctx.fillStyle = '#ea580c';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-f.width/2, -f.height);
        ctx.lineTo(0, -f.height * 3);
        ctx.lineTo(f.width/2, -f.height);
        ctx.fill();

        ctx.restore();
    }
    // VOLT: STATIC DISCHARGE EXPLOSION
    else if (f.classType === 'VOLT') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#06b6d4';
        
        // Aggressive Arcs
        const count = 8;
        for(let i=0; i<count; i++) {
            ctx.beginPath();
            ctx.moveTo(0, -f.height/2);
            const len = 80 + Math.random() * 120;
            const angle = (Math.PI * 2 / count) * i + gameState.frameCount * 0.2;
            
            // ZigZag
            let cx = 0, cy = -f.height/2;
            for(let j=0; j<4; j++) {
                const segLen = len / 4;
                cx += Math.cos(angle) * segLen + (Math.random()-0.5)*20;
                cy += Math.sin(angle) * segLen + (Math.random()-0.5)*20;
                ctx.lineTo(cx, cy);
            }
            ctx.lineWidth = Math.random() * 4;
            ctx.stroke();
        }
        ctx.restore();
    }
    // SLINGER: TAUT ROPEM & SPARK
    else if (f.classType === 'SLINGER' && f.isGrappling) {
        ctx.save();
        ctx.strokeStyle = '#94a3b8'; // Steel
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -f.height * 0.8);
        ctx.lineTo(0, -1000); 
        ctx.stroke();
        
        // Spark at shoulder
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 10;
        
        const sparkSize = 5 + Math.random() * 10;
        ctx.beginPath();
        ctx.arc(0, -f.height * 0.8, sparkSize, 0, Math.PI*2);
        ctx.fill();
        
        // Particles falling from rope
        if (Math.random() > 0.5) {
            ctx.fillStyle = '#cccccc';
            ctx.fillRect((Math.random()-0.5)*4, -f.height*0.8 - Math.random()*200, 2, 2);
        }

        ctx.restore();
    }
};
