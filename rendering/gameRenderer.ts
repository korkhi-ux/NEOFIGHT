
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
    const { player, enemy, shake, shakeX, shakeY, cameraX, cameraY, cameraZoom, matchState, introStep } = gameState;
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
    // In Intro, draw active one on top/last
    if (matchState === 'intro' && introStep === 'p1') {
        drawFighter(ctx, enemy, gameState);
        drawFighter(ctx, player, gameState);
    } else if (matchState === 'intro' && introStep === 'p2') {
        drawFighter(ctx, player, gameState);
        drawFighter(ctx, enemy, gameState);
    } else {
        drawFighter(ctx, enemy, gameState);
        drawFighter(ctx, player, gameState);
    }

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

    // --- CINEMATIC POST PROCESS ---
    if (matchState === 'intro') {
        // Cinemascope Bars
        ctx.fillStyle = '#000000';
        const barHeight = height * 0.12;
        ctx.fillRect(0, 0, width, barHeight);
        ctx.fillRect(0, height - barHeight, width, barHeight);

        // Intro Text
        if (introStep !== 'both') {
            const name = introStep === 'p1' ? player.classType : enemy.classType;
            const sub = introStep === 'p1' ? "PLAYER 1" : "OPPONENT";
            const color = introStep === 'p1' ? player.color.primary : enemy.color.primary;

            ctx.save();
            ctx.shadowColor = color; ctx.shadowBlur = 10;
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 italic 80px Orbitron';
            ctx.textAlign = introStep === 'p1' ? 'left' : 'right';
            const tx = introStep === 'p1' ? 50 : width - 50;
            const ty = height - barHeight + 70;
            ctx.fillText(name, tx, ty);
            
            ctx.font = '400 20px monospace';
            ctx.fillStyle = color;
            ctx.fillText(sub, tx, ty - 60);
            ctx.restore();
        }
    }

    // Oscilloscope (UI Layer)
    if (audio) {
        drawOscilloscope(ctx, width, height, audio);
    }

    // Restore Hit Flash Mode
    if (player.hitFlashTimer > 0 || enemy.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // Ensure cleanup
};
