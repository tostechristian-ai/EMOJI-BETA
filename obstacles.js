// ============================================================
// obstacles.js — Destructible obstacles (barrels, bricks)
// ============================================================

let destructibles    = [];
let lastBarrelSpawnTime = 0;
let flameAreas       = [];

function spawnInitialObstacles() {
    destructibles.length = 0;
    const playerSafeRadius = 200;
    const spawnPos = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };

    // Barrels
    for (let i = 0; i < 5; i++) {
        let x, y, dist;
        do {
            x    = Math.random() * WORLD_WIDTH;
            y    = Math.random() * WORLD_HEIGHT;
            dist = Math.hypot(x - spawnPos.x, y - spawnPos.y);
        } while (dist < playerSafeRadius);
        destructibles.push({ x, y, size: 15, health: 1, maxHealth: 1, emoji: '🛢️' });
    }

    // Bricks (indestructible)
    for (let i = 0; i < 4; i++) {
        let x, y, dist;
        do {
            x    = Math.random() * WORLD_WIDTH;
            y    = Math.random() * WORLD_HEIGHT;
            dist = Math.hypot(x - spawnPos.x, y - spawnPos.y);
        } while (dist < playerSafeRadius);
        destructibles.push({ x, y, size: 30, health: Infinity, emoji: '🧱' });
    }
}

function spawnRandomBarrel() {
    const spawnMargin = 50;
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
        case 0: x = Math.random() * WORLD_WIDTH;  y = -spawnMargin; break;
        case 1: x = WORLD_WIDTH + spawnMargin;    y = Math.random() * WORLD_HEIGHT; break;
        case 2: x = Math.random() * WORLD_WIDTH;  y = WORLD_HEIGHT + spawnMargin; break;
        case 3: x = -spawnMargin;                 y = Math.random() * WORLD_HEIGHT; break;
    }
    destructibles.push({ x, y, size: 15, health: 1, maxHealth: 1, emoji: '🛢️' });
}

function handleBarrelDestruction(barrel) {
    playSound('enemyDeath');
    const explosionRadius = 54;
    flameAreas.push({
        x: barrel.x, y: barrel.y, radius: explosionRadius,
        startTime: Date.now(), endTime: Date.now() + 3000
    });
    enemies.forEach(enemy => {
        if (!enemy.isHit) {
            const dx = enemy.x - barrel.x;
            const dy = enemy.y - barrel.y;
            if (dx * dx + dy * dy < explosionRadius * explosionRadius) {
                enemy.health -= 2;
                createBloodSplatter(enemy.x, enemy.y);
                if (enemy.health <= 0) handleEnemyDeath(enemy);
            }
        }
    });
}

function triggerCircleSpawnEvent() {
    // Periodically spawn a ring of enemies
    const count  = 12;
    const radius = 300;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x     = player.x + Math.cos(angle) * radius;
        const y     = player.y + Math.sin(angle) * radius;
        createEnemy(x, y, '🧟');
    }
}
