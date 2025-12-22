
import { Fighter, GameState } from '../types';

export const drawFighter = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    
    // --- KINETIC VFX ---
    const isKinetic = f.classType === 'KINETIC';
    const speed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
    
    if (isKinetic) {
        ctx.save();
        ctx.translate(f.x + f.width/2, f.y + f.height/2);

        // 1. SPEED LINES (Velocity > 8)
        if (speed > 8) {
             ctx.globalAlpha = Math.min(0.6, (speed - 8) / 10);
             ctx.strokeStyle = '#ffffff';
             ctx.lineWidth = 3; 
             
             const angle = Math.atan2(f.vy, f.vx);
             const backX = -Math.cos(angle);
             const backY = -Math.sin(angle);
             
             for(let i=0; i<3; i++) {
                 const offset = (gameState.frameCount * 20 + i * 50) % 100;
                 const sx = (Math.random() - 0.5) * 40;
                 const sy = (Math.random() - 0.5) * 40;
                 
                 ctx.beginPath();
                 ctx.moveTo(sx, sy);
                 ctx.lineTo(sx + backX * (50 + offset), sy + backY * (50 + offset));
                 ctx.stroke();
             }
        }
        
        // 2. POST-COMBUSTION
        if (f.isDashing || (!f.isGrounded && speed > 20)) {
            const angle = Math.atan2(f.vy, f.vx);
            ctx.rotate(angle);
            ctx.fillStyle = '#f97316'; 
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#fbbf24'; 
            
            ctx.beginPath();
            ctx.moveTo(-30, 0); 
            ctx.lineTo(-80 - Math.random() * 20, -15);
            ctx.lineTo(-80 - Math.random() * 20, 15);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-30, 0);
            ctx.lineTo(-60, -5);
            ctx.lineTo(-60, 5);
            ctx.fill();
        }
        ctx.restore();
    }

    // --- VORTEX: VOID ORB RENDER ---
    if (f.classType === 'VORTEX' && f.voidOrb && f.voidOrb.active) {
        const { x, y } = f.voidOrb;
        ctx.save();
        ctx.translate(x, y);
        const pulse = Math.sin(gameState.frameCount * 0.2) * 5;
        ctx.shadowBlur = 20; ctx.shadowColor = f.color.glow;
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 10 + pulse * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = f.color.glow; ctx.stroke();
        if (Math.random() < 0.3) {
             ctx.fillStyle = f.color.secondary;
             const angle = Math.random() * Math.PI * 2; const dist = 30 + Math.random() * 20;
             const px = Math.cos(angle) * dist; const py = Math.sin(angle) * dist;
             ctx.fillRect(px, py, 4, 4);
        }
        ctx.restore();
    }

    // --- SLINGER: GRAPPLE ROPE RENDER ---
    if (f.classType === 'SLINGER' && f.isGrappling && f.grapplePoint) {
        const startX = f.x + f.width/2; const startY = f.y + f.height * 0.55; 
        const endX = f.grapplePoint.x; const endY = f.grapplePoint.y;
        const isEnemyHook = f.grappleTargetId !== null;
        const baseColor = isEnemyHook ? '#ffff00' : f.color.glow;
        const coreColor = isEnemyHook ? '#ffffff' : '#ccffcc';

        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const segments = 30; 
        const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const tightness = Math.min(dist / 600, 1);
        const amplitude = 15 * tightness + 2; const freq = gameState.frameCount * 0.8;

        for (let i = 0; i < segments; i++) {
            const t = i / segments; const tNext = (i + 1) / segments;
            const x1 = startX + (endX - startX) * t; const y1 = startY + (endY - startY) * t;
            const x2 = startX + (endX - startX) * tNext; const y2 = startY + (endY - startY) * tNext;
            const damp1 = Math.sin(t * Math.PI); const damp2 = Math.sin(tNext * Math.PI);
            const nx = -(endY - startY) / dist; const ny = (endX - startX) / dist;
            const wave1 = Math.sin(t * 10 + freq) * amplitude * damp1;
            const wave2 = Math.sin(tNext * 10 + freq) * amplitude * damp2;
            const jitterX = (Math.random() - 0.5) * 6 * damp1; const jitterY = (Math.random() - 0.5) * 6 * damp1;

            const finalX1 = x1 + nx * wave1 + jitterX; const finalY1 = y1 + ny * wave1 + jitterY;
            const finalX2 = x2 + nx * wave2; const finalY2 = y2 + ny * wave2;

            ctx.beginPath(); ctx.moveTo(finalX1, finalY1); ctx.lineTo(finalX2, finalY2);
            const thickness = 6 * (1 - t) + 1; ctx.lineWidth = thickness;
            ctx.strokeStyle = baseColor; ctx.shadowColor = f.color.primary; ctx.shadowBlur = 15; ctx.stroke();
            if (thickness > 2) { ctx.lineWidth = thickness * 0.4; ctx.strokeStyle = coreColor; ctx.shadowBlur = 0; ctx.stroke(); }
        }
        ctx.fillStyle = coreColor; ctx.shadowBlur = 20; ctx.shadowColor = baseColor;
        ctx.beginPath(); ctx.arc(endX, endY, 6 + Math.random() * 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // --- Death Squash ---
    if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
            f.scaleY *= 0.9; f.scaleX *= 1.1; f.color.glow = '#000';
    }

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

    // --- Character Body ---
    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height);
    ctx.rotate(f.rotation); 
    ctx.scale(f.scaleX, f.scaleY);
    
    // Aura Handling
    if (f.classType === 'SLINGER' && (Math.abs(f.vx) > 10 || f.isGrappling)) {
        ctx.shadowBlur = 30; ctx.shadowColor = f.color.primary;
    } else if (f.classType === 'VOLT') {
        // --- VOLT HIGH VOLTAGE AURA ---
        const intensity = f.dashCooldown <= 0 ? 30 : 15;
        ctx.shadowBlur = intensity + Math.random() * 10;
        ctx.shadowColor = f.color.glow;

        // Sparks / Lightning lines
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = f.color.glow;
        ctx.lineWidth = 2;
        
        const sparkCount = f.dashCooldown <= 0 ? 5 : 2;
        
        for(let i=0; i<sparkCount; i++) {
             const angle = Math.random() * Math.PI * 2;
             const rad = f.height * 0.6;
             const sx = Math.cos(angle) * rad * 0.8;
             const sy = -f.height/2 + Math.sin(angle) * rad * 0.8;
             
             ctx.moveTo(sx, sy);
             // Jittery line
             ctx.lineTo(sx + (Math.random()-0.5)*30, sy + (Math.random()-0.5)*30);
        }
        ctx.stroke();
        ctx.restore();

    } else {
        const flicker = Math.abs(Math.sin(gameState.frameCount * 0.2)) * 10 + 20;
        ctx.shadowBlur = flicker; ctx.shadowColor = f.color.glow;
    }

    const bodyW = f.width;
    const bodyH = f.height;

    // Body Render
    if (f.classType === 'VORTEX') {
        ctx.fillStyle = f.color.primary; ctx.strokeStyle = f.color.glow;
        const slices = 4; const sliceH = bodyH / slices;
        for(let i=0; i<slices; i++) {
            const offset = (Math.random() - 0.5) * 6; 
            ctx.fillRect((-bodyW/2) + offset, -bodyH + (i*sliceH), bodyW, sliceH - 2);
        }
        ctx.lineWidth = 1; ctx.shadowBlur = 0; ctx.strokeRect((-bodyW/2), -bodyH, bodyW, bodyH);

    } else if (f.classType === 'KINETIC') {
        ctx.fillStyle = f.color.secondary; ctx.beginPath(); ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 4); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = f.color.primary; ctx.stroke();
        const speedRatio = Math.min(Math.sqrt(f.vx*f.vx + f.vy*f.vy) / 20, 1);
        ctx.fillStyle = f.color.glow; ctx.globalAlpha = 0.5 + (0.5 * speedRatio);
        ctx.shadowBlur = 10 + (20 * speedRatio); ctx.shadowColor = f.color.primary;
        ctx.beginPath(); ctx.moveTo(-bodyW/4, -bodyH * 0.7); ctx.lineTo(0, -bodyH * 0.4); ctx.lineTo(bodyW/4, -bodyH * 0.7); ctx.fill();
        ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;

    } else {
        // --- STANDARD / VOLT BODY ---
        ctx.fillStyle = f.color.primary; 
        ctx.beginPath(); 
        ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
        ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = f.color.glow; ctx.shadowBlur = 0; ctx.stroke();
    }
    
    if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 5; ctx.shadowColor = '#fff';
        const eyeOffset = f.facing === 1 ? bodyW/4 : -bodyW/4 - 10;
        ctx.fillRect(eyeOffset, -bodyH + 20, 15, 4);
    }

    // --- ANIME NEEDLE BLADES ---
    if (f.isAttacking) {
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
