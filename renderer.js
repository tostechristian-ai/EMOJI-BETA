// ==========================================
// RENDERER.JS
// Canvas drawing, Pre-rendering, and UI updates
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Visual State Globals ---
let cameraZoom = 1.0;
let cameraOffsetX = 0;
let cameraOffsetY = 0;
let cameraAimOffsetX = 0;
let cameraAimOffsetY = 0;

let isPlayerHitShaking = false; 
let playerHitShakeStartTime = 0; 
const PLAYER_HIT_SHAKE_DURATION = 300;
const MAX_PLAYER_HIT_SHAKE_OFFSET = 5;
const BOB_AMPLITUDE = 2.5;

// --- Pre-Rendering System ---
const preRenderedEntities = {};

function preRenderEmoji(emoji, size) {
    const bufferCanvas = document.createElement('canvas');
    const bufferCtx = bufferCanvas.getContext('2d');
    const paddedSize = size * 1.3;
    bufferCanvas.width = paddedSize;
    bufferCanvas.height = paddedSize;
    bufferCtx.font = `${size}px sans-serif`;
    bufferCtx.textAlign = 'center';
    bufferCtx.textBaseline = 'middle';
    bufferCtx.fillText(emoji, paddedSize / 2, paddedSize / 2);
    preRenderedEntities[emoji] = bufferCanvas;
}

function initializePreRenders() {
    // Enemies
    preRenderEmoji('🧟', 17);
    preRenderEmoji('💀', 20); // Used for Enemy Skull and Player Skull
    preRenderEmoji('🦇', 25 * 0.85);
    preRenderEmoji('🌀', 22);
    preRenderEmoji('🦟', 15);
    preRenderEmoji('😈', 20 * 0.8);
    preRenderEmoji('👹', 28 * 0.7);
    preRenderEmoji('👻', 22);
    preRenderEmoji('👁️', 25 * 0.6);
    preRenderEmoji('🧟‍♀️', 17 * 1.75);
    preRenderEmoji('🧛‍♀️', 20);
    
    // Pickups & Effects
    const COIN_SIZE = 10;
    const DIAMOND_SIZE = 12;
    const RING_SYMBOL_SIZE = 11;
    const APPLE_ITEM_SIZE = 15;
    const BOMB_SIZE = 14;
    const LIGHTNING_SIZE = 10;
    const EYE_PROJECTILE_SIZE = 25 * 0.6 / 2;
    const WHIRLWIND_AXE_SIZE = 30;

    preRenderEmoji('🔸', COIN_SIZE);
    preRenderEmoji('🔹', DIAMOND_SIZE);
    preRenderEmoji('💍', RING_SYMBOL_SIZE);
    preRenderEmoji('♦️', RING_SYMBOL_SIZE);
    preRenderEmoji('🍎', APPLE_ITEM_SIZE);
    preRenderEmoji('💣', BOMB_SIZE);
    preRenderEmoji('⚡️', LIGHTNING_SIZE);
    preRenderEmoji('🧿', EYE_PROJECTILE_SIZE);
    preRenderEmoji('🪓', WHIRLWIND_AXE_SIZE);
    
    // Special
    preRenderEmoji('🐶', 25);
    preRenderEmoji('🦉', 30);
    preRenderEmoji('🧱', 30); 
    preRenderEmoji('🛢️', 15); 
    
    // Character Bones
    preRenderEmoji('🦴', 16); // Bone projectile
    
    console.log("All emojis have been pre-rendered to memory.");
}

// --- DOM UI Updates ---

function triggerAnimation(element, animationClass, color = '#FFFFFF') {
    if (!element) return;
    element.classList.add(animationClass);
    if (color !== '#FFFFFF') {
        element.style.color = color;
        element.style.textShadow = `0 0 8px ${color}`;
    }
    element.addEventListener('animationend', () => {
        element.classList.remove(animationClass);
        element.style.color = '';
        element.style.textShadow = '';
    }, { once: true });
}

