
import { GameState } from '../types';
import { COLORS } from '../config/colors';
import { drawBackground } from './drawBackground';
import { drawFighter } from './drawFighter';
import { drawEffects, drawSpeedLines, drawOscilloscope } from './drawEffects';
import { AudioManager } from '../core/AudioManager';

export const renderGame = (
    ctx: CanvasRenderingContext2D, 
    gameState: GameState, 
    audio: AudioManager | null
) => {
    const { player, enemy, shake, shakeX, shakeY, cameraX, cameraY, cameraZoom } = gameState;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Shake
    const activeShake = shake + 0.5; 
    const noiseX = (Math.random() - 0.5) * activeShake;
    const noiseY = (Math.random() - 0.5) * activeShake;
    const totalShakeX = noiseX + shakeX;
    const totalShakeY = noiseY + shakeY;

    // --- RENDER PASS ---
    ctx.save();
    
    // Hit Flash
    if (player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,width,height);
        ctx.globalCompositeOperation = 'difference';
    } else {
        ctx.fillStyle = COLORS.backgroundFar;
        ctx.fillRect(0, 0, width, height);
    }

    // Camera Transform
    ctx.translate(width/2, height/2);
    ctx.rotate(gameState.cameraTilt);
    ctx.scale(cameraZoom, cameraZoom);
    ctx.translate(-width/2, -height/2);
    ctx.translate(-cameraX + totalShakeX / cameraZoom, -cameraY + totalShakeY / cameraZoom);

    // Background
    if (!(player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0)) {
        drawBackground(ctx, gameState, width / cameraZoom, cameraX);
    }

    // Entities
    drawFighter(ctx, enemy, gameState);
    drawFighter(ctx, player, gameState);

    // World Effects
    drawEffects(ctx, gameState, width, height, audio);

    // Screen Space Effects (Pop Camera)
    if (Math.abs(player.vx) > 10 || player.isDashing) {
         ctx.restore(); 
         ctx.save();
         drawSpeedLines(ctx, width, height, COLORS.speedLine);
    } else {
        ctx.restore(); 
    }

    // Oscilloscope (UI Layer)
    if (audio) {
        drawOscilloscope(ctx, width, height, audio);
    }

    // Restore Hit Flash Mode
    if (player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // Ensure cleanup of saves if logic branched
    // (The standard flow has one save at start, restored at 'Pop Camera' or else block)
};
