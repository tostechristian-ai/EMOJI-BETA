// ============================================================
// player.js — Player objects, stats and dash logic
// ============================================================

const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    size: 35,
    speed: 1.4,
    xp: 0,
    level: 1,
    xpToNextLevel: 3,
    projectileSizeMultiplier: 1,
    projectileSpeedMultiplier: 1,
    lives: 3,
    maxLives: 3,
    appleCount: 0,
    coins: 0,
    magnetRadius: 23 * 2,
    orbitAngle: 0,
    boxPickupsCollectedCount: 0,
    bgmFastModeActive: false,
    swordActive: false,
    lastSwordSwingTime: 0,
    currentSwordSwing: null,
    isSlowedByMosquitoPuddle: false,
    originalPlayerSpeed: 1.4,
    damageMultiplier: 1,
    knockbackStrength: 0,
    facing: 'down',
    stepPhase: 0,
    rotationAngle: 0,
    isDashing: false,
    dashEndTime: 0,
    lastDashTime: 0,
    dashCooldown: 6000,
    isInvincible: false,
    spinStartTime: null,
    spinDirection: 0,
    upgradeLevels: {
        speed: 0, fireRate: 0, magnetRadius: 0, damage: 0,
        projectileSpeed: 0, knockback: 0, luck: 0
    }
};

let player2 = null;
let doppelganger = null;
let doppelgangerActive = false;
let lastDoppelgangerSpawnTime = 0;

// Spin duration used during dash animation
const spinDuration = 300;

function triggerDash(target) {
    const now = Date.now();
    const cooldown = cheats.infinite_dash ? 0 : target.dashCooldown;
    if (now - target.lastDashTime < cooldown) return;

    target.isDashing    = true;
    target.dashEndTime  = now + 200;
    target.lastDashTime = now;
    target.spinStartTime  = now;
    target.spinDirection  = 0;
    if (cheats.infinite_dash) target.isInvincible = true;
    if (target === player) {
        playerStats.totalDashes++;
        runStats.dashesThisRun = (runStats.dashesThisRun || 0) + 1;
        playSound('dodge');
    }
    if (cheats.explosive_player && target === player) {
        const explosionId = `dash_${now}`;
        explosions.push({ x: player.x, y: player.y, startTime: now, duration: 400, radius: player.size * 2.5 });
        enemies.forEach(enemy => {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            if (dx*dx + dy*dy < (player.size * 2.5)**2 && !enemy.isHit) {
                enemy.health -= 2;
                createBloodSplatter(enemy.x, enemy.y);
                if (enemy.health <= 0) handleEnemyDeath(enemy, explosionId);
            }
        });
    }
}

function applyPermanentUpgrades() {
    player.damageMultiplier   = 1 + (playerData.upgrades.playerDamage || 0) * PERMANENT_UPGRADES.playerDamage.effect;
    player.speed              = 1.4 * (1 + (playerData.upgrades.playerSpeed || 0) * PERMANENT_UPGRADES.playerSpeed.effect);
    baseEnemySpeed            = 0.84 * (1 + (playerData.upgrades.enemyHealth || 0) * PERMANENT_UPGRADES.enemyHealth.effect);
    player.magnetRadius       = (player.size * 2) * (1 + (playerData.upgrades.magnetRadius || 0) * PERMANENT_UPGRADES.magnetRadius.effect);
    const luckBonus           = (playerData.upgrades.luck || 0) * PERMANENT_UPGRADES.luck.effect;
    boxDropChance  = 0.01 + luckBonus;
    appleDropChance = 0.05 + luckBonus;
}
