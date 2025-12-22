
import { Fighter, GameState } from '../../types';

export const drawKinetic = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    const speed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);

    // 1. SPEED LINES (Velocity > 8)
    if (speed > 8) {
        ctx.save();
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
        ctx.restore();
    }

    // 2. POST-COMBUSTION
    if (f.isDashing || (!f.isGrounded && speed > 20)) {
        ctx.save();
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
        ctx.restore();
    }

    // Standard Glow
    const flicker = Math.abs(Math.sin(gameState.frameCount * 0.2)) * 10 + 20;
    ctx.shadowBlur = flicker; ctx.shadowColor = f.color.glow;

    // Body Render
    const bodyW = f.width;
    const bodyH = f.height;
    ctx.fillStyle = f.color.secondary; ctx.beginPath(); ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 4); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = f.color.primary; ctx.stroke();
    const speedRatio = Math.min(Math.sqrt(f.vx*f.vx + f.vy*f.vy) / 20, 1);
    ctx.fillStyle = f.color.glow; ctx.globalAlpha = 0.5 + (0.5 * speedRatio);
    ctx.shadowBlur = 10 + (20 * speedRatio); ctx.shadowColor = f.color.primary;
    ctx.beginPath(); ctx.moveTo(-bodyW/4, -bodyH * 0.7); ctx.lineTo(0, -bodyH * 0.4); ctx.lineTo(bodyW/4, -bodyH * 0.7); ctx.fill();
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
};
