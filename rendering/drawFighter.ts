
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

    // --- CLASS SPECIFIC ATTACK VFX (RESKINNED) ---
    if (f.isAttacking) {
        const bodyH = f.height;
        ctx.translate(0, -bodyH * 0.55);
        
        // Common Combo Math
        let baseAngle = 0; let bladeLength = 280; let bladeThickness = 12; 
        if (f.comboCount === 0) { baseAngle = -0.18; bladeLength = 280; bladeThickness = 14; } 
        else if (f.comboCount === 1) { baseAngle = 0.18; bladeLength = 300; bladeThickness = 16; } 
        else { baseAngle = 0; bladeLength = 550; bladeThickness = 22; }

        ctx.save(); 
        ctx.scale(f.facing, 1); 
        const jitter = Math.sin(gameState.frameCount * 0.8) * 0.02; 
        ctx.rotate(baseAngle + jitter); 

        // Dispatch Draw Call per Class
        switch(f.classType) {
            case 'VOLT':
                drawThunderSlash(ctx, bladeLength, bladeThickness, f.color.glow);
                break;
            case 'KINETIC':
                drawMagmaSmash(ctx, bladeLength, bladeThickness, f.color.primary);
                break;
            case 'VORTEX':
                drawVoidTear(ctx, bladeLength, bladeThickness, f.color.glow, gameState.frameCount);
                break;
            case 'SLINGER':
                drawAeroEdge(ctx, bladeLength, bladeThickness, f.color.glow);
                break;
            default:
                // Fallback (Needle)
                drawThunderSlash(ctx, bladeLength, bladeThickness, '#ffffff');
                break;
        }

        ctx.restore(); 
    }
    
    ctx.restore();
};

// --- VFX FUNCTIONS ---

const drawThunderSlash = (ctx: CanvasRenderingContext2D, len: number, thick: number, color: string) => {
    // VOLT: Jagged, Electric, Sharp
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;

    // Core Lightning
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Zig Zag Pattern
    ctx.lineTo(len * 0.3, -thick * 2); 
    ctx.lineTo(len * 0.6, thick * 1.5);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.7, thick * 0.5); // Return path
    ctx.lineTo(0, 0);
    
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = grad;
    ctx.fill();

    // Outer Sparks
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(len * 0.8, -thick * 3);
    ctx.stroke();
};

const drawMagmaSmash = (ctx: CanvasRenderingContext2D, len: number, thick: number, color: string) => {
    // KINETIC: Heavy, Blunt, Explosive Cone
    ctx.globalCompositeOperation = 'source-over'; // Heavy paint look
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fbbf24'; // Orange Glow

    // Draw the "Smash" Cone
    ctx.beginPath();
    ctx.moveTo(0, -thick);
    ctx.lineTo(len, -thick * 5); // Wide tip
    ctx.lineTo(len, thick * 5);  // Wide tip
    ctx.lineTo(0, thick);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, '#f97316'); // Kinetic Orange
    grad.addColorStop(0.6, '#7c2d12'); // Dark Magma
    grad.addColorStop(1, 'rgba(0,0,0,0)'); // Fade

    ctx.fillStyle = grad;
    ctx.fill();

    // Heat White Core
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(len * 0.1, -thick, len * 0.4, thick * 2);
};

const drawVoidTear = (ctx: CanvasRenderingContext2D, len: number, thick: number, color: string, frame: number) => {
    // VORTEX: Glitchy, Dark, Fragmented
    ctx.globalCompositeOperation = 'exclusion'; // Weird inverted look
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#d946ef';

    // The Rift (Black Core)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len*0.2, -thick*3, len*0.8, thick*3, len, 0);
    ctx.bezierCurveTo(len*0.8, -thick*2, len*0.2, thick*2, 0, 0);
    ctx.fill();

    // Glitch Rectangles around it
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    
    for(let i=0; i<5; i++) {
        const offset = (Math.random() - 0.5) * thick * 4;
        const xPos = Math.random() * len;
        const w = Math.random() * 40 + 10;
        ctx.fillRect(xPos, offset, w, 2);
    }
};

const drawAeroEdge = (ctx: CanvasRenderingContext2D, len: number, thick: number, color: string) => {
    // SLINGER: Smooth, Curved, Wind Scythe
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowBlur = 5;
    ctx.shadowColor = color;

    // Perfect Crescent
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Control points create a C shape
    ctx.quadraticCurveTo(len * 0.5, -thick * 6, len, 0);
    ctx.quadraticCurveTo(len * 0.5, -thick * 2, 0, 0);
    
    const grad = ctx.createLinearGradient(0, -thick*3, len, 0);
    grad.addColorStop(0, '#ffffff'); // White hot start
    grad.addColorStop(0.3, color);   // Green body
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.8;
    ctx.fill();

    // Wind Lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(len * 0.2, -thick * 4);
    ctx.quadraticCurveTo(len * 0.6, -thick * 8, len * 0.9, -thick * 2);
    ctx.stroke();
};
