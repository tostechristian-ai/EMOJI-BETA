/**
 * spawner.js
 * Handles all entity spawning: enemies, pickups, merchants, effects
 * Depends on: constants.js, state.js, audio.js
 */

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAX_ENEMIES,
  ENEMY_SPAWN_INTERVAL,
  MERCHANT_SPAWN_INTERVAL,
} from './constants.js';

import {
  gameState,
  entities,
  player,
  addScore,
  addEnemyDefeated,
} from './state.js';

import { playSound } from './audio.js';

// ============================================
// ENEMY CONFIGURATION
// ============================================

export const ENEMY_CONFIGS = {
  '🧟': {
    emoji: '🧟',
    size: 17,
    baseHealth: 1,
    speedMultiplier: 1,
    type: 'pursuer',
    minLevel: 1,
    xpReward: 10,
  },
  '💀': {
    emoji: '💀',
    size: 20,
    baseHealth: 2,
    speedMultiplier: 1.15,
    type: 'pursuer',
    minLevel: 5,
    xpReward: 20,
  },
  '🌀': {
    emoji: '🌀',
    size: 22,
    baseHealth: 4,
    speedMultiplier: 0.3,
    type: 'snail',
    minLevel: 4,
    xpReward: 15,
    initialProps: () => ({
      lastPuddleSpawnTime: Date.now(),
      directionAngle: Math.random() * 2 * Math.PI,
    }),
  },
  '🦟': {
    emoji: '🦟',
    size: 15,
    baseHealth: 2,
    speedMultiplier: 1.5,
    type: 'mosquito',
    minLevel: 7,
    xpReward: 18,
    initialProps: () => ({
      lastDirectionUpdateTime: Date.now(),
      currentMosquitoDirection: null,
      lastPuddleSpawnTime: Date.now(),
    }),
  },
  '🦇': {
    emoji: '🦇',
    size: 25 * 0.85,
    baseHealth: 3,
    speedMultiplier: 2,
    type: 'bat',
    minLevel: 10,
    xpReward: 25,
    initialProps: () => ({
      isPaused: false,
      pauseTimer: 0,
      pauseDuration: 30,
      moveDuration: 30,
    }),
  },
  '😈': {
    emoji: '😈',
    size: 20 * 0.8,
    baseHealth: 3,
    speedMultiplier: 1.84,
    type: 'devil',
    minLevel: 12,
    xpReward: 30,
    initialProps: () => ({
      moveAxis: 'x',
      lastAxisSwapTime: Date.now(),
    }),
  },
};

// ============================================
// PICKUP TYPES
// ============================================

export const PICKUP_TYPES = {
  XP: 'xp',
  COIN: 'coin',
  BOX: 'box',
  HEART: 'heart',
  APPLE: 'apple',
};

const PICKUP_CONFIG = {
  [PICKUP_TYPES.XP]: {
    emoji: '🔸',
    xpValue: 10,
    spawnChance: 0.3,
  },
  [PICKUP_TYPES.COIN]: {
    emoji: '💰',
    xpValue: 5,
    spawnChance: 0.15,
  },
  [PICKUP_TYPES.BOX]: {
    emoji: '📦',
    xpValue: 50,
    spawnChance: 0.01,
  },
  [PICKUP_TYPES.HEART]: {
    emoji: '❤️',
    xpValue: 0,
    spawnChance: 0.05,
  },
  [PICKUP_TYPES.APPLE]: {
    emoji: '🍎',
    xpValue: 25,
    spawnChance: 0.08,
  },
};

// ============================================
// SPAWNING STATE
// ============================================

export const spawnerState = {
  lastEnemySpawnTime: 0,
  lastMerchantSpawnTime: 0,
  lastBossSpawnTime: 0,
  baseEnemySpeed: 0.84,
  difficultySpeedMultiplier: 1,
  currentDifficulty: 'easy',
};

// ============================================
// ENEMY SPAWNING
// ============================================

/**
 * Spawn a single enemy
 * Can spawn at specific coordinates or random edges
 */
