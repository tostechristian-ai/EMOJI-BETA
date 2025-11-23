// game.js - Main Game Loop and Logic
import { 
    gameState, player, playerStats, playerData, 
    entities, WORLD_WIDTH, WORLD_HEIGHT, ASSETS, 
    ENEMY_CONFIGS, CONSTANTS, CHARACTERS 
} from './data.js';

import { 
    setupInput, updateGamepad, inputs, 
    loadAssets, audio, playSound, vibrate, 
    preRenderEmoji, Quadtree 
} from './systems.js';

import { 
    setupUI, updateHUD, showUpgradeMenu, showGameOverScreen, 
    saveGameData 
} from './ui.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let quadtree;

// === INITIALIZATION ===
function init() {
    loadAssets(() => {
        // Pre-render common emojis for performance
        ['💀', '🦴', '🧟', '🧛‍♀️', '🔸', '🔹'].forEach(e => preRenderEmoji(e, 30));
        
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
        
        // Start Button Listener
        document.getElementById('startButton').addEventListener('click', () => {
            // Initialize Audio Context on user gesture
            if (Tone.context.state !== 'running') Tone.start();
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('difficultyContainer').style.display = 'block';
            audio.players['mainMenu'].start();
        });

        setupInput(triggerDash); // Pass dash function to input system
        setupUI(startGame);      // Pass start function to UI system
    });
}

// === GAME START ===
function startGame() {
    // Reset State
    gameState.gameActive = true;
    gameState.gameOver = false;
    gameState.gamePaused = false;
    gameState.score = 0;
    gameState.startTime = Date.now();
    gameState.lastFrameTime = Date.now();
    gameState.enemiesDefeated = 0;
    
    // Reset Entities
    entities.enemies = [];
    entities.projectiles = [];
    entities.pickups = [];
    entities.visualEffects = [];
    
    // Reset Player
    player.lives = player.maxLives;
    player.xp = 0;
    player.level = 1;
    player.isSkullCharacter = (gameState.equippedCharacterID === 'skull');
    player.dashCooldown = playerData.hasReducedDashCooldown ? 3000 : 6000;
    
    // Apply Permanent Upgrades
    player.damageMultiplier = 1 + (playerData.upgrades.playerDamage || 0) * 0.02;
    player.speed = CONSTANTS.PLAYER_BASE_SPEED * (1 + (playerData.upgrades.playerSpeed || 0) * 0.015);
    
    // Stop Menu Music, Start Game Loop
    audio.players['mainMenu'].stop();
    requestAnimationFrame(gameLoop);
}

// === MAIN LOOP ===
function gameLoop() {
    if (!gameState.gameActive) return;
    
    const now = Date.now();
    const dt = now - gameState.lastFrameTime;
    gameState.lastFrameTime = now;
    
    if (!gameState.gamePaused) {
        update(now, dt);
        draw();
    }
    
    updateHUD();
    updateGamepad(triggerDash, () => gameState.gamePaused = !gameState.gamePaused);
    
    if (!gameState.gameOver) requestAnimationFrame(gameLoop);
}

// === UPDATE LOGIC ===
function update(now, dt) {
    // 1. Spawning Logic
    const enemyCap = 100;
    if (entities.enemies.length < enemyCap && Math.random() < 0.02) {
        spawnEnemy();
    }
    
    // 2. Player Movement
    let dx = inputs.moveX;
    let dy = inputs.moveY;
    
    // Apply Speed
    const currentSpeed = player.speed * (player.isDashing ? 3.0 : 1.0);
    player.x += dx * currentSpeed;
    player.y += dy * currentSpeed;
    
    // Bounds Check
    player.x = Math.max(player.size/2, Math.min(WORLD_WIDTH - player.size/2, player.x));
    player.y = Math.max(player.size/2, Math.min(WORLD_HEIGHT - player.size/2, player.y));
    
    // Dash State
    if (player.isDashing && now - player.lastDashTime > 300) {
        player.isDashing = false;
        player.isInvincible = false;
    }

    // 3. Firing Logic
    // If aiming stick is active or auto-fire is needed
    const isAiming = inputs.aimX !== 0 || inputs.aimY !== 0;
    const fireRate = Math.max(100, 400 * (1 - player.upgradeLevels.fireRate * 0.08));
    
    if (isAiming && now - inputs.lastFireTime > fireRate) {
        createWeapon(Math.atan2(inputs.aimY, inputs.aimX));
        inputs.lastFireTime = now;
    } else if (!isAiming && now - inputs.lastFireTime > fireRate) {
        // Auto-fire at nearest
        const nearest = getNearestEnemy();
        if (nearest) {
            const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
            createWeapon(angle);
            inputs.lastFireTime = now;
        }
    }

    // 4. Update Projectiles
    for (let i = entities.projectiles.length - 1; i >= 0; i--) {
        const p = entities.projectiles[i];
        p.x += p.dx;
        p.y += p.dy;
        if (now - p.spawnTime > p.lifetime) entities.projectiles.splice(i, 1);
    }

    // 5. Update Enemies & Collision (Quadtree)
    quadtree = new Quadtree({ x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT });
    entities.enemies.forEach(e => quadtree.insert({ x: e.x, y: e.y, width: e.size, height: e.size, ref: e }));

    entities.enemies.forEach(enemy => {
        // Move towards player
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;
        
        // Player Collision
        const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distToPlayer < (player.size/2 + enemy.size/2) && !player.isInvincible && !player.isDashing) {
            player.lives--;
            vibrate(100);
            playSound('playerScream');
            player.isInvincible = true;
            setTimeout(() => player.isInvincible = false, 1000);
            if (player.lives <= 0) endGame();
        }
    });

    // Projectile vs Enemy Collision
    entities.projectiles.forEach(proj => {
        if (!proj.active) return;
        const targets = quadtree.retrieve({ x: proj.x, y: proj.y, width: proj.size, height: proj.size });
        
        for (let t of targets) {
            const enemy = t.ref;
            const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (dist < (proj.size/2 + enemy.size/2)) {
                enemy.health -= proj.damage;
                proj.active = false; // Destroy bullet
                if (enemy.health <= 0) handleEnemyDeath(enemy);
                break; // One bullet hits one enemy (unless penetrating)
            }
        }
    });
    
    // Cleanup Dead Enemies/Projectiles
    entities.enemies = entities.enemies.filter(e => e.health > 0);
    entities.projectiles = entities.projectiles.filter(p => p.active);
}

