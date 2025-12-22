
import { Fighter, GameState } from '../../types';

export const drawVortex = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    // VOID ORB RENDER
    if (f.voidOrb && f.voidOrb.active) {
        const { x, y } = f.voidOrb;
        // The orb is drawn in world space, but this function is called inside a transformed context
        // centered on the fighter. We must untransform or draw it relatively.
        // Actually, drawFighter usually draws children components relative to body. 
        // But the Void Orb floats independently.
        // To keep it simple, we draw it relative to the fighter's current position (0,0 in this context is f.x+w/2, f.y+h)
        // We need to calculate relative coords.
        const relX = x - (f.x + f.width/2);
        const relY = y - (f.y + f.height/2); // Correcting for pivot

        // Wait, the main draw loop applies rotation. We should probably draw the orb in drawEffects or before rotation.
        // However, we can just invert rotation here or draw it in a separate save/restore block *before* body rotation.
        // Let's assume strict separation: the orb is part of the Vortex visual identity.
        
        ctx.save();
        // Counter-rotate to keep orb upright if fighter tilts
        ctx.rotate(-f.rotation); 
        ctx.translate(relX, relY - f.height/2); // Adjust for the fact that context is at feet
        
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

    // Standard Glow
    const flicker = Math.abs(Math.sin(gameState.frameCount * 0.2)) * 10 + 20;
    ctx.shadowBlur = flicker; ctx.shadowColor = f.color.glow;

    // Body Render (Glitch)
    const bodyW = f.width;
    const bodyH = f.height;
    ctx.fillStyle = f.color.primary; ctx.strokeStyle = f.color.glow;
    const slices = 4; const sliceH = bodyH / slices;
    for(let i=0; i<slices; i++) {
        const offset = (Math.random() - 0.5) * 6; 
        ctx.fillRect((-bodyW/2) + offset, -bodyH + (i*sliceH), bodyW, sliceH - 2);
    }
    ctx.lineWidth = 1; ctx.shadowBlur = 0; ctx.strokeRect((-bodyW/2), -bodyH, bodyW, bodyH);
};
