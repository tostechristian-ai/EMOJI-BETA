// ==========================================
// ENTITIES.JS
// Game objects, factories, and state management
// ==========================================

// --- Global Entity Arrays ---
let enemies = [];
let pickupItems = [];
let appleItems = [];
let eyeProjectiles = [];
let playerPuddles = [];
let snailPuddles = [];
let mosquitoPuddles = [];
let bombs = [];
let floatingTexts = [];
let visualWarnings = [];
let explosions = [];
let blackHoles = [];
let bloodSplatters = [];
let bloodPuddles = [];
let antiGravityPulses = [];
let vengeanceNovas = [];
let dogHomingShots = [];
let destructibles = [];
let flameAreas = [];
let flies = [];
let owlProjectiles = [];
let lightningStrikes = [];
let smokeParticles = [];
let merchants = [];
let lightningBolts = [];

// --- Global Entity State Variables ---
let player2 = null;
let doppelganger = null;
let doppelgangerActive = false;
let dog = { x: 0, y: 0, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 };
let owl = null; 

// --- Player Object ---
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

    // Character specific flags
    _isSkull: false,

    upgradeLevels: {
        speed: 0, fireRate: 0, magnetRadius: 0, damage: 0, projectileSpeed: 0, knockback: 0, luck: 0
    }
};

// --- Weapon Object Pool ---
const MAX_WEAPONS = 500;
const weaponPool = [];
for (let i = 0; i < MAX_WEAPONS; i++) {
    weaponPool.push({ active: false, hitEnemies: [] });
}

// --- Player 2 Helper ---
function initializePlayer2() {
    if (player.lives > 1 && (!player2 || !player2.active)) {
        player.lives--;
        // Update UI logic should happen in main/renderer, but state changes here
        player2 = {
            active: true, x: player.x, y: player.y, size: 35, speed: 1.4,
            facing: 'down', stepPhase: 0, gunAngle: -Math.PI / 2,
            lastFireTime: 0, fireInterval: 400,
            isDashing: false, dashEndTime: 0, lastDashTime: 0, dashCooldown: 6000,
            spinStartTime: null, 
            spinDirection: 0, 
            dx: 0, dy: 0 
        };
        return true; // Signal that P2 joined
    }
    return false;
}

// --- Dash Mechanics (Integrated with Skull Nova) ---
function triggerDash(entity) {
    const now = Date.now();
    // Use saved player data for cooldown check if applicable
    const cooldown = (entity === player && typeof playerData !== 'undefined' && playerData.hasReducedDashCooldown) ? 3000 : 6000;
    
    if (!entity || entity.isDashing || now - entity.lastDashTime < cooldown) {
        return;
    }

    entity.isDashing = true;
    entity.dashEndTime = now + 300; // 300ms dash duration
    entity.lastDashTime = now;
    entity.spinStartTime = now;
    
    // Play sound if available globally
    if (typeof playSound === 'function') playSound('dodge');

    // Stats tracking
    if (entity === player && typeof playerStats !== 'undefined') {
        playerStats.totalDashes++;
    }

    // *** SKULL CHARACTER LOGIC INTEGRATION ***
    if (entity === player && player._isSkull) {
        createSkullNova();
    }
}

// --- Weapon Factories ---

function createWeapon(shooter = player, customAngle = null) {
    // Determine Angle
    let weaponAngle;
    if (customAngle !== null) {
        weaponAngle = customAngle;
    } else if (typeof autoAimActive !== 'undefined' && autoAimActive && enemies.length > 0) {
            let closestEnemy = null; let minDistance = Infinity;
        enemies.forEach(enemy => {
            const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
            if (distSq < minDistance) { minDistance = distSq; closestEnemy = enemy; }
        });
        if (closestEnemy) { weaponAngle = Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x); } 
        else { weaponAngle = shooter.rotationAngle; }
    }
    else if (aimDx !== 0 || aimDy !== 0) { weaponAngle = Math.atan2(aimDy, aimDx); } 
    else {
        // Auto-fire at nearest if no input
        let closestEnemy = null; let minDistance = Infinity;
        enemies.forEach(enemy => {
            const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
            if (distSq < minDistance) { minDistance = distSq; closestEnemy = enemy; }
        });
        if (closestEnemy) { weaponAngle = Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x); } 
        else { weaponAngle = shooter.rotationAngle; }
    }

    // Helper to pull from pool
    const fireWeaponFromPool = (angle) => {
        for(const weapon of weaponPool) {
            if(!weapon.active) {
                weapon.x = shooter.x;
                weapon.y = shooter.y;
                
                // Globals checked here: shotgunBlastActive, rocketLauncherActive, ricochetActive
                const isShotgun = typeof shotgunBlastActive !== 'undefined' && shotgunBlastActive;
                const isRocket = typeof rocketLauncherActive !== 'undefined' && rocketLauncherActive;
                const isRicochet = typeof ricochetActive !== 'undefined' && ricochetActive;

                weapon.size = isShotgun ? 30 * player.projectileSizeMultiplier : 38 * player.projectileSizeMultiplier * (isRocket ? 2 : 1);
                weapon.speed = 5.04 * player.projectileSpeedMultiplier;
                weapon.angle = angle;
                weapon.dx = Math.cos(angle) * weapon.speed;
                weapon.dy = Math.sin(angle) * weapon.speed;
                weapon.lifetime = Date.now() + 2000;
                weapon.hitsLeft = isRocket ? 3 : (isRicochet ? 2 : 1);
                weapon.hitEnemies.length = 0; 
                weapon.active = true;
                
                // Skull Logic: Add spin for bones
                if (player._isSkull) {
                    weapon.spinAngle = angle; 
                }
                return; 
            }
        }
    };

    let angles = [weaponAngle];
    const isShotgun = typeof shotgunBlastActive !== 'undefined' && shotgunBlastActive;
    
    // Logic for spread shots
    // Note: window.vShapeProjectileLevel is set by pickups
    let vLevel = (typeof vShapeProjectileLevel !== 'undefined') ? vShapeProjectileLevel : 0;
    const V_SHAPE_INCREMENT_ANGLE = Math.PI / 18;

    if (isShotgun && shooter === player) {
        angles = [];
        const projectileCount = 8; const spreadAngle = Math.PI / 8;
        for (let i = 0; i < projectileCount; i++) {
            const angleOffset = (Math.random() - 0.5) * spreadAngle;
            angles.push(weaponAngle + angleOffset);
        }
    } else if (vLevel > 0 && shooter === player) {
        const projectilesToEmit = vLevel + 1;
        angles = [];
        const totalSpreadAngle = V_SHAPE_INCREMENT_ANGLE * (projectilesToEmit - 1);
        const halfTotalSpread = totalSpreadAngle / 2;
        for (let i = 0; i < projectilesToEmit; i++) {
            angles.push(weaponAngle - halfTotalSpread + i * V_SHAPE_INCREMENT_ANGLE);
        }
    }
    
    angles.forEach(angle => fireWeaponFromPool(angle));
    
    if(typeof dualGunActive !== 'undefined' && dualGunActive && shooter === player) { 
        angles.forEach(angle => fireWeaponFromPool(angle + Math.PI)); 
    }

    if (typeof playSound === 'function') playSound('playerShoot');
}

function createPlayer2Weapon() {
    if (!player2 || !player2.active) return;
    
    for(const weapon of weaponPool) {
        if(!weapon.active) {
            weapon.x = player2.x;
            weapon.y = player2.y;
            weapon.size = 38;
            weapon.speed = 5.04;
            weapon.angle = player2.gunAngle;
            weapon.dx = Math.cos(player2.gunAngle) * weapon.speed;
            weapon.dy = Math.sin(player2.gunAngle) * weapon.speed;
            weapon.lifetime = Date.now() + 2000;
            weapon.hitsLeft = 1;
            weapon.hitEnemies.length = 0;
            weapon.active = true;
            break; 
        }
    }
    if (typeof playSound === 'function') playSound('playerShoot');
}

function createSkullNova() {
    const NOVA_COUNT = 6;
    const NOVA_SPEED = 6.0;
    const NOVA_SIZE = 20;
    const NOVA_LIFE = 1500;

    for (let i = 0; i < NOVA_COUNT; i++) {
        const angle = (i / NOVA_COUNT) * Math.PI * 2;
        for (const weapon of weaponPool) {
            if (!weapon.active) {
                weapon.x = player.x;
                weapon.y = player.y;
                weapon.size = NOVA_SIZE * (player.projectileSizeMultiplier || 1);
                weapon.speed = NOVA_SPEED * (player.projectileSpeedMultiplier || 1);
                weapon.angle = angle;
                weapon.dx = Math.cos(angle) * weapon.speed;
                weapon.dy = Math.sin(angle) * weapon.speed;
                weapon.lifetime = Date.now() + NOVA_LIFE;
                weapon.hitsLeft = 1;
                weapon.hitEnemies = [];
                weapon.active = true;
                weapon.spinAngle = angle;
                break;
            }
        }
    }
    if (typeof playSound === 'function') playSound('playerShoot');
}

// --- Enemy Factories ---

let lastBossLevelSpawned = 0;
let baseEnemySpeed = 0.84;

function createEnemy(x_pos, y_pos, type, currentDifficulty = 'easy') { 
    let x, y, enemyEmoji;
    if (x_pos !== undefined && y_pos !== undefined && type !== undefined) {
        x = x_pos; y = y_pos; enemyEmoji = type;
    } else {
        const spawnOffset = 29;
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
            case 0: x = Math.random() * WORLD_WIDTH; y = -spawnOffset; break;
            case 1: x = WORLD_WIDTH + spawnOffset; y = Math.random() * WORLD_HEIGHT; break;
            case 2: x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT + spawnOffset; break;
            case 3: x = -spawnOffset; y = Math.random() * WORLD_HEIGHT; break;
        }
        const eligibleEnemyEmojis = Object.keys(ENEMY_CONFIGS).filter(emoji => ENEMY_CONFIGS[emoji].minLevel <= player.level);
        if (eligibleEnemyEmojis.length === 0) return;
        enemyEmoji = eligibleEnemyEmojis[Math.floor(Math.random() * eligibleEnemyEmojis.length)];
    }
    
    let difficultySpeedMultiplier = (currentDifficulty === 'easy') ? 0.9 : (currentDifficulty === 'medium') ? 1.35 : 1.75; 
    let levelSpeedMultiplier = (currentDifficulty === 'hard') ? (1 + 0.025 * (player.level - 1)) : (1 + 0.02 * (player.level - 1)); 
    const currentBaseEnemySpeed = baseEnemySpeed * difficultySpeedMultiplier * levelSpeedMultiplier;
    
    const config = ENEMY_CONFIGS[enemyEmoji];
    const newEnemy = { 
        x, y, size: config.size, emoji: enemyEmoji, speed: currentBaseEnemySpeed * config.speedMultiplier, 
        health: config.baseHealth, isHit: false, isHitByOrbiter: false, isHitByCircle: false, 
        isFrozen: false, freezeEndTime: 0, originalSpeed: currentBaseEnemySpeed * config.speedMultiplier, 
        isSlowedByPuddle: false, isBoss: false, isHitByAxe: false,
        isIgnited: false, ignitionEndTime: 0, lastIgnitionDamageTime: 0
    };
    
    // Add custom properties if the enemy config has them
    if (config.initialProps) Object.assign(newEnemy, config.initialProps());
    
    enemies.push(newEnemy);
}

