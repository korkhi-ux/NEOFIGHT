
import { MIN_ZOOM, MAX_ZOOM, WORLD_WIDTH, GROUND_Y, MAX_SPEED } from '../constants';
import { GameState } from '../types';

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy, shake } = gameState;

    // --- 1. LOGIQUE DE ZOOM "TENSION" ---
    
    // Calcul de la distance brute entre les joueurs
    const minX = Math.min(player.x, enemy.x);
    const maxX = Math.max(player.x + player.width, enemy.x + enemy.width);
    const dist = maxX - minX;

    // Calcul de la "Tension" par la vitesse
    // Plus ça bouge vite, plus on a besoin de voir large
    const maxVel = Math.max(Math.abs(player.vx), Math.abs(enemy.vx));
    
    // Padding de base très serré (150px) pour favoriser les gros plans
    const basePadding = 150;
    // Padding dynamique : Ajoute jusqu'à ~300-400px lors des dashs
    const velocityPadding = maxVel * 15; 
    
    const currentPadding = basePadding + velocityPadding;
    const targetWidth = dist + (currentPadding * 2);
    
    let targetZoom = viewportWidth / targetWidth;

    // IMPACT ZOOM : Si le jeu tremble (coup reçu), on zoom in brusquement pour l'impact
    if (shake > 5) {
        targetZoom += 0.15;
    }

    // Clamp
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

    // Lissage Zoom Rapide (0.15)
    gameState.cameraZoom += (targetZoom - gameState.cameraZoom) * 0.15;

    const currentZoom = gameState.cameraZoom;
    const viewW = viewportWidth / currentZoom;
    const viewH = viewportHeight / currentZoom;

    // --- 2. POSITION HORIZONTALE AVEC LOOK-AHEAD (SCAN) ---

    const midX = (minX + maxX) / 2;

    // Look-Ahead agressif : On décale la caméra vers là où le joueur va.
    // Cela permet de voir l'ennemi arriver ou le mur.
    // Factor 12 : vx=10 -> shift 120px
    const lookAhead = player.vx * 12;

    let targetCamX = (midX + lookAhead) - (viewW / 2);
    
    // Clamp Monde
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));

    // --- 3. POSITION VERTICALE (ANCRE SOL STABLE) ---

    // Règle des 80% : Le sol reste en bas
    const groundAnchorY = GROUND_Y - (viewH * 0.80);
    
    // Élévation conditionnelle
    const highestPoint = Math.min(player.y, enemy.y);
    const skyThreshold = GROUND_Y - 300; 

    let targetCamY = groundAnchorY;

    if (highestPoint < skyThreshold) {
        // Si ça vole haut, on suit, mais on garde une préférence pour le sol
        const airTargetY = highestPoint - (viewH * 0.25);
        targetCamY = Math.min(groundAnchorY, airTargetY);
    }

    // Sécurités
    targetCamY = Math.min(targetCamY, groundAnchorY);
    targetCamY = Math.max(-2500, targetCamY);

    // --- 4. LISSAGE HAUTE FRÉQUENCE ---
    // Mouvement nerveux pour suivre l'action sans latence "molle"
    gameState.cameraX += (targetCamX - gameState.cameraX) * 0.15;
    gameState.cameraY += (targetCamY - gameState.cameraY) * 0.15;

    // Tilt basé sur la vitesse pour l'effet dynamique
    const targetTilt = (player.vx / MAX_SPEED) * 0.025;
    gameState.cameraTilt += (targetTilt - gameState.cameraTilt) * 0.1;

    // Reset lookahead pour le prochain calcul (si utilisé ailleurs)
    gameState.cameraLookAhead = lookAhead;
};
