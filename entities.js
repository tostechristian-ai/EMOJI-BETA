/**
 * entities.js
 * Handles all game entities: enemies, player behaviors, entity updates
 * Depends on: constants.js, state.js, spawner.js, physics.js, audio.js
 */

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_BASE_SPEED,
  DASH_SPEED_MULTIPLIER,
} from './constants.js';

import {
  gameState,
  player,
  entities,
  addScore,
  addEnemyDefeated,
  startShake,
} from './state.js';

import {
  ENEMY_CONFIGS,
  spawnDrops,
  spawnBloodSplatter,
  spawnBloodPuddle,
  spawnExplosion,
  spawnFloatingText,
} from './spawner.js';

import { playSound } from './audio.js';

// ============================================
// ENEMY BEHAVIOR MANAGEMENT
// ============================================

/**
 * Update all active enemies
 */
export function updateEnemies(now) {
  for (let i = entities.enemies.length - 1; i >= 0; i--) {
    const enemy = entities.enemies[i];

    if (enemy.isHit) {
      entities.enemies.splice(i, 1);
      continue;
    }

    // Update enemy based on type
    switch (enemy.type) {
      case 'pursuer':
        updatePursuerEnemy(enemy);
        break;
      case 'snail':
        updateSnailEnemy(enemy, now);
        break;
      case 'mosquito':
        updateMosquitoEnemy(enemy, now);
        break;
      case 'bat':
        updateBatEnemy(enemy, now);
        break;
      case 'devil':
        updateDevilEnemy(enemy, now);
        break;
      default:
        updateBasicEnemy(enemy);
    }

    // Check collision with player
    checkEnemyPlayerCollision(enemy);
  }
}

/**
 * Basic pursuer enemy behavior - moves directly toward player
 */
function updatePursuerEnemy(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;

    // Clamp to world bounds
    enemy.x = Math.max(0, Math.min(WORLD_WIDTH, enemy.x));
    enemy.y = Math.max(0, Math.min(WORLD_HEIGHT, enemy.y));
  }

  enemy.stepPhase = (enemy.stepPhase || 0) + 0.05;
}

/**
 * Snail enemy - slow but creates puddles
 */
function updateSnailEnemy(enemy, now) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;

    enemy.x = Math.max(0, Math.min(WORLD_WIDTH, enemy.x));
    enemy.y = Math.max(0, Math.min(WORLD_HEIGHT, enemy.y));
  }

  // Spawn puddles occasionally
  if (
    !enemy.lastPuddleSpawnTime ||
    now - enemy.lastPuddleSpawnTime > 500
  ) {
    spawnBloodPuddle(enemy.x, enemy.y, enemy.size * 0.8);
    enemy.lastPuddleSpawnTime = now;
  }
}

/**
 * Mosquito enemy - erratic movement
 */
function updateMosquitoEnemy(enemy, now) {
  // Update direction randomly
  if (
    !enemy.lastDirectionUpdateTime ||
    now - enemy.lastDirectionUpdateTime > 500
  ) {
    enemy.currentMosquitoDirection = Math.random() * Math.PI * 2;
    enemy.lastDirectionUpdateTime = now;
  }

  // Move in current direction
  if (enemy.currentMosquitoDirection !== null) {
    const moveDistance = enemy.speed;
    enemy.x += Math.cos(enemy.currentMosquitoDirection) * moveDistance;
    enemy.y += Math.sin(enemy.currentMosquitoDirection) * moveDistance;
  }

  // Wrap around world or bounce
  if (enemy.x < 0) enemy.x = WORLD_WIDTH;
  if (enemy.x > WORLD_WIDTH) enemy.x = 0;
  if (enemy.y < 0) enemy.y = WORLD_HEIGHT;
  if (enemy.y > WORLD_HEIGHT) enemy.y = 0;

  // Occasionally spawn puddles
  if (Math.random() < 0.02) {
    spawnBloodPuddle(enemy.x, enemy.y, enemy.size * 0.6);
  }
}

