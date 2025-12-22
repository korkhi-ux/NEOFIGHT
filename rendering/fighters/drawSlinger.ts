
import { Fighter, GameState } from '../../types';

export const drawSlinger = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    // GRAPPLE ROPE RENDER
    if (f.isGrappling && f.grapplePoint) {
        // Calculate relative coordinates
        const startX = 0; 
        const startY = -f.height * 0.45; // Chest height relative to feet
        
        // We need world coordinates of grapple point to map to local space
        // Local space is rotated. This is tricky.
        // Simplest way: Untransform the grapple point.
        // Or simpler: Draw the rope in World Space in drawEffects? 
        // The prompt says separate responsibilities. Slinger draws its rope.
        // Let's draw it here. We need to handle the rotation carefully or draw line to a rotated point.
        
        // Actually, let's reverse transform the target point into local space
        const dx = f.grapplePoint.x - (f.x + f.width/2);
        const dy = f.grapplePoint.y - (f.y + f.height);
        
        // Apply reverse rotation of fighter to find point in local space
        const cos = Math.cos(-f.rotation);
        const sin = Math.sin(-f.rotation);
        const localEndX = dx * cos - dy * sin;
        const localEndY = dx * sin + dy * cos;

        const isEnemyHook = f.grappleTargetId !== null;
        const baseColor = isEnemyHook ? '#ffff00' : f.color.glow;
        const coreColor = isEnemyHook ? '#ffffff' : '#ccffcc';

        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const segments = 30; 
        const dist = Math.sqrt(Math.pow(localEndX - startX, 2) + Math.pow(localEndY - startY, 2));
        const tightness = Math.min(dist / 600, 1);
        const amplitude = 15 * tightness + 2; const freq = gameState.frameCount * 0.8;

        for (let i = 0; i < segments; i++) {
            const t = i / segments; const tNext = (i + 1) / segments;
            const x1 = startX + (localEndX - startX) * t; const y1 = startY + (localEndY - startY) * t;
            const x2 = startX + (localEndX - startX) * tNext; const y2 = startY + (localEndY - startY) * tNext;
            const damp1 = Math.sin(t * Math.PI); const damp2 = Math.sin(tNext * Math.PI);
            const nx = -(localEndY - startY) / dist; const ny = (localEndX - startX) / dist;
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
        ctx.beginPath(); ctx.arc(localEndX, localEndY, 6 + Math.random() * 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // Aura
    if (Math.abs(f.vx) > 10 || f.isGrappling) {
        ctx.shadowBlur = 30; ctx.shadowColor = f.color.primary;
    } else {
        const flicker = Math.abs(Math.sin(gameState.frameCount * 0.2)) * 10 + 20;
        ctx.shadowBlur = flicker; ctx.shadowColor = f.color.glow;
    }

    // Body
    const bodyW = f.width;
    const bodyH = f.height;
    ctx.fillStyle = f.color.primary; 
    ctx.beginPath(); 
    ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = f.color.glow; ctx.shadowBlur = 0; ctx.stroke();
};