// === DRAWING ===
function draw() {
    // Camera Logic
    const camX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width/2));
    const camY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, player.y - canvas.height/2));
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camX, -camY);
    
    // Draw Background
    // (In a real implementation, tile the background or draw image)
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Draw Pickups
    ctx.fillStyle = 'gold';
    entities.pickups.forEach(p => {
        ctx.font = '20px sans-serif';
        ctx.fillText('🔸', p.x, p.y);
    });

    // Draw Enemies
    entities.enemies.forEach(e => {
        ctx.font = `${e.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Flip sprite if moving left
        ctx.fillText(e.emoji, e.x, e.y);
    });

    // Draw Projectiles
    entities.projectiles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
    });

    // Draw Player
    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.isDashing) ctx.rotate(Date.now() / 100); // Spin on dash
    const charData = CHARACTERS[gameState.equippedCharacterID] || CHARACTERS['cowboy'];
    ctx.font = `${player.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charData.emoji, 0, 0);
    
    // Draw Dash Cooldown Bar
    const dashCharge = Math.min(1, (Date.now() - player.lastDashTime) / player.dashCooldown);
    if (dashCharge < 1) {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(-15, 20, 30 * dashCharge, 3);
    }
    ctx.restore();

    ctx.restore();
}

// === GAMEPLAY HELPERS ===

function spawnEnemy() {
    // Simple edge spawn logic
    const angle = Math.random() * Math.PI * 2;
    const r = Math.hypot(WORLD_WIDTH, WORLD_HEIGHT) / 2; // Spawn far out
    const x = player.x + Math.cos(angle) * 600; 
    const y = player.y + Math.sin(angle) * 600;
    
    // Clamp to world (simplified)
    const bx = Math.max(20, Math.min(WORLD_WIDTH-20, x));
    const by = Math.max(20, Math.min(WORLD_HEIGHT-20, y));

    entities.enemies.push({
        x: bx, y: by,
        size: 25,
        speed: 1 + Math.random(),
        health: 2 + player.level * 0.5,
        emoji: Math.random() > 0.8 ? '💀' : '🧟'
    });
}

function handleEnemyDeath(enemy) {
    gameState.enemiesDefeated++;
    gameState.score += 10;
    playerStats.totalKills++;
    playSound('enemyDeath');
    
    // Drop Coin
    player.coins++;
    
    // Drop XP
    player.xp += 1;
    if (player.xp >= player.xpToNextLevel) {
        player.xp = 0;
        player.level++;
        player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);
        playSound('levelUp');
        showUpgradeMenu(applyUpgrade);
    }
}

function applyUpgrade(opt) {
    if (opt.type === 'damage') player.damageMultiplier += opt.value;
    else if (opt.type === 'speed') player.speed += opt.value;
    // ... handle other types
}

function createWeapon(angle) {
    playSound('playerShoot');
    
    const isSkull = player.isSkullCharacter;
    
    // SKULL LOGIC: V-Spread Pattern
    const count = isSkull ? 2 : 1; 
    const spread = 0.2; // Radians
    
    for(let i = 0; i < count; i++) {
        const actualAngle = isSkull ? (angle - spread/2 + i*spread) : angle;
        
        entities.projectiles.push({
            x: player.x,
            y: player.y,
            dx: Math.cos(actualAngle) * 7,
            dy: Math.sin(actualAngle) * 7,
            size: isSkull ? 20 : 10,
            emoji: isSkull ? '🦴' : '🔹', // SKULL LOGIC: Bone sprite
            damage: player.damageMultiplier * (isSkull ? 0.8 : 1.0), // Skull does slightly less dmg per bone but fires 2
            lifetime: 2000,
            spawnTime: Date.now(),
            active: true,
            angle: actualAngle
        });
    }
}

// Exported for Systems to call
export function triggerDash(entity) {
    const now = Date.now();
    if (entity.isDashing || now - entity.lastDashTime < entity.dashCooldown) return;
    
    entity.isDashing = true;
    entity.lastDashTime = now;
    playSound('dodge');
    vibrate(50);
    
    // SKULL LOGIC: Bone Nova on Dash
    if (entity.isSkullCharacter) {
        const novaCount = 8;
        for(let i=0; i<novaCount; i++) {
            const angle = (Math.PI * 2 / novaCount) * i;
            entities.projectiles.push({
                x: entity.x,
                y: entity.y,
                dx: Math.cos(angle) * 6,
                dy: Math.sin(angle) * 6,
                size: 20,
                emoji: '🦴',
                damage: player.damageMultiplier,
                lifetime: 1000,
                spawnTime: now,
                active: true,
                angle: angle
            });
        }
    }
}

function getNearestEnemy() {
    let nearest = null;
    let minDst = Infinity;
    entities.enemies.forEach(e => {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDst) { minDst = d; nearest = e; }
    });
    return nearest;
}

function endGame() {
    gameState.gameActive = false;
    gameState.gameOver = true;
    playerData.currency += player.coins; // Save earned coins
    saveGameData();
    playSound('gameOver');
    showGameOverScreen();
}

// Start
init();
