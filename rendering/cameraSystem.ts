
import { MIN_ZOOM, MAX_ZOOM, WORLD_WIDTH, GROUND_Y, MAX_SPEED, CANVAS_HEIGHT } from '../constants';
import { GameState, Fighter } from '../types';

/**
 * Calcule uniquement la bounding box horizontale prédictive pour le zoom.
 * On ignore la prédiction Y pour éviter les sauts de caméra.
 */
const getHorizontalPredictiveBounds = (players: Fighter[], lookaheadFrames: number) => {
    let minX = Infinity, maxX = -Infinity;
    
    players.forEach(p => {
        const currentX = p.x;
        const predX = p.x + p.vx * lookaheadFrames;
        const w = p.width;

        minX = Math.min(minX, currentX, predX);
        maxX = Math.max(maxX, currentX + w, predX + w);
    });

    return { minX, maxX };
};

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy } = gameState;
    
    // --- 1. ZOOM "FOCUS" STABILISÉ (HORIZONTAL UNIQUEMENT) ---
    // On ignore totalement la verticalité pour le calcul du zoom.
    // Cela empêche la caméra de pomper quand on saute.
    
    const highSpeed = Math.abs(player.vx) > 15 || player.isDashing || player.isGrappling;
    const lookahead = highSpeed ? 15 : 5;
    
    const boundsX = getHorizontalPredictiveBounds([player, enemy], lookahead);
    
    // Marge Fixe de 450px de chaque côté (Total 900px de 'vide' désiré)
    // Cela laisse de la place pour voir venir les attaques.
    const paddingX = 450; 
    const targetWidth = (boundsX.maxX - boundsX.minX) + paddingX * 2;
    
    let targetZoom = viewportWidth / targetWidth;
    
    // Clamp du zoom
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    
    // Lissage du Zoom (Intermédiaire)
    gameState.cameraZoom += (targetZoom - gameState.cameraZoom) * 0.1;
    
    const currentZoom = gameState.cameraZoom;
    const viewW = viewportWidth / currentZoom;
    const viewH = viewportHeight / currentZoom;

    // --- 2. POSITIONNEMENT HORIZONTAL (NERVEUX) ---
    // La caméra doit suivre les dashs et téléports très vite.
    
    const midX = (boundsX.minX + boundsX.maxX) / 2;
    let targetCamX = midX - viewW / 2;
    
    // Clamp Monde X
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));

    // --- 3. POSITIONNEMENT VERTICAL (ANCRAGE SOL) ---
    // Règle d'or : Le sol est à 80% du bas de l'écran.
    // On ne bouge que si nécessaire.
    
    const groundAnchorY = GROUND_Y - (viewH * 0.80);
    
    // Détection de l'élévation des joueurs
    // On cherche le point le plus haut (minY le plus faible)
    const highestPoint = Math.min(player.y, enemy.y);
    
    // Seuil critique : Si un joueur dépasse 200px au dessus du sol
    const skyThreshold = GROUND_Y - 250; 
    
    let targetCamY = groundAnchorY;

    if (highestPoint < skyThreshold) {
        // Mode Aérien : On monte doucement pour garder le joueur en vue
        // On vise à placer le joueur le plus haut à environ 20% du haut de l'écran
        const airTargetY = highestPoint - (viewH * 0.2);
        
        // On prend la valeur minimale (la plus haute) entre l'ancre et la cible aérienne
        // Mais on s'assure de ne jamais aller PLUS BAS que l'ancre de sol.
        targetCamY = Math.min(groundAnchorY, airTargetY);
    }
    
    // Clamp Monde Y (Plafond map)
    targetCamY = Math.max(-2000, targetCamY);
    // Clamp Bas (Ne jamais montrer sous le sol)
    targetCamY = Math.min(targetCamY, groundAnchorY);

    // --- 4. LISSAGE DIFFÉRENCIÉ (VORTEX-READY) ---
    
    // X : Smoothing Rapide (0.20) pour suivre l'action latérale intense
    gameState.cameraX += (targetCamX - gameState.cameraX) * 0.20;
    
    // Y : Smoothing Lent (0.05) pour une stabilité cinématique
    // Sauf si on retombe au sol (pour éviter de perdre le sol de vue à l'atterrissage)
    const ySmoothing = (targetCamY > gameState.cameraY) ? 0.1 : 0.05;
    gameState.cameraY += (targetCamY - gameState.cameraY) * ySmoothing;
    
    // --- 5. TILT & IMPACTS ---
    // Le tilt reste purement esthétique basé sur la vitesse X
    const targetTilt = (player.vx / MAX_SPEED) * 0.01;
    gameState.cameraTilt += (targetTilt - gameState.cameraTilt) * 0.1;
    
    // Reset lookahead car géré par la bounding box
    gameState.cameraLookAhead = 0;
};
