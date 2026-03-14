/**
 * physics.js
 * Handles movement, collision detection, and camera logic
 * Depends on: constants.js, state.js, input.js
 */

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_BASE_SPEED,
  DASH_SPEED_MULTIPLIER,
  CAMERA_SMOOTHING,
  PLAYER_HIT_SHAKE_DURATION,
  MAX_PLAYER_HIT_SHAKE_OFFSET,
} from './constants.js';

import {
  gameState,
  cameraState,
  player,
  entities,
} from './state.js';

import { inputState } from './input.js';

// ============================================
// MOVEMENT PHYSICS
// ============================================

/**
 * Update player movement based on input
 * Handles both keyboard/joystick and dash mechanics
 */
export function updatePlayerMovement(deltaTime) {
  // Collect movement input
  let moveX = 0;
  let moveY = 0;

  // Keyboard input
  if (inputState.keys['ArrowUp'] || inputState.keys['w']) moveY -= 1;
  if (inputState.keys['ArrowDown'] || inputState.keys['s']) moveY += 1;
  if (inputState.keys['ArrowLeft'] || inputState.keys['a']) moveX -= 1;
  if (inputState.keys['ArrowRight'] || inputState.keys['d']) moveX += 1;

  // Fallback to joystick if no keyboard input
  if (moveX === 0 && moveY === 0) {
    moveX = inputState.joystickDirX;
    moveY = inputState.joystickDirY;
  }

  // Normalize movement vector
  const moveMag = Math.hypot(moveX, moveY);
  if (moveMag > 0) {
    moveX /= moveMag;
    moveY /= moveMag;
    player.stepPhase += player.speed * 0.1;
  }

  // Calculate current speed (account for dash)
  let currentSpeed = player.speed;
  if (player.isDashing) {
    currentSpeed *= DASH_SPEED_MULTIPLIER;
  }

  // Apply velocity and clamp to world bounds
  if (moveMag > 0 || player.isDashing) {
    let nextX = player.x + moveX * currentSpeed;
    let nextY = player.y + moveY * currentSpeed;

    // World boundary collision
    nextX = Math.max(player.size / 2, Math.min(WORLD_WIDTH - player.size / 2, nextX));
    nextY = Math.max(player.size / 2, Math.min(WORLD_HEIGHT - player.size / 2, nextY));

    player.x = nextX;
    player.y = nextY;
  }
}

/**
 * Handle dash mechanics and invincibility frames
 */
export function updateDashMechanics(now) {
  if (player.isDashing && now > player.dashEndTime) {
    player.isDashing = false;
    player.isInvincible = false;
  }
}

/**
 * Trigger dash from player
 * Can be called from input handlers
 */
export function triggerDash(now) {
  if (player.isDashing || now - player.lastDashTime < player.dashCooldown) {
    return; // Dash on cooldown
  }

  player.isDashing = true;
  player.isInvincible = true;
  player.dashEndTime = now + 200; // 200ms dash
  player.lastDashTime = now;

  window.dispatchEvent(new CustomEvent('dashTriggered'));
}

// ============================================
// CAMERA SYSTEM
// ============================================

/**
 * Update camera to follow player smoothly
 */
export function updateCamera(canvas) {
  if (!canvas) return;

  const targetCameraX = player.x - canvas.width / 2;
  const targetCameraY = player.y - canvas.height / 2;

  // Smooth camera follow
  cameraState.offsetX += (targetCameraX - cameraState.offsetX) * CAMERA_SMOOTHING;
  cameraState.offsetY += (targetCameraY - cameraState.offsetY) * CAMERA_SMOOTHING;
}

/**
 * Apply screen shake effect when player is hit
 */