/**
 * Bat enemy - pause/move pattern
 */
function updateBatEnemy(enemy, now) {
  if (!enemy.isPaused) {
    // Moving phase
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;

      enemy.x = Math.max(0, Math.min(WORLD_WIDTH, enemy.x));
      enemy.y = Math.max(0, Math.min(WORLD_HEIGHT, enemy.y));
    }

    enemy.moveTimer = (enemy.moveTimer || 0) + 1;
    if (enemy.moveTimer > (enemy.moveDuration || 30)) {
      enemy.isPaused = true;
      enemy.moveTimer = 0;
    }
  } else {
    // Pause phase - do nothing
    enemy.pauseTimer = (enemy.pauseTimer || 0) + 1;
    if (enemy.pauseTimer > (enemy.pauseDuration || 30)) {
      enemy.isPaused = false;
      enemy.pauseTimer = 0;
    }
  }
}

/**
 * Devil enemy - moves only on one axis at a time
 */
function updateDevilEnemy(enemy, now) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;

  // Swap axis occasionally
  if (!enemy.lastAxisSwapTime || now - enemy.lastAxisSwapTime > 2000) {
    enemy.moveAxis = enemy.moveAxis === 'x' ? 'y' : 'x';
    enemy.lastAxisSwapTime = now;
  }

  // Move only on current axis
  if (enemy.moveAxis === 'x') {
    if (dx !== 0) {
      enemy.x += Math.sign(dx) * enemy.speed;
    }
  } else {
    if (dy !== 0) {
      enemy.y += Math.sign(dy) * enemy.speed;
    }
  }

  enemy.x = Math.max(0, Math.min(WORLD_WIDTH, enemy.x));
  enemy.y = Math.max(0, Math.min(WORLD_HEIGHT, enemy.y));
}

/**
 * Generic enemy update fallback
 */
function updateBasicEnemy(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;

    enemy.x = Math.max(0, Math.min(WORLD_WIDTH, enemy.x));
    enemy.y = Math.max(0, Math.min(WORLD_HEIGHT, enemy.y));
  }
}

/**
 * Check collision between enemy and player
 */
