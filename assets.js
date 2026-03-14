/**
 * assets.js
 * Asset loading and management for sprites, audio, and backgrounds
 * Depends on: audio.js, constants.js
 */

import { EMOJI_SIZES } from './constants.js';
import { loadSoundEffect, loadMusic } from './audio.js';

// ============================================
// ASSET PATHS
// ============================================

export const SPRITE_PATHS = {
  gun: 'sprites/gun.png',
  bullet: 'sprites/bullet.png',
  circle: 'sprites/circle.png',
  pickupBox: 'sprites/pickupbox.png',
  slime: 'sprites/slime.png',
  playerUp: 'sprites/playerup.png',
  playerDown: 'sprites/playerdown.png',
  playerLeft: 'sprites/playerleft.png',
  playerRight: 'sprites/playerright.png',
  levelUpBox: 'sprites/levelupbox.png',
  spinninglight: 'sprites/spinninglight.png',
  bloodPuddle: 'sprites/blood.png',
  crosshair: 'sprites/crosshair.png',
};

export const AUDIO_PATHS = {
  playerShoot: 'audio/fire_shot.mp3',
  xpPickup: 'audio/pick_up_xp.mp3',
  boxPickup: 'audio/pick_up_power.mp3',
  levelUp: 'audio/level_up.mp3',
  levelUpSelect: 'audio/level_up_end.mp3',
  enemyDeath: 'audio/enemy_death.mp3',
  gameOver: 'audio/gameover.mp3',
  playerScream: 'audio/scream.mp3',
  uiClick: 'audio/click.mp3',
  mainMenu: 'audio/mainmenu.mp3',
  dodge: 'audio/dodge.mp3',
};

export const BACKGROUND_PATHS = [
  'sprites/Background6.png',
  'sprites/Background2.png',
  'sprites/Background3.png',
  'sprites/Background4.png',
  'sprites/Background5.png',
  'sprites/Background8.png',
  'sprites/Background1.png',
  'sprites/Background7.png',
  'sprites/Background9.png',
];

// ============================================
// ASSET STATE
// ============================================

export const assetState = {
  sprites: {},
  backgrounds: new Array(BACKGROUND_PATHS.length),
  preRendered: {},
  loadedCount: 0,
  totalAssets: 0,
  isReady: false,
};

// ============================================
// SPRITE LOADING
// ============================================

/**
 * Load a single sprite image
 */
function loadSprite(name, path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      assetState.sprites[name] = img;
      assetState.loadedCount++;
      resolve();
    };
    img.onerror = () => {
      console.error(`Failed to load sprite: ${path}`);
      reject(new Error(`Sprite load failed: ${name}`));
    };
    img.src = path;
  });
}

/**
 * Load a background image
 */
function loadBackground(path, index) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      assetState.backgrounds[index] = img;
      assetState.loadedCount++;
      resolve();
    };
    img.onerror = () => {
      console.error(`Failed to load background: ${path}`);
      reject(new Error(`Background load failed: ${path}`));
    };
    img.src = path;
  });
}

// ============================================
// PRE-RENDERING (EMOJI OPTIMIZATION)
// ============================================

/**
 * Pre-render an emoji to a canvas for performance
 */
export function preRenderEmoji(emoji, size) {
  if (assetState.preRendered[emoji]) {
    return assetState.preRendered[emoji];
  }

  const bufferCanvas = document.createElement('canvas');
  const bufferCtx = bufferCanvas.getContext('2d');
  const paddedSize = size * 1.3;

  bufferCanvas.width = paddedSize;
  bufferCanvas.height = paddedSize;

  bufferCtx.font = `${size}px sans-serif`;
  bufferCtx.textAlign = 'center';
  bufferCtx.textBaseline = 'middle';
  bufferCtx.fillText(emoji, paddedSize / 2, paddedSize / 2);

  assetState.preRendered[emoji] = bufferCanvas;
  return bufferCanvas;
}

