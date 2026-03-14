// ============================================================
// physics.js — update() : all per-frame game simulation logic
// ============================================================

// ---- Shared state referenced throughout update() ----
let gamePaused   = false;
let gameOver     = false;
let gameActive   = false;
let gameStartTime = 0;

let score                = 0;
let lastEnemySpawnTime   = 0;
let enemySpawnInterval   = 1000;
let baseEnemySpeed       = 0.84;

let enemiesDefeatedCount = 0;
let lastFrameTime        = 0;
let lastCircleSpawnEventTime = 0;

// Powerup state flags
let bombEmitterActive      = false; let lastBombEmitMs          = 0;
let orbitingPowerUpActive  = false;
let damagingCircleActive   = false; let lastDamagingCircleDamageTime = 0;
let lightningProjectileActive = false; let lastLightningSpawnTime = 0;
let magneticProjectileActive  = false;
let vShapeProjectileLevel  = 0;
let iceProjectileActive    = false;
let puddleTrailActive      = false; let lastPlayerPuddleSpawnTime = 0;
let laserPointerActive     = false;
let autoAimActive          = false;
let explosiveBulletsActive = false;
let vengeanceNovaActive    = false;
let dogCompanionActive     = false;
let antiGravityActive      = false; let lastAntiGravityPushTime  = 0;
let ricochetActive         = false;
let rocketLauncherActive   = false;
let blackHoleActive        = false; let lastBlackHoleTime        = 0;
let dualGunActive          = false;
let flamingBulletsActive   = false;
let shotgunBlastActive     = false;
let bugSwarmActive         = false; let lastBugSwarmSpawnTime    = 0;
let nightOwlActive         = false;
let whirlwindAxeActive     = false;
let lightningStrikeActive  = false; let lastLightningStrikeTime  = 0;
let hasDashInvincibility   = false;
let temporalWardActive     = false;
let isTimeStopped          = false; let timeStopEndTime          = 0;

let dog = { x: 0, y: 0, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 };
let owl = null;

// Particle / projectile arrays
let pickupItems      = [];
let lightningBolts   = [];
let eyeProjectiles   = [];
let playerPuddles    = [];
let snailPuddles     = [];
let mosquitoPuddles  = [];
let floatingTexts    = [];
let visualWarnings   = [];
let explosions       = [];
let blackHoles       = [];
let bloodSplatters   = [];
let bloodPuddles     = [];
let antiGravityPulses = [];
let vengeanceNovas   = [];
let dogHomingShots   = [];
let smokeParticles   = [];
let pickups          = [];
let flies            = [];
let owlProjectiles   = [];
let lightningStrikes = [];
let bombs            = [];
let appleItems       = [];

let appleDropChance  = 0.05;
let boxDropChance    = 0.01;

// Rendering angles
let orbitingImageAngle  = 0;
let damagingCircleAngle = 0;
let whirlwindAxeAngle   = 0;

let isPlayerHitShaking      = false;
let playerHitShakeStartTime = 0;

let cameraOffsetX    = 0;
let cameraOffsetY    = 0;
let cameraAimOffsetX = 0;
let cameraAimOffsetY = 0;

let currentDifficulty    = 'easy';
let cameraZoom           = 1.0;
let currentBackgroundIndex = 0;
let selectedMapIndex     = -1;
let equippedCharacterID  = 'cowboy';

let doppelganger         = null;
let doppelgangerActive   = false;

