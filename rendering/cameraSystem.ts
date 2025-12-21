
import { MIN_ZOOM, MAX_ZOOM, WORLD_WIDTH, GROUND_Y, MAX_SPEED, CANVAS_HEIGHT } from '../constants';
import { GameState, Fighter } from '../types';

/**
 * Calcul les limites prédictives (Bounding Box) englobant tous les joueurs.
 */
const getPredictiveBounds = (players: Fighter[], lookaheadFrames: number) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    players.forEach(p => {
        // Position actuelle
        const currentX = p.x;
        const currentY = p.y;
        
        // Position prédite (Future)
        const predX = p.x + p.vx * lookaheadFrames;
        const predY = p.y + p.vy * lookaheadFrames;

        const w = p.width;
        const h = p.height;

        minX = Math.min(minX, currentX, predX);
        maxX = Math.max(maxX, currentX + w, predX + w);
        minY = Math.min(minY, currentY, predY);
        maxY = Math.max(maxY, currentY + h, predY + h);
    });

    return { minX, maxX, minY, maxY };
};

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy } = gameState;
    
    // --- 1. ANALYSE DE SITUATION ---
    const highSpeedAction = player.isGrappling || player.isDashing || Math.abs(player.vx) > 20 || Math.abs(enemy.vx) > 20;
    const predictionFrames = highSpeedAction ? 20 : 10;
    const bounds = getPredictiveBounds([player, enemy], predictionFrames);

    // --- 2. CALCUL DU ZOOM "SAFE ZONE" ---
    // On priorise la largeur pour le zoom de base
    const totalVelocity = Math.abs(player.vx) + Math.abs(player.vy) + Math.abs(enemy.vx) + Math.abs(enemy.vy);
    const dynamicPadding = Math.min(300, totalVelocity * 5); 
    const basePaddingX = 350; 
    
    // Width Target
    const targetW = (bounds.maxX - bounds.minX) + (basePaddingX + dynamicPadding) * 2;
    let targetZoom = viewportWidth / targetW;

    // --- 3. IN-FRAME CHECK (SÉCURITÉ VERTICALE) ---
    // On vérifie si les joueurs sont proches des bords verticaux avec le zoom actuel
    // Si oui, on force le dézoom.
    const paddingY_Critical = 100; // Marge minimale absolue (pixels écran)
    const contentHeightWorld = (bounds.maxY - bounds.minY);
    
    // Hauteur visible en pixels monde avec le zoom calculé sur la largeur
    let visibleWorldHeight = viewportHeight / targetZoom;

    // Si le contenu vertical + marges dépasse ce qu'on peut voir, on dézoome
    if (contentHeightWorld + (paddingY_Critical * 2 / targetZoom) > visibleWorldHeight) {
        // Recalcul du zoom basé sur la hauteur nécessaire
        // On veut que : contentHeightWorld * newZoom + margins < viewportHeight
        const neededHeight = contentHeightWorld; // Padding géré par le ratio
        // On laisse environ 20% de marge totale (10% haut, 10% bas)
        targetZoom = Math.min(targetZoom, (viewportHeight * 0.8) / neededHeight);
    }

    // Clamping final
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

    // --- 4. POSITION VERTICALE (GROUND ANCHOR vs ELEVATION) ---
    
    const currentViewH = viewportHeight / targetZoom; // Hauteur du viewport en unités monde pour le target
    
    // A. Ancre de sol : Le sol est à 85% de l'écran vers le bas.
    // CamY = GroundY - (85% de la vue)
    const groundAnchorY = GROUND_Y - (currentViewH * 0.85);

    // B. Élévation Dynamique : Où sont les joueurs ?
    const playersMidY = (bounds.minY + bounds.maxY) / 2;
    
    // Seuil de décollage : Si le milieu des joueurs dépasse 300px au dessus du sol
    const airThreshold = GROUND_Y - 300; 

    let targetCamY = groundAnchorY;

    if (playersMidY < airThreshold) {
        // Les joueurs volent haut. On passe en mode "Centrage Vertical"
        // On centre la caméra sur les joueurs
        const centerTargetY = playersMidY - (currentViewH / 2);
        
        // On choisit la position la plus haute (valeur Y la plus faible) entre l'ancre et le centrage
        // Cela permet une transition naturelle : tant que le centrage est plus bas que l'ancre, l'ancre gagne.
        targetCamY = Math.min(groundAnchorY, centerTargetY);
    }

    // Clamp bas : Ne jamais descendre sous l'ancre de sol (on ne veut pas voir sous la map)
    targetCamY = Math.min(targetCamY, groundAnchorY);
    // Clamp haut : Plafond max
    targetCamY = Math.max(-3000, targetCamY);

    // --- 5. POSITION HORIZONTALE (CENTRAGE STANDARD) ---
    const currentViewW = viewportWidth / targetZoom;
    const boxCenterX = (bounds.minX + bounds.maxX) / 2;
    let targetCamX = boxCenterX - currentViewW / 2;
    
    // Clamp Monde
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - currentViewW));

    // --- 6. LISSAGE ET APPLICATION ---

    let smoothing = highSpeedAction ? 0.2 : 0.08;

    // Urgence : Si on est très loin du target zoom (changement brusque de distance), on accélère
    if (Math.abs(targetZoom - gameState.cameraZoom) > 0.2) {
        smoothing = 0.15;
    }

    // STABILISATION DE DÉPART (Frame 1-5)
    if (gameState.frameCount < 5) {
        gameState.cameraZoom = 1.0; // Force start zoom
        // Recalcul simple pour frame 1
        gameState.cameraX = boxCenterX - (viewportWidth / 1.0) / 2;
        gameState.cameraY = GROUND_Y - (viewportHeight / 1.0) * 0.85;
    } else {
        gameState.cameraZoom += (targetZoom - gameState.cameraZoom) * smoothing;
        gameState.cameraX += (targetCamX - gameState.cameraX) * smoothing;
        gameState.cameraY += (targetCamY - gameState.cameraY) * smoothing;
    }

    // --- 7. TILT ---
    const targetTilt = (player.vx / MAX_SPEED) * 0.015;
    gameState.cameraTilt += (targetTilt - gameState.cameraTilt) * 0.1;
    gameState.cameraLookAhead = 0;
};
