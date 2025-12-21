
import { PLAYER_WIDTH, PLAYER_HEIGHT, MIN_ZOOM, MAX_ZOOM, CAMERA_SMOOTHING, CAMERA_TILT_MAX, GROUND_Y, WORLD_WIDTH, MAX_SPEED } from '../constants';
import { GameState } from '../types';

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy } = gameState;
    
    const midX = (player.x + enemy.x + PLAYER_WIDTH) / 2;
    const dist = Math.abs(player.x - enemy.x);

    const desiredZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (viewportWidth * 0.55) / dist));
    gameState.cameraZoom += (desiredZoom - gameState.cameraZoom) * CAMERA_SMOOTHING;
    const zoom = gameState.cameraZoom;

    // Look Ahead
    const playerVel = player.isDashing ? player.vx * 1.5 : player.vx;
    const lookAheadTarget = playerVel * 10;
    gameState.cameraLookAhead += (lookAheadTarget - gameState.cameraLookAhead) * 0.05;

    // Dynamic Tilt
    // If speed is very low, snap target to 0
    const targetTilt = (Math.abs(player.vx) < 1.0) 
        ? 0 
        : (player.vx / MAX_SPEED) * CAMERA_TILT_MAX;
        
    // Faster return to 0 (0.2) than tilt accumulation (0.1)
    const tiltSmoothing = Math.abs(player.vx) < 1.0 ? 0.2 : 0.1;
    gameState.cameraTilt += (targetTilt - gameState.cameraTilt) * tiltSmoothing;

    const viewW = viewportWidth / zoom;
    const viewH = viewportHeight / zoom;
    let targetCamX = midX - viewW / 2 + gameState.cameraLookAhead;
    let targetCamY = GROUND_Y - viewH * 0.75; 
    
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));
    targetCamY = Math.max(-200, Math.min(targetCamY, GROUND_Y + 100 - viewH));

    gameState.cameraX += (targetCamX - gameState.cameraX) * CAMERA_SMOOTHING;
    gameState.cameraY += (targetCamY - gameState.cameraY) * CAMERA_SMOOTHING;
};