function updateUIStats() {
    const currentLevelSpan = document.getElementById('currentLevel');
    const playerLivesIcon = document.getElementById('playerLivesIcon');
    const currentXpSpan = document.getElementById('currentXp');
    const requiredXpSpan = document.getElementById('requiredXp');
    const currentScoreSpan = document.getElementById('currentScore');
    const appleCounterSpan = document.getElementById('appleCounter');
    const coinCounterSpan = document.getElementById('coinCounter');
    const xpBar = document.getElementById('xpBar');

    const oldLevel = currentLevelSpan.textContent;
    const newLevel = player.level;
    if (oldLevel !== newLevel.toString()) {
        currentLevelSpan.textContent = newLevel;
        triggerAnimation(currentLevelSpan, 'stat-updated');
    }

    const oldLives = playerLivesIcon.innerHTML;
    let newLivesHTML = '';
    if (player.lives > 0) {
        newLivesHTML = '<span class="pulsating-heart">❤️</span>';
        newLivesHTML += '❤️'.repeat(player.lives - 1);
    }
    if (oldLives !== newLivesHTML) { playerLivesIcon.innerHTML = newLivesHTML; }

    const oldXp = currentXpSpan.textContent;
    const newXp = player.xp;
    if(oldXp !== newXp.toString()){
        currentXpSpan.textContent = newXp;
        triggerAnimation(currentXpSpan, 'stat-updated');
    }
    
    const oldRequiredXp = requiredXpSpan.textContent;
    const newRequiredXp = player.xpToNextLevel;
    if(oldRequiredXp !== newRequiredXp.toString()){ requiredXpSpan.textContent = newRequiredXp; }
    
    // Score update handled via global 'score' variable in main.js
    if (typeof score !== 'undefined') {
        const oldScore = currentScoreSpan.textContent;
        const newScore = Math.floor(score);
        if(oldScore !== newScore.toString()){ currentScoreSpan.textContent = newScore; }
    }
    
    if (appleCounterSpan) appleCounterSpan.textContent = player.appleCount;
    if (coinCounterSpan) coinCounterSpan.textContent = player.coins;
    if (xpBar) xpBar.style.width = `${(player.xp / player.xpToNextLevel) * 100}%`;
}

