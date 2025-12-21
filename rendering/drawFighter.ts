
import { Fighter, GameState } from '../types';

export const drawFighter = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
            f.scaleY *= 0.9;
            f.scaleX *= 1.1;
            f.color.glow = '#000';
    }

    // Kinetic Blur Trails
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
        
        ctx.lineWidth = f.width * 0.8;
        ctx.strokeStyle = f.color.glow;
        ctx.globalAlpha = 0.2;
        ctx.stroke();
        ctx.restore();
    }

    // Body
    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height);
    
    // Apply Tilt Rotation
    ctx.rotate(f.rotation * f.facing); 
    
    ctx.scale(f.scaleX, f.scaleY);
    
    ctx.fillStyle = f.color.primary;
    const flicker = Math.abs(Math.sin(gameState.frameCount * 0.2)) * 10 + 20;
    ctx.shadowBlur = flicker;
    ctx.shadowColor = f.color.glow;

    const bodyW = f.width;
    const bodyH = f.height;

    ctx.beginPath();
    ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
    ctx.fill();
    
    if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        const eyeOffset = f.facing === 1 ? bodyW/4 : -bodyW/4 - 10;
        ctx.fillRect(eyeOffset, -bodyH + 20, 15, 4);
    }

    // --- ANIME SLASHES (Light Ovals) ---
    if (f.isAttacking) {
        ctx.save();
        ctx.translate(0, -bodyH/2);
        
        const slashColor = f.color.glow;
        const coreColor = '#ffffff';
        
        if (f.comboCount === 0) {
            ctx.rotate(f.facing * Math.PI / 4);
            ctx.translate(f.facing * 40, 0);
        } else if (f.comboCount === 1) {
            ctx.rotate(f.facing * Math.PI / 8); 
            ctx.translate(f.facing * 60, -20);
        } else {
            ctx.translate(f.facing * 80, 0);
        }

        let len = 100;
        let thick = 15;
        if (f.comboCount === 1) { len = 140; thick = 25; }
        if (f.comboCount === 2) { len = 250; thick = 40; } 

        const grad = ctx.createRadialGradient(0, 0, thick * 0.2, 0, 0, len * 0.6);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(0.3, slashColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.shadowBlur = 30;
        ctx.shadowColor = slashColor;
        
        ctx.beginPath();
        ctx.ellipse(0, 0, len, thick, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
    
    ctx.restore();
};