export function updateCameraShake(now) {
  if (!cameraState.isShaking) return;

  const elapsed = now - cameraState.shakeStartTime;
  if (elapsed > PLAYER_HIT_SHAKE_DURATION) {
    cameraState.isShaking = false;
    return;
  }

  const progress = elapsed / PLAYER_HIT_SHAKE_DURATION;
  const intensity = (1 - progress) * MAX_PLAYER_HIT_SHAKE_OFFSET;

  // Random shake offset
  const shakeX = (Math.random() - 0.5) * intensity * 2;
  const shakeY = (Math.random() - 0.5) * intensity * 2;

  cameraState.offsetX += shakeX;
  cameraState.offsetY += shakeY;
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(worldX, worldY, canvas) {
  if (!canvas) return { x: 0, y: 0 };

  return {
    x: worldX - cameraState.offsetX,
    y: worldY - cameraState.offsetY,
  };
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(screenX, screenY) {
  return {
    x: screenX + cameraState.offsetX,
    y: screenY + cameraState.offsetY,
  };
}

// ============================================
// PLAYER ROTATION & FACING
// ============================================

/**
 * Update player rotation angle based on aiming direction
 */
export function updatePlayerRotation() {
  if (inputState.aimDx !== 0 || inputState.aimDy !== 0) {
    player.rotationAngle = Math.atan2(inputState.aimDy, inputState.aimDx);
  }
}

/**
 * Update player facing sprite based on rotation angle
 * Returns: 'up' | 'down' | 'left' | 'right'
 */
export function updatePlayerFacing() {
  const angle = player.rotationAngle;

  if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
    player.facing = 'right';
  } else if (angle > Math.PI / 4 && angle <= (3 * Math.PI) / 4) {
    player.facing = 'down';
  } else if (angle > (3 * Math.PI) / 4 || angle <= -(3 * Math.PI) / 4) {
    player.facing = 'left';
  } else {
    player.facing = 'up';
  }
}

// ============================================
// COLLISION DETECTION
// ============================================

/**
 * Check circular collision between two objects
 */
export function checkCircleCollision(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = (obj1.size + obj2.size) / 2;
  return distance < minDistance;
}

/**
 * Get distance between two objects
 */
export function getDistance(obj1, obj2) {
  return Math.hypot(obj1.x - obj2.x, obj1.y - obj2.y);
}

/**
 * Check if object is within world bounds
 */
export function isInWorldBounds(x, y, size = 0) {
  const margin = size / 2;
  return x - margin >= 0 &&
         x + margin <= WORLD_WIDTH &&
         y - margin >= 0 &&
         y + margin <= WORLD_HEIGHT;
}

/**
 * Update weapon collisions with enemies
 */
export function updateWeaponCollisions() {
  if (!gameState.quadtree) return;

  for (const weapon of entities.weaponPool) {
    if (!weapon.active) continue;

    const weaponBounds = {
      x: weapon.x - weapon.size / 2,
      y: weapon.y - weapon.size / 2,
      width: weapon.size,
      height: weapon.size,
    };

    const nearby = gameState.quadtree.retrieve(weaponBounds);

    for (const container of nearby) {
      const enemy = container.ref;

      // Skip non-enemies
      if (enemy === player || !enemy.health || enemy.isHit) continue;

      // Check circle collision
      if (checkCircleCollision(weapon, enemy)) {
        if (!weapon.hitEnemies.includes(enemy)) {
          enemy.health -= player.damageMultiplier;
          weapon.hitEnemies.push(enemy);

          // Emit hit event
          window.dispatchEvent(
            new CustomEvent('weaponHitEnemy', { detail: { weapon, enemy } })
          );

          if (enemy.health <= 0) {
            window.dispatchEvent(
              new CustomEvent('enemyDefeated', { detail: { enemy } })
            );
          }

          weapon.hitsLeft--;
          if (weapon.hitsLeft <= 0) {
            weapon.active = false;
          }
        }
      }
    }
  }
}

/**
 * Update player collision with enemies
 */
export function updatePlayerEnemyCollisions() {
  for (const enemy of entities.enemies) {
    if (player.isInvincible || player.isDashing) continue;

    const dist = getDistance(player, enemy);
    const collisionDistance = (player.size + enemy.size) / 2 - 5;

    if (dist < collisionDistance) {
      player.lives--;
      window.dispatchEvent(
        new CustomEvent('playerHit', { detail: { enemy } })
      );

      if (player.lives <= 0) {
        window.dispatchEvent(new CustomEvent('playerDeath'));
      }

      // Remove enemy
      enemy.isHit = true;
      window.dispatchEvent(
        new CustomEvent('enemyDefeated', { detail: { enemy } })
      );
    }
  }
}

// ============================================
// ENEMY PHYSICS
// ============================================

/**
 * Update enemy AI and movement toward player
 */
export function updateEnemyMovement() {
  for (const enemy of entities.enemies) {
    if (enemy.isHit) continue;

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
    }
  }
}

// ============================================
// QUADTREE MANAGEMENT
// ============================================

/**
 * Refresh quadtree with all game objects
 */
export function updateQuadtree() {
  if (!gameState.quadtree) return;

  gameState.quadtree.clear();

  // Collect all collidable objects
  const allObjects = [...entities.enemies, ...entities.destructibles, player];
  if (player.player2 && player.player2.active) {
    allObjects.push(player.player2);
  }

  // Insert into quadtree
  for (const obj of allObjects) {
    gameState.quadtree.insert({
      x: obj.x - obj.size / 2,
      y: obj.y - obj.size / 2,
      width: obj.size,
      height: obj.size,
      ref: obj,
    });
  }
}