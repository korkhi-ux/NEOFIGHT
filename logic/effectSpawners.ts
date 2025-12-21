
import { GameState } from '../types';

export const createParticles = (gameState: GameState, x: number, y: number, count: number, color: string, speed: number) => {
  for(let i=0; i<count; i++) {
    gameState.particles.push({
        id: Math.random().toString(),
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed * 2,
        life: 20 + Math.random() * 10,
        maxLife: 30,
        color: color,
        size: Math.random() * 6 + 2
    });
  }
};

export const createImpact = (gameState: GameState, x: number, y: number, color: string) => {
  gameState.impacts.push({
      id: Math.random().toString(),
      x, y,
      life: 15, // Short life
      color,
      rotation: Math.random() * Math.PI
  });
};

export const createGrappleImpact = (gameState: GameState, x: number, y: number, color: string) => {
    // Ring effect
    gameState.shockwaves.push({
        id: Math.random().toString(),
        x, y,
        radius: 5,
        maxRadius: 60,
        color: color,
        width: 3,
        alpha: 1
    });
    // Sparks
    createParticles(gameState, x, y, 8, color, 8);
};

export const createFlare = (gameState: GameState, x: number, y: number, color: string) => {
  gameState.flares.push({
      id: Math.random().toString(),
      x, y,
      life: 20,
      color
  });
};

export const createShockwave = (gameState: GameState, x: number, y: number, color: string) => {
  gameState.shockwaves.push({
      id: Math.random().toString(),
      x, y,
      radius: 10,
      maxRadius: 150,
      color,
      width: 5,
      alpha: 1
  });
};
