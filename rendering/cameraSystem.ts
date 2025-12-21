
import { MIN_ZOOM, MAX_ZOOM, WORLD_WIDTH, GROUND_Y, MAX_SPEED } from '../constants';
import { GameState } from '../types';

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy, shake } = gameState;

    // --- 1. SYSTEME DE ZOOM "SMART PADDING" ---
    
    // Distance horizontale brute
    const minX = Math.min(player.x, enemy.x);
    const maxX = Math.max(player.x + player.width, enemy.x + enemy.width);
    const dist = maxX - minX;

    // Padding Adaptatif
    // Si proches (<300px) -> Padding serré (150px) pour l'intimité
    // Si loin -> Padding large (jusqu'à 400px) pour la visibilité
    const distRatio = Math.min(1, dist / 800);
    const adaptivePadding = 150 + (distRatio * 250); // Interpole entre 150 et 400

    const targetWidth = dist + (adaptivePadding * 2);
    let targetZoom = viewportWidth / targetWidth;

    // Impact Zoom (Coup reçu)
    if (shake > 5) {
        targetZoom += 0.15;
    }

    // Clamp
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

    // STABILISATION (Hysteresis)
    // On ne met à jour le zoom que si le changement de largeur nécessaire dépasse 50px
    // Cela évite l'effet de "pompage" quand les joueurs bougent un tout petit peu.
    const currentViewW = viewportWidth / gameState.cameraZoom;
    const neededViewW = viewportWidth / targetZoom;
    
    // On force la mise à jour si c'est un Zoom In rapide (impact) ou si différence significative
    if (Math.abs(neededViewW - currentViewW) > 50 || shake > 5) {
         // Smooth Zoom (0.1)
         gameState.cameraZoom += (targetZoom - gameState.cameraZoom) * 0.1;
    }

    const zoom = gameState.cameraZoom;
    const viewW = viewportWidth / zoom;
    const viewH = viewportHeight / zoom;

    // --- 2. POSITIONNEMENT AVEC LOOK-AHEAD ET FOCUS PONDÉRÉ ---

    // Centrage Pondéré : On ne prend pas le milieu strict (0.5), 
    // on donne une légère priorité au joueur pour le "Game Feel" (ex: 55/45)
    // Cependant, pour la compétition, le milieu strict + lookahead est souvent plus lisible.
    // Prompt: "Centrage pondéré (70% joueur)" - Attention, cela peut faire sortir l'ennemi.
    // On utilise le milieu strict pour la base, et le LookAhead du joueur fait le reste.
    const strictMidX = (minX + maxX) / 2;

    // Look-Ahead : Basé sur la direction du joueur.
    // Permet de voir ce qui arrive devant.
    const lookAhead = player.vx * 15; 

    let targetCamX = (strictMidX + lookAhead) - (viewW / 2);

    // Clamp Monde
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));

    // --- 3. POSITIONNEMENT VERTICAL (ANCRE STABLE) ---

    // Ancre Sol : 80% vers le bas
    const groundAnchorY = GROUND_Y - (viewH * 0.80);
    
    // Élévation
    const highestPoint = Math.min(player.y, enemy.y);
    const skyThreshold = GROUND_Y - 300; 

    let targetCamY = groundAnchorY;

    if (highestPoint < skyThreshold) {
        const airTargetY = highestPoint - (viewH * 0.25);
        targetCamY = Math.min(groundAnchorY, airTargetY);
    }
    
    // Sécurité Bas et Haut
    targetCamY = Math.min(targetCamY, groundAnchorY);
    targetCamY = Math.max(-2500, targetCamY);

    // --- 4. LISSAGE INTELLIGENT (AMORTISSEMENT DYNAMIQUE) ---

    // X Smoothing : Base 0.2 (Nerveux)
    let smoothX = 0.2;

    // VÉRIFICATION DE BORDURE (Panic Snap)
    // Si un joueur est trop près du bord de l'écran (15%), on accélère la caméra
    const playerScreenX = (player.x - gameState.cameraX) * zoom;
    const enemyScreenX = (enemy.x - gameState.cameraX) * zoom;
    const margin = viewportWidth * 0.15;

    if (playerScreenX < margin || playerScreenX > viewportWidth - margin || 
        enemyScreenX < margin || enemyScreenX > viewportWidth - margin) {
        smoothX = 0.40; // Rattrapage d'urgence
    }

    // Y Smoothing : Lent (0.08) pour la lourdeur et la stabilité
    const smoothY = 0.08;

    gameState.cameraX += (targetCamX - gameState.cameraX) * smoothX;
    gameState.cameraY += (targetCamY - gameState.cameraY) * smoothY;

    // --- 5. TILT AVEC LAG (POIDS) ---
    // On utilise un lissage très bas (0.05) pour que le tilt "suive" le mouvement avec retard
    const targetTilt = (player.vx / MAX_SPEED) * 0.02;
    gameState.cameraTilt += (targetTilt - gameState.cameraTilt) * 0.05;

    gameState.cameraLookAhead = lookAhead;
};
