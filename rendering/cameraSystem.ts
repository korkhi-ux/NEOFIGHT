
import { PLAYER_WIDTH, PLAYER_HEIGHT, MIN_ZOOM, MAX_ZOOM, CAMERA_SMOOTHING, CAMERA_TILT_MAX, GROUND_Y, WORLD_WIDTH, MAX_SPEED } from '../constants';
import { GameState } from '../types';

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy } = gameState;
    
    // 1. Calculate Midpoints
    const midX = (player.x + enemy.x + PLAYER_WIDTH) / 2;
    const midY = (player.y + enemy.y + PLAYER_HEIGHT) / 2;

    const distX = Math.abs(player.x - enemy.x);
    const distY = Math.abs(player.y - enemy.y);

    // 2. Adaptive Zoom (Multi-Axis)
    const paddingX = 400; // Side padding
    const paddingY = 250; // Vertical padding
    
    // Calculate zoom needed to fit X distance
    const zoomX = viewportWidth / (distX + paddingX);
    
    // Calculate zoom needed to fit Y distance
    const zoomY = viewportHeight / (distY + paddingY);
    
    // We must pick the SMALLER zoom (more zoomed out) to ensure BOTH constraints are met.
    let desiredZoom = Math.min(zoomX, zoomY);
    
    // Clamp Zoom limits
    desiredZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, desiredZoom));

    gameState.cameraZoom += (desiredZoom - gameState.cameraZoom) * CAMERA_SMOOTHING;
    const zoom = gameState.cameraZoom;

    // 3. Look Ahead Logic
    const playerVelX = player.isDashing ? player.vx * 1.5 : player.vx;
    const lookAheadTargetX = playerVelX * 10;
    gameState.cameraLookAhead += (lookAheadTargetX - gameState.cameraLookAhead) * 0.05;

    // Vertical Look Ahead is less important now that we center on midY, 
    // but slight adjustment helps.
    
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
    let targetCamY = midY - viewH / 2; // Perfectly centered vertically on the action

    // 6. Clamping (World Bounds)
    
    // Horizontal Clamp
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));

    // Vertical Clamp
    // Allow seeing up to -2000 (high air)
    // Don't let camera go below ground view
    targetCamY = Math.max(-2000, Math.min(targetCamY, GROUND_Y + 100 - viewH));

    gameState.cameraX += (targetCamX - gameState.cameraX) * CAMERA_SMOOTHING;
    gameState.cameraY += (targetCamY - gameState.cameraY) * CAMERA_SMOOTHING;
};