export function spawnEnemy(xPos = null, yPos = null, enemyType = null) {
  // Don't spawn if max enemies reached
  if (entities.enemies.length >= MAX_ENEMIES) return;

  let x, y, emoji;

  // Custom spawn position
  if (xPos !== null && yPos !== null && enemyType !== null) {
    x = xPos;
    y = yPos;
    emoji = enemyType;
  } else {
    // Random edge spawn
    const spawnOffset = 50;
    const edge = Math.floor(Math.random() * 4);

    switch (edge) {
      case 0:
        x = Math.random() * WORLD_WIDTH;
        y = -spawnOffset;
        break;
      case 1:
        x = WORLD_WIDTH + spawnOffset;
        y = Math.random() * WORLD_HEIGHT;
        break;
      case 2:
        x = Math.random() * WORLD_WIDTH;
        y = WORLD_HEIGHT + spawnOffset;
        break;
      case 3:
        x = -spawnOffset;
        y = Math.random() * WORLD_HEIGHT;
        break;
    }

    // Select random eligible enemy type
    const eligibleEnemies = Object.values(ENEMY_CONFIGS).filter(
      config => config.minLevel <= player.level
    );

    if (eligibleEnemies.length === 0) return;

    const selectedConfig = eligibleEnemies[
      Math.floor(Math.random() * eligibleEnemies.length)
    ];
    emoji = selectedConfig.emoji;
  }

  const config = ENEMY_CONFIGS[emoji];
  if (!config) return;

  // Create enemy object
  const enemy = {
    emoji,
    x,
    y,
    size: config.size,
    health: config.baseHealth,
    maxHealth: config.baseHealth,
    speed:
      spawnerState.baseEnemySpeed *
      config.speedMultiplier *
      spawnerState.difficultySpeedMultiplier,
    type: config.type,
    isHit: false,
    stepPhase: Math.random() * Math.PI * 2,
    xpReward: config.xpReward,
    ...((config.initialProps && config.initialProps()) || {}),
  };

  entities.enemies.push(enemy);
}

/**
 * Update enemy spawning based on time interval
 */
export function updateEnemySpawning(now) {
  if (!gameState.active || gameState.paused) return;

  if (
    entities.enemies.length < MAX_ENEMIES &&
    now - spawnerState.lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL
  ) {
    spawnEnemy();
    spawnerState.lastEnemySpawnTime = now;
  }
}

// ============================================
// PICKUP SPAWNING
// ============================================

/**
 * Spawn a pickup item at position
 */
export function spawnPickup(x, y, pickupType = PICKUP_TYPES.XP) {
  const config = PICKUP_CONFIG[pickupType];
  if (!config) return;

  const pickup = {
    x,
    y,
    type: pickupType,
    emoji: config.emoji,
    xpValue: config.xpValue,
    size: 12,
    vx: (Math.random() - 0.5) * 2, // Random drift
    vy: (Math.random() - 0.5) * 2,
  };

  entities.pickupItems.push(pickup);
}

/**
 * Spawn pickups on enemy death
 */
export function spawnDrops(x, y) {
  // XP drop (guaranteed)
  spawnPickup(x, y, PICKUP_TYPES.XP);

  // Chance for additional drops
  for (const [type, config] of Object.entries(PICKUP_CONFIG)) {
    if (type !== PICKUP_TYPES.XP && Math.random() < config.spawnChance) {
      spawnPickup(
        x + (Math.random() - 0.5) * 30,
        y + (Math.random() - 0.5) * 30,
        type
      );
    }
  }
}

/**
 * Update pickup movement and cleanup
 */
export function updatePickups() {
  for (let i = entities.pickupItems.length - 1; i >= 0; i--) {
    const item = entities.pickupItems[i];

    // Apply velocity decay
    item.vx *= 0.98;
    item.vy *= 0.98;
    item.x += item.vx;
    item.y += item.vy;

    // Magnet pull toward player
    const dist = Math.hypot(player.x - item.x, player.y - item.y);

    if (dist < player.magnetRadius) {
      const pullStrength = 0.1;
      item.x += (player.x - item.x) * pullStrength;
      item.y += (player.y - item.y) * pullStrength;
    }

    // Collect on player contact
    if (dist < player.size / 2) {
      collectPickup(item);
      entities.pickupItems.splice(i, 1);
    }

    // Remove if out of bounds
    if (
      item.x < -100 ||
      item.x > WORLD_WIDTH + 100 ||
      item.y < -100 ||
      item.y > WORLD_HEIGHT + 100
    ) {
      entities.pickupItems.splice(i, 1);
    }
  }
}

/**
 * Handle pickup collection
 */
function collectPickup(item) {
  playSound('xpPickup');

  switch (item.type) {
    case PICKUP_TYPES.XP:
    case PICKUP_TYPES.COIN:
      player.xp += item.xpValue;
      addScore(item.xpValue);
      break;

    case PICKUP_TYPES.BOX:
      player.xp += item.xpValue;
      player.boxPickupsCollectedCount++;
      playSound('boxPickup');
      break;

    case PICKUP_TYPES.HEART:
      if (player.lives < player.maxLives) {
        player.lives++;
      }
      break;

    case PICKUP_TYPES.APPLE:
      player.appleCount++;
      player.xp += item.xpValue;
      break;
  }

  window.dispatchEvent(
    new CustomEvent('pickupCollected', { detail: { pickup: item } })
  );
}

// ============================================
// MERCHANT SPAWNING
// ============================================

/**
 * Spawn a merchant NPC
 */
