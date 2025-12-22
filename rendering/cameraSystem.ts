
import { MAX_ZOOM, MIN_ZOOM, CAMERA_TILT_MAX } from '../config/settings';
import { WORLD_WIDTH, GROUND_Y, MAX_SPEED } from '../config/physics';
import { GameState } from '../types';

const lerp = (start: number, end: number, t: number) => {
    return start + (end - start) * t;
};

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy, shake } = gameState;

    // --- 0. STATE ANALYSIS ---
    const isHighSpeed = Math.abs(player.vx) > 15 || Math.abs(player.vy) > 15 || player.isGrappling || player.isDashing;

    // --- 1. TARGET FOCUS (Bounding Box) ---
    const minX = Math.min(player.x, enemy.x);
    const maxX = Math.max(player.x + player.width, enemy.x + enemy.width);
    const minY = Math.min(player.y, enemy.y);
    const maxY = Math.max(player.y + player.height, enemy.y + enemy.height);

    const midX = (minX + maxX) / 2;
    const distX = maxX - minX;
    const distY = maxY - minY;

    // --- 2. ZOOM LOGIC (Zone-based & Hysteresis) ---
    // Zone 1: Close Combat (< 350px) -> Tight Zoom
    // Zone 2: Mid Range -> Adaptive
    // Zone 3: Far / High Speed -> Wide Zoom (MIN_ZOOM tendency)
    
    let paddingX = 450; // Default Mid-range padding

    if (isHighSpeed) {
        paddingX = 650; // Open up view for speed
    } else if (distX < 350) {
        paddingX = 250; // Intimacy for melee
    } else if (distX > 900) {
        paddingX = 550; // Maintain context at distance
    }

    const paddingY = 300; // Vertical breathing room

    const idealZoomX = viewportWidth / (distX + paddingX);
    const idealZoomY = viewportHeight / (distY + paddingY);
    
    // Choose the zoom that fits both dimensions
    let targetZoom = Math.min(idealZoomX, idealZoomY);

    // Hard Clamps
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

    // Impact Shake Zoom Effect
    if (shake > 5) targetZoom += 0.05;

    // Hysteresis: Prevent micro-jitter when near threshold
    // If the difference is small, stick to current zoom unless moving fast
    if (!isHighSpeed && Math.abs(targetZoom - gameState.cameraZoom) < 0.01) {
        targetZoom = gameState.cameraZoom;
    }

    // Interpolation Speed
    // Snappy on high energy/dash/grapple, smooth on stable movement
    const zoomSpeed = (isHighSpeed || Math.abs(player.vx) > 12) ? 0.15 : 0.02;
    gameState.cameraZoom = lerp(gameState.cameraZoom, targetZoom, zoomSpeed);

    // --- 3. HORIZONTAL POSITIONING (Predictive Look-ahead) ---
    const viewW = viewportWidth / gameState.cameraZoom;
    
    // Predictive Look-ahead based on player velocity
    // Helps player see where they are going
    const lookAheadFactor = 15;
    const maxLookAhead = 100;
    const lookAhead = Math.max(-maxLookAhead, Math.min(maxLookAhead, player.vx * lookAheadFactor));
    
    let targetCamX = (midX + lookAhead) - (viewW / 2);
    
    // Map Constraints (Clamp to World)
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));


    // --- 4. VERTICAL POSITIONING (Robust Ground Anchor) ---
    const viewH = viewportHeight / gameState.cameraZoom;

    // Anchor Position: Ground is at 80% of screen height (bottom 20% margin)
    // This keeps the floor stable and visible.
    const anchorY = GROUND_Y - (viewH * 0.8);

    // Lift Threshold: Camera only rises if highest player is significantly above ground
    // e.g., > 350px above ground
    const liftThreshold = GROUND_Y - 350;
    
    let targetCamY = anchorY;

    // If highest player (minY) is above the threshold (numerically smaller)
    if (minY < liftThreshold) {
         // Track the player, keeping them roughly at 25% from top of screen
         const trackingY = minY - (viewH * 0.25);
         
         // Use the higher value (numerically smaller Y) between anchor and tracking
         // This allows the camera to lift up
         targetCamY = Math.min(anchorY, trackingY);
    }
    
    // Floor Clamp: Prevent looking too deep underground
    const maxCamY = GROUND_Y + 150 - viewH;
    targetCamY = Math.min(targetCamY, maxCamY);
    
    // Ceiling Clamp
    targetCamY = Math.max(targetCamY, -WORLD_WIDTH); // Arbitrary sky limit

    // Vertical Smoothing
    // Very slow smoothing for stability, preventing nausea during jumps
    const verticalLerp = 0.03; 
    
    // Horizontal Smoothing
    // Faster to track dashes
    const horizontalLerp = isHighSpeed ? 0.2 : 0.08;

    gameState.cameraX = lerp(gameState.cameraX, targetCamX, horizontalLerp);
    gameState.cameraY = lerp(gameState.cameraY, targetCamY, verticalLerp);

    // --- 5. TILT DYNAMICS ---
    // Tilt only on horizontal movement
    let targetTilt = 0;
    if (Math.abs(player.vx) > 10) {
        targetTilt = (player.vx / MAX_SPEED) * CAMERA_TILT_MAX;
    }
    gameState.cameraTilt = lerp(gameState.cameraTilt, targetTilt, 0.05);
};
