
import { PLAYER_WIDTH, PLAYER_HEIGHT, MIN_ZOOM, MAX_ZOOM, CAMERA_SMOOTHING, CAMERA_TILT_MAX, GROUND_Y, WORLD_WIDTH, MAX_SPEED } from '../constants';
import { GameState } from '../types';

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy } = gameState;
    
    // 1. Calculate Midpoints (Target Centers)
    const midX = (player.x + enemy.x + PLAYER_WIDTH) / 2;
    const midY = (player.y + enemy.y + PLAYER_HEIGHT) / 2;

    const distX = Math.abs(player.x - enemy.x);
    const distY = Math.abs(player.y - enemy.y);

    // 2. Adaptive Zoom (Multi-Axis)
    // Zoom out if players are far horizontally OR vertically.
    // Factor 0.55 ensures players stay within the central 55% of the screen.
    const zoomForX = (viewportWidth * 0.55) / (distX + 300); // Added padding 300
    const zoomForY = (viewportHeight * 0.55) / (distY + 300); // Added padding 300
    
    // Choose the zoom that accommodates the largest dimension needed (The smallest zoom value)
    let desiredZoom = Math.min(zoomForX, zoomForY);
    
    // Clamp Zoom limits
    desiredZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, desiredZoom));

    gameState.cameraZoom += (desiredZoom - gameState.cameraZoom) * CAMERA_SMOOTHING;
    const zoom = gameState.cameraZoom;

    // 3. Look Ahead Logic
    
    // Horizontal Look-Ahead (Anticipate running direction)
    const playerVelX = player.isDashing ? player.vx * 1.5 : player.vx;
    const lookAheadTargetX = playerVelX * 10;
    gameState.cameraLookAhead += (lookAheadTargetX - gameState.cameraLookAhead) * 0.05;

    // Vertical Look-Ahead (Anticipate jumping/grappling up)
    // If player is moving UP fast (negative VY), shift camera UP.
    const lookAheadTargetY = player.vy < -5 ? player.vy * 12 : 0;
    
    // 4. Dynamic Tilt
    const targetTilt = (Math.abs(player.vx) < 1.0) 
        ? 0 
        : (player.vx / MAX_SPEED) * CAMERA_TILT_MAX;
        
    const tiltSmoothing = Math.abs(player.vx) < 1.0 ? 0.2 : 0.1;
    gameState.cameraTilt += (targetTilt - gameState.cameraTilt) * tiltSmoothing;

    // 5. Final Target Calculation
    const viewW = viewportWidth / zoom;
    const viewH = viewportHeight / zoom;

    let targetCamX = midX - viewW / 2 + gameState.cameraLookAhead;
    
    // Vertical Target: Center on MidY, apply LookAhead
    let targetCamY = midY - viewH / 2 + lookAheadTargetY;

    // 6. Clamping (World Bounds)
    
    // Horizontal Clamp
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));

    // Vertical Clamp
    // Allow going high up (-1500) for grapple gameplay, stop at ground
    targetCamY = Math.max(-1500, Math.min(targetCamY, GROUND_Y + 150 - viewH));

    gameState.cameraX += (targetCamX - gameState.cameraX) * CAMERA_SMOOTHING;
    gameState.cameraY += (targetCamY - gameState.cameraY) * CAMERA_SMOOTHING;
};