// =========================================================
function update() {
    if (gamePaused || gameOver || !gameActive) return;

    // Rebuild quadtree
    quadtree.clear();
    const allGameObjects = [...enemies, ...destructibles, player];
    if (player2 && player2.active) allGameObjects.push(player2);
    if (doppelganger)              allGameObjects.push(doppelganger);
    for (const obj of allGameObjects) {
        quadtree.insert({ x: obj.x - obj.size / 2, y: obj.y - obj.size / 2, width: obj.size, height: obj.size, ref: obj });
    }

    const now = Date.now();
    const deltaTime = now - lastFrameTime;
    if (deltaTime > 0) {
        const xpGainMultiplier = 1 + (playerData.upgrades.xpGain || 0) * PERMANENT_UPGRADES.xpGain.effect;
        if (doppelgangerActive && runStats.lastDoppelgangerStartTime > 0) {
            runStats.doppelgangerActiveTimeThisRun += deltaTime;
        }
    }
    lastFrameTime = now;
    checkAchievements();

    // Merchant spawn timer
    if (Date.now() - lastMerchantSpawnTime >= MERCHANT_SPAWN_INTERVAL) {
        spawnMerchant(player.x + 200, player.y);
        lastMerchantSpawnTime = Date.now();
    }
    // Merchant collision
    for (let i = merchants.length - 1; i >= 0; i--) {
        const m = merchants[i];
        const dx = player.x - m.x, dy = player.y - m.y;
        if (Math.sqrt(dx * dx + dy * dy) < (player.size / 2) + (m.size / 2)) {
            showMerchantShop();
            merchants.splice(i, 1);
            break;
        }
    }

    if (fireRateBoostActive && now > fireRateBoostEndTime) fireRateBoostActive = false;
    if (isTimeStopped && now > timeStopEndTime) isTimeStopped = false;

    if (now - lastCircleSpawnEventTime > 180000) {
        triggerCircleSpawnEvent();
        lastCircleSpawnEventTime = now;
    }
    if (now - lastBarrelSpawnTime > 30000) {
        spawnRandomBarrel();
        lastBarrelSpawnTime = now;
    }

    // ---- Player movement ----
    let moveX = 0, moveY = 0;
    if (keys['ArrowUp']   || keys['w']) moveY -= 1;
    if (keys['ArrowDown'] || keys['s']) moveY += 1;
    if (keys['ArrowLeft'] || keys['a']) moveX -= 1;
    if (keys['ArrowRight']|| keys['d']) moveX += 1;
    if (moveX === 0 && moveY === 0) { moveX = joystickDirX; moveY = joystickDirY; }
    const moveMagnitude = Math.hypot(moveX, moveY);
    let isMoving = false;
    if (moveMagnitude > 0) { isMoving = true; moveX /= moveMagnitude; moveY /= moveMagnitude; }

    // Spin animation
    const spinDuration = 500;
    if (player.isDashing && player.spinStartTime) {
        if (now < player.spinStartTime + spinDuration) {
            if      (moveX > 0) player.spinDirection = 1;
            else if (moveX < 0) player.spinDirection = -1;
            else if (player.spinDirection === 0) player.spinDirection = 1;
        } else { player.spinStartTime = null; player.spinDirection = 0; }
    }

    if (isMoving && !player.isDashing) player.stepPhase += player.speed * 0.1;

    let currentPlayerSpeed = player.speed;
    if (cheats.double_game_speed) currentPlayerSpeed *= 2;

    if (player.isDashing) {
        currentPlayerSpeed *= 3.5;
        if (now > player.dashEndTime) {
            player.isDashing = false; player.isInvincible = false;
        } else {
            if (hasDashInvincibility) player.isInvincible = true;
            if (Math.random() > 0.5) {
                smokeParticles.push({ x: player.x, y: player.y + player.size / 4, dx: (Math.random() - 0.5) * 0.5, dy: (Math.random() - 0.5) * 0.5, size: 15 + Math.random() * 10, alpha: 0.8 });
            }
        }
    }

    // Puddle slow effects
    player.isSlowedByMosquitoPuddle = false;
    for (const puddle of mosquitoPuddles) {
        const dx = player.x - puddle.x, dy = player.y - puddle.y;
        if (dx*dx + dy*dy < ((player.size/2) + (puddle.size/2))**2) { currentPlayerSpeed *= MOSQUITO_PUDDLE_SLOW_FACTOR; player.isSlowedByMosquitoPuddle = true; break; }
    }
    for (const puddle of snailPuddles) {
        const dx = player.x - puddle.x, dy = player.y - puddle.y;
        if (dx*dx + dy*dy < ((player.size/2) + (puddle.size/2))**2) { currentPlayerSpeed *= PLAYER_PUDDLE_SLOW_FACTOR; break; }
    }

    // Move player with obstacle collision
    if (isMoving) {
        let nextX = player.x + moveX * currentPlayerSpeed;
        let nextY = player.y + moveY * currentPlayerSpeed;
        let collision = false;
        for (const obs of destructibles) {
            const dx = nextX - obs.x, dy = nextY - obs.y;
            if (dx*dx + dy*dy < ((player.size/2) + (obs.size/2))**2) { collision = true; break; }
        }
        if (!collision) { player.x = nextX; player.y = nextY; }
    }

    // World bounds
    const PUSH_BACK_STRENGTH = 2.5;
    const halfSize = player.size / 2;
    if (player.x < halfSize) player.x += PUSH_BACK_STRENGTH;
    if (player.x > WORLD_WIDTH  - halfSize) player.x -= PUSH_BACK_STRENGTH;
    if (player.y < halfSize) player.y += PUSH_BACK_STRENGTH;
    if (player.y > WORLD_HEIGHT - halfSize) player.y -= PUSH_BACK_STRENGTH;
    player.x = Math.max(halfSize, Math.min(WORLD_WIDTH  - halfSize, player.x));
    player.y = Math.max(halfSize, Math.min(WORLD_HEIGHT - halfSize, player.y));

    // ---- Camera ----
    const aimMagnitude = Math.hypot(aimDx, aimDy);
    const normAimDx = aimMagnitude > 0 ? aimDx / aimMagnitude : 0;
    const normAimDy = aimMagnitude > 0 ? aimDy / aimMagnitude : 0;
    cameraAimOffsetX += (normAimDx * CAMERA_PULL_STRENGTH - cameraAimOffsetX) * CAMERA_LERP_FACTOR;
    cameraAimOffsetY += (normAimDy * CAMERA_PULL_STRENGTH - cameraAimOffsetY) * CAMERA_LERP_FACTOR;
    cameraOffsetX = Math.max(0, Math.min(WORLD_WIDTH  - canvas.width,  player.x + cameraAimOffsetX - canvas.width  / 2));
    cameraOffsetY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, player.y + cameraAimOffsetY - canvas.height / 2));

    // ---- Player facing / rotation ----
    const updateFacing = (angle) => {
        player.rotationAngle = angle;
        if      (angle > -Math.PI/4  && angle <= Math.PI/4)       player.facing = 'right';
        else if (angle > Math.PI/4   && angle <= 3*Math.PI/4)     player.facing = 'down';
        else if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4)    player.facing = 'left';
        else                                                        player.facing = 'up';
    };
    if (autoAimActive) {
        let closestEnemy = null, minDSq = Infinity;
        enemies.forEach(e => { if (!e.isHit) { const d = (player.x-e.x)**2+(player.y-e.y)**2; if (d < minDSq) { minDSq = d; closestEnemy = e; } } });
        if (closestEnemy) updateFacing(Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x));
    } else if (aimDx !== 0 || aimDy !== 0) {
        updateFacing(Math.atan2(aimDy, aimDx));
    }

    // ---- Player 2 ----
    if (player2 && player2.active) {
        let p2VelX = 0, p2VelY = 0;
        p2aimDx = 0; p2aimDy = 0;
        if (keys['j']) p2VelX -= player2.speed;
        if (keys['l']) p2VelX += player2.speed;
        if (keys['i']) p2VelY -= player2.speed;
        if (keys['k']) p2VelY += player2.speed;
        if (player2.isDashing) { p2VelX *= 3.5; p2VelY *= 3.5; if (now > player2.dashEndTime) player2.isDashing = false; }
        player2.x += p2VelX; player2.y += p2VelY;
        if (p2VelX > 0) player2.facing = 'right'; else if (p2VelX < 0) player2.facing = 'left';
        if (p2VelY > 0) player2.facing = 'down';  else if (p2VelY < 0) player2.facing = 'up';
        player2.x = Math.max(player2.size/2, Math.min(WORLD_WIDTH  - player2.size/2, player2.x));
        player2.y = Math.max(player2.size/2, Math.min(WORLD_HEIGHT - player2.size/2, player2.y));
        if (keys['8']) p2aimDy = -1; if (keys['2']) p2aimDy = 1;
        if (keys['4']) p2aimDx = -1; if (keys['6']) p2aimDx = 1;
        if (keys['7']) { p2aimDx = -1; p2aimDy = -1; } if (keys['9']) { p2aimDx = 1; p2aimDy = -1; }
        if (keys['1']) { p2aimDx = -1; p2aimDy = 1; }  if (keys['3']) { p2aimDx = 1; p2aimDy = 1; }
        const p2AimMag = Math.hypot(p2aimDx, p2aimDy);
        if (p2AimMag > 0) { p2aimDx /= p2AimMag; p2aimDy /= p2AimMag; player2.gunAngle = Math.atan2(p2aimDy, p2aimDx); }
        if ((p2aimDx !== 0 || p2aimDy !== 0) && now - player2.lastFireTime > player2.fireInterval) {
            createPlayer2Weapon(); player2.lastFireTime = now;
        }
    }

    // ---- Special powerup companions ----
    if (bugSwarmActive && !isTimeStopped && now - lastBugSwarmSpawnTime > BUG_SWARM_INTERVAL) {
        for (let i = 0; i < BUG_SWARM_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            flies.push({ x: player.x + Math.cos(angle)*player.size, y: player.y + Math.sin(angle)*player.size, target: null, isHit: false });
        }
        lastBugSwarmSpawnTime = now;
    }
    if (nightOwlActive && !isTimeStopped) {
        if (!owl) owl = { x: player.x, y: player.y - OWL_FOLLOW_DISTANCE, lastFireTime: 0 };
        owl.x += (player.x - owl.x) * 0.05;
        owl.y += (player.y - OWL_FOLLOW_DISTANCE - owl.y) * 0.05;
        if (now - owl.lastFireTime > OWL_FIRE_INTERVAL && enemies.length > 0) {
            let closest = null, minDSq = Infinity;
            enemies.forEach(e => { if (!e.isHit) { const d = (owl.x-e.x)**2+(owl.y-e.y)**2; if (d < minDSq) { minDSq = d; closest = e; } } });
            if (closest) {
                const a = Math.atan2(closest.y - owl.y, closest.x - owl.x);
                owlProjectiles.push({ x: owl.x, y: owl.y, size: OWL_PROJECTILE_SIZE, dx: Math.cos(a)*OWL_PROJECTILE_SPEED, dy: Math.sin(a)*OWL_PROJECTILE_SPEED, angle: a, isHit: false, lifetime: now+3000 });
                owl.lastFireTime = now;
            }
        }
    }
    if (lightningStrikeActive && !isTimeStopped && now - lastLightningStrikeTime > LIGHTNING_STRIKE_INTERVAL && enemies.length > 0) {
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        if (target && !target.isHit) {
            lightningStrikes.push({ x: target.x, y: target.y, startTime: now, duration: 500 });
            target.health -= LIGHTNING_STRIKE_DAMAGE;
            createBloodSplatter(target.x, target.y);
            if (target.health <= 0) handleEnemyDeath(target);
            lastLightningStrikeTime = now;
        }
    }

    // ---- Enemy spawning ----
    const enemySpawnCap = cheats.noSpawnCap ? Infinity : 100;
    let currentEnemySpawnInterval = enemySpawnInterval / Math.pow(1.3, player.boxPickupsCollectedCount) * (1 - 0.01 * (player.level - 1));
    currentEnemySpawnInterval = Math.max(80, currentEnemySpawnInterval);
    if (player.level > 0 && player.level % BOSS_SPAWN_INTERVAL_LEVELS === 0 && player.level !== lastBossLevelSpawned) {
        createBoss(); lastBossLevelSpawned = player.level;
    }
    if (enemies.length < enemySpawnCap && now - lastEnemySpawnTime > currentEnemySpawnInterval) {
        createEnemy(); lastEnemySpawnTime = now;
    }

    // ---- Enemy AI movement ----
    const enemyMovements = new Map();
    enemies.forEach(enemy => {
        if (isTimeStopped) return;
        if (enemy.isIgnited) {
            if (now > enemy.ignitionEndTime) enemy.isIgnited = false;
            else if (now - enemy.lastIgnitionDamageTime > 3000) {
                enemy.health -= 1; createBloodSplatter(enemy.x, enemy.y);
                if (enemy.health <= 0) handleEnemyDeath(enemy);
                enemy.lastIgnitionDamageTime = now;
            }
        }
        let moveX = 0, moveY = 0;
        let target = player, minTargetDistSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
        if (player2 && player2.active) { const d = (player2.x-enemy.x)**2+(player2.y-enemy.y)**2; if (d < minTargetDistSq) { target = player2; minTargetDistSq = d; } }
        if (doppelganger)              { const d = (doppelganger.x-enemy.x)**2+(doppelganger.y-enemy.y)**2; if (d < minTargetDistSq) { target = doppelganger; minTargetDistSq = d; } }
        let angleToTarget = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        let effectiveEnemySpeed = enemy.speed;
        if (cheats.fastEnemies) effectiveEnemySpeed *= 1.5;
        if (cheats.slowEnemies) effectiveEnemySpeed *= 0.5;
        enemy.isSlowedByPuddle = false;
        for (const p of [...playerPuddles, ...snailPuddles]) {
            const dx = enemy.x - p.x, dy = enemy.y - p.y;
            if (dx*dx + dy*dy < ((enemy.size/2)+(p.size/2))**2) { effectiveEnemySpeed *= PLAYER_PUDDLE_SLOW_FACTOR; enemy.isSlowedByPuddle = true; break; }
        }
        if (enemy.isFrozen && now < enemy.freezeEndTime) { enemyMovements.set(enemy, {moveX:0, moveY:0}); return; }
        else if (enemy.isFrozen && now >= enemy.freezeEndTime) enemy.isFrozen = false;

        const behaviorType = enemy.isBoss ? ENEMY_CONFIGS[enemy.mimics].type : ENEMY_CONFIGS[enemy.emoji].type;
        switch (behaviorType) {
            case 'bat':
                enemy.pauseTimer++;
                if (enemy.isPaused) { if (enemy.pauseTimer >= enemy.pauseDuration) { enemy.isPaused = false; enemy.pauseTimer = 0; } }
                else { moveX += Math.cos(angleToTarget)*effectiveEnemySpeed; moveY += Math.sin(angleToTarget)*effectiveEnemySpeed; if (enemy.pauseTimer >= enemy.moveDuration) { enemy.isPaused = true; enemy.pauseTimer = 0; } }
                break;
            case 'devil':
                if (now - enemy.lastAxisSwapTime > 500) { enemy.moveAxis = enemy.moveAxis === 'x' ? 'y' : 'x'; enemy.lastAxisSwapTime = now; }
                if (enemy.moveAxis === 'x') moveX += Math.sign(target.x - enemy.x)*effectiveEnemySpeed;
                else                        moveY += Math.sign(target.y - enemy.y)*effectiveEnemySpeed;
                break;
            case 'demon':
                if (now - enemy.lastStateChangeTime >= 2000) { enemy.moveState = enemy.moveState === 'following' ? 'random' : 'following'; enemy.lastStateChangeTime = now; if (enemy.moveState === 'random') { const ra = Math.random()*Math.PI*2; enemy.randomDx = Math.cos(ra); enemy.randomDy = Math.sin(ra); } }
                if (enemy.moveState === 'following') { moveX += Math.cos(angleToTarget)*effectiveEnemySpeed; moveY += Math.sin(angleToTarget)*effectiveEnemySpeed; }
                else { moveX += enemy.randomDx*effectiveEnemySpeed; moveY += enemy.randomDy*effectiveEnemySpeed; }
                break;
            case 'ghost':
                if (now - enemy.lastPhaseChange > enemy.phaseDuration) { enemy.isVisible = !enemy.isVisible; enemy.lastPhaseChange = now; }
                enemy.bobOffset = Math.sin(now / 200) * 4;
                if (enemy.isVisible) { moveX += Math.cos(angleToTarget)*effectiveEnemySpeed; moveY += Math.sin(angleToTarget)*effectiveEnemySpeed; }
                break;
            case 'eye':
                const distToTarget = Math.sqrt(minTargetDistSq);
                if (distToTarget < EYE_SAFE_DISTANCE) { moveX -= Math.cos(angleToTarget)*effectiveEnemySpeed; moveY -= Math.sin(angleToTarget)*effectiveEnemySpeed; }
                else if (distToTarget > EYE_TOO_FAR_DISTANCE) { moveX += Math.cos(angleToTarget)*effectiveEnemySpeed; moveY += Math.sin(angleToTarget)*effectiveEnemySpeed; }
                else if (now - enemy.lastEyeProjectileTime > EYE_PROJECTILE_INTERVAL) {
                    eyeProjectiles.push({ x: enemy.x, y: enemy.y, size: EYE_PROJECTILE_SIZE, emoji: EYE_PROJECTILE_EMOJI, speed: EYE_PROJECTILE_SPEED, dx: Math.cos(angleToTarget)*EYE_PROJECTILE_SPEED, dy: Math.sin(angleToTarget)*EYE_PROJECTILE_SPEED, lifetime: now + EYE_PROJECTILE_LIFETIME });
                    enemy.lastEyeProjectileTime = now; playSound('playerShoot');
                }
                break;
            case 'vampire':
                let dvX = 0, dvY = 0;
                for (const w of weaponPool) {
                    if (w.active) {
                        const d = (enemy.x-w.x)**2+(enemy.y-w.y)**2;
                        if (d < VAMPIRE_DODGE_DETECTION_RADIUS**2 && (w.dx*(enemy.x-w.x)+w.dy*(enemy.y-w.y)) > 0) {
                            const n = Math.sqrt((-w.dy)**2+(w.dx)**2);
                            if (n > 0) { dvX += -w.dy/n; dvY += w.dx/n; }
                        }
                    }
                }
                const dvMag = Math.sqrt(dvX*dvX+dvY*dvY);
                if (dvMag > 0) { dvX = dvX/dvMag*VAMPIRE_DODGE_STRENGTH; dvY = dvY/dvMag*VAMPIRE_DODGE_STRENGTH; }
                moveX += Math.cos(angleToTarget)*effectiveEnemySpeed + dvX;
                moveY += Math.sin(angleToTarget)*effectiveEnemySpeed + dvY;
                break;
            case 'mosquito':
                if (!enemy.currentMosquitoDirection || now - enemy.lastDirectionUpdateTime > MOSQUITO_DIRECTION_UPDATE_INTERVAL) { enemy.lastDirectionUpdateTime = now; enemy.currentMosquitoDirection = { dx: Math.cos(angleToTarget), dy: Math.sin(angleToTarget) }; }
                moveX += enemy.currentMosquitoDirection.dx * effectiveEnemySpeed;
                moveY += enemy.currentMosquitoDirection.dy * effectiveEnemySpeed;
                if (now - enemy.lastPuddleSpawnTime > MOSQUITO_PUDDLE_SPAWN_INTERVAL) { mosquitoPuddles.push({ x: enemy.x, y: enemy.y, size: MOSQUITO_PUDDLE_SIZE, spawnTime: now, lifetime: MOSQUITO_PUDDLE_LIFETIME }); enemy.lastPuddleSpawnTime = now; }
                break;
            case 'snail':
                moveX += Math.cos(enemy.directionAngle) * effectiveEnemySpeed;
                moveY += Math.sin(enemy.directionAngle) * effectiveEnemySpeed;
                if (enemy.x < 0 || enemy.x > WORLD_WIDTH || enemy.y < 0 || enemy.y > WORLD_HEIGHT) enemy.directionAngle = Math.random()*Math.PI*2;
                if (now - enemy.lastPuddleSpawnTime > PLAYER_PUDDLE_SPAWN_INTERVAL*2) { snailPuddles.push({ x: enemy.x, y: enemy.y, size: PLAYER_PUDDLE_SIZE, spawnTime: now, lifetime: PLAYER_PUDDLE_LIFETIME*2 }); enemy.lastPuddleSpawnTime = now; }
                break;
            default:
                moveX += Math.cos(angleToTarget)*effectiveEnemySpeed;
                moveY += Math.sin(angleToTarget)*effectiveEnemySpeed;
        }
        enemyMovements.set(enemy, { moveX, moveY });
    });

    // Apply enemy movements + enemy-player collision
    const finalMovements = new Map();
    enemies.forEach(e1 => {
        const totalMove = enemyMovements.get(e1);
        if (!totalMove) return;
        let repulsionX = 0, repulsionY = 0;
        destructibles.forEach(obs => {
            const dx = e1.x - obs.x, dy = e1.y - obs.y;
            const distSq = dx*dx + dy*dy;
            const rr = obs.size/2 + e1.size/2 + 5;
            if (distSq < rr*rr) { const d = Math.sqrt(distSq); const pf = (1-(d/rr))*2; if (d > 0.1) { repulsionX += (dx/d)*pf; repulsionY += (dy/d)*pf; } }
        });
        finalMovements.set(e1, { finalX: totalMove.moveX + repulsionX, finalY: totalMove.moveY + repulsionY });
    });

    enemies.forEach(enemy => {
        const fm = finalMovements.get(enemy);
        if (fm) {
            let nextX = enemy.x + fm.finalX, nextY = enemy.y + fm.finalY;
            let collision = false;
            for (const obs of destructibles) {
                const dx = nextX - obs.x, dy = nextY - obs.y;
                if (dx*dx + dy*dy < ((enemy.size/2)+(obs.size/2))**2) { collision = true; break; }
            }
            if (!collision) { enemy.x = nextX; enemy.y = nextY; }
        }
        const canGhostDamage = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);
        const cr = (player.size/2) + (enemy.size/2) - 5.6;
        const dxp = player.x - enemy.x, dyp = player.y - enemy.y;
        if (canGhostDamage && !player.isInvincible && !cheats.god_mode && dxp*dxp+dyp*dyp < cr*cr) {
            player.lives--; runStats.lastDamageTime = now;
            createBloodSplatter(player.x, player.y); createBloodPuddle(player.x, player.y, player.size);
            vibrate(50); playSound('playerScream');
            isPlayerHitShaking = true; playerHitShakeStartTime = now;
            if (vengeanceNovaActive) vengeanceNovas.push({ x: player.x, y: player.y, startTime: now, duration: 500, maxRadius: player.size*3 });
            if (temporalWardActive) { isTimeStopped = true; timeStopEndTime = now + 2000; playSound('levelUpSelect'); }
            if (player.lives <= 0) endGame();
            handleEnemyDeath(enemy);
        }
    });

    // ---- Doppelganger AI ----
    if (doppelganger) {
        if (now > doppelganger.endTime) { doppelganger = null; doppelgangerActive = false; runStats.lastDoppelgangerStartTime = 0; updatePowerupIconsUI(); }
        else {
            let closest = null, minDSq = Infinity;
            enemies.forEach(e => { if (!e.isHit) { const d = (doppelganger.x-e.x)**2+(doppelganger.y-e.y)**2; if (d < minDSq) { minDSq = d; closest = e; } } });
            if (closest) {
                doppelganger.rotationAngle = Math.atan2(closest.y - doppelganger.y, closest.x - doppelganger.x);
                if (now - doppelganger.lastFireTime > DOPPELGANGER_FIRE_INTERVAL) { createWeapon(doppelganger, doppelganger.rotationAngle); doppelganger.lastFireTime = now; }
            }
        }
    }

    // ---- Dog companion ----
    if (dogCompanionActive && !isTimeStopped) {
        const DOG_SPEED = baseEnemySpeed * SKULL_SPEED_MULTIPLIER;
        if (dog.state === 'returning') {
            const dx = player.x - dog.x, dy = player.y - dog.y;
            if (dx*dx + dy*dy < (player.size/2)**2) { dog.state = 'seeking'; dog.target = null; }
            else { const a = Math.atan2(dy, dx); dog.x += Math.cos(a)*DOG_SPEED; dog.y += Math.sin(a)*DOG_SPEED; }
        } else if (dog.state === 'seeking') {
            if (dog.target && dog.target.isHit) dog.target = null;
            if (!dog.target) {
                let closest = null, minDSq = Infinity;
                enemies.forEach(e => { if (!e.isHit && !e.isBoss) { const d = (dog.x-e.x)**2+(dog.y-e.y)**2; if (d < minDSq) { minDSq = d; closest = e; } } });
                dog.target = closest;
            }
            if (dog.target) {
                const dx = dog.target.x - dog.x, dy = dog.target.y - dog.y;
                const cr = (dog.size/2) + (dog.target.size/2);
                if (dx*dx + dy*dy < cr*cr) { handleEnemyDeath(dog.target); dog.target = null; dog.state = 'returning'; }
                else { const a = Math.atan2(dy, dx); dog.x += Math.cos(a)*DOG_SPEED; dog.y += Math.sin(a)*DOG_SPEED; }
            } else dog.state = 'returning';
        }
        if (magneticProjectileActive && dog.target && now - dog.lastHomingShotTime > DOG_HOMING_SHOT_INTERVAL) {
            const a = Math.atan2(dog.target.y - dog.y, dog.target.x - dog.x);
            dogHomingShots.push({ x: dog.x, y: dog.y, size: 15, speed: 5.04, dx: Math.cos(a)*5.04, dy: Math.sin(a)*5.04, angle: a, isHit: false, lifetime: now+2000, isHoming: true });
            dog.lastHomingShotTime = now; playSound('playerShoot');
        }
    }

    // ---- Pickup collection ----
    for (let i = pickupItems.length - 1; i >= 0; i--) {
        const item = pickupItems[i];
        const dx = player.x - item.x, dy = player.y - item.y;
        const distSq = dx*dx + dy*dy;
        if (distSq < player.magnetRadius*player.magnetRadius) { const a = Math.atan2(dy,dx); item.x += Math.cos(a)*MAGNET_STRENGTH; item.y += Math.sin(a)*MAGNET_STRENGTH; }
        let collected = distSq < ((player.size/2)+(item.size/2))**2;
        if (!collected && player2 && player2.active) { const dx2=player2.x-item.x, dy2=player2.y-item.y; collected = (dx2*dx2+dy2*dy2) < ((player2.size/2)+(item.size/2))**2; }
        if (collected) {
            if (item.type === 'box') {
                vibrate(20); player.boxPickupsCollectedCount++; playerStats.totalBoxesOpened = (playerStats.totalBoxesOpened||0)+1;
                const choices = [];
                if (vShapeProjectileLevel < 4 && !shotgunBlastActive) choices.push(ALWAYS_AVAILABLE_PICKUPS.v_shape_projectile);
                if (!magneticProjectileActive)  choices.push(ALWAYS_AVAILABLE_PICKUPS.magnetic_projectile);
                if (!iceProjectileActive)        choices.push(ALWAYS_AVAILABLE_PICKUPS.ice_projectile);
                if (!ricochetActive)             choices.push(ALWAYS_AVAILABLE_PICKUPS.ricochet);
                if (!explosiveBulletsActive)     choices.push(ALWAYS_AVAILABLE_PICKUPS.explosive_bullets);
                if (!puddleTrailActive)          choices.push(ALWAYS_AVAILABLE_PICKUPS.puddle_trail);
                if (!player.swordActive)         choices.push(ALWAYS_AVAILABLE_PICKUPS.sword);
                if (!laserPointerActive)         choices.push(ALWAYS_AVAILABLE_PICKUPS.laser_pointer);
                if (!autoAimActive)              choices.push(ALWAYS_AVAILABLE_PICKUPS.auto_aim);
                if (!dualGunActive)              choices.push(ALWAYS_AVAILABLE_PICKUPS.dual_gun);
                if (!bombEmitterActive)          choices.push(ALWAYS_AVAILABLE_PICKUPS.bomb);
                if (!orbitingPowerUpActive)      choices.push(ALWAYS_AVAILABLE_PICKUPS.orbiter);
                if (!lightningProjectileActive)  choices.push(ALWAYS_AVAILABLE_PICKUPS.lightning_projectile);
                if (!bugSwarmActive)             choices.push({id:'bug_swarm', name:'Bug Swarm'});
                if (!lightningStrikeActive)      choices.push({id:'lightning_strike', name:'Lightning Strike'});
                if (!hasDashInvincibility)       choices.push({id:'dash_invincibility', name:'Dash Invincibility'});
                if (!playerData.hasReducedDashCooldown) choices.push({id:'dash_cooldown', name:'Dash Cooldown'});
                const ul = playerData.unlockedPickups;
                if (ul.doppelganger   && !doppelgangerActive)   choices.push({id:'doppelganger',     name:'Doppelganger'});
                if (ul.temporal_ward  && !temporalWardActive)   choices.push({id:'temporal_ward',     name:'Temporal Ward'});
                if (ul.circle         && !damagingCircleActive)  choices.push({id:'circle',            name:'Damaging Circle'});
                if (ul.vengeance_nova && !vengeanceNovaActive)   choices.push({id:'vengeance_nova',   name:'Vengeance Nova'});
                if (ul.dog_companion  && !dogCompanionActive)    choices.push({id:'dog_companion',    name:'Dog Companion'});
                if (ul.anti_gravity   && !antiGravityActive)     choices.push({id:'anti_gravity',     name:'Anti-Gravity'});
                if (ul.rocket_launcher && !rocketLauncherActive && !shotgunBlastActive) choices.push({id:'rocket_launcher', name:'Heavy Shells'});
                if (ul.black_hole     && !blackHoleActive)       choices.push({id:'black_hole',       name:'Black Hole'});
                if (ul.flaming_bullets && !flamingBulletsActive) choices.push({id:'flaming_bullets',  name:'Flaming Bullets'});
                if (ul.night_owl      && !nightOwlActive)        choices.push({id:'night_owl',        name:'Night Owl'});
                if (ul.whirlwind_axe  && !whirlwindAxeActive)   choices.push({id:'whirlwind_axe',    name:'Whirlwind Axe'});
                if (choices.length > 0) {
                    const pick = choices[Math.floor(Math.random()*choices.length)];
                    activatePowerup(pick.id);
                    playSound('boxPickup');
                    floatingTexts.push({ text: pick.name+'!', x: player.x, y: player.y-player.size, startTime: now, duration: 1500 });
                    updatePowerupIconsUI();
                }
                pickupItems.splice(i,1); continue;
            }
            player.xp += item.xpValue * (cheats.xp_boost ? 2 : 1);
            runStats.xpCollectedThisRun = (runStats.xpCollectedThisRun||0) + item.xpValue;
            score += item.xpValue * 7; vibrate(10); pickupItems.splice(i,1); playSound('xpPickup');
            if (player.xp >= player.xpToNextLevel) levelUp();
        }
    }

    // Apple collection
    for (let i = appleItems.length - 1; i >= 0; i--) {
        const apple = appleItems[i];
        if (now - apple.spawnTime > apple.lifetime) { appleItems.splice(i,1); continue; }
        const dx = player.x - apple.x, dy = player.y - apple.y;
        const distSq = dx*dx + dy*dy;
        if (distSq < player.magnetRadius*player.magnetRadius) { const a = Math.atan2(dy,dx); apple.x += Math.cos(a)*MAGNET_STRENGTH; apple.y += Math.sin(a)*MAGNET_STRENGTH; }
        let collected = distSq < ((player.size/2)+(apple.size/2))**2;
        if (!collected && player2 && player2.active) { const dx2=player2.x-apple.x, dy2=player2.y-apple.y; collected=(dx2*dx2+dy2*dy2)<((player2.size/2)+(apple.size/2))**2; }
        if (collected) {
            vibrate(20); player.appleCount++; runStats.applesEatenThisRun = (runStats.applesEatenThisRun||0)+1; playerStats.totalApplesEaten = (playerStats.totalApplesEaten||0)+1;
            if (player.appleCount >= 5) { player.maxLives++; player.appleCount = 0; vibrate(50); playSound('levelUpSelect'); floatingTexts.push({ text:'Max Life +1!', x:player.x, y:player.y-player.size, startTime:now, duration:1500 }); }
            player.lives = player.maxLives; fireRateBoostActive = true; fireRateBoostEndTime = now + FIRE_RATE_BOOST_DURATION;
            playSound('xpPickup'); updateUIStats(); appleItems.splice(i,1);
        }
    }

    // ---- Auto-fire ----
    let currentFireInterval = weaponFireInterval;
    if (fireRateBoostActive) currentFireInterval /= 2;
    if (cheats.fastShooting)     currentFireInterval /= 5;
    if (cheats.double_game_speed) currentFireInterval /= 2;
    currentFireInterval = Math.max(50, currentFireInterval);
    if (!cheats.no_gun_mode && (aimDx !== 0 || aimDy !== 0) && (now - lastWeaponFireTime > currentFireInterval)) {
        createWeapon(); lastWeaponFireTime = now;
    }

    // ---- Bullet movement and obstacle hit ----
    for (const weapon of weaponPool) {
        if (!weapon.active) continue;
        if (magneticProjectileActive && enemies.length > 0) {
            let closest = null, minDSq = Infinity;
            enemies.forEach(e => { if (!e.isHit && !(e.isFrozen && now < e.freezeEndTime)) { const d=(weapon.x-e.x)**2+(weapon.y-e.y)**2; if (d<minDSq) { minDSq=d; closest=e; } } });
            if (closest) {
                const ta = Math.atan2(closest.y-weapon.y, closest.x-weapon.x);
                let diff = ta - weapon.angle;
                if (diff > Math.PI) diff -= 2*Math.PI; if (diff < -Math.PI) diff += 2*Math.PI;
                weapon.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.02);
                weapon.dx = Math.cos(weapon.angle)*weapon.speed; weapon.dy = Math.sin(weapon.angle)*weapon.speed;
            }
        }
        weapon.x += weapon.dx; weapon.y += weapon.dy;
        if (now > weapon.lifetime) { weapon.active = false; continue; }
        for (let j = destructibles.length - 1; j >= 0; j--) {
            const obs = destructibles[j];
            const dx = weapon.x - obs.x, dy = weapon.y - obs.y;
            if (dx*dx+dy*dy < ((weapon.size/2)+(obs.size/2))**2) {
                weapon.active = false;
                if (obs.health !== Infinity) obs.health--;
                if (obs.health <= 0) { handleBarrelDestruction(obs); destructibles.splice(j,1); }
                break;
            }
        }
    }

    // ---- Bullet-enemy collision (via quadtree) ----
    for (const weapon of weaponPool) {
        if (!weapon.active) continue;
        const nearby = quadtree.retrieve({ x: weapon.x-weapon.size/2, y: weapon.y-weapon.size/2, width: weapon.size, height: weapon.size });
        for (const to of nearby) {
            const enemy = to.ref;
            if (!enemy || !enemy.health || enemy.isHit) continue;
            const canHit = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);
            if (canHit && !weapon.hitEnemies.includes(enemy)) {
                const dx = weapon.x - enemy.x, dy = weapon.y - enemy.y;
                if (dx*dx+dy*dy < ((weapon.size/2)+(enemy.size/2))**2) {
                    let dmg = player.damageMultiplier;
                    if (rocketLauncherActive) dmg *= 2;
                    if (cheats.one_hit_kill)  dmg = Infinity;
                    enemy.health -= dmg; createBloodSplatter(enemy.x, enemy.y); weapon.hitEnemies.push(enemy);
                    if (explosiveBulletsActive) {
                        const eid = Math.random();
                        explosions.push({ x: weapon.x, y: weapon.y, radius: enemy.size*2, startTime: Date.now(), duration: 300 });
                        enemies.forEach(oe => { if (oe !== enemy && !oe.isHit) { const d=(oe.x-weapon.x)**2+(oe.y-weapon.y)**2; if (d<(enemy.size*2+oe.size/2)**2) { oe.health -= player.damageMultiplier; createBloodSplatter(oe.x,oe.y); if (oe.health<=0) handleEnemyDeath(oe,eid); } } });
                    }
                    if (player.knockbackStrength > 0 && !enemy.isBoss) { const nd=weapon.speed; enemy.x += (weapon.dx/nd)*50*player.knockbackStrength; enemy.y += (weapon.dy/nd)*50*player.knockbackStrength; }
                    if (iceProjectileActive) { enemy.isFrozen = true; enemy.freezeEndTime = Date.now()+250; }
                    if (flamingBulletsActive) { enemy.isIgnited = true; enemy.ignitionEndTime = Date.now()+6000; enemy.lastIgnitionDamageTime = Date.now(); }
                    if (enemy.health <= 0) handleEnemyDeath(enemy);
                    weapon.hitsLeft--;
                    if (weapon.hitsLeft > 0 && ricochetActive && !rocketLauncherActive) {
                        let nt = null, minDSq = Infinity;
                        enemies.forEach(oe => { if (!weapon.hitEnemies.includes(oe) && !oe.isHit) { const d=(weapon.x-oe.x)**2+(weapon.y-oe.y)**2; if (d<minDSq) { minDSq=d; nt=oe; } } });
                        if (nt) { const a = Math.atan2(nt.y-weapon.y, nt.x-weapon.x); weapon.angle=a; weapon.dx=Math.cos(a)*weapon.speed; weapon.dy=Math.sin(a)*weapon.speed; }
                        else weapon.active = false;
                    } else { weapon.active = false; }
                    if (!weapon.active) break;
                }
            }
        }
    }

    // ---- Special weapon systems ----
    if (bombEmitterActive && now - lastBombEmitMs >= BOMB_INTERVAL_MS) { bombs.push({ x: player.x, y: player.y, size: BOMB_SIZE, spawnTime: now }); lastBombEmitMs = now; }
    for (let b = bombs.length-1; b >= 0; b--) {
        const bomb = bombs[b];
        if (now - bomb.spawnTime > BOMB_LIFETIME_MS) { bombs.splice(b,1); continue; }
        for (let e = enemies.length-1; e >= 0; e--) {
            const enemy = enemies[e];
            const dx = enemy.x-bomb.x, dy = enemy.y-bomb.y;
            if (dx*dx+dy*dy < ((enemy.size/2)+(bomb.size/2))**2) { explosions.push({ x: bomb.x, y: bomb.y, radius: bomb.size*2, startTime: now, duration: 300 }); handleEnemyDeath(enemy); playBombExplosionSound(); bombs.splice(b,1); break; }
        }
    }
    if (orbitingPowerUpActive) {
        player.orbitAngle = (player.orbitAngle + ORBIT_SPEED) % (Math.PI*2);
        const ox = player.x + ORBIT_RADIUS*Math.cos(player.orbitAngle), oy = player.y + ORBIT_RADIUS*Math.sin(player.orbitAngle);
        for (let i = enemies.length-1; i >= 0; i--) { const e=enemies[i]; const dx=ox-e.x, dy=oy-e.y; if (dx*dx+dy*dy<((ORBIT_POWER_UP_SIZE/2)+(e.size/2))**2) { if (!e.isHit && !e.isHitByOrbiter) { e.health-=player.damageMultiplier; createBloodSplatter(e.x,e.y); e.isHitByOrbiter=true; if (e.health<=0) handleEnemyDeath(e); } } else { e.isHitByOrbiter=false; } }
        for (let i = eyeProjectiles.length-1; i >= 0; i--) { const ep=eyeProjectiles[i]; const dx=ox-ep.x, dy=oy-ep.y; if (!ep.isHit && dx*dx+dy*dy<((ORBIT_POWER_UP_SIZE/2)+(ep.size/2))**2) ep.isHit=true; }
    }
    if (whirlwindAxeActive) {
        whirlwindAxeAngle -= WHIRLWIND_AXE_SPEED;
        const ax = player.x + WHIRLWIND_AXE_RADIUS*Math.cos(whirlwindAxeAngle), ay = player.y + WHIRLWIND_AXE_RADIUS*Math.sin(whirlwindAxeAngle);
        for (let i = enemies.length-1; i >= 0; i--) { const e=enemies[i]; const dx=ax-e.x, dy=ay-e.y; if (dx*dx+dy*dy<((WHIRLWIND_AXE_SIZE/2)+(e.size/2))**2) { if (!e.isHit && !e.isHitByAxe) { e.health-=1; createBloodSplatter(e.x,e.y); e.isHitByAxe=true; if (e.health<=0) handleEnemyDeath(e); } } else { e.isHitByAxe=false; } }
    }
    if (damagingCircleActive && now - lastDamagingCircleDamageTime > DAMAGING_CIRCLE_DAMAGE_INTERVAL) {
        const rSq = DAMAGING_CIRCLE_RADIUS**2;
        for (let i = enemies.length-1; i >= 0; i--) { const e=enemies[i]; const dx=player.x-e.x, dy=player.y-e.y; if (!e.isHit && (dx*dx+dy*dy) < rSq+(e.size/2)**2) { if (!e.isHitByCircle) { e.health-=player.damageMultiplier; createBloodSplatter(e.x,e.y); e.isHitByCircle=true; if (e.health<=0) handleEnemyDeath(e); } } else { e.isHitByCircle=false; } }
        lastDamagingCircleDamageTime = now;
    }
    if (lightningProjectileActive && now - lastLightningSpawnTime > LIGHTNING_SPAWN_INTERVAL) {
        let closest = null, minDSq = Infinity;
        enemies.forEach(e => { if (!e.isHit && !(e.isFrozen && now<e.freezeEndTime)) { const d=(player.x-e.x)**2+(player.y-e.y)**2; if (d<minDSq) { minDSq=d; closest=e; } } });
        if (closest) { const a=Math.atan2(closest.y-player.y, closest.x-player.x); lightningBolts.push({ x:player.x, y:player.y, size:LIGHTNING_SIZE, emoji:LIGHTNING_EMOJI, speed:5.6, dx:Math.cos(a)*5.6, dy:Math.sin(a)*5.6, angle:a, isHit:false, lifetime:now+2000 }); playSound('playerShoot'); }
        lastLightningSpawnTime = now;
    }
    for (let i = lightningBolts.length-1; i >= 0; i--) {
        const bolt = lightningBolts[i]; bolt.x += bolt.dx; bolt.y += bolt.dy;
        if (now > bolt.lifetime) { bolt.isHit = true; continue; }
        for (let j = enemies.length-1; j >= 0; j--) { const e=enemies[j]; const dx=bolt.x-e.x, dy=bolt.y-e.y; if (!e.isHit && !bolt.isHit && dx*dx+dy*dy<((bolt.size/2)+(e.size/2))**2) { e.health-=player.damageMultiplier; bolt.isHit=true; createBloodSplatter(e.x,e.y); if (e.health<=0) handleEnemyDeath(e); break; } }
    }
    lightningBolts = lightningBolts.filter(b => !b.isHit);

    if (player.swordActive && now - player.lastSwordSwingTime > SWORD_SWING_INTERVAL) {
        let swordAngle = (aimDx!==0||aimDy!==0) ? Math.atan2(aimDy,aimDx) : (() => { let cl=null, minD=Infinity; enemies.forEach(e => { if (!e.isHit) { const d=(player.x-e.x)**2+(player.y-e.y)**2; if (d<minD) { minD=d; cl=e; } } }); return cl ? Math.atan2(cl.y-player.y,cl.x-player.x) : -Math.PI/2; })();
        player.currentSwordSwing = { x:player.x, y:player.y, angle:swordAngle, activeUntil:now+SWORD_SWING_DURATION, startTime:now };
        playSwordSwingSound();
        const swordRSq = (player.size + SWORD_THRUST_DISTANCE)**2;
        for (let i = enemies.length-1; i >= 0; i--) { const e=enemies[i]; const dx=player.x-e.x, dy=player.y-e.y; if (dx*dx+dy*dy < swordRSq+(e.size/2)**2 && !e.isHit) { e.health-=player.damageMultiplier; createBloodSplatter(e.x,e.y); if (e.health<=0) handleEnemyDeath(e); } }
        player.lastSwordSwingTime = now;
    }
    if (player.currentSwordSwing && now > player.currentSwordSwing.activeUntil) player.currentSwordSwing = null;

    // Eye projectile movement + player hit
    for (let i = eyeProjectiles.length-1; i >= 0; i--) {
        const ep = eyeProjectiles[i]; ep.x += ep.dx; ep.y += ep.dy;
        if (now > ep.lifetime) { ep.isHit=true; continue; }
        const dx=player.x-ep.x, dy=player.y-ep.y;
        if (!player.isInvincible && dx*dx+dy*dy < ((player.size/2)+(ep.size/2))**2 && !ep.isHit) {
            player.lives--; runStats.lastDamageTime=now; createBloodSplatter(player.x,player.y); createBloodPuddle(player.x,player.y,player.size);
            playSound('playerScream'); playEyeProjectileHitSound(); updateUIStats(); ep.isHit=true;
            isPlayerHitShaking=true; playerHitShakeStartTime=now;
            if (player.lives <= 0) endGame();
        }
    }

    if (puddleTrailActive && now - lastPlayerPuddleSpawnTime > PLAYER_PUDDLE_SPAWN_INTERVAL) { playerPuddles.push({ x:player.x, y:player.y, size:PLAYER_PUDDLE_SIZE, spawnTime:now, lifetime:PLAYER_PUDDLE_LIFETIME }); lastPlayerPuddleSpawnTime=now; }
    if (antiGravityActive && !isTimeStopped && now - lastAntiGravityPushTime > ANTI_GRAVITY_INTERVAL) {
        antiGravityPulses.push({ x:player.x, y:player.y, spawnTime:now, duration:500 });
        enemies.forEach(e => { if (!e.isBoss) { const d=Math.hypot(player.x-e.x, player.y-e.y); if (d<ANTI_GRAVITY_RADIUS && d>0) { const a=Math.atan2(e.y-player.y, e.x-player.x); e.x+=Math.cos(a)*ANTI_GRAVITY_STRENGTH; e.y+=Math.sin(a)*ANTI_GRAVITY_STRENGTH; } } });
        lastAntiGravityPushTime=now;
    }
    if (blackHoleActive && !isTimeStopped && now - lastBlackHoleTime > BLACK_HOLE_INTERVAL) { blackHoles.push({ x:player.x, y:player.y, spawnTime:now, lifetime:BLACK_HOLE_DELAY+BLACK_HOLE_PULL_DURATION, radius:BLACK_HOLE_RADIUS, pullStrength:BLACK_HOLE_PULL_STRENGTH }); lastBlackHoleTime=now; }
    for (let i = blackHoles.length-1; i >= 0; i--) {
        const hole = blackHoles[i];
        if (now - hole.spawnTime > hole.lifetime) { blackHoles.splice(i,1); continue; }
        if (now - hole.spawnTime > BLACK_HOLE_DELAY) { enemies.forEach(e => { if (!e.isBoss) { const d=Math.hypot(e.x-hole.x, e.y-hole.y); if (d<hole.radius&&d>0) { const a=Math.atan2(hole.y-e.y, hole.x-e.x); const pf=hole.pullStrength*(1-d/hole.radius); e.x+=Math.cos(a)*pf; e.y+=Math.sin(a)*pf; } } }); }
    }

    // Puddle cleanup
    for (let i=playerPuddles.length-1; i>=0; i--)   { if (now-playerPuddles[i].spawnTime   > playerPuddles[i].lifetime)   playerPuddles.splice(i,1); }
    for (let i=snailPuddles.length-1; i>=0; i--)    { if (now-snailPuddles[i].spawnTime    > snailPuddles[i].lifetime)    snailPuddles.splice(i,1); }
    for (let i=mosquitoPuddles.length-1; i>=0; i--) { if (now-mosquitoPuddles[i].spawnTime > mosquitoPuddles[i].lifetime) mosquitoPuddles.splice(i,1); }
    for (let i=bloodSplatters.length-1; i>=0; i--)  { const p=bloodSplatters[i]; if (now-p.spawnTime>p.lifetime) { bloodSplatters.splice(i,1); continue; } p.x+=p.dx; p.y+=p.dy; p.dx*=0.96; p.dy*=0.96; }
    for (let i=bloodPuddles.length-1; i>=0; i--)    { if (now-bloodPuddles[i].spawnTime > bloodPuddles[i].lifetime) bloodPuddles.splice(i,1); }

    // Dog homing shots
    dogHomingShots.forEach(shot => {
        if (shot.isHoming && enemies.length > 0) {
            let cl=null, minDSq=Infinity;
            enemies.forEach(e => { if (!e.isHit) { const d=(shot.x-e.x)**2+(shot.y-e.y)**2; if (d<minDSq) { minDSq=d; cl=e; } } });
            if (cl) { const ta=Math.atan2(cl.y-shot.y, cl.x-shot.x); let diff=ta-shot.angle; if (diff>Math.PI) diff-=2*Math.PI; if (diff<-Math.PI) diff+=2*Math.PI; shot.angle+=Math.sign(diff)*Math.min(Math.abs(diff),0.04); shot.dx=Math.cos(shot.angle)*shot.speed; shot.dy=Math.sin(shot.angle)*shot.speed; }
        }
        shot.x+=shot.dx; shot.y+=shot.dy; if (now>shot.lifetime) shot.isHit=true;
    });
    for (let i=enemies.length-1; i>=0; i--) { const e=enemies[i]; if (!e.isHit) { for (let j=dogHomingShots.length-1; j>=0; j--) { const s=dogHomingShots[j]; const dx=s.x-e.x, dy=s.y-e.y; if (!s.isHit && dx*dx+dy*dy<((s.size/2)+(e.size/2))**2) { e.health-=1; createBloodSplatter(e.x,e.y); if (e.health<=0) handleEnemyDeath(e); s.isHit=true; } } } }

    // Flame areas
    for (let i=flameAreas.length-1; i>=0; i--) { const a=flameAreas[i]; if (now>a.endTime) { flameAreas.splice(i,1); continue; } enemies.forEach(e => { const dx=e.x-a.x, dy=e.y-a.y; if (!e.isHit && dx*dx+dy*dy<a.radius*a.radius) { if (!e.isIgnited||now>e.ignitionEndTime) { e.isIgnited=true; e.ignitionEndTime=now+6000; e.lastIgnitionDamageTime=now; } } }); }
    // Flies
    for (let i=flies.length-1; i>=0; i--) { const fly=flies[i]; if (fly.isHit || enemies.length===0) { flies.splice(i,1); continue; } let cl=null, minDSq=Infinity; enemies.forEach(e => { if (!e.isHit) { const d=(fly.x-e.x)**2+(fly.y-e.y)**2; if (d<minDSq) { minDSq=d; cl=e; } } }); fly.target=cl; if (fly.target) { const a=Math.atan2(fly.target.y-fly.y, fly.target.x-fly.x); fly.x+=Math.cos(a)*FLY_SPEED; fly.y+=Math.sin(a)*FLY_SPEED; const dx=fly.x-fly.target.x, dy=fly.y-fly.target.y; if (dx*dx+dy*dy<((FLY_SIZE/2)+(fly.target.size/2))**2) { fly.target.health-=FLY_DAMAGE; createBloodSplatter(fly.target.x,fly.target.y); if (fly.target.health<=0) handleEnemyDeath(fly.target); fly.isHit=true; } } }
    // Owl projectiles
    for (let i=owlProjectiles.length-1; i>=0; i--) { const p=owlProjectiles[i]; p.x+=p.dx; p.y+=p.dy; if (now>p.lifetime) { p.isHit=true; continue; } for (let j=enemies.length-1; j>=0; j--) { const e=enemies[j]; const dx=p.x-e.x, dy=p.y-e.y; if (!e.isHit && !p.isHit && dx*dx+dy*dy<((p.size/2)+(e.size/2))**2) { e.health-=player.damageMultiplier; p.isHit=true; createBloodSplatter(e.x,e.y); if (e.health<=0) handleEnemyDeath(e); break; } } }
    // Smoke particles
    for (let i=smokeParticles.length-1; i>=0; i--) { const p=smokeParticles[i]; p.x+=p.dx; p.y+=p.dy; p.alpha-=0.02; if (p.alpha<=0) smokeParticles.splice(i,1); }
    // Vengeance novas
    vengeanceNovas.forEach(nova => { const age=now-nova.startTime; if (age<nova.duration) { const cr=nova.maxRadius*(age/nova.duration); for (let i=enemies.length-1; i>=0; i--) { const e=enemies[i]; const dx=nova.x-e.x, dy=nova.y-e.y; if (!e.isHit && dx*dx+dy*dy<cr*cr) handleEnemyDeath(e); } } });

    // Cleanup
    antiGravityPulses = antiGravityPulses.filter(p => now-p.spawnTime < p.duration);
    explosions        = explosions.filter(exp => now-exp.startTime < exp.duration);
    vengeanceNovas    = vengeanceNovas.filter(n => now-n.startTime < n.duration);
    floatingTexts     = floatingTexts.filter(ft => now-ft.startTime < ft.duration);
    enemies           = enemies.filter(e => !e.isHit);
    eyeProjectiles    = eyeProjectiles.filter(p => !p.isHit);
    dogHomingShots    = dogHomingShots.filter(s => !s.isHit);
    owlProjectiles    = owlProjectiles.filter(p => !p.isHit);
    lightningStrikes  = lightningStrikes.filter(ls => now-ls.startTime < ls.duration);
}
