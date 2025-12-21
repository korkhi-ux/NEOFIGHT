
import { GameState } from '../types';
import { COLORS } from '../constants';
import { AudioManager } from '../core/AudioManager';

export const drawEffects = (ctx: CanvasRenderingContext2D, gameState: GameState, width: number, height: number, audio: AudioManager | null) => {
    const { particles, shockwaves, impacts, flares, player } = gameState;

    // Shockwaves
    shockwaves.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.globalAlpha = s.alpha;
        ctx.shadowBlur = 20;
        ctx.shadowColor = s.color;
        ctx.stroke();
        ctx.restore();
    });

    // Impacts
    impacts.forEach(imp => {
        ctx.save();
        ctx.translate(imp.x, imp.y);
        ctx.rotate(imp.rotation);
        
        ctx.strokeStyle = imp.color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = imp.color;
        
        const size = 60 * (imp.life / 15);
        
        ctx.beginPath();
        ctx.moveTo(-size, 0); ctx.lineTo(size, 0);
        ctx.moveTo(0, -size); ctx.lineTo(0, size);
        ctx.moveTo(-size*0.5, -size*0.5); ctx.lineTo(size*0.5, size*0.5);
        ctx.moveTo(size*0.5, -size*0.5); ctx.lineTo(-size*0.5, size*0.5);
        
        ctx.stroke();
        ctx.restore();
    });

    // Particles
    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        const len = p.size * (1 + Math.abs(p.vx)*0.2);
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);
        ctx.fillRect(-len/2, -p.size/2, len, p.size);
        ctx.restore();
    });

    // Lens Flares
    flares.forEach(f => {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.globalCompositeOperation = 'screen';
        
        const opacity = Math.min(1, f.life / 10);
        ctx.globalAlpha = opacity;
        
        const grad = ctx.createLinearGradient(-300, 0, 300, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, f.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-300, -2, 600, 4);
        
        const rad = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
        rad.addColorStop(0, '#ffffff');
        rad.addColorStop(0.2, f.color);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(0, 0, 100, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    });
};

export const drawSpeedLines = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string) => {
     ctx.save();
     ctx.strokeStyle = color;
     ctx.lineWidth = 2;
     for(let i=0; i<4; i++) {
         const lx = Math.random() * width; 
         const ly = Math.random() * height;
         const len = Math.random() * 300 + 100;
         ctx.beginPath();
         ctx.moveTo(lx, ly);
         ctx.lineTo(lx + len, ly);
         ctx.globalAlpha = 0.2;
         ctx.stroke();
     }
     ctx.restore();
}

export const drawOscilloscope = (ctx: CanvasRenderingContext2D, width: number, height: number, audio: AudioManager) => {
    const bufferLength = audio.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    audio.getWaveform(dataArray);

    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.gridHighlight; 
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.gridHighlight;
    ctx.globalAlpha = 0.6;

    ctx.beginPath();
    const sliceWidth = width * 1.0 / bufferLength;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (height/20) + (height - 60); 

        if(i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
    }
    ctx.lineTo(width, height/2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}