function checkEnemyPlayerCollision(enemy) {
  if (player.isInvincible || player.isDashing) {
    return; // Player has invincibility frames
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  const minDist = (player.size + enemy.size) / 2 - 5;

  if (dist < minDist) {
    handlePlayerDamage(enemy);
  }
}

/**
 * Handle player taking damage from enemy
 */
function handlePlayerDamage(enemy) {
  player.lives--;
  startShake(); // Camera shake effect

  playSound('playerScream');

  window.dispatchEvent(
    new CustomEvent('playerHit', { detail: { enemy } })
  );

  if (player.lives <= 0) {
    handlePlayerDeath();
  } else {
    // Enemy dies on contact
    killEnemy(enemy);
  }
}

/**
 * Handle player death
 */
function handlePlayerDeath() {
  gameState.over = true;
  gameState.active = false;

  playSound('gameOver');

  window.dispatchEvent(new CustomEvent('playerDeath'));
}

/**
 * Kill an enemy
 */
export function killEnemy(enemy) {
  if (enemy.isHit) return;

  enemy.isHit = true;
  addEnemyDefeated();
  addScore(enemy.xpReward || 10);

  // Spawn effects
  spawnBloodSplatter(enemy.x, enemy.y, 8);
  spawnBloodPuddle(enemy.x, enemy.y, enemy.size * 1.2);
  spawnExplosion(enemy.x, enemy.y, enemy.size * 2, 0.5);
  spawnFloatingText(enemy.x, enemy.y, `+${enemy.xpReward || 10}`, '#FFD700');

  // Spawn pickups
  spawnDrops(enemy.x, enemy.y);

  window.dispatchEvent(
    new CustomEvent('enemyDefeated', { detail: { enemy } })
  );
}

// ============================================
// WEAPON SYSTEM
// ============================================

/**
 * Update all active weapons/projectiles
 */
export function updateWeapons(now) {
  for (const weapon of entities.weaponPool) {
    if (!weapon.active) continue;

    // Update position
    weapon.x += weapon.dx;
    weapon.y += weapon.dy;

    // Lifetime check
    if (now > weapon.lifetime) {
      weapon.active = false;
      continue;
    }

    // World bounds check
    if (
      weapon.x < -50 ||
      weapon.x > WORLD_WIDTH + 50 ||
      weapon.y < -50 ||
      weapon.y > WORLD_HEIGHT + 50
    ) {
      weapon.active = false;
      continue;
    }

    // Check collisions with enemies
    checkWeaponEnemyCollisions(weapon);
  }
}

/**
 * Check weapon collision with enemies
 */
function checkWeaponEnemyCollisions(weapon) {
  for (const enemy of entities.enemies) {
    if (enemy.isHit) continue;

    const dx = weapon.x - enemy.x;
    const dy = weapon.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    const minDist = (weapon.size + enemy.size) / 2;

    if (dist < minDist) {
      // Check if already hit this enemy
      if (!weapon.hitEnemies.includes(enemy)) {
        // Deal damage
        enemy.health -= player.damageMultiplier;
        weapon.hitEnemies.push(enemy);

        // Visual feedback
        spawnBloodSplatter(enemy.x, enemy.y, 3);

        // Enemy death check
        if (enemy.health <= 0) {
          killEnemy(enemy);
        }

        // Reduce weapon hits
        weapon.hitsLeft--;
        if (weapon.hitsLeft <= 0) {
          weapon.active = false;
        }
      }
    }
  }
}

/**
 * Fire a weapon from the pool
 */
export function fireWeapon(shooter = player, angle) {
  for (const weapon of entities.weaponPool) {
    if (!weapon.active) {
      weapon.x = shooter.x;
      weapon.y = shooter.y;
      weapon.size = 10;
      weapon.speed = 8;
      weapon.angle = angle;
      weapon.dx = Math.cos(angle) * weapon.speed;
      weapon.dy = Math.sin(angle) * weapon.speed;
      weapon.lifetime = Date.now() + 2000; // 2 second lifetime
      weapon.hitsLeft = 1;
      weapon.hitEnemies.length = 0;
      weapon.active = true;

      playSound('playerShoot');
      break;
    }
  }
}

/**
 * Create v-shaped projectile pattern (upgradeable)
 */
export function fireVShapePattern(shooter = player, centerAngle, projectileCount = 3) {
  const angleSpread = Math.PI / 6; // 30 degrees spread
  const angleStep = angleSpread / (projectileCount - 1);
  const startAngle = centerAngle - angleSpread / 2;

  for (let i = 0; i < projectileCount; i++) {
    const angle = startAngle + i * angleStep;
    fireWeapon(shooter, angle);
  }
}

/**
 * Create nova/circular projectile pattern (for skull character)
 */
export function fireNovaPattern(shooter = player, projectileCount = 6) {
  const angleStep = (Math.PI * 2) / projectileCount;

  for (let i = 0; i < projectileCount; i++) {
    const angle = i * angleStep;
    fireWeapon(shooter, angle);
  }
}

// ============================================
// PLAYER ABILITIES
// ============================================

/**
 * Trigger player dash ability
 */
export function triggerPlayerDash(now) {
  const dashCooldown = player.dashCooldown || 6000;

  // Check cooldown
  if (now - player.lastDashTime < dashCooldown) {
    return false;
  }

  // Activate dash
  player.isDashing = true;
  player.isInvincible = true;
  player.dashEndTime = now + 200; // 200ms dash duration
  player.lastDashTime = now;
  player.spinStartTime = now;

  playSound('dodge');

  window.dispatchEvent(new CustomEvent('dashTriggered'));

  return true;
}

/**
 * Update dash mechanics
 */
export function updateDashMechanics(now) {
  if (player.isDashing && now > player.dashEndTime) {
    player.isDashing = false;
    player.isInvincible = false;
  }
}

// ============================================
// PLAYER STAT MANAGEMENT
// ============================================

/**
 * Apply damage to player (direct damage, not from enemy contact)
 */
export function damagePlayer(amount) {
  if (player.isInvincible || player.isDashing) {
    return;
  }

  player.lives -= amount;
  startShake();

  if (player.lives <= 0) {
    handlePlayerDeath();
  }
}

/**
 * Heal player
 */
export function healPlayer(amount) {
  player.lives = Math.min(player.lives + amount, player.maxLives);
}

/**
 * Apply speed buff
 */
export function applySpeedBuff(multiplier, duration = null) {
  const originalSpeed = player.speed;
  player.speed *= multiplier;

  if (duration) {
    setTimeout(() => {
      player.speed = originalSpeed;
    }, duration);
  }
}

/**
 * Apply damage buff
 */
export function applyDamageBuff(multiplier, duration = null) {
  const originalDamage = player.damageMultiplier;
  player.damageMultiplier *= multiplier;

  if (duration) {
    setTimeout(() => {
      player.damageMultiplier = originalDamage;
    }, duration);
  }
}

/**
 * Increase magnet radius
 */
export function increaseMagnetRadius(amount) {
  player.magnetRadius += amount;
}

// ============================================
// PLAYER LEVEL AND XP
// ============================================

/**
 * Add XP to player
 */
export function addPlayerXP(amount) {
  player.xp += amount;

  if (player.xp >= player.xpToNextLevel) {
    levelUpPlayer();
  }

  window.dispatchEvent(new CustomEvent('xpGained', { detail: { amount } }));
}

/**
 * Level up the player
 */
export function levelUpPlayer() {
  player.level++;
  player.xp = 0;
  player.xpToNextLevel = Math.ceil(player.xpToNextLevel * 1.2);

  playSound('levelUp');

  window.dispatchEvent(new CustomEvent('levelUp', { detail: { level: player.level } }));
}

// ============================================
// ENTITY CLEANUP & MANAGEMENT
// ============================================

/**
 * Clean up dead/inactive entities
 */
export function cleanupEntities() {
  // Remove hit enemies
  entities.enemies = entities.enemies.filter(e => !e.isHit);

  // Clean up expired effects
  cleanupEffects();
}

/**
 * Clean up visual effects
 */
function cleanupEffects() {
  const now = Date.now();

  entities.explosions = entities.explosions.filter(e => now - e.spawnTime < e.life);
  entities.floatingTexts = entities.floatingTexts.filter(e => now - e.spawnTime < e.life);
  entities.smokeParticles = entities.smokeParticles.filter(
    e => now - e.spawnTime < e.life
  );
  entities.bloodSplatters = entities.bloodSplatters.filter(
    e => now - e.spawnTime < e.life
  );
  entities.bloodPuddles = entities.bloodPuddles.filter(
    e => now - e.spawnTime < e.life
  );
}

/**
 * Get player stats for saving
 */
export function getPlayerStats() {
  return {
    level: player.level,
    xp: player.xp,
    lives: player.lives,
    damageMultiplier: player.damageMultiplier,
    speed: player.speed,
    magnetRadius: player.magnetRadius,
    upgradeLevels: { ...player.upgradeLevels },
  };
}

/**
 * Reset player to initial state
 */
export function resetPlayer() {
  player.lives = player.maxLives;
  player.xp = 0;
  player.level = 1;
  player.x = WORLD_WIDTH / 2;
  player.y = WORLD_HEIGHT / 2;
  player.isDashing = false;
  player.isInvincible = false;
  player.facing = 'down';
  player.rotationAngle = 0;
  player.stepPhase = 0;
}