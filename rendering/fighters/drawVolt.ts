
import { Fighter, GameState } from '../../types';

export const drawVolt = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
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

    // Body
    const bodyW = f.width;
    const bodyH = f.height;
    ctx.fillStyle = f.color.primary; 
    ctx.beginPath(); 
    ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = f.color.glow; ctx.shadowBlur = 0; ctx.stroke();
};