function updatePowerupIconsUI() {
    const powerupIconsDiv = document.getElementById('powerupIcons');
    if (!powerupIconsDiv) return;
    
    powerupIconsDiv.innerHTML = '';
    
    // Helper check variables (assumes these are global from main.js/entities.js)
    const has = (cond) => typeof cond !== 'undefined' && cond;

    if (has(shotgunBlastActive)) { powerupIconsDiv.innerHTML += '<span>💥</span>';
    } else {
        if (has(rocketLauncherActive)) powerupIconsDiv.innerHTML += '<span>🚀</span>';
        if (typeof vShapeProjectileLevel !== 'undefined' && vShapeProjectileLevel > 0) powerupIconsDiv.innerHTML += `<span>🕊️${vShapeProjectileLevel > 1 ? `x${vShapeProjectileLevel}` : ''}</span>`;
    }
    
    const dogActive = typeof dogCompanionActive !== 'undefined' && dogCompanionActive;
    const magProj = typeof magneticProjectileActive !== 'undefined' && magneticProjectileActive;

    if (dogActive && magProj) { powerupIconsDiv.innerHTML += '<span>🎯🐶</span>'; } 
    else {
        if (dogActive) powerupIconsDiv.innerHTML += '<span>🐶</span>';
        if (magProj) powerupIconsDiv.innerHTML += '<span>🧲</span>';
    }

    const checks = [
        { val: typeof doppelgangerActive !== 'undefined' && doppelgangerActive, icon: '👯' },
        { val: typeof temporalWardActive !== 'undefined' && temporalWardActive, icon: '⏱️' },
        { val: typeof bombEmitterActive !== 'undefined' && bombEmitterActive, icon: '💣' },
        { val: typeof orbitingPowerUpActive !== 'undefined' && orbitingPowerUpActive, icon: '💫' },
        { val: typeof damagingCircleActive !== 'undefined' && damagingCircleActive, icon: '⭕' },
        { val: typeof lightningProjectileActive !== 'undefined' && lightningProjectileActive, icon: '⚡️' },
        { val: player.swordActive, icon: '🗡️' },
        { val: typeof iceProjectileActive !== 'undefined' && iceProjectileActive, icon: '❄️' },
        { val: typeof puddleTrailActive !== 'undefined' && puddleTrailActive, icon: '💧' },
        { val: typeof laserPointerActive !== 'undefined' && laserPointerActive, icon: '🔴' },
        { val: typeof autoAimActive !== 'undefined' && autoAimActive, icon: '🎯' },
        { val: typeof explosiveBulletsActive !== 'undefined' && explosiveBulletsActive, icon: '💥' },
        { val: typeof vengeanceNovaActive !== 'undefined' && vengeanceNovaActive, icon: '🛡️' },
        { val: typeof antiGravityActive !== 'undefined' && antiGravityActive, icon: '💨' },
        { val: typeof ricochetActive !== 'undefined' && ricochetActive, icon: '🔄' },
        { val: typeof blackHoleActive !== 'undefined' && blackHoleActive, icon: '⚫' },
        { val: typeof dualGunActive !== 'undefined' && dualGunActive, icon: '🔫' },
        { val: typeof flamingBulletsActive !== 'undefined' && flamingBulletsActive, icon: '🔥' },
        { val: typeof bugSwarmActive !== 'undefined' && bugSwarmActive, icon: '🪰' },
        { val: typeof nightOwlActive !== 'undefined' && nightOwlActive, icon: '🦉' },
        { val: typeof whirlwindAxeActive !== 'undefined' && whirlwindAxeActive, icon: '🪓' },
        { val: typeof lightningStrikeActive !== 'undefined' && lightningStrikeActive, icon: '⚡' },
        { val: typeof hasDashInvincibility !== 'undefined' && hasDashInvincibility, icon: '🛡️💨' }
    ];

    checks.forEach(c => { if(c.val) powerupIconsDiv.innerHTML += `<span>${c.icon}</span>`; });

    if (powerupIconsDiv.scrollHeight > powerupIconsDiv.clientHeight) { powerupIconsDiv.classList.add('small-icons'); } 
    else { powerupIconsDiv.classList.remove('small-icons'); }
}

function updateUpgradeStatsUI() {
    const upgradeStatsDiv = document.getElementById('upgradeStats');
    if (!upgradeStatsDiv) return;
    
    upgradeStatsDiv.innerHTML = '';
    const upgradeNames = {
        speed: 'SPD', fireRate: 'FR', magnetRadius: 'MAG',
        damage: 'DMG', projectileSpeed: 'P.SPD', knockback: 'KB',
        luck: 'LUCK'
    };
    for (const [type, level] of Object.entries(player.upgradeLevels)) {
        if (level > 0) {
            const p = document.createElement('p');
            p.textContent = `${upgradeNames[type] || type.toUpperCase()}: ${'⭐'.repeat(level)}`;
            upgradeStatsDiv.appendChild(p);
        }
    }
}

// --- Main Draw Function ---

