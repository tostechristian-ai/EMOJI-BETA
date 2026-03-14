/**
 * constants.js
 * Global game configuration and constants
 * No dependencies - safe to import first
 */

// World dimensions
export const WORLD_WIDTH = 2560;
export const WORLD_HEIGHT = 1440;

// Player constants
export const PLAYER_SIZE = 35;
export const PLAYER_BASE_SPEED = 1.4;
export const PLAYER_MAX_LIVES = 3;
export const PLAYER_MAGNET_RADIUS = 23 * 2;

// Dash constants
export const DASH_COOLDOWN = 6000;
export const DASH_SPEED_MULTIPLIER = 3.5;
export const DASH_DURATION = 200;
export const DASH_INVINCIBILITY_FRAMES = 300;

// Camera
export const CAMERA_SMOOTHING = 0.1;
export const PLAYER_HIT_SHAKE_DURATION = 300;
export const MAX_PLAYER_HIT_SHAKE_OFFSET = 5;
export const BOB_AMPLITUDE = 2.5;

// Gameplay
export const MERCHANT_SPAWN_INTERVAL = 180000; // 3 minutes
export const MAX_ENEMIES = 100;
export const MAX_WEAPONS = 500;
export const GAMEPAD_DEADZONE = 0.15;

// Enemy spawn timing
export const ENEMY_SPAWN_INTERVAL = 1000;
export const WEAPON_FIRE_INTERVAL = 400;

// Rendering
export const CANVAS_WIDTH = 1125;
export const CANVAS_HEIGHT = 676;

// XP & Level
export const INITIAL_XP_TO_NEXT_LEVEL = 3;
export const XP_LEVEL_MULTIPLIER = 1.2;

// Emoji sizes for rendering
export const EMOJI_SIZES = {
  ZOMBIE: 17,
  SKULL: 20,
  BAT: 25 * 0.85,
  SPIRAL: 22,
  MOSQUITO: 15,
  DEMON: 20 * 0.8,
  OGRE: 28 * 0.7,
  GHOST: 22,
  EYE: 25 * 0.6,
  ZOMBIE_FEMALE: 17 * 1.75,
  VAMPIRE: 20,
  COIN: 10,
  DIAMOND: 12,
  RING: 11,
  APPLE: 15,
  BOMB: 14,
  LIGHTNING: 10,
  EYE_PROJECTILE: 25 * 0.6 / 2,
  WHIRLWIND_AXE: 30,
  DOG: 25,
  OWL: 30,
  BRICK: 30,
  BARREL: 15,
};