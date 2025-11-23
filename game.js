// game.js - Main Game Loop
// ========================
import { 
    gameState, player, playerStats, playerData, runStats,
    entities, companionState,
    WORLD_WIDTH, WORLD_HEIGHT, CONSTANTS, 
    ENEMY_CONFIGS, CHARACTERS, ALWAYS_AVAILABLE_PICKUPS, ASSETS 
} from './data.js';

import { 
    setupInput, updateGamepad, inputs, 
    loadAssets, audioPlayers, playSound, vibrate, 
    preRenderEmoji, Quadtree, backgroundImages 
} from './systems.js';

import { 
    setupUI, updateHUD, showLevelUpMenu, showMerchantMenu,
    saveGameData 
} from './ui.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let quadtree;
let animationFrameId;

// === INIT ===
function init() {
    loadAssets(() => {
        // Pre-render common emojis
        ['💀','🦴','🧟','🧛‍♀️','🔸','🔹'].forEach(e => preRenderEmoji(e, 30));
        
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
        
        document.getElementById('startButton').addEventListener('click', () => {
            if (Tone.context.state !== 'running') Tone.start();
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('difficultyContainer').style.display = 'block';
            if(audioPlayers['mainMenu']) audioPlayers['mainMenu'].start();
        });

        setupInput(triggerDash);
        setupUI(startGame);
    });
}

// === START ===
function startGame() {
    if(audioPlayers['mainMenu']) audioPlayers['mainMenu'].stop();
    // Load a background track...
    
    gameState.gameActive = true;
    gameState.gameOver = false;
    gameState.score = 0;
    gameState.startTime = Date.now();
    gameState.lastFrameTime = Date.now();
    gameState.enemiesDefeated = 0;
    
    // Reset Entities
    entities.enemies = [];
    entities.projectiles = [];
    entities.pickups = [];
    
    // Reset Player
    player.lives = player.maxLives;
    player.xp = 0;
    player.level = 1;
    player.dashCooldown = playerData.hasReducedDashCooldown ? 3000 : 6000;
    
    // Check Character
    if(gameState.equippedCharacterID === 'skull') {
        // Skull logic handled in createWeapon/dash
    }

    quadtree = new Quadtree({x:0, y:0, width:WORLD_WIDTH, height:WORLD_HEIGHT});
    
    // Apply Upgrades
    player.damageMultiplier = 1 + (playerData.upgrades.playerDamage||0)*0.02;
    player.speed = CONSTANTS.PLAYER_BASE_SPEED * (1 + (playerData.upgrades.playerSpeed||0)*0.015);

    animationFrameId = requestAnimationFrame(gameLoop);
}

// === LOOP ===
function gameLoop() {
    if(!gameState.gameActive) return;
    const now = Date.now();
    const dt = now - gameState.lastFrameTime;
    gameState.lastFrameTime = now;

    if(!gameState.gamePaused) {
        update(now, dt);
        draw();
    }
    
    updateHUD();
    updateGamepad(triggerDash, () => gameState.gamePaused = !gameState.gamePaused);
    requestAnimationFrame(gameLoop);
}

// === UPDATE ===
function update(now, dt) {
    // 1. Spawning
    if(entities.enemies.length < 100 && Math.random() < 0.02) spawnEnemy();

    // 2. Player Move
    let dx = inputs.moveX;
    let dy = inputs.moveY;
    // Keyboard fallback
    if(inputs.keys['w']) dy = -1;
    if(inputs.keys['s']) dy = 1;
    if(inputs.keys['a']) dx = -1;
    if(inputs.keys['d']) dx = 1;

    const currentSpeed = player.speed * (player.isDashing ? 3.0 : 1.0);
    player.x += dx * currentSpeed;
    player.y += dy * currentSpeed;
    
    // Clamp
    player.x = Math.max(player.size/2, Math.min(WORLD_WIDTH - player.size/2, player.x));
    player.y = Math.max(player.size/2, Math.min(WORLD_HEIGHT - player.size/2, player.y));
    
    // Dash End
    if(player.isDashing && now > player.dashEndTime) {
        player.isDashing = false;
        player.isInvincible = false;
    }

    // 3. Firing
    const fireRate = Math.max(100, 400 * (1 - player.upgradeLevels.fireRate * 0.08));
    const isAiming = inputs.aimX !== 0 || inputs.aimY !== 0;
    
    if (now - inputs.lastFireTap > fireRate) {
        // Auto-aim or manual
        if (isAiming) {
            createWeapon(Math.atan2(inputs.aimY, inputs.aimX));
            inputs.lastFireTap = now;
        } else {
            const nearest = getNearestEnemy();
            if(nearest) {
                createWeapon(Math.atan2(nearest.y - player.y, nearest.x - player.x));
                inputs.lastFireTap = now;
            }
        }
    }

    // 4. Enemies & Collision
    quadtree.clear();
    entities.enemies.forEach(e => quadtree.insert({x:e.x-e.size/2, y:e.y-e.size/2, width:e.size, height:e.size, ref:e}));

    entities.enemies.forEach(e => {
        // Move to player
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        // Hit Player
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < (player.size/2 + e.size/2) && !player.isInvincible && !player.isDashing) {
            player.lives--;
            player.isInvincible = true;
            setTimeout(()=>player.isInvincible=false, 1000);
            playSound('playerScream');
            vibrate(100);
            if(player.lives <= 0) endGame();
        }
    });

    // Projectiles
    for(let i=entities.projectiles.length-1; i>=0; i--) {
        const p = entities.projectiles[i];
        p.x += p.dx; p.y += p.dy;
        
        // Quadtree collision
        const targets = quadtree.retrieve({x:p.x, y:p.y, width:p.size, height:p.size});
        let hit = false;
        for(let t of targets) {
            const e = t.ref;
            const d = Math.hypot(p.x - e.x, p.y - e.y);
            if (d < (p.size/2 + e.size/2)) {
                e.health -= p.damage;
                if(e.health <= 0) handleEnemyDeath(e);
                hit = true;
                break;
            }
        }

        if(hit || now > p.lifetime) entities.projectiles.splice(i, 1);
    }
    
    entities.enemies = entities.enemies.filter(e => e.health > 0);
}

