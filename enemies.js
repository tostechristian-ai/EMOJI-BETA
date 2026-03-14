// ============================================================
// enemies.js — Enemy/boss creation and death handling
// ============================================================

let enemies = [];

function createEnemy(x_pos, y_pos, type) {
    let x, y, enemyEmoji;
    if (x_pos !== undefined && y_pos !== undefined && type !== undefined) {
        x = x_pos; y = y_pos; enemyEmoji = type;
    } else {
        const spawnOffset = 29;
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
            case 0: x = Math.random() * WORLD_WIDTH;  y = -spawnOffset; break;
            case 1: x = WORLD_WIDTH + spawnOffset;    y = Math.random() * WORLD_HEIGHT; break;
            case 2: x = Math.random() * WORLD_WIDTH;  y = WORLD_HEIGHT + spawnOffset; break;
            case 3: x = -spawnOffset;                 y = Math.random() * WORLD_HEIGHT; break;
        }
        const eligibleEnemyEmojis = Object.keys(ENEMY_CONFIGS).filter(emoji => ENEMY_CONFIGS[emoji].minLevel <= player.level);
        if (eligibleEnemyEmojis.length === 0) return;
        enemyEmoji = eligibleEnemyEmojis[Math.floor(Math.random() * eligibleEnemyEmojis.length)];
    }

    let difficultySpeedMultiplier = (currentDifficulty === 'easy') ? 0.9 : (currentDifficulty === 'medium') ? 1.35 : 1.75;
    let levelSpeedMultiplier      = (currentDifficulty === 'hard')
        ? (1 + 0.025 * (player.level - 1))
        : (1 + 0.02  * (player.level - 1));
    const currentBaseEnemySpeed   = baseEnemySpeed * difficultySpeedMultiplier * levelSpeedMultiplier;

    const config   = ENEMY_CONFIGS[enemyEmoji];
    const newEnemy = {
        x, y, size: config.size, emoji: enemyEmoji,
        speed: currentBaseEnemySpeed * config.speedMultiplier,
        health: config.baseHealth, isHit: false,
        isHitByOrbiter: false, isHitByCircle: false,
        isFrozen: false, freezeEndTime: 0,
        originalSpeed: currentBaseEnemySpeed * config.speedMultiplier,
        isSlowedByPuddle: false, isBoss: false, isHitByAxe: false,
        isIgnited: false, ignitionEndTime: 0, lastIgnitionDamageTime: 0
    };
    if (config.initialProps) Object.assign(newEnemy, config.initialProps());
    enemies.push(newEnemy);
}

let lastBossLevelSpawned = 0;

function createBoss() {
    let x, y;
    const spawnOffset = 29;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
        case 0: x = Math.random() * WORLD_WIDTH;  y = -spawnOffset; break;
        case 1: x = WORLD_WIDTH + spawnOffset;    y = Math.random() * WORLD_HEIGHT; break;
        case 2: x = Math.random() * WORLD_WIDTH;  y = WORLD_HEIGHT + spawnOffset; break;
        case 3: x = -spawnOffset;                 y = Math.random() * WORLD_HEIGHT; break;
    }
    const mimickedEmoji = BOSSED_ENEMY_TYPES[Math.floor(Math.random() * BOSSED_ENEMY_TYPES.length)];
    const config        = ENEMY_CONFIGS[mimickedEmoji];
    let difficultySpeedMultiplier = (currentDifficulty === 'easy') ? 0.9 : (currentDifficulty === 'medium') ? 1.35 : 1.75;
    const currentBaseEnemySpeed   = baseEnemySpeed * difficultySpeedMultiplier * (1 + 0.02 * (player.level - 1));
    const bossSpeed = currentBaseEnemySpeed * config.speedMultiplier * 0.75;
    const bossSize  = config.size * 2;
    const boss = {
        x, y, size: bossSize, emoji: mimickedEmoji, speed: bossSpeed,
        health: BOSS_HEALTH, isBoss: true, mimics: mimickedEmoji,
        isHit: false, isHitByOrbiter: false, isHitByCircle: false,
        isFrozen: false, freezeEndTime: 0, originalSpeed: bossSpeed,
        isSlowedByPuddle: false, isHitByAxe: false,
        isIgnited: false, ignitionEndTime: 0, lastIgnitionDamageTime: 0
    };
    if (config.initialProps) Object.assign(boss, config.initialProps());
    enemies.push(boss);
    console.log(`Spawned a boss mimicking ${mimickedEmoji} at level ${player.level}`);
}

function handleEnemyDeath(enemy, explosionId = null) {
    if (enemy.isHit) return;
    enemy.isHit = true;
    enemiesDefeatedCount++;
    player.coins++;

    if (Math.random() < boxDropChance) createPickup(enemy.x, enemy.y, '📦', BOX_SIZE, 0);

    // Achievement tracking
    runStats.killsThisRun++;
    playerStats.totalKills++;
    if (enemy.isBoss) { runStats.bossesKilledThisRun++; playerStats.totalBossesKilled++; }
    if (enemy.emoji === '🧛‍♀️') runStats.vampiresKilledThisRun++;
    if (explosionId) {
        if (!runStats.killsPerExplosion[explosionId]) runStats.killsPerExplosion[explosionId] = 0;
        runStats.killsPerExplosion[explosionId]++;
    }
    checkAchievements();

    createBloodPuddle(enemy.x, enemy.y, enemy.size);
    playSound('enemyDeath');

    if (enemy.isBoss) {
        createPickup(enemy.x, enemy.y, BOSS_XP_EMOJI, enemy.size / 2, BOSS_XP_DROP);
    } else if (enemy.emoji === VAMPIRE_EMOJI || enemy.emoji === FEMALE_ZOMBIE_EMOJI) {
        createPickup(enemy.x, enemy.y, '💎', DIAMOND_SIZE, 5);
    } else if (enemy.emoji === '🌀') {
        createPickup(enemy.x, enemy.y, DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE);
    } else if (enemy.emoji === MOSQUITO_EMOJI) {
        createPickup(enemy.x, enemy.y, DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE);
    } else if (Math.random() < appleDropChance) {
        createAppleItem(enemy.x, enemy.y);
    } else {
        if      (enemy.emoji === '🧟')                                           createPickup(enemy.x, enemy.y, COIN_EMOJI,        COIN_SIZE,        COIN_XP_VALUE);
        else if (enemy.emoji === '💀')                                           createPickup(enemy.x, enemy.y, DIAMOND_EMOJI,     DIAMOND_SIZE,     DIAMOND_XP_VALUE);
        else if (enemy.emoji === BAT_EMOJI || enemy.emoji === '😈')              createPickup(enemy.x, enemy.y, RING_SYMBOL_EMOJI, RING_SYMBOL_SIZE, RING_SYMBOL_XP_VALUE);
        else if (enemy.emoji === DEMON_EMOJI || enemy.emoji === EYE_EMOJI || enemy.emoji === '👻')
                                                                                 createPickup(enemy.x, enemy.y, DEMON_XP_EMOJI,   RING_SYMBOL_SIZE, DEMON_XP_VALUE);
    }

    if (Math.random() < boxDropChance) { createPickup(enemy.x, enemy.y, 'box', BOX_SIZE, 0); }
    score += 10;
}