export function spawnMerchant(x, y) {
  const merchant = {
    x,
    y,
    size: 40,
    emoji: '🏪',
    type: 'merchant',
    inventory: [
      { name: 'Health Potion', price: 50, effect: 'heal' },
      { name: 'Speed Boost', price: 75, effect: 'speedBoost' },
      { name: 'Damage Boost', price: 100, effect: 'damageBoost' },
    ],
  };

  entities.merchants.push(merchant);

  window.dispatchEvent(
    new CustomEvent('merchantSpawned', { detail: { merchant } })
  );
}

/**
 * Update merchant spawning
 */
export function updateMerchantSpawning(now) {
  if (!gameState.active || gameState.paused) return;

  if (now - spawnerState.lastMerchantSpawnTime >= MERCHANT_SPAWN_INTERVAL) {
    spawnMerchant(
      player.x + Math.random() * 200 - 100,
      player.y + Math.random() * 200 - 100
    );
    spawnerState.lastMerchantSpawnTime = now;
  }
}

// ============================================
// VISUAL EFFECTS SPAWNING
// ============================================

/**
 * Create blood splatter effect
 */
export function spawnBloodSplatter(x, y, count = 5) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = Math.random() * 3 + 1;

    const splatter = {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 500,
      maxLife: 500,
      emoji: '🩸',
      size: 8,
    };

    entities.bloodSplatters.push(splatter);
  }
}

/**
 * Create blood puddle effect
 */
export function spawnBloodPuddle(x, y, size = 20) {
  const puddle = {
    x,
    y,
    size,
    emoji: '🩸',
    opacity: 1,
    life: 3000,
    maxLife: 3000,
  };

  entities.bloodPuddles.push(puddle);
}

/**
 * Create explosion effect
 */
export function spawnExplosion(x, y, radius = 40, force = 1) {
  const explosion = {
    x,
    y,
    radius,
    force,
    life: 300,
    maxLife: 300,
    emoji: '💥',
  };

  entities.explosions.push(explosion);

  playSound('enemyDeath');

  // Knockback nearby enemies
  for (const enemy of entities.enemies) {
    const dist = Math.hypot(enemy.x - x, enemy.y - y);
    if (dist < radius) {
      const angle = Math.atan2(enemy.y - y, enemy.x - x);
      const knockback = force * (1 - dist / radius);
      enemy.x += Math.cos(angle) * knockback * 5;
      enemy.y += Math.sin(angle) * knockback * 5;
    }
  }
}

/**
 * Create floating text effect
 */
export function spawnFloatingText(x, y, text, color = '#FFF') {
  const floatingText = {
    x,
    y,
    text,
    color,
    life: 1000,
    maxLife: 1000,
    size: 20,
  };

  entities.floatingTexts.push(floatingText);
}

/**
 * Create smoke particle effect
 */
export function spawnSmoke(x, y, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 0.5;

    const smoke = {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 800,
      maxLife: 800,
      size: Math.random() * 15 + 5,
      emoji: '💨',
      opacity: 0.6,
    };

    entities.smokeParticles.push(smoke);
  }
}

// ============================================
// DIFFICULTY MANAGEMENT
// ============================================

/**
 * Set game difficulty and adjust spawning
 */
export function setDifficulty(difficulty) {
  spawnerState.currentDifficulty = difficulty;

  switch (difficulty) {
    case 'easy':
      spawnerState.difficultySpeedMultiplier = 0.9;
      break;
    case 'medium':
      spawnerState.difficultySpeedMultiplier = 1.35;
      break;
    case 'hard':
      spawnerState.difficultySpeedMultiplier = 1.75;
      break;
    default:
      spawnerState.difficultySpeedMultiplier = 1;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all nearby enemies
 */
export function getNearbyEnemies(x, y, radius) {
  return entities.enemies.filter(enemy => {
    const dist = Math.hypot(enemy.x - x, enemy.y - y);
    return dist < radius;
  });
}

/**
 * Get all nearby pickups
 */
export function getNearbyPickups(x, y, radius) {
  return entities.pickupItems.filter(item => {
    const dist = Math.hypot(item.x - x, item.y - y);
    return dist < radius;
  });
}

/**
 * Clear all effects and visual elements
 */
export function clearEffects() {
  entities.bloodSplatters.length = 0;
  entities.bloodPuddles.length = 0;
  entities.explosions.length = 0;
  entities.floatingTexts.length = 0;
  entities.smokeParticles.length = 0;
  entities.lightningStrikes.length = 0;
}

/**
 * Reset spawner state for new game
 */
export function resetSpawner() {
  spawnerState.lastEnemySpawnTime = 0;
  spawnerState.lastMerchantSpawnTime = 0;
  spawnerState.lastBossSpawnTime = 0;

  entities.enemies.length = 0;
  entities.pickupItems.length = 0;
  entities.merchants.length = 0;

  clearEffects();
}

/**
 * Update all spawning systems
 */
export function updateSpawning(now) {
  updateEnemySpawning(now);
  updateMerchantSpawning(now);
  updatePickups();
}