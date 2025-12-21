
import { MIN_ZOOM, MAX_ZOOM, WORLD_WIDTH, GROUND_Y, MAX_SPEED, CAMERA_TILT_MAX } from '../constants';
import { GameState } from '../types';

const lerp = (start: number, end: number, t: number) => {
    return start + (end - start) * t;
};

export const updateCamera = (gameState: GameState, viewportWidth: number, viewportHeight: number) => {
    const { player, enemy, shake } = gameState;

    // --- 1. BOUNDING BOX (La boîte qui contient les deux joueurs) ---
    // On calcule les limites extrêmes de l'action
    const minX = Math.min(player.x, enemy.x);
    const maxX = Math.max(player.x + player.width, enemy.x + enemy.width);
    const minY = Math.min(player.y, enemy.y);
    const maxY = Math.max(player.y + player.height, enemy.y + enemy.height);

    // Centre de l'action (Le point que la caméra veut regarder)
    const midX = (minX + maxX) / 2;
    // Pour le Y, on vise un peu plus haut que le milieu pour donner de l'air au dessus des têtes
    const midY = (minY + maxY) / 2 - 50; 

    // --- 2. ZOOM INTELLIGENT ---
    const distX = maxX - minX;
    const distY = maxY - minY;

    // On calcule le zoom nécessaire pour faire tenir la largeur + marges
    // On ajoute 400px de marge horizontale (200px de chaque côté)
    const paddingX = 400; 
    let targetZoom = viewportWidth / (distX + paddingX);

    // Vérification Verticale : Si les joueurs s'écartent beaucoup verticalement (Slinger/Grappin)
    // On dézoome aussi pour qu'ils rentrent en hauteur
    const paddingY = 300;
    const zoomNeededForHeight = viewportHeight / (distY + paddingY);
    
    // On prend le zoom le plus "large" (le plus petit chiffre) entre contrainte X et Y
    targetZoom = Math.min(targetZoom, zoomNeededForHeight);

    // Clamp final (Limites strictes du jeu)
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

    // Effet d'impact (petit coup de zoom)
    if (shake > 5) targetZoom += 0.05;

    // Application du Zoom
    // Si on dézoome (target < current), on le fait un peu plus vite pour ne pas perdre l'action
    const zoomSpeed = targetZoom < gameState.cameraZoom ? 0.1 : 0.05;
    gameState.cameraZoom = lerp(gameState.cameraZoom, targetZoom, zoomSpeed);

    // --- 3. CALCUL DE LA POSITON CAMÉRA ---
    
    // Dimensions actuelles de la vue dans le monde
    const viewW = viewportWidth / gameState.cameraZoom;
    const viewH = viewportHeight / gameState.cameraZoom;

    // Cible X : Centrée sur l'action
    let targetCamX = midX - (viewW / 2);

    // LookAhead : Décalage subtil selon la direction du joueur principal
    // (Seulement si la cam n'est pas déjà au max zoom out)
    if (gameState.cameraZoom > MIN_ZOOM + 0.1) {
        targetCamX += player.facing * 50; 
    }

    // Cible Y : Centrée sur l'action, MAIS avec contrainte sol
    let targetCamY = midY - (viewH / 2);

    // --- 4. CONTRAINTES CRITIQUES (FLOOR & CEILING) ---

    // CONTRAINTE SOL : Le bas de la caméra ne doit pas être en dessous de GROUND_Y + marge
    // On veut voir le sol, donc on se cale pour que GROUND_Y soit à environ 100px du bas de l'écran
    const floorLimit = GROUND_Y + 100 - viewH;
    
    // Si la cible calculée (centrée sur les joueurs) est plus basse que la limite sol, on remonte.
    // Cela empêche la caméra de montrer "sous la map".
    if (targetCamY > floorLimit) {
        targetCamY = floorLimit;
    }

    // CONTRAINTE PLAFOND : Juste pour éviter les bugs si on s'envole à l'infini
    if (targetCamY < -WORLD_WIDTH) targetCamY = -WORLD_WIDTH;

    // --- 5. LISSAGE & RÉACTIVITÉ (DYNAMIQUE) ---

    // Détection Haute Vitesse (Grappin / Dash)
    const highVelocity = Math.abs(player.vx) > 25 || Math.abs(player.vy) > 20 || player.isGrappling;
    
    // Si on va très vite, la caméra devient plus nerveuse (lerp plus élevé)
    // Sinon, elle est fluide (cinématique)
    const smoothX = highVelocity ? 0.3 : 0.1;
    const smoothY = highVelocity ? 0.3 : 0.1;

    // Clamp X Monde (Ne pas sortir à gauche/droite)
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - viewW));

    // Application finale
    gameState.cameraX = lerp(gameState.cameraX, targetCamX, smoothX);
    gameState.cameraY = lerp(gameState.cameraY, targetCamY, smoothY);

    // Tilt (Inclinaison dynamique)
    const tilt = (player.vx / MAX_SPEED) * CAMERA_TILT_MAX;
    gameState.cameraTilt = lerp(gameState.cameraTilt, tilt, 0.1);
};
