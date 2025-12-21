
import { MIN_ZOOM, MAX_ZOOM, WORLD_WIDTH, GROUND_Y, MAX_SPEED, CANVAS_HEIGHT } from '../constants';
import { GameState, Fighter } from '../types';

/**
 * Calcul les limites prédictives (Bounding Box) englobant tous les joueurs.
 * @param players Liste des combattants
 * @param lookaheadFrames Nombre de frames à anticiper (ex: 15 frames)
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

        // Limites du corps
        const w = p.width;
        const h = p.height;

        // On étend la box pour inclure le présent ET le futur
        minX = Math.min(minX, currentX, predX);
        maxX = Math.max(maxX, currentX + w, predX + w);
        minY = Math.min(minY, currentY, predY);
        maxY = Math.max(maxY, currentY + h, predY + h);
    });

    return { minX, maxX, minY, maxY };
};

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy } = gameState;
    
    // --- 1. LOGIQUE PRÉDICTIVE & VELOCITÉ ---
    
    // Détermine si le jeu est en mode "Haute Vitesse"
    const highSpeedAction = player.isGrappling || player.isDashing || Math.abs(player.vx) > 20 || Math.abs(enemy.vx) > 20;
    
    // Si haute vitesse, on regarde plus loin dans le futur
    const predictionFrames = highSpeedAction ? 20 : 10;
    const bounds = getPredictiveBounds([player, enemy], predictionFrames);

    // --- 2. CALCUL DU ZOOM ADAPTATIF "SAFE ZONE" ---

    // Padding Dynamique : Plus ça bouge vite, plus on laisse de marge sur les bords
    const totalVelocity = Math.abs(player.vx) + Math.abs(player.vy) + Math.abs(enemy.vx) + Math.abs(enemy.vy);
    const dynamicPadding = Math.min(300, totalVelocity * 5); // Cap padding
    
    const basePaddingX = 350; // Marge latérale minimum
    const basePaddingY = 250; // Marge verticale minimum

    const targetWidth = (bounds.maxX - bounds.minX) + (basePaddingX + dynamicPadding) * 2;
    const targetHeight = (bounds.maxY - bounds.minY) + (basePaddingY + dynamicPadding) * 2;

    // Calcul du zoom idéal pour contenir cette target box
    const zoomX = viewportWidth / targetWidth;
    const zoomY = viewportHeight / targetHeight;
    
    // On prend le plus petit zoom (le plus dézoomé) pour être sûr que tout rentre
    let targetZoom = Math.min(zoomX, zoomY);
    
    // Clamping
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

    // --- 3. INTELLIGENT SMOOTHING (Non-Linéaire) ---

    // Par défaut, smoothing fluide
    let smoothing = 0.08;

    // Si action rapide, la caméra devient "nerveuse" et colle à l'action
    if (highSpeedAction) {
        smoothing = 0.25; 
    }

    // Si on est très loin de la cible (retard important), on accélère drastiquement
    const zoomDiff = Math.abs(targetZoom - gameState.cameraZoom);
    if (zoomDiff > 0.5) smoothing = 0.3; // Catch up fast on zoom

    // Application du Zoom
    gameState.cameraZoom += (targetZoom - gameState.cameraZoom) * smoothing;

    // --- 4. CENTRAGE & ANCRAGE SOL ---

    const currentZoom = gameState.cameraZoom;
    const viewW = viewportWidth / currentZoom;
    const viewH = viewportHeight / currentZoom;

    // Centre géométrique de la Bounding Box
    const boxCenterX = (bounds.minX + bounds.maxX) / 2;
    const boxCenterY = (bounds.minY + bounds.maxY) / 2;

    let targetCamX = boxCenterX - viewW / 2;
    let targetCamY = boxCenterY - viewH / 2;

    // --- 5. BOUNDARY CHECK & GROUND ANCHOR ---
    
    // Clamp Horizontal (Ne pas sortir du monde)
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));

    // Clamp Vertical (Ne pas voir sous le sol)
    // Mais permettre de voir très haut dans le ciel
    // Ground Anchor : Si l'action est proche du sol, on s'assure que le bas de l'écran n'est pas trop haut
    const maxCamY = GROUND_Y + 150 - viewH; // Laisse un peu de marge sous le sol
    targetCamY = Math.min(targetCamY, maxCamY);
    
    // Hard Limit ciel : pour éviter de perdre les repères (optionnel, mis à -4000)
    targetCamY = Math.max(-4000, targetCamY);

    // --- 6. URGENCE (EMERGENCY FRAMING) ---
    // Vérification finale : Si un joueur est sur le point de sortir de l'écran malgré le lissage
    // On force la position (Snap partiel)
    
    // Conversion World -> Screen pour vérifier
    const pScreenX = (player.x - targetCamX) * currentZoom;
    const pScreenY = (player.y - targetCamY) * currentZoom;
    
    const margin = 50; // 50px de marge critique
    const isCritical = 
        pScreenX < margin || pScreenX > viewportWidth - margin ||
        pScreenY < margin || pScreenY > viewportHeight - margin;

    if (isCritical) {
        smoothing = 0.5; // Très rapide pour corriger l'urgence
    }

    // Application Position
    gameState.cameraX += (targetCamX - gameState.cameraX) * smoothing;
    gameState.cameraY += (targetCamY - gameState.cameraY) * smoothing;

    // --- 7. TILT DYNAMIQUE ---
    const targetTilt = (player.vx / MAX_SPEED) * 0.02; // Léger tilt
    gameState.cameraTilt += (targetTilt - gameState.cameraTilt) * 0.1;
    
    // Pas de LookAhead artificiel ici, la bounding box prédictive s'en charge mieux
    gameState.cameraLookAhead = 0; 
};