/**
 * Initialize all emoji pre-renders
 */
export function initializePreRenderedEmojis() {
  // Enemies
  preRenderEmoji('🧟', EMOJI_SIZES.ZOMBIE);
  preRenderEmoji('💀', EMOJI_SIZES.SKULL);
  preRenderEmoji('🦇', EMOJI_SIZES.BAT);
  preRenderEmoji('🌀', EMOJI_SIZES.SPIRAL);
  preRenderEmoji('🦟', EMOJI_SIZES.MOSQUITO);
  preRenderEmoji('😈', EMOJI_SIZES.DEMON);
  preRenderEmoji('👹', EMOJI_SIZES.OGRE);
  preRenderEmoji('👻', EMOJI_SIZES.GHOST);
  preRenderEmoji('👁️', EMOJI_SIZES.EYE);
  preRenderEmoji('🧟‍♀️', EMOJI_SIZES.ZOMBIE_FEMALE);
  preRenderEmoji('🧛‍♀️', EMOJI_SIZES.VAMPIRE);

  // Pickups & Effects
  preRenderEmoji('🔸', EMOJI_SIZES.COIN);
  preRenderEmoji('🔹', EMOJI_SIZES.DIAMOND);
  preRenderEmoji('💍', EMOJI_SIZES.RING);
  preRenderEmoji('♦️', EMOJI_SIZES.RING);
  preRenderEmoji('🍎', EMOJI_SIZES.APPLE);
  preRenderEmoji('💣', EMOJI_SIZES.BOMB);
  preRenderEmoji('⚡️', EMOJI_SIZES.LIGHTNING);
  preRenderEmoji('🧿', EMOJI_SIZES.EYE_PROJECTILE);
  preRenderEmoji('🪓', EMOJI_SIZES.WHIRLWIND_AXE);

  // Special
  preRenderEmoji('🐶', EMOJI_SIZES.DOG);
  preRenderEmoji('🦉', EMOJI_SIZES.OWL);
  preRenderEmoji('🧱', EMOJI_SIZES.BRICK);
  preRenderEmoji('🛢️', EMOJI_SIZES.BARREL);
}

// ============================================
// MAIN ASSET LOADING
// ============================================

/**
 * Load all game assets (sprites, audio, backgrounds)
 * Returns: Promise that resolves when all assets are loaded
 */
export async function loadAllAssets() {
  assetState.totalAssets =
    Object.keys(SPRITE_PATHS).length +
    Object.keys(AUDIO_PATHS).length +
    BACKGROUND_PATHS.length;

  const promises = [];

  // Load sprites
  for (const [name, path] of Object.entries(SPRITE_PATHS)) {
    promises.push(loadSprite(name, path));
  }

  // Load audio
  for (const [name, path] of Object.entries(AUDIO_PATHS)) {
    loadSoundEffect(name, path);
    assetState.loadedCount++;
  }

  // Load backgrounds
  for (let i = 0; i < BACKGROUND_PATHS.length; i++) {
    promises.push(loadBackground(BACKGROUND_PATHS[i], i));
  }

  try {
    await Promise.all(promises);
    initializePreRenderedEmojis();
    assetState.isReady = true;
    console.log('All assets loaded successfully');
    return true;
  } catch (e) {
    console.error('Asset loading failed:', e);
    return false;
  }
}

/**
 * Get loaded asset progress (0.0 - 1.0)
 */
export function getAssetLoadProgress() {
  return assetState.totalAssets > 0
    ? assetState.loadedCount / assetState.totalAssets
    : 0;
}

/**
 * Get a sprite by name
 */
export function getSprite(name) {
  return assetState.sprites[name] || null;
}

/**
 * Get a background by index
 */
export function getBackground(index) {
  return assetState.backgrounds[index] || null;
}

/**
 * Get pre-rendered emoji canvas
 */
export function getPreRenderedEmoji(emoji) {
  return assetState.preRendered[emoji] || null;
}