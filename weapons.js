// ============================================================
// weapons.js — Weapon pool, bullet creation and projectile state
// ============================================================

// ---- Object pool ----
const weaponPool = [];
for (let i = 0; i < MAX_WEAPONS; i++) {
    weaponPool.push({ active: false, hitEnemies: [] });
}

let lastWeaponFireTime = 0;
let weaponFireInterval = 400;

// ---- Blood / visual effects ----
function createBloodSplatter(x, y) {
    const particleCount = 6;
    const speed = 2 + Math.random() * 2;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        bloodSplatters.push({
            x, y,
            dx: Math.cos(angle) * speed + (Math.random() - 0.5),
            dy: Math.sin(angle) * speed + (Math.random() - 0.5),
            size: 2 + Math.random() * 3,
            spawnTime: Date.now(),
            lifetime: 800 + Math.random() * 400
        });
    }
}

function createBloodPuddle(x, y, size) {
    if (!sprites.bloodPuddle) return;
    bloodPuddles.push({
        x, y,
        initialSize: size * 1.5,
        spawnTime: Date.now(),
        rotation: Math.random() * Math.PI * 2,
        lifetime: 10000
    });
}

// ---- Main weapon factory (uses pool) ----
function createWeapon(shooter = player, customAngle = null) {
    let weaponAngle;

    if (customAngle !== null) {
        weaponAngle = customAngle;
    } else if (autoAimActive && enemies.length > 0) {
        let closestEnemy = null, minDistance = Infinity;
        enemies.forEach(enemy => {
            const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
            if (distSq < minDistance) { minDistance = distSq; closestEnemy = enemy; }
        });
        weaponAngle = closestEnemy
            ? Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x)
            : shooter.rotationAngle;
    } else if (aimDx !== 0 || aimDy !== 0) {
        weaponAngle = Math.atan2(aimDy, aimDx);
    } else {
        let closestEnemy = null, minDistance = Infinity;
        enemies.forEach(enemy => {
            const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
            if (distSq < minDistance) { minDistance = distSq; closestEnemy = enemy; }
        });
        weaponAngle = closestEnemy
            ? Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x)
            : shooter.rotationAngle;
    }

    const fireWeaponFromPool = (angle) => {
        for (const weapon of weaponPool) {
            if (!weapon.active) {
                weapon.x        = shooter.x;
                weapon.y        = shooter.y;
                weapon.size     = shotgunBlastActive
                    ? 30 * player.projectileSizeMultiplier
                    : 38 * player.projectileSizeMultiplier * (rocketLauncherActive ? 2 : 1);
                weapon.speed    = 5.04 * player.projectileSpeedMultiplier;
                weapon.angle    = angle;
                weapon.dx       = Math.cos(angle) * weapon.speed;
                weapon.dy       = Math.sin(angle) * weapon.speed;
                weapon.lifetime = Date.now() + 2000;
                weapon.hitsLeft = rocketLauncherActive ? 3 : (ricochetActive ? 2 : 1);
                weapon.hitEnemies.length = 0;
                weapon.active   = true;
                return;
            }
        }
    };

    let angles = [weaponAngle];
    if (shotgunBlastActive && shooter === player) {
        angles = [];
        const projectileCount = 8;
        const spreadAngle     = Math.PI / 8;
        for (let i = 0; i < projectileCount; i++) {
            angles.push(weaponAngle + (Math.random() - 0.5) * spreadAngle);
        }
    } else if (vShapeProjectileLevel > 0 && shooter === player) {
        angles = [];
        const projectilesToEmit  = vShapeProjectileLevel + 1;
        const totalSpreadAngle   = V_SHAPE_INCREMENT_ANGLE * (projectilesToEmit - 1);
        const halfTotalSpread    = totalSpreadAngle / 2;
        for (let i = 0; i < projectilesToEmit; i++) {
            angles.push(weaponAngle - halfTotalSpread + i * V_SHAPE_INCREMENT_ANGLE);
        }
    }

    angles.forEach(angle => fireWeaponFromPool(angle));
    if (dualGunActive && shooter === player) { angles.forEach(angle => fireWeaponFromPool(angle + Math.PI)); }

    if (shooter === player) {
        const elementsToShake = [gameContainer, gameStats, pauseButton];
        elementsToShake.forEach(el => {
            if (el) {
                el.classList.remove('ui-shake-active');
                void el.offsetWidth;
                el.classList.add('ui-shake-active');
                el.addEventListener('animationend', () => el.classList.remove('ui-shake-active'), { once: true });
            }
        });
        vibrate(10);
    }

    playSound('playerShoot');
}

// ---- Player 2 weapon ----
function createPlayer2Weapon() {
    if (!player2 || !player2.active) return;
    for (const weapon of weaponPool) {
        if (!weapon.active) {
            weapon.x        = player2.x;
            weapon.y        = player2.y;
            weapon.size     = 38;
            weapon.speed    = 5.04;
            weapon.angle    = player2.gunAngle;
            weapon.dx       = Math.cos(player2.gunAngle) * weapon.speed;
            weapon.dy       = Math.sin(player2.gunAngle) * weapon.speed;
            weapon.lifetime = Date.now() + 2000;
            weapon.hitsLeft = 1;
            weapon.hitEnemies.length = 0;
            weapon.active   = true;
            break;
        }
    }
    playSound('playerShoot');
}

// ---- Pickup helpers ----
function createPickup(x, y, type, size, xpValue) {
    if (x === -1 || y === -1) { x = Math.random() * WORLD_WIDTH; y = Math.random() * WORLD_HEIGHT; }
    pickupItems.push({ x, y, size, type, xpValue, glimmerStartTime: Date.now() + Math.random() * 2000 });
}

function createAppleItem(x, y) {
    appleItems.push({ x, y, size: APPLE_ITEM_SIZE, type: 'apple', spawnTime: Date.now(), lifetime: APPLE_LIFETIME, glimmerStartTime: Date.now() + Math.random() * 2000 });
}
