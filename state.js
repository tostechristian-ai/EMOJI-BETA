/**
 * state.js
 * Centralized game state management
 * Single source of truth for all game variables
 */

import { PLAYER_SIZE, PLAYER_BASE_SPEED, PLAYER_MAX_LIVES, PLAYER_MAGNET_RADIUS } from './constants.js';

// ============================================
// GAME STATE
// ============================================

export const gameState = {
  // Game Flags
  active: false,
  paused: false,
  over: false,
  
  // Timing
  startTime: 0,
  lastFrameTime: 0,
  animationFrameId: null,
  now: 0,
  deltaTime: 0,
  
  // Score & Progress
  score: 0,
  enemiesDefeatedCount: 0,
  
  // Spawning Timers
  lastEnemySpawnTime: 0,
  lastMerchantSpawnTime: 0,
  lastWeaponFireTime: 0,
  lastDashTime: 0,
  
  // World
  quadtree: null,
};

// ============================================
// CAMERA STATE
// ============================================

export const cameraState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
  aimOffsetX: 0,
  aimOffsetY: 0,
  isShaking: false,
  shakeStartTime: 0,
};

// ============================================
// PLAYER STATE (Destructured for clarity)
// ============================================

export function createPlayerState() {
  return {
    // Position & Movement
    x: 0,
    y: 0,
    size: PLAYER_SIZE,
    speed: PLAYER_BASE_SPEED,
    facing: 'down',
    stepPhase: 0,
    rotationAngle: 0,
    
    // Health & Lives
    lives: PLAYER_MAX_LIVES,
    maxLives: PLAYER_MAX_LIVES,
    
    // Experience & Leveling
    xp: 0,
    level: 1,
    xpToNextLevel: 3,
    
    // Combat Stats
    damageMultiplier: 1,
    knockbackStrength: 0,
    projectileSizeMultiplier: 1,
    projectileSpeedMultiplier: 1,
    
    // Pickups & Items
    appleCount: 0,
    coins: 0,
    magnetRadius: PLAYER_MAGNET_RADIUS,
    boxPickupsCollectedCount: 0,
    
    // Dash
    isDashing: false,
    dashEndTime: 0,
    isInvincible: false,
    spinStartTime: null,
    spinDirection: 0,
    
    // Weapons
    swordActive: false,
    lastSwordSwingTime: 0,
    currentSwordSwing: null,
    
    // Effects
    isSlowedByMosquitoPuddle: false,
    originalSpeed: PLAYER_BASE_SPEED,
    bgmFastModeActive: false,
    
    // Character
    _isSkull: false,
    
    // Upgrades
    upgradeLevels: {
      speed: 0,
      fireRate: 0,
      magnetRadius: 0,
      damage: 0,
      projectileSpeed: 0,
      knockback: 0,
      luck: 0,
    },
  };
}

// Initialize player
export let player = createPlayerState();
export function resetPlayer() {
  player = createPlayerState();
}

// ============================================
// ENTITY ARRAYS
// ============================================

export const entities = {
  enemies: [],
  pickupItems: [],
  appleItems: [],
  eyeProjectiles: [],
  playerPuddles: [],
  snailPuddles: [],
  mosquitoPuddles: [],
  bombs: [],
  floatingTexts: [],
  visualWarnings: [],
  explosions: [],
  blackHoles: [],
  bloodSplatters: [],
  bloodPuddles: [],
  antiGravityPulses: [],
  vengeanceNovas: [],
  dogHomingShots: [],
  destructibles: [],
  flameAreas: [],
  flies: [],
  owlProjectiles: [],
  lightningStrikes: [],
  smokeParticles: [],
  merchants: [],
  lightningBolts: [],
};

// ============================================
// SPECIAL ENTITIES
// ============================================

export let player2 = null;
export let doppelganger = null;
export let dog = {
  x: 0,
  y: 0,
  size: 25,
  state: 'returning',
  target: null,
  lastHomingShotTime: 0,
};
export let owl = null;

// ============================================
// WEAPON POOL
// ============================================

export function createWeaponPool(maxWeapons) {
  const pool = [];
  for (let i = 0; i < maxWeapons; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      size: 0,
      lifetime: 0,
      hitEnemies: [],
      hitsLeft: 0,
    });
  }
  return pool;
}

export let weaponPool = [];

// ============================================
// STATE UPDATE HELPERS
// ============================================

export function setGameActive(value) {
  gameState.active = value;
}

export function setGamePaused(value) {
  gameState.paused = value;
}

export function setGameOver(value) {
  gameState.over = value;
}

export function addScore(amount) {
  gameState.score += amount;
}

export function addEnemyDefeated() {
  gameState.enemiesDefeatedCount++;
}

export function updateGameTime(now) {
  gameState.deltaTime = now - gameState.lastFrameTime;
  gameState.lastFrameTime = now;
  gameState.now = now;
}

export function startShake() {
  cameraState.isShaking = true;
  cameraState.shakeStartTime = gameState.now;
}

export function clearAllEntities() {
  for (const key in entities) {
    if (Array.isArray(entities[key])) {
      entities[key].length = 0;
    }
  }
  weaponPool.forEach(w => w.active = false);
}