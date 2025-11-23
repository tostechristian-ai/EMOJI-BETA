// ==========================================
// MAIN.JS
// Game Loop, Input Handling, and Logic Core
// ==========================================

// --- Global Game State ---
let gameActive = false;
let gamePaused = false;
let gameOver = false;
let gameStartTime = 0;
let lastFrameTime = 0;
let animationFrameId;
let score = 0;
let enemiesDefeatedCount = 0;

// --- Timers & intervals ---
let lastEnemySpawnTime = 0;
let enemySpawnInterval = 1000;
let lastWeaponFireTime = 0;
let weaponFireInterval = 400;
let lastCircleSpawnEventTime = 0;
let lastBarrelSpawnTime = 0;
let lastMerchantSpawnTime = 0;
const MERCHANT_SPAWN_INTERVAL = 180000; // 3 minutes

// --- Audio Globals ---
const audioPlayers = {};
let currentBGMPlayer = null;

// --- Quadtree Instance ---
let quadtree;

// --- Input State ---
let isMouseInCanvas = false;
let mouseX = 0;
let mouseY = 0;
let activeTouches = {};
let mouseActiveStick = null;

// --- Asset Loading State ---
const sprites = {};
const backgroundImages = new Array(backgroundPaths.length);
let assetsLoadedCount = 0;
const totalAssets = Object.keys(spritePaths).length + Object.keys(audioPaths).length + backgroundPaths.length;

// ==========================================
// INITIALIZATION & ASSETS
// ==========================================

function assetLoaded() {
    assetsLoadedCount++;
    if (assetsLoadedCount === totalAssets) {
        console.log('All game assets loaded.');
        document.getElementById('levelUpBox').src = sprites.levelUpBox.src;
        initializePreRenders();
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
    }
}

function loadSprite(name, path) {
    const img = new Image();
    img.src = path;
    img.onload = () => { sprites[name] = img; assetLoaded(); };
    img.onerror = () => console.error(`Failed to load sprite: ${path}`);
}

function loadAudio(name, path) {
    const player = new Tone.Player({
        url: path,
        autostart: false,
        loop: name === 'mainMenu',
        onload: assetLoaded
    }).toDestination();
    audioPlayers[name] = player;
}

function loadBackground(path, index) {
    const img = new Image();
    img.src = path;
    img.onload = () => { backgroundImages[index] = img; assetLoaded(); };
}

// ==========================================
// AUDIO SYSTEM
// ==========================================

function playSound(name) {
    if (gameActive && !gamePaused && audioPlayers[name]) {
        audioPlayers[name].start(getSafeToneTime());
    }
}

function playUISound(name) {
    if (audioPlayers[name]) audioPlayers[name].start(getSafeToneTime());
}

async function tryLoadMusic(retries = 3) {
    const backgroundMusicPaths = [
        'audio/background_music.mp3', 'audio/background_music2.mp3',
        'audio/background_music3.mp3', 'audio/background_music4.mp3'
    ];
    // Simple round-robin or random load logic
    const path = backgroundMusicPaths[Math.floor(Math.random() * backgroundMusicPaths.length)];
    try {
        if (currentBGMPlayer) { currentBGMPlayer.stop(); currentBGMPlayer.dispose(); }
        currentBGMPlayer = new Tone.Player({ url: path, loop: true, autostart: false, volume: -10 }).toDestination();
        await Tone.loaded();
        if (gameActive && !gamePaused) currentBGMPlayer.start();
    } catch (e) { console.error("Music load failed", e); }
}

function startMainMenuBGM() {
    if (Tone.context.state !== 'running') {
        Tone.start().then(() => {
            if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') {
                if (currentBGMPlayer) currentBGMPlayer.stop();
                audioPlayers['mainMenu'].start();
            }
        });
    } else {
        if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') {
            if (currentBGMPlayer) currentBGMPlayer.stop();
            audioPlayers['mainMenu'].start();
        }
    }
}

// ==========================================
// GAME LOOP & UPDATE
// ==========================================

function update(deltaTime) {
    if (gamePaused || gameOver || !gameActive) return;

    const now = Date.now();

    // 1. Quadtree Refresh
    quadtree.clear();
    const allGameObjects = [...enemies, ...destructibles, player];
    if (player2 && player2.active) allGameObjects.push(player2);
    // Insert Logic
    for (const obj of allGameObjects) {
        quadtree.insert({
            x: obj.x - obj.size / 2,
            y: obj.y - obj.size / 2,
            width: obj.size,
            height: obj.size,
            ref: obj
        });
    }

    // 2. Spawners
    if (enemies.length < 100 && now - lastEnemySpawnTime > enemySpawnInterval) {
        createEnemy();
        lastEnemySpawnTime = now;
    }
    
    // Merchant Spawn
    if (now - lastMerchantSpawnTime >= MERCHANT_SPAWN_INTERVAL) {
        spawnMerchant(player.x + 200, player.y);
        lastMerchantSpawnTime = now;
    }
    
    // Merchant Collision
    for (let i = merchants.length - 1; i >= 0; i--) {
        const m = merchants[i];
        const dist = Math.hypot(player.x - m.x, player.y - m.y);
        if (dist < (player.size / 2) + (m.size / 2)) {
            // Open Shop logic would go here
             merchants.splice(i, 1);
             // Trigger UI open
             const shop = document.getElementById('merchantShop');
             if(shop) shop.style.display = 'flex';
             gamePaused = true;
        }
    }

    // 3. Player Movement
    let moveX = 0; let moveY = 0;
    if (keys['ArrowUp'] || keys['w']) moveY -= 1;
    if (keys['ArrowDown'] || keys['s']) moveY += 1;
    if (keys['ArrowLeft'] || keys['a']) moveX -= 1;
    if (keys['ArrowRight'] || keys['d']) moveX += 1;
    
    if (moveX === 0 && moveY === 0) { moveX = joystickDirX; moveY = joystickDirY; }
    
    const moveMag = Math.hypot(moveX, moveY);
    if (moveMag > 0) {
        moveX /= moveMag; moveY /= moveMag;
        player.stepPhase += player.speed * 0.1;
    }
    
    // Dash / Speed Logic
    let currentSpeed = player.speed;
    if (player.isDashing) {
        currentSpeed *= 3.5;
        if (now > player.dashEndTime) {
            player.isDashing = false;
            player.isInvincible = false;
        }
    }

    // Apply Velocity
    if (moveMag > 0 || player.isDashing) {
        let nextX = player.x + moveX * currentSpeed;
        let nextY = player.y + moveY * currentSpeed;
        
        // World Bounds
        nextX = Math.max(player.size/2, Math.min(WORLD_WIDTH - player.size/2, nextX));
        nextY = Math.max(player.size/2, Math.min(WORLD_HEIGHT - player.size/2, nextY));
        
        player.x = nextX;
        player.y = nextY;
    }
    
    // Camera Follow
    const targetCameraX = player.x - canvas.width / 2; // Simplified centering
    const targetCameraY = player.y - canvas.height / 2;
    cameraOffsetX += (targetCameraX - cameraOffsetX) * 0.1;
    cameraOffsetY += (targetCameraY - cameraOffsetY) * 0.1;

    // 4. Player Aim / Facing
    if (aimDx !== 0 || aimDy !== 0) {
        player.rotationAngle = Math.atan2(aimDy, aimDx);
    } else if (moveMag > 0) {
        // Look where moving if not aiming
        // player.rotationAngle = Math.atan2(moveY, moveX); // Optional
    }
    
    // Update Facing Sprite
    const angle = player.rotationAngle;
    if (angle > -Math.PI/4 && angle <= Math.PI/4) player.facing = 'right';
    else if (angle > Math.PI/4 && angle <= 3*Math.PI/4) player.facing = 'down';
    else if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4) player.facing = 'left';
    else player.facing = 'up';

    // 5. Weapon Firing
    if (!gamePaused && (aimDx !== 0 || aimDy !== 0) && (now - lastWeaponFireTime > weaponFireInterval)) {
        createWeapon(player);
        lastWeaponFireTime = now;
    }
    
    // 6. Update Projectiles
    for (const weapon of weaponPool) {
        if (!weapon.active) continue;
        weapon.x += weapon.dx;
        weapon.y += weapon.dy;
        if (now > weapon.lifetime) weapon.active = false;
        
        // Collision vs Enemies
        const weaponBounds = { x: weapon.x - weapon.size/2, y: weapon.y - weapon.size/2, width: weapon.size, height: weapon.size };
        const nearby = quadtree.retrieve(weaponBounds);
        
        for (const container of nearby) {
            const enemy = container.ref;
            if (enemy === player || enemy === player2) continue; // Safety
            if (!enemy.health || enemy.isHit) continue;
            
            // Check Circle Collision
            const dx = weapon.x - enemy.x;
            const dy = weapon.y - enemy.y;
            const r = (weapon.size + enemy.size) / 2;
            if (dx*dx + dy*dy < r*r) {
                if (!weapon.hitEnemies.includes(enemy)) {
                    enemy.health -= player.damageMultiplier;
                    weapon.hitEnemies.push(enemy);
                    createBloodSplatter(enemy.x, enemy.y);
                    
                    if (enemy.health <= 0) handleEnemyDeath(enemy);
                    
                    weapon.hitsLeft--;
                    if (weapon.hitsLeft <= 0) weapon.active = false;
                }
            }
        }
    }

    // 7. Update Enemies
    enemies.forEach(enemy => {
        // Simple tracking logic
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
        
        // Player Collision
        if (!player.isInvincible && !player.isDashing) { // Dash usually gives i-frames
             const colDist = (player.size + enemy.size) / 2 - 5;
             if (dist < colDist) {
                 player.lives--;
                 isPlayerHitShaking = true;
                 playerHitShakeStartTime = now;
                 playSound('playerScream');
                 updateUIStats();
                 handleEnemyDeath(enemy); // Enemy explodes on contact
                 if (player.lives <= 0) endGame();
             }
        }
    });

    // 8. Pickups
    for (let i = pickupItems.length - 1; i >= 0; i--) {
        const item = pickupItems[i];
        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        
        // Magnet
        if (dist < player.magnetRadius) {
            item.x += (player.x - item.x) * 0.05;
            item.y += (player.y - item.y) * 0.05;
        }
        
        // Collect
        if (dist < player.size) {
            if (item.type === 'box') {
                 // Box logic (simplified)
                 playSound('boxPickup');
                 // Trigger random upgrade logic here or in entities.js
                 // For now, just XP
                 player.xp += 50;
            } else {
                 player.xp += item.xpValue;
                 playSound('xpPickup');
            }
            pickupItems.splice(i, 1);
            if (player.xp >= player.xpToNextLevel) levelUp();
            updateUIStats();
        }
    }
}

// ==========================================
// GAME LOGIC FUNCTIONS
// ==========================================

function handleEnemyDeath(enemy) {
    enemy.isHit = true; // Mark for removal
    enemiesDefeatedCount++;
    score += 10;
    createBloodPuddle(enemy.x, enemy.y, enemy.size);
    if (Math.random() < 0.3) createPickup(enemy.x, enemy.y, '🔸', 10, 1);
    if (Math.random() < 0.01) createPickup(enemy.x, enemy.y, 'box', 25, 0);
    // Remove from array happens in filter loop or filter here
    enemies = enemies.filter(e => !e.isHit);
}

function levelUp() {
    gamePaused = true;
    player.level++;
    player.xp = 0;
    player.xpToNextLevel = Math.ceil(player.xpToNextLevel * 1.2);
    updateUIStats();
    playSound('levelUp');
    
    // Show Upgrade Menu
    const menu = document.getElementById('upgradeMenu');
    const container = document.getElementById('upgradeOptionsContainer');
    container.innerHTML = '';
    
    // Simple mock options
    const options = [
        { text: "Speed +10%", action: () => { player.speed *= 1.1; player.upgradeLevels.speed++; } },
        { text: "Damage +10%", action: () => { player.damageMultiplier *= 1.1; player.upgradeLevels.damage++; } },
        { text: "Heal 1 Heart", action: () => { if(player.lives < player.maxLives) player.lives++; } }
    ];
    
    options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'upgrade-card';
        btn.innerHTML = `<h3>${opt.text}</h3><button>Select</button>`;
        btn.onclick = () => {
            opt.action();
            menu.style.display = 'none';
            gamePaused = false;
        };
        container.appendChild(btn);
    });
    
    menu.style.display = 'flex';
}

function startGame() {
    // Stop Menu Music
    if (audioPlayers['mainMenu']) audioPlayers['mainMenu'].stop();
    
    // Init Audio Context
    if (Tone.context.state !== 'running') Tone.start();
    
    // Init World
    quadtree = new Quadtree({ x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT });
    
    // Reset Player
    player.lives = player.maxLives;
    player.xp = 0;
    player.level = 1;
    player.x = WORLD_WIDTH / 2;
    player.y = WORLD_HEIGHT / 2;
    score = 0;
    enemiesDefeatedCount = 0;
    
    // Reset Entities
    enemies = [];
    pickupItems = [];
    weaponPool.forEach(w => w.active = false);
    
    spawnInitialObstacles();
    
    // UI
    document.getElementById('difficultyContainer').style.display = 'none';
    document.getElementById('characterSelectContainer').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('gameStats').style.display = 'block';
    document.getElementById('gameOverlay').style.display = 'none';
    
    // Joysticks for mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        document.getElementById('movement-stick-base').style.display = 'flex';
        document.getElementById('fire-stick-base').style.display = 'flex';
    }

    tryLoadMusic();
    
    gameActive = true;
    gamePaused = false;
    gameOver = false;
    
    gameStartTime = Date.now();
    lastFrameTime = gameStartTime;
    
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameOver = true;
    gameActive = false;
    if (currentBGMPlayer) currentBGMPlayer.stop();
    playSound('gameOver');
    
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('finalScore').textContent = Math.floor(score);
    document.getElementById('coinsEarned').textContent = enemiesDefeatedCount;
    
    saveHighScore(Math.floor(score), player.level, 'easy');
}

function gameLoop() {
    if (!gameActive) return;
    
    const now = Date.now();
    const deltaTime = now - lastFrameTime;
    lastFrameTime = now;
    
    update(deltaTime);
    handleGamepadInput(); // Poll gamepad
    draw(gameActive, backgroundImages, 0); // 0 is default bg index
    
    if (!gameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// ==========================================
// INPUT HANDLING (EVENTS)
// ==========================================

function handleGamepadInput() {
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (!gp) return;

    // Movement
    let lx = gp.axes[0];
    let ly = gp.axes[1];
    if (Math.abs(lx) < GAMEPAD_DEADZONE) lx = 0;
    if (Math.abs(ly) < GAMEPAD_DEADZONE) ly = 0;
    joystickDirX = lx;
    joystickDirY = ly;

    // Aiming
    let rx = gp.axes[2];
    let ry = gp.axes[3];
    if (Math.abs(rx) < GAMEPAD_DEADZONE) rx = 0;
    if (Math.abs(ry) < GAMEPAD_DEADZONE) ry = 0;
    aimDx = rx;
    aimDy = ry;

    // Dash (Button 0 or 7 usually)
    if (gp.buttons[0].pressed) {
        triggerDash(player);
    }
}

// Keyboard
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'p' || e.key === 'Escape') {
        gamePaused = !gamePaused;
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) pauseOverlay.style.display = gamePaused ? 'flex' : 'none';
    }
    // Player 2 Join
    if (e.key === 'Insert') {
        initializePlayer2();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Mouse
window.addEventListener('mousemove', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Aim relative to center of screen (player position)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    aimDx = (mouseX - centerX);
    aimDy = (mouseY - centerY);
});

window.addEventListener('mousedown', () => {
   if (gameActive && !gamePaused) triggerDash(player); 
});

// Touch (Joysticks)
document.body.addEventListener('touchstart', (e) => {
    if (!gameActive) return;
    // e.preventDefault(); // careful with this blocking UI clicks
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const moveBase = document.getElementById('movement-stick-base');
        const fireBase = document.getElementById('fire-stick-base');
        
        // Movement Stick Check
        const mr = moveBase.getBoundingClientRect();
        if (t.clientX > mr.left && t.clientX < mr.right && t.clientY > mr.top && t.clientY < mr.bottom) {
            activeTouches[t.identifier] = 'move';
        }
        
        // Fire Stick Check
        const fr = fireBase.getBoundingClientRect();
        if (t.clientX > fr.left && t.clientX < fr.right && t.clientY > fr.top && t.clientY < fr.bottom) {
            activeTouches[t.identifier] = 'fire';
             // Tap to dash logic could go here
             triggerDash(player);
        }
    }
}, {passive: false});

document.body.addEventListener('touchmove', (e) => {
    if (!gameActive) return;
    // e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const type = activeTouches[t.identifier];
        
        if (type === 'move') {
            const base = document.getElementById('movement-stick-base');
            const cap = document.getElementById('movement-stick-cap');
            const input = getJoystickInput(t.clientX, t.clientY, base, cap);
            const mag = Math.hypot(input.dx, input.dy);
            if (mag > 0) { joystickDirX = input.dx/mag; joystickDirY = input.dy/mag; }
        } else if (type === 'fire') {
            const base = document.getElementById('fire-stick-base');
            const cap = document.getElementById('fire-stick-cap');
            const input = getJoystickInput(t.clientX, t.clientY, base, cap);
            aimDx = input.dx; aimDy = input.dy;
        }
    }
}, {passive: false});

document.body.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const type = activeTouches[t.identifier];
        if (type === 'move') {
            joystickDirX = 0; joystickDirY = 0;
            document.getElementById('movement-stick-cap').style.transform = 'translate(0,0)';
        }
        if (type === 'fire') {
            aimDx = 0; aimDy = 0;
            document.getElementById('fire-stick-cap').style.transform = 'translate(0,0)';
        }
        delete activeTouches[t.identifier];
    }
});

// ==========================================
// STARTUP
// ==========================================

window.onload = function() {
    // Canvas sizing
    canvas.width = 1125;
    canvas.height = 676;

    // Load Data
    // (In a real scenario, you'd call loadPlayerData/Stats from utils.js here)
    
    // Asset Loading
    for (const [name, path] of Object.entries(spritePaths)) loadSprite(name, path);
    for (const [name, path] of Object.entries(audioPaths)) loadAudio(name, path);
    backgroundPaths.forEach((path, i) => loadBackground(path, i));
    
    // Bind Buttons
    document.getElementById('startButton').onclick = () => {
        Tone.start().then(() => {
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('difficultyContainer').style.display = 'block';
            startMainMenuBGM();
        });
    };
    
    // Difficulty Buttons
    document.querySelectorAll('.difficulty-buttons button').forEach(btn => {
        if (btn.dataset.difficulty) {
            btn.onclick = () => {
                // startGame();
                // Or show character select first
                startGame(); 
            };
        }
    });

    // Character Select Logic Hook
    const charBtn = document.getElementById('characterSelectButton');
    if (charBtn) {
        charBtn.onclick = () => {
            document.getElementById('difficultyContainer').style.display = 'none';
            document.getElementById('characterSelectContainer').style.display = 'block';
            
            const container = document.getElementById('characterTilesContainer');
            container.innerHTML = '';
            Object.values(CHARACTERS).forEach(char => {
                const div = document.createElement('div');
                div.className = 'character-tile';
                div.innerHTML = `<p>${char.emoji}</p><h4>${char.name}</h4>`;
                div.onclick = () => {
                    // Set Global Player State for character
                    if (char.id === 'skull') {
                        player._isSkull = true;
                        // Adjust stats
                        player.damageMultiplier *= 0.5;
                        if(typeof vShapeProjectileLevel !== 'undefined') vShapeProjectileLevel = Math.max(1, vShapeProjectileLevel || 1);
                    } else {
                        player._isSkull = false;
                        player.damageMultiplier = 1; // Reset
                    }
                    
                    document.getElementById('characterSelectContainer').style.display = 'none';
                    document.getElementById('difficultyContainer').style.display = 'block';
                };
                container.appendChild(div);
            });
        };
    }
    
    // Back Buttons
    const backBtns = document.querySelectorAll('button[id^="backTo"]');
    backBtns.forEach(b => b.onclick = () => {
        document.getElementById('characterSelectContainer').style.display = 'none';
        document.getElementById('difficultyContainer').style.display = 'block';
    });

    document.getElementById('restartButton').onclick = () => {
        document.getElementById('gameOverlay').style.display = 'none';
        document.getElementById('difficultyContainer').style.display = 'block';
        startMainMenuBGM();
    };
    
    document.getElementById('resumeButton').onclick = () => {
        gamePaused = false;
        document.getElementById('pauseOverlay').style.display = 'none';
    };
};
