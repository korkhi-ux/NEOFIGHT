
import { COLORS, WORLD_WIDTH, GROUND_Y } from '../constants';
import { GameState } from '../types';

export const drawBackground = (ctx: CanvasRenderingContext2D, gameState: GameState, viewW: number, camX: number) => {
    const { player, enemy } = gameState;

    // Sky
    ctx.save();
    ctx.translate(camX * 0.1, 0); 
    ctx.fillStyle = COLORS.background;
    for (let i = 0; i < 5; i++) {
        const x = (i * 800) % WORLD_WIDTH;
        ctx.fillStyle = 'rgba(10, 20, 50, 0.5)';
        ctx.fillRect(x + 200, GROUND_Y - 600, 300, 600);
    }
    ctx.restore();

    // Mid
    ctx.save();
    ctx.translate(camX * 0.4, 0); 
    ctx.fillStyle = 'rgba(20, 40, 100, 0.2)';
    for (let i = 0; i < 20; i++) {
        const x = (i * 400) % (WORLD_WIDTH * 1.5);
        const y = GROUND_Y - 200 - (i % 3) * 100;
        const size = 40 + (i % 4) * 20;
        ctx.fillRect(x, y, size, size);
    }
    ctx.restore();

    // Floor Grid
    ctx.lineWidth = 2;
    const startX = Math.floor(camX / 100) * 100;
    const endX = Math.min(WORLD_WIDTH, camX + viewW + 100);
    const startY = GROUND_Y;
    const endY = GROUND_Y + 300;

    for (let x = startX; x <= endX; x += 100) {
        for (let y = startY; y <= endY; y += 100) {
            const centerX = x + 50;
            const distToP = Math.abs(centerX - player.x);
            const distToE = Math.abs(centerX - enemy.x);
            const minD = Math.min(distToP, distToE);
            
            let alpha = 0.05;
            let color = COLORS.grid;
            if (minD < 200) {
                alpha = 0.3 + (1 - minD / 200) * 0.5;
                color = COLORS.gridHighlight;
            }
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            ctx.strokeRect(x, y, 100, 100);
            if (minD < 150) {
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha * 0.2;
                ctx.fillRect(x, y, 100, 100);
            }
        }
    }
    ctx.globalAlpha = 1.0;
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.player.glow;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(WORLD_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
};
