
import { GameMode } from '../types';

export const HIT_FLASH_DURATION = 2; 
export const TRAIL_LENGTH = 3; 

// Camera Dynamics
export const MAX_ZOOM = 1.3; 
export const MIN_ZOOM = 0.65; 
export const CAMERA_SMOOTHING = 0.12; 
export const CAMERA_LOOKAHEAD = 80; 
export const CAMERA_TILT_MAX = 0.015;

// Game Defaults
export const DEFAULT_GAME_MODE: GameMode = 'VERSUS';
export const DEFAULT_WAVE = 1;
export const IS_MENU_OPEN_DEFAULT = true;