function createBoss(currentDifficulty = 'easy') {
    let x, y;
    const spawnOffset = 29;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
        case 0: x = Math.random() * WORLD_WIDTH; y = -spawnOffset; break;
        case 1: x = WORLD_WIDTH + spawnOffset; y = Math.random() * WORLD_HEIGHT; break;
        case 2: x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT + spawnOffset; break;
        case 3: x = -spawnOffset; y = Math.random() * WORLD_HEIGHT; break;
    }
    const mimickedEmoji = BOSSED_ENEMY_TYPES[Math.floor(Math.random() * BOSSED_ENEMY_TYPES.length)];
    const config = ENEMY_CONFIGS[mimickedEmoji];
    let difficultySpeedMultiplier = (currentDifficulty === 'easy') ? 0.9 : (currentDifficulty === 'medium') ? 1.35 : 1.75; 
    const currentBaseEnemySpeed = baseEnemySpeed * difficultySpeedMultiplier * (1 + 0.02 * (player.level - 1));
    const bossSpeed = currentBaseEnemySpeed * config.speedMultiplier * 0.75;
    const bossSize = config.size * 2;
    const boss = { 
        x, y, size: bossSize, emoji: mimickedEmoji, speed: bossSpeed, health: BOSS_HEALTH, 
        isBoss: true, mimics: mimickedEmoji, isHit: false, isHitByOrbiter: false, isHitByCircle: false, 
        isFrozen: false, freezeEndTime: 0, originalSpeed: bossSpeed, isSlowedByPuddle: false,
        isHitByAxe: false, isIgnited: false, ignitionEndTime: 0, lastIgnitionDamageTime: 0
    };
    if (config.initialProps) Object.assign(boss, config.initialProps());
    enemies.push(boss);
    console.log(`Spawned a boss mimicking ${mimickedEmoji} at level ${player.level}`);
}

function spawnMerchant(x, y) {
    merchants.push({
        x: x,
        y: y,
        size: 40 
    });
}

// --- Pickup Factories ---
function createPickup(x, y, type, size, xpValue) {
    if (x === -1 || y === -1) { x = Math.random() * WORLD_WIDTH; y = Math.random() * WORLD_HEIGHT; }
    pickupItems.push({ x, y, size, type, xpValue, glimmerStartTime: Date.now() + Math.random() * 2000 });
}

function createAppleItem(x, y) {
    appleItems.push({ x, y, size: 15, type: 'apple', spawnTime: Date.now(), lifetime: 5000, glimmerStartTime: Date.now() + Math.random() * 2000 });
}

// --- Effects Factories ---
function createBloodSplatter(x, y) {
    const particleCount = 6;
    const speed = 2 + Math.random() * 2;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        bloodSplatters.push({
            x: x, y: y, dx: Math.cos(angle) * speed + (Math.random() - 0.5),
            dy: Math.sin(angle) * speed + (Math.random() - 0.5),
            size: 2 + Math.random() * 3, spawnTime: Date.now(), lifetime: 800 + Math.random() * 400
        });
    }
}

function createBloodPuddle(x, y, size) {
    bloodPuddles.push({
        x: x, y: y, initialSize: size * 1.5,
        spawnTime: Date.now(), rotation: Math.random() * Math.PI * 2, lifetime: 10000
    });
}

function spawnInitialObstacles() {
    destructibles.length = 0;
    const playerSafeRadius = 200;
    const spawnPos = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };

    const barrelCount = 5;
    for (let i = 0; i < barrelCount; i++) {
        let x, y, dist;
        do {
            x = Math.random() * WORLD_WIDTH;
            y = Math.random() * WORLD_HEIGHT;
            dist = Math.hypot(x - spawnPos.x, y - spawnPos.y);
        } while (dist < playerSafeRadius);
        destructibles.push({ x, y, size: 15, health: 1, maxHealth: 1, emoji: '🛢️' });
    }
     const brickCount = 4;
     for (let i = 0; i < brickCount; i++) {
        let x, y, dist;
        do {
            x = Math.random() * WORLD_WIDTH;
            y = Math.random() * WORLD_HEIGHT;
            dist = Math.hypot(x - spawnPos.x, y - spawnPos.y);
        } while (dist < playerSafeRadius);
        destructibles.push({ x, y, size: 30, health: Infinity, emoji: '🧱' });
    }
}

function spawnRandomBarrel() {
    const spawnMargin = 50; let x, y;
    const edge = Math.floor(Math.random() * 4);
    switch(edge) {
        case 0: x = Math.random() * WORLD_WIDTH; y = -spawnMargin; break;
        case 1: x = WORLD_WIDTH + spawnMargin; y = Math.random() * WORLD_HEIGHT; break;
        case 2: x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT + spawnMargin; break;
        case 3: x = -spawnMargin; y = Math.random() * WORLD_HEIGHT; break;
    }
     destructibles.push({ x: x, y: y, size: 15, health: 1, maxHealth: 1, emoji: '🛢️' });
}