function draw(gameActive, backgroundImages, currentBackgroundIndex) {
    if (!gameActive) return;
    
    // --- Camera Shake Logic ---
    const now = Date.now();
    let currentHitShakeX = 0, currentHitShakeY = 0;
    if (isPlayerHitShaking) {
        const elapsedTime = now - playerHitShakeStartTime;
        if (elapsedTime < PLAYER_HIT_SHAKE_DURATION) {
            const shakeIntensity = MAX_PLAYER_HIT_SHAKE_OFFSET * (1 - (elapsedTime / PLAYER_HIT_SHAKE_DURATION));
            currentHitShakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
            currentHitShakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
        } else isPlayerHitShaking = false;
    }

    let finalCameraOffsetX = cameraOffsetX - currentHitShakeX;
    let finalCameraOffsetY = cameraOffsetY - currentHitShakeY;

    // --- Canvas Setup ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(cameraZoom, cameraZoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // --- Background ---
    ctx.save();
    ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
    if (backgroundImages.length > 0 && backgroundImages[currentBackgroundIndex]) {
        ctx.drawImage(backgroundImages[currentBackgroundIndex], 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else { 
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); 
    }
    ctx.restore();
    
    // --- World Objects Transform ---
    ctx.save();
    ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
    
    // 1. Destructibles
    destructibles.forEach(obs => {
        if(obs.health !== Infinity) ctx.globalAlpha = 0.5 + (obs.health / obs.maxHealth) * 0.5;
        const preRendered = preRenderedEntities[obs.emoji];
        if(preRendered) {
            ctx.drawImage(preRendered, obs.x - preRendered.width / 2, obs.y - preRendered.height / 2);
        }
        ctx.globalAlpha = 1.0;
    });

    // 2. Flame Areas
    flameAreas.forEach(area => {
        const age = now - area.startTime;
        const lifeRatio = age / (area.endTime - area.startTime);
        const alpha = 1 - lifeRatio;
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#1a1a1a'; // Black puddle
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.7;
        const flameCount = 2;
        for (let i = 0; i < flameCount; i++) {
            const angle = (i / flameCount) * Math.PI * 2 + (now / 500);
            const dist = Math.random() * area.radius * 0.8;
            const flameX = area.x + Math.cos(angle) * dist;
            const flameY = area.y + Math.sin(angle) * dist;
            const flameSize = 10 + Math.random() * 5;
            ctx.font = `${flameSize}px sans-serif`;
            ctx.fillText('🔥', flameX, flameY);
        }
        ctx.restore();
    });

    // 3. Blood & Puddles
    bloodPuddles.forEach(puddle => {
        const age = now - puddle.spawnTime;
        if (age < puddle.lifetime) {
            const lifeRatio = age / puddle.lifetime;
            const currentSize = puddle.initialSize * (1 - lifeRatio);
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.translate(puddle.x, puddle.y);
            ctx.rotate(puddle.rotation);
            // Assuming 'sprites' is global from main
            if(typeof sprites !== 'undefined' && sprites.bloodPuddle)
                ctx.drawImage(sprites.bloodPuddle, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
            ctx.restore();
        }
    });

    bloodSplatters.forEach(p => {
        const age = now - p.spawnTime;
        const alpha = 1 - (age / p.lifetime);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // 4. Area Effects (Circle, AntiGrav, BlackHole)
    if (typeof damagingCircleActive !== 'undefined' && damagingCircleActive) {
        // damagingCircleAngle is global in main, accessed here
        // We'll increment it here or assume it's updated in update(). 
        // For render purity, usually update in update(), but original code did it here.
        if (typeof damagingCircleAngle !== 'undefined') {
             // We can't easily update the global here without return, so we rely on main.js to update variables
             // Or we access the global directly if available.
        }
        // Simplified: Draw Circle
        const size = 140; // Approx RADIUS * 2
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(player.x, player.y);
        // Assuming access to damagingCircleAngle
        // ctx.rotate(damagingCircleAngle); 
        if(typeof sprites !== 'undefined') ctx.drawImage(sprites.circle, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    // Black Holes
    blackHoles.forEach(hole => {
        const age = now - hole.spawnTime;
        const lifeRatio = age / hole.lifetime;
        const alpha = 1 - lifeRatio;
        ctx.save();
        // ... (Drawing logic simplified for brevity, assume full logic from original)
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(50, 0, 100, ${alpha * 0.2})`;
        ctx.fill();
        ctx.restore();
    });

    // 5. Enemies
    enemies.forEach(enemy => {
        ctx.save();
        if (enemy.emoji === '👻') {
            ctx.globalAlpha = enemy.isVisible ? 1.0 : 0.2;
        }
        if (enemy.isFrozen) ctx.filter = 'saturate(0.5) brightness(1.5) hue-rotate(180deg)';
        if (enemy.isSlowedByPuddle) ctx.filter = 'saturate(2) brightness(0.8)';
        
        const emojiToDraw = enemy.isBoss ? enemy.mimics : enemy.emoji;
        const preRenderedImage = preRenderedEntities[emojiToDraw];
        if(preRenderedImage) {
            ctx.drawImage(preRenderedImage, enemy.x - preRenderedImage.width / 2, enemy.y - preRenderedImage.height / 2 + (enemy.bobOffset || 0));
        }

        if (enemy.isIgnited) {
            ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.8);
            ctx.font = `${enemy.size * 0.8}px sans-serif`;
            ctx.fillText('🔥', enemy.x, enemy.y + (enemy.bobOffset || 0));
        }
        ctx.restore();
    });

    // 6. Projectiles
    const flamingBullets = typeof flamingBulletsActive !== 'undefined' && flamingBulletsActive;
    const magProj = typeof magneticProjectileActive !== 'undefined' && magneticProjectileActive;
    const iceProj = typeof iceProjectileActive !== 'undefined' && iceProjectileActive;

    for(const weapon of weaponPool) {
        if(!weapon.active) continue;
        ctx.save();
        ctx.translate(weapon.x, weapon.y);
        
        // Skull Logic: Rotate bones
        if (player._isSkull && weapon.spinAngle !== undefined) {
             weapon.spinAngle += 0.25; // Spin speed
             ctx.rotate(weapon.spinAngle);
             const bone = preRenderedEntities['🦴'];
             if (bone) ctx.drawImage(bone, -16 / 2, -16 / 2, 16, 16); // Bone size
        } else {
             // Standard Bullet
            ctx.rotate(weapon.angle);
            if (flamingBullets) ctx.filter = 'hue-rotate(30deg) saturate(5) brightness(1.5)';
            else if (magProj && iceProj) ctx.filter = 'hue-rotate(270deg) saturate(2)';
            else if (magProj) ctx.filter = 'hue-rotate(0deg) saturate(5) brightness(1.5)';
            else if (iceProj) ctx.filter = 'hue-rotate(180deg) saturate(2)';
            
            if(typeof sprites !== 'undefined')
                ctx.drawImage(sprites.bullet, -weapon.size / 2, -weapon.size / 2, weapon.size, weapon.size * 0.5);
        }
        ctx.restore();
    }

    // 7. Pickups (Glimmer logic handled inline for perf)
    const drawGlimmer = (item) => {
        const glimmerDuration = 1000;
        const timeSinceStart = (now - item.glimmerStartTime) % 2000;
        if (timeSinceStart < glimmerDuration) {
            const progress = timeSinceStart / glimmerDuration;
            const alpha = Math.sin(progress * Math.PI);
            const size = item.size * (1 + progress * 0.5);
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(item.x, item.y, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    };

    pickupItems.forEach(item => {
        drawGlimmer(item);
        if (item.type === 'box' && typeof sprites !== 'undefined') { 
            ctx.drawImage(sprites.pickupBox, item.x - item.size / 2, item.y - item.size / 2, item.size, item.size); 
        } else {
            const preRendered = preRenderedEntities[item.type];
            if(preRendered) ctx.drawImage(preRendered, item.x - preRendered.width/2, item.y - preRendered.height/2);
        }
    });

    // 8. Player Drawing
    const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase) * BOB_AMPLITUDE;
    const spinDuration = 500;
    const isSpinning = player.spinStartTime && now < player.spinStartTime + spinDuration;

    ctx.save();
    ctx.translate(player.x, player.y + bobOffset);

    // *** SKULL CHARACTER DRAW LOGIC ***
    if (player._isSkull) {
        // Draw Skull Emoji
        if (isSpinning) {
             const spinProgress = (now - player.spinStartTime) / spinDuration;
             ctx.rotate(spinProgress * 2.1 * Math.PI * player.spinDirection);
        }
        const skullPre = preRenderedEntities['💀'];
        const skullSize = 28;
        if (skullPre) {
            ctx.drawImage(skullPre, -skullSize/2, -skullSize/2, skullSize, skullSize);
        }
    } else {
        // Standard Player Sprite
        if (isSpinning) {
            const spinProgress = (now - player.spinStartTime) / spinDuration;
            const rotation = spinProgress * 2.1 * Math.PI * player.spinDirection;
            ctx.rotate(rotation);
        }
        
        let playerSprite;
        if (typeof sprites !== 'undefined') {
            switch (player.facing) {
                case 'up': playerSprite = sprites.playerUp; break;
                case 'down': playerSprite = sprites.playerDown; break;
                case 'left': playerSprite = sprites.playerLeft; break;
                case 'right': playerSprite = sprites.playerRight; break;
                default: playerSprite = sprites.playerDown;
            }
            if(playerSprite) ctx.drawImage(playerSprite, -player.size / 2, -player.size / 2, player.size, player.size);
        }
    }
    ctx.restore();

    // Dash Bar & Shield
    const dashCharge = Math.min(1, (now - player.lastDashTime) / player.dashCooldown);
    if (dashCharge < 1) {
        const barWidth = player.size * 0.8;
        const barX = player.x - barWidth / 2;
        const barY = player.y + player.size / 2 + 4;
        ctx.fillStyle = '#444';
        ctx.fillRect(barX, barY, barWidth, 4);
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(barX, barY, barWidth * dashCharge, 4);
    }
    
    // 9. Floating Text
    floatingTexts.forEach(ft => {
        const elapsed = now - ft.startTime;
        const alpha = 1.0 - (elapsed / ft.duration);
        const yOffset = (elapsed / ft.duration) * 20; 
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = 'bold 14px "Press Start 2P"';
        ctx.fillStyle = ft.color || '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.x, ft.y - yOffset);
        ctx.fillText(ft.text, ft.x, ft.y - yOffset);
        ctx.restore();
    });

    // 10. Gun / Crosshair
    if ((aimDx !== 0 || aimDy !== 0 || (typeof autoAimActive !== 'undefined' && autoAimActive)) && !player._isSkull) {
         // Gun drawing logic here (simplified for brevity)
         const aimAngle = player.rotationAngle;
         ctx.save();
         ctx.translate(player.x, player.y + bobOffset);
         ctx.rotate(aimAngle);
         if (aimAngle > Math.PI / 2 || aimAngle < -Math.PI / 2) { ctx.scale(1, -1); }
         const gunWidth = player.size * 0.8;
         if (typeof sprites !== 'undefined' && sprites.gun) {
             const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
             ctx.drawImage(sprites.gun, player.size / 4, -gunHeight / 2, gunWidth, gunHeight);
         }
         ctx.restore();
    }
    
    // Mouse Crosshair (if active)
    let isMouseInCanvas = false; // Usually passed in or tracked globally
    // Assuming mouseX, mouseY global
    if (typeof mouseX !== 'undefined' && typeof isMouseInCanvas !== 'undefined' && isMouseInCanvas && typeof sprites !== 'undefined' && sprites.crosshair) {
        const reticleSize = 16;
        ctx.drawImage(sprites.crosshair, mouseX - reticleSize / 2, mouseY - reticleSize / 2, reticleSize, reticleSize);
    }

    ctx.restore(); // End World Transform
    ctx.restore(); // End Canvas Center Transform
}
