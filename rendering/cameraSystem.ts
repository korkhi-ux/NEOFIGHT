
import { MAX_ZOOM, MIN_ZOOM, CAMERA_TILT_MAX } from '../config/settings';
import { WORLD_WIDTH, GROUND_Y, MAX_SPEED } from '../config/physics';
import { GameState } from '../types';

const lerp = (start: number, end: number, t: number) => {
    return start + (end - start) * t;
};

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy, shake, matchState, introStep } = gameState;

    // --- 0. INTRO CINEMATIC OVERRIDE ---
    if (matchState === 'intro') {
        let targetSubject = player;
        let targetZoom = 1.3;
        let lerpSpeed = 0.05;

        // Determine Subject & Zoom based on step
        if (introStep === 'p1') {
            targetSubject = player;
            targetZoom = 1.5;
            lerpSpeed = 0.08;
        } else if (introStep === 'p2') {
            targetSubject = enemy;
            targetZoom = 1.5;
            lerpSpeed = 0.08;
        } else {
            // "Both" - Center frame
            const midX = (player.x + enemy.x + player.width + enemy.width) / 2;
            // Create a virtual target in the middle
            targetSubject = { ...player, x: midX - player.width/2 }; 
            targetZoom = 1.1; // Wider shot for the face-off
            lerpSpeed = 0.03;
        }

        const viewW = viewportWidth / targetZoom;
        const viewH = viewportHeight / targetZoom;

        // --- CAMERA POSITIONING ---
        // X: Center on the subject
        const targetX = (targetSubject.x + targetSubject.width/2) - (viewW / 2);
        
        let targetY = 0;

        // Y: DYNAMIC TRACKING VS GROUND LOCK
        // Slinger and Kinetic drop from the sky, so we want to track their descent.
        // Volt and Vortex appear on the ground (or teleport in), so we frame the stage.
        const isAerialEntry = (introStep === 'p1' || introStep === 'p2') && 
                              (targetSubject.classType === 'KINETIC' || targetSubject.classType === 'SLINGER');

        if (isAerialEntry) {
            // Track the falling character center
            const charCenterY = targetSubject.y + targetSubject.height / 2;
            targetY = charCenterY - (viewH / 2);

            // Clamp bottom so we don't look underground when they land.
            // We calculate the "Stage Frame" Y position and ensure we don't go below it.
            const standingY = GROUND_Y - targetSubject.height;
            const floorLimitY = (standingY + targetSubject.height * 0.4) - (viewH / 2);
            
            // Allow tracking high up (negative values), but cap the descent at the floor limit
            targetY = Math.min(targetY, floorLimitY);
        } else {
            // Ground Lock for Volt/Vortex/Face-off
            // We frame the "Stage" so we see them land/spawn into the frame.
            const standingY = GROUND_Y - targetSubject.height;
            targetY = (standingY + targetSubject.height * 0.4) - (viewH / 2);
        }

        gameState.cameraZoom = lerp(gameState.cameraZoom, targetZoom, lerpSpeed);
        gameState.cameraX = lerp(gameState.cameraX, targetX, lerpSpeed);
        gameState.cameraY = lerp(gameState.cameraY, targetY, lerpSpeed);
        gameState.cameraTilt = lerp(gameState.cameraTilt, 0, 0.05);
        return;
    }


    // --- 1. STANDARD COMBAT CAMERA ---
    const isHighSpeed = Math.abs(player.vx) > 15 || Math.abs(player.vy) > 15 || player.isGrappling || player.isDashing;

    const minX = Math.min(player.x, enemy.x);
    const maxX = Math.max(player.x + player.width, enemy.x + enemy.width);
    const minY = Math.min(player.y, enemy.y);
    const maxY = Math.max(player.y + player.height, enemy.y + enemy.height);

    const midX = (minX + maxX) / 2;
    const distX = maxX - minX;
    const distY = maxY - minY;

    // --- ZOOM LOGIC ---
    let paddingX = 450; 
    if (isHighSpeed) paddingX = 650; 
    else if (distX < 350) paddingX = 250; 
    else if (distX > 900) paddingX = 550; 

    const paddingY = 300; 

    const idealZoomX = viewportWidth / (distX + paddingX);
    const idealZoomY = viewportHeight / (distY + paddingY);
    let targetZoom = Math.min(idealZoomX, idealZoomY);
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

    if (shake > 5) targetZoom += 0.05;
    if (!isHighSpeed && Math.abs(targetZoom - gameState.cameraZoom) < 0.01) targetZoom = gameState.cameraZoom;

    const zoomSpeed = (isHighSpeed || Math.abs(player.vx) > 12) ? 0.15 : 0.02;
    gameState.cameraZoom = lerp(gameState.cameraZoom, targetZoom, zoomSpeed);

    // --- POSITIONING ---
    const viewW = viewportWidth / gameState.cameraZoom;
    const lookAheadFactor = 15;
    const maxLookAhead = 100;
    const lookAhead = Math.max(-maxLookAhead, Math.min(maxLookAhead, player.vx * lookAheadFactor));
    
    let targetCamX = (midX + lookAhead) - (viewW / 2);
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));

    const viewH = viewportHeight / gameState.cameraZoom;
    const anchorY = GROUND_Y - (viewH * 0.8);
    const liftThreshold = GROUND_Y - 350;
    let targetCamY = anchorY;

    if (minY < liftThreshold) {
         const trackingY = minY - (viewH * 0.25);
         targetCamY = Math.min(anchorY, trackingY);
    }
    
    const maxCamY = GROUND_Y + 150 - viewH;
    targetCamY = Math.min(targetCamY, maxCamY);
    targetCamY = Math.max(targetCamY, -WORLD_WIDTH); 

    const verticalLerp = 0.03; 
    const horizontalLerp = isHighSpeed ? 0.2 : 0.08;

    gameState.cameraX = lerp(gameState.cameraX, targetCamX, horizontalLerp);
    gameState.cameraY = lerp(gameState.cameraY, targetCamY, verticalLerp);

    let targetTilt = 0;
    if (Math.abs(player.vx) > 10) {
        targetTilt = (player.vx / MAX_SPEED) * CAMERA_TILT_MAX;
    }
    gameState.cameraTilt = lerp(gameState.cameraTilt, targetTilt, 0.05);
};
