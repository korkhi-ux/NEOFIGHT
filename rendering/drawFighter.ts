
import { Fighter, GameState } from '../types';

export const drawFighter = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    
    // --- VORTEX: VOID ORB RENDER ---
    if (f.classType === 'VORTEX' && f.voidOrb && f.voidOrb.active) {
        const { x, y } = f.voidOrb;
        
        ctx.save();
        ctx.translate(x, y);
        
        // Pulse
        const pulse = Math.sin(gameState.frameCount * 0.2) * 5;
        
        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = f.color.glow;
        
        // Black Core
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, 10 + pulse * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Rim
        ctx.lineWidth = 3;
        ctx.strokeStyle = f.color.glow;
        ctx.stroke();
        
        // Suction Particles
        if (Math.random() < 0.3) {
             ctx.fillStyle = f.color.secondary;
             const angle = Math.random() * Math.PI * 2;
             const dist = 30 + Math.random() * 20;
             const px = Math.cos(angle) * dist;
             const py = Math.sin(angle) * dist;
             ctx.fillRect(px, py, 4, 4);
             // Note: These are purely visual per frame, no persistent state needed for simple suction
        }

        ctx.restore();
    }

    // --- SLINGER: GRAPPLE ROPE RENDER (ORGANIC/JIGGLE) ---
    if (f.classType === 'SLINGER' && f.isGrappling && f.grapplePoint) {
        const startX = f.x + f.width/2;
        // CENTER OF CHEST (Matches physics origin: 0.55)
        const startY = f.y + f.height * 0.55; 
        const endX = f.grapplePoint.x;
        const endY = f.grapplePoint.y;
        
        const isEnemyHook = f.grappleTargetId !== null;
        const baseColor = isEnemyHook ? '#ffff00' : f.color.glow;
        const coreColor = isEnemyHook ? '#ffffff' : '#ccffcc';

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const segments = 30; // Increased segments for smoother wave
        const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        
        const tightness = Math.min(dist / 600, 1);
        const amplitude = 15 * tightness + 2; 
        const freq = gameState.frameCount * 0.8;

        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const tNext = (i + 1) / segments;

            const x1 = startX + (endX - startX) * t;
            const y1 = startY + (endY - startY) * t;
            
            const x2 = startX + (endX - startX) * tNext;
            const y2 = startY + (endY - startY) * tNext;

            const damp1 = Math.sin(t * Math.PI);
            const damp2 = Math.sin(tNext * Math.PI);
            
            const nx = -(endY - startY) / dist;
            const ny = (endX - startX) / dist;

            const wave1 = Math.sin(t * 10 + freq) * amplitude * damp1;
            const wave2 = Math.sin(tNext * 10 + freq) * amplitude * damp2;

            // Nervous Glitch Jitter
            const jitterX = (Math.random() - 0.5) * 6 * damp1;
            const jitterY = (Math.random() - 0.5) * 6 * damp1;

            const finalX1 = x1 + nx * wave1 + jitterX;
            const finalY1 = y1 + ny * wave1 + jitterY;
            const finalX2 = x2 + nx * wave2; 
            const finalY2 = y2 + ny * wave2;

            ctx.beginPath();
            ctx.moveTo(finalX1, finalY1);
            ctx.lineTo(finalX2, finalY2);

            const thickness = 6 * (1 - t) + 1; 
            ctx.lineWidth = thickness;
            
            ctx.strokeStyle = baseColor;
            ctx.shadowColor = f.color.primary;
            ctx.shadowBlur = 15;
            
            ctx.stroke();
            
            if (thickness > 2) {
                ctx.lineWidth = thickness * 0.4;
                ctx.strokeStyle = coreColor;
                ctx.shadowBlur = 0;
                ctx.stroke();
            }
        }
        
        ctx.fillStyle = coreColor;
        ctx.shadowBlur = 20;
        ctx.shadowColor = baseColor;
        ctx.beginPath();
        ctx.arc(endX, endY, 6 + Math.random() * 4, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    }

    // --- Death Squash ---
    if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
            f.scaleY *= 0.9;
            f.scaleX *= 1.1;
            f.color.glow = '#000';
    }

    // --- Kinetic Blur Trails (More discreet) ---
    if (f.trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const last = f.trail[f.trail.length-1];
        ctx.moveTo(last.x + f.width/2, last.y + f.height/2);
        
        for(let i=f.trail.length-2; i>=0; i--) {
            const t = f.trail[i];
            ctx.lineTo(t.x + f.width/2, t.y + f.height/2);
        }
        ctx.lineTo(f.x + f.width/2, f.y + f.height/2);
        
        ctx.lineWidth = f.width * 0.6; 
        ctx.strokeStyle = f.color.glow;
        ctx.globalAlpha = 0.15; 
        ctx.stroke();
        ctx.restore();
    }

    // --- Character Body ---
    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height);
    
    // Apply Tilt Rotation
    ctx.rotate(f.rotation); 
    
    ctx.scale(f.scaleX, f.scaleY);
    
    // SLINGER SPEED AURA
    if (f.classType === 'SLINGER' && (Math.abs(f.vx) > 10 || f.isGrappling)) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = f.color.primary;
    } else {
        const flicker = Math.abs(Math.sin(gameState.frameCount * 0.2)) * 10 + 20;
        ctx.shadowBlur = flicker;
        ctx.shadowColor = f.color.glow;
    }

    const bodyW = f.width;
    const bodyH = f.height;

    // Body Render (GLITCH vs NORMAL)
    if (f.classType === 'VORTEX') {
        // --- GLITCH BODY ---
        ctx.fillStyle = f.color.primary;
        ctx.strokeStyle = f.color.glow;
        
        // Exactement 3 ou 4 slices comme demandé pour l'instabilité
        const slices = 4;
        const sliceH = bodyH / slices;
        
        for(let i=0; i<slices; i++) {
            const offset = (Math.random() - 0.5) * 6; // Décalage aléatoire
            ctx.fillRect((-bodyW/2) + offset, -bodyH + (i*sliceH), bodyW, sliceH - 2);
        }
        
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.strokeRect((-bodyW/2), -bodyH, bodyW, bodyH);

    } else {
        // --- STANDARD BODY ---
        ctx.fillStyle = f.color.primary;
        ctx.beginPath();
        ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
        ctx.fill();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = f.color.glow;
        ctx.shadowBlur = 0; 
        ctx.stroke();
    }
    
    if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        const eyeOffset = f.facing === 1 ? bodyW/4 : -bodyW/4 - 10;
        ctx.fillRect(eyeOffset, -bodyH + 20, 15, 4);
    }

    // --- ANIME NEEDLE BLADES (Attacks) ---
    if (f.isAttacking) {
        ctx.translate(0, -bodyH * 0.55);

        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 0; 

        const bladeColor = f.color.glow; 
        const jitter = Math.sin(gameState.frameCount * 0.8) * 0.02; 

        let baseAngle = 0;
        let bladeLength = 280;
        let bladeThickness = 12; 

        if (f.comboCount === 0) {
            baseAngle = -0.18; 
            bladeLength = 280;
            bladeThickness = 14;
        } else if (f.comboCount === 1) {
            baseAngle = 0.18; 
            bladeLength = 300;
            bladeThickness = 16;
        } else {
            baseAngle = 0;
            bladeLength = 550; 
            bladeThickness = 22;
        }

        ctx.save();
        ctx.scale(f.facing, 1); 
        ctx.rotate(baseAngle + jitter); 
        
        const drawNeedle = (len: number, thick: number, color: string, alpha: number) => {
            ctx.beginPath();
            ctx.moveTo(0, 0); 

            ctx.quadraticCurveTo(len * 0.4, -thick, len, 0);
            ctx.quadraticCurveTo(len * 0.4, thick, 0, 0);

            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fill();
        };

        const grad = ctx.createLinearGradient(0, 0, bladeLength, 0);
        grad.addColorStop(0, bladeColor);
        grad.addColorStop(0.3, bladeColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)'); 
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(bladeLength * 0.4, -bladeThickness, bladeLength, 0);
        ctx.quadraticCurveTo(bladeLength * 0.4, bladeThickness, 0, 0);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.8;
        ctx.fill();

        drawNeedle(bladeLength * 0.95, bladeThickness * 0.25, '#ffffff', 1.0);

        ctx.restore(); 
        ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.restore();
};