// === DRAW ===
function draw() {
    const camX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width/2));
    const camY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, player.y - canvas.height/2));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camX, -camY);

    // BG
    ctx.fillStyle = '#222';
    ctx.fillRect(0,0, WORLD_WIDTH, WORLD_HEIGHT);
    // Draw Background Image if loaded
    if (backgroundImages[gameState.selectedMapIndex > -1 ? gameState.selectedMapIndex : 0]) {
        ctx.drawImage(backgroundImages[gameState.selectedMapIndex > -1 ? gameState.selectedMapIndex : 0], 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    // Entities
    entities.pickups.forEach(p => {
        ctx.font='20px sans-serif'; ctx.fillText('🔸', p.x, p.y);
    });

    entities.enemies.forEach(e => {
        ctx.font=`${e.size}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(e.emoji, e.x, e.y);
    });

    entities.projectiles.forEach(p => {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.font=`${p.size}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
    });

    // Player
    ctx.save();
    ctx.translate(player.x, player.y);
    if(player.isDashing) ctx.rotate(Date.now()/100);
    const char = CHARACTERS[gameState.equippedCharacterID];
    ctx.font=`${player.size}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(char.emoji, 0, 0);
    ctx.restore();

    ctx.restore();
}

// === HELPERS ===
function spawnEnemy() {
    const types = Object.keys(ENEMY_CONFIGS);
    const type = types[Math.floor(Math.random()*types.length)];
    const cfg = ENEMY_CONFIGS[type];
    if(cfg.minLevel > player.level) return; // simple check

    const angle = Math.random() * Math.PI * 2;
    const dist = 600;
    entities.enemies.push({
        x: player.x + Math.cos(angle)*dist,
        y: player.y + Math.sin(angle)*dist,
        size: cfg.size,
        emoji: type,
        speed: cfg.speedMultiplier * (0.84 + player.level*0.02),
        health: cfg.baseHealth + player.level*0.5
    });
}

function createWeapon(angle) {
    playSound('playerShoot');
    const isSkull = gameState.equippedCharacterID === 'skull';
    
    // Skull V-Spread logic integrated
    const count = isSkull ? 2 : 1; 
    const spread = 0.2;
    
    for(let i=0; i<count; i++) {
        const finalAngle = isSkull ? (angle - spread/2 + i*spread) : angle;
        entities.projectiles.push({
            x: player.x, y: player.y,
            dx: Math.cos(finalAngle)*7, dy: Math.sin(finalAngle)*7,
            angle: finalAngle,
            size: isSkull ? 20 : 10,
            emoji: isSkull ? '🦴' : '🔹',
            damage: player.damageMultiplier,
            lifetime: Date.now() + 2000
        });
    }
}

function triggerDash(entity) {
    if(entity.isDashing) return;
    const now = Date.now();
    if(now - entity.lastDashTime < entity.dashCooldown) return;
    
    entity.isDashing = true;
    entity.lastDashTime = now;
    entity.dashEndTime = now + 300;
    playSound('dodge');
    
    // Skull Nova Logic
    if(gameState.equippedCharacterID === 'skull' && entity === player) {
        for(let i=0; i<8; i++) {
            const a = (Math.PI*2/8)*i;
            entities.projectiles.push({
                x:player.x, y:player.y,
                dx:Math.cos(a)*6, dy:Math.sin(a)*6, angle:a,
                size:20, emoji:'🦴', damage:player.damageMultiplier, lifetime:Date.now()+1000
            });
        }
    }
}

function handleEnemyDeath(e) {
    gameState.enemiesDefeated++;
    gameState.score += 10;
    player.coins++;
    player.xp++;
    playSound('enemyDeath');
    if(player.xp >= player.xpToNextLevel) {
        showLevelUpMenu((opt) => {
            // apply upgrade logic
            if(opt.type==='speed') player.speed *= (1+opt.value);
            // ... add others
            player.level++;
            player.xp = 0;
            player.xpToNextLevel = Math.ceil(player.xpToNextLevel * 1.5);
        });
    }
}

function getNearestEnemy() {
    let nearest = null, minDist = Infinity;
    entities.enemies.forEach(e => {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if(d < minDist) { minDist = d; nearest = e; }
    });
    return nearest;
}

function endGame() {
    gameState.gameActive = false;
    gameState.gameOver = true;
    playerData.currency += player.coins;
    saveGameData();
    playSound('gameOver');
    document.getElementById('gameOverlay').style.display = 'flex';
}

init();
