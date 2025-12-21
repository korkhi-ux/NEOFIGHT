
import { Fighter, GameState } from '../types';

export const drawFighter = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    // --- SLINGER: GRAPPLE ROPE RENDER ---
    if (f.classType === 'SLINGER' && f.isGrappling && f.grapplePoint) {
        const startX = f.x + f.width/2;
        const startY = f.y + f.height/2;
        const endX = f.grapplePoint.x;
        const endY = f.grapplePoint.y;

        ctx.save();
        ctx.strokeStyle = f.color.glow;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = f.color.primary;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // Vibrating Rope Effect
        const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const segments = 10;
        const vibration = Math.sin(gameState.frameCount * 0.8) * 5; // Oscillation magnitude
        
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            
            // Perpendicular offset
            const perpX = -(endY - startY) / dist;
            const perpY = (endX - startX) / dist;
            
            // Damping vibration near ends
            const damp = Math.sin(t * Math.PI); 
            
            ctx.lineTo(
                x + perpX * vibration * damp, 
                y + perpY * vibration * damp
            );
        }
        
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Anchor Dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, Math.PI*2);
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
        // Flicker intensity based on frame
        const flicker = Math.abs(Math.sin(gameState.frameCount * 0.2)) * 10 + 20;
        ctx.shadowBlur = flicker;
        ctx.shadowColor = f.color.glow;
    }

    // Body Fill
    ctx.fillStyle = f.color.primary;

    const bodyW = f.width;
    const bodyH = f.height;

    ctx.beginPath();
    ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
    ctx.fill();
    
    // Crisp Outline
    ctx.lineWidth = 2;
    ctx.strokeStyle = f.color.glow;
    ctx.shadowBlur = 0; 
    ctx.stroke();
    
    // Eye
    if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        const eyeOffset = f.facing === 1 ? bodyW/4 : -bodyW/4 - 10;
        ctx.fillRect(eyeOffset, -bodyH + 20, 15, 4);
    }

    // --- ANIME NEEDLE BLADES (Attacks) ---
    if (f.isAttacking) {
        // 1. Alignement de Hauteur Fixe : Centre du buste (55% height)
        ctx.translate(0, -bodyH * 0.55);

        // 5. Rendu Cristallin : Mode 'lighter' et netteté absolue
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 0; 

        // Params
        const bladeColor = f.color.glow; 
        const jitter = Math.sin(gameState.frameCount * 0.8) * 0.02; // Reduced jitter for stability

        // 4. Dynamique d'Attaque Horizontale (Max +/- 15 degrees)
        // 15 degrees is approx 0.26 radians
        let baseAngle = 0;
        let bladeLength = 280;
        let bladeThickness = 12; // Needle thin

        if (f.comboCount === 0) {
            // Step 1: Slight Upward Slash (10 degrees)
            baseAngle = -0.18; 
            bladeLength = 280;
            bladeThickness = 14;
        } else if (f.comboCount === 1) {
            // Step 2: Slight Downward Slash (10 degrees)
            baseAngle = 0.18; 
            bladeLength = 300;
            bladeThickness = 16;
        } else {
            // Step 3 (Finisher): Perfectly Horizontal Pierce
            baseAngle = 0;
            bladeLength = 550; // Screen clearing length
            bladeThickness = 22;
        }

        // Apply Symmetry
        ctx.save();
        ctx.scale(f.facing, 1); 
        ctx.rotate(baseAngle + jitter); 
        
        // 2. & 3. Géométrie "Vrai Ovale Pointu" & Double Pass
        
        const drawNeedle = (len: number, thick: number, color: string, alpha: number) => {
            ctx.beginPath();
            ctx.moveTo(0, 0); // Start at chest center

            // Top Curve (Quadratic for sharp needle shape)
            // Control point is mid-length but pulled out to thickness
            ctx.quadraticCurveTo(len * 0.4, -thick, len, 0);

            // Bottom Curve
            ctx.quadraticCurveTo(len * 0.4, thick, 0, 0);

            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fill();
        };

        // Pass 1: Outer Blade (Colored, Wider)
        // Using a gradient for the outer blade to feel like light fading
        const grad = ctx.createLinearGradient(0, 0, bladeLength, 0);
        grad.addColorStop(0, bladeColor);
        grad.addColorStop(0.3, bladeColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)'); // Fade tip
        
        // Custom draw with gradient logic inline for the outer shell to support gradient
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(bladeLength * 0.4, -bladeThickness, bladeLength, 0);
        ctx.quadraticCurveTo(bladeLength * 0.4, bladeThickness, 0, 0);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.8;
        ctx.fill();

        // Pass 2: Inner Core (White, Thinner, Sharper)
        // No gradient, pure hot white
        drawNeedle(bladeLength * 0.95, bladeThickness * 0.25, '#ffffff', 1.0);

        ctx.restore(); // Restore facing/rotation

        // Restore standard composite
        ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.restore();
};
