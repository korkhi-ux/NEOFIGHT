
import { Fighter, GameState } from '../../types';

export const drawVolt = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    
    // --- DRAW THUNDER CUT TRAIL & GHOST ---
    if (f.lightningTrail && f.lightningTrail.active) {
        const t = f.lightningTrail;
        
        const currentCenterX = f.x + f.width/2;
        const currentCenterY = f.y + f.height;

        // --- 1. GHOST AFTERIMAGE (The Start Position) ---
        // Calculate ghost relative position to current camera/context
        const relGhostX = t.ghostX - f.x; 
        const relGhostY = t.ghostY - f.y;

        ctx.save();
        // Since the main context is rotated/scaled for the fighter, we need to handle that.
        // Or simpler: We draw the ghost relative to the *body center* which is (0, -height).
        // Let's reset the transform for the Ghost to align with world space relative to fighter.
        ctx.rotate(-f.rotation); // Reset rotation
        ctx.translate(relGhostX, relGhostY);
        
        ctx.globalAlpha = (t.life / 20) * 0.4; // Fade out
        ctx.fillStyle = '#06b6d4'; // Cyan
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        
        // Draw Ghost Silhouette
        const bodyW = f.width;
        const bodyH = f.height;
        ctx.beginPath();
        ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8);
        ctx.fill();
        
        ctx.restore();


        // --- 2. ELECTRIC TRAIL ---
        // Relative coordinates for the line
        const relStartX = t.startX - currentCenterX;
        const relStartY = t.startY - currentCenterY;
        const relEndX = t.endX - currentCenterX;
        const relEndY = t.endY - currentCenterY;

        ctx.save();
        ctx.rotate(-f.rotation);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'bevel';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = '#06b6d4'; // Cyan Neon
        ctx.lineWidth = 4;
        
        ctx.globalAlpha = Math.min(1, t.life / 10);

        ctx.beginPath();
        ctx.moveTo(relStartX, relStartY);
        
        // Create jagged line effect with VIBRATION
        const segments = 12;
        const dx = (relEndX - relStartX) / segments;
        const dy = (relEndY - relStartY) / segments;

        for (let i = 1; i < segments; i++) {
            const px = relStartX + dx * i;
            const py = relStartY + dy * i;
            
            // Random Jitter (Re-calculated every frame for vibration)
            const jitterX = (Math.random() - 0.5) * 20;
            const jitterY = (Math.random() - 0.5) * 20;
            ctx.lineTo(px + jitterX, py + jitterY);
        }
        
        ctx.lineTo(relEndX, relEndY);
        ctx.stroke();

        // Inner Core (White - Intense)
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#e0f2fe';
        ctx.shadowBlur = 5;
        ctx.stroke();

        ctx.restore();
    }

    // --- VOLT HIGH VOLTAGE AURA (Main Body) ---
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

    // Body
    const bodyW = f.width;
    const bodyH = f.height;
    ctx.fillStyle = f.color.primary; 
    ctx.beginPath(); 
    ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = f.color.glow; ctx.shadowBlur = 0; ctx.stroke();
};
