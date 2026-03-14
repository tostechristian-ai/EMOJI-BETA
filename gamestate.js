// ============================================================
// gamestate.js — Game lifecycle: start, end, pause, loop,
//                level-up, UI stats, and window.onload wiring
// ============================================================

// ---- Shared DOM refs (populated after DOMContentLoaded) ----
const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');

const gameContainer          = document.getElementById('gameContainer');
const movementStickBase      = document.getElementById('movement-stick-base');
const movementStickCap       = document.getElementById('movement-stick-cap');
const firestickBase          = document.getElementById('fire-stick-base');
const firestickCap           = document.getElementById('fire-stick-cap');
const currentLevelSpan       = document.getElementById('currentLevel');
const currentScoreSpan       = document.getElementById('currentScore');
const currentXpSpan          = document.getElementById('currentXp');
const requiredXpSpan         = document.getElementById('requiredXp');
const xpBar                  = document.getElementById('xpBar');
const playerLivesIcon        = document.getElementById('playerLivesIcon');
const appleCounterSpan       = document.getElementById('appleCounter');
const coinCounterSpan        = document.getElementById('coinCounter');
const upgradeMenu            = document.getElementById('upgradeMenu');
const upgradeOptionsContainer = document.getElementById('upgradeOptionsContainer');
const levelUpBoxImage        = document.getElementById('levelUpBox');
const merchantShop           = document.getElementById('merchantShop');
const merchantOptionsContainer = document.getElementById('merchantOptionsContainer');
const leaveMerchantButton    = document.getElementById('leaveMerchantButton');
const gameOverlay            = document.getElementById('gameOverlay');
const finalScoreSpan         = document.getElementById('finalScore');
const coinsEarnedSpan        = document.getElementById('coinsEarned');
const finalTimeSpan          = document.getElementById('finalTime');
const restartButton          = document.getElementById('restartButton');
const loadingStoryDiv        = document.getElementById('loadingStory');
const storytellerOutputDiv   = document.getElementById('storytellerOutput');
const difficultyContainer    = document.getElementById('difficultyContainer');
const difficultyButtons      = document.querySelectorAll('.difficulty-buttons button:not(#howToPlayButton):not(#desktopUpgradesButton):not(#characterSelectButton)');
const howToPlayButton        = document.getElementById('howToPlayButton');
const gameGuideModal         = document.getElementById('gameGuideModal');
const backToDifficultyButton = document.getElementById('backToDifficultyButton');
const pauseButton            = document.getElementById('pauseButton');
const pauseOverlay           = document.getElementById('pauseOverlay');
const powerupIconsDiv        = document.getElementById('powerupIcons');
const upgradeStatsDiv        = document.getElementById('upgradeStats');
const musicVolumeSlider      = document.getElementById('musicVolume');
const effectsVolumeSlider    = document.getElementById('effectsVolume');
const pauseRestartButton     = document.getElementById('pauseRestartButton');
const resumeButton           = document.getElementById('resumeButton');
const startButton            = document.getElementById('startButton');
const gameStats              = document.getElementById('gameStats');
const gameStartOverlay       = document.getElementById('gameStartOverlay');
const gameStartText          = document.getElementById('gameStartText');
const gameStartDifficulty    = document.getElementById('gameStartDifficulty');
const zoomToggle             = document.getElementById('zoomToggle');
const upgradeShop            = document.getElementById('upgradeShop');
const desktopUpgradesButton  = document.getElementById('desktopUpgradesButton');
const backToMenuButton       = document.getElementById('backToMenuButton');
const currencyDisplay        = document.getElementById('currencyDisplay');
const permanentUpgradesContainer = document.getElementById('permanentUpgradesContainer');
const unlockablePickupsContainer = document.getElementById('unlockablePickupsContainer');
const mapSelectContainer     = document.getElementById('mapSelectContainer');
const mapTilesContainer      = document.getElementById('mapTilesContainer');
const backToDifficultySelectButton = document.getElementById('backToDifficultySelectButton');
const characterSelectContainer = document.getElementById('characterSelectContainer');
const characterSelectButton  = document.getElementById('characterSelectButton');
const characterTilesContainer = document.getElementById('characterTilesContainer');
const backToMenuFromCharsButton = document.getElementById('backToMenuFromCharsButton');
const desktopAchievementsButton = document.getElementById('desktopAchievementsButton');
const desktopResetButton     = document.getElementById('desktopResetButton');
const achievementsModal      = document.getElementById('achievementsModal');
const backToMenuFromAchievements = document.getElementById('backToMenuFromAchievements');
const achievementsContainer  = document.getElementById('achievementsContainer');
const achievementBanner      = document.getElementById('achievement-banner');
const cheatsMenuButton       = document.getElementById('cheatsMenuButton');
const cheatsModal            = document.getElementById('cheatsModal');
const backToAchievementsButton = document.getElementById('backToAchievementsButton');
const cheatsContainer        = document.getElementById('cheatsContainer');
const mobileResetButton      = document.getElementById('mobileResetButton');
const mobileMenuUpgradesButton = document.getElementById('mobileMenuUpgradesButton');
const mobileMenuTrophiesButton = document.getElementById('mobileMenuTrophiesButton');
const mobileMenuCheatsButton = document.getElementById('mobileMenuCheatsButton');

// ---- Misc singletons ----
const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let   animationFrameId;
let   quadtree;

// ---- Audio ----
function getSafeToneTime() {
    let now = Tone.now();
    let lastTime = getSafeToneTime.lastTime || 0;
    if (now <= lastTime) now = lastTime + 0.001;
    getSafeToneTime.lastTime = now;
    return now;
}
function vibrate(duration) { if (isMobileDevice && navigator.vibrate) navigator.vibrate(duration); }
function playSound(name) { if (gameActive && !gamePaused && audioPlayers[name]) audioPlayers[name].start(getSafeToneTime()); }
function playUISound(name) { if (audioPlayers[name]) audioPlayers[name].start(getSafeToneTime()); }

const swordSwingSynth      = new Tone.Synth({ oscillator:{type:"sine"},    envelope:{attack:0.005,decay:0.1,sustain:0.01,release:0.05}  }).toDestination();
const eyeProjectileHitSynth = new Tone.Synth({ oscillator:{type:"triangle"},envelope:{attack:0.001,decay:0.08,sustain:0.01,release:0.1}  }).toDestination();
const bombExplosionSynth   = new Tone.Synth({ oscillator:{type:"sawtooth"},envelope:{attack:0.001,decay:0.1, sustain:0.01,release:0.2}  }).toDestination();

function playBombExplosionSound() { if (gameActive && !gamePaused) bombExplosionSynth.triggerAttackRelease("F3","8n",getSafeToneTime()); }
function playSwordSwingSound()    { if (gameActive && !gamePaused) swordSwingSynth.triggerAttackRelease("D4","16n",getSafeToneTime()); }
function playEyeProjectileHitSound(){ if (gameActive && !gamePaused) eyeProjectileHitSynth.triggerAttackRelease("G2","16n",getSafeToneTime()); }

const backgroundMusicPaths = [
    'audio/background_music.mp3','audio/background_music2.mp3','audio/background_music3.mp3',
    'audio/background_music4.mp3','audio/background_music5.mp3','audio/background_music6.mp3',
    'audio/background_music7.mp3','audio/background_music8.mp3','audio/background_music9.mp3',
    'audio/background_music10.mp3','audio/background_music11.mp3'
];
let currentBGMPlayer = null;

function startBGM() { if (currentBGMPlayer && currentBGMPlayer.state !== 'started') currentBGMPlayer.start(); Tone.Transport.start(); }
function stopBGM()  { if (currentBGMPlayer) currentBGMPlayer.stop(); Tone.Transport.stop(); }
function startMainMenuBGM() {
    if (Tone.context.state !== 'running') { Tone.start().then(() => { if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') { stopBGM(); audioPlayers['mainMenu'].start(); } }); }
    else { if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') { stopBGM(); audioPlayers['mainMenu'].start(); } }
}
function stopMainMenuBGM() { if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state === 'started') audioPlayers['mainMenu'].stop(); }

async function tryLoadMusic(retries = 3) {
    let tracks = [...backgroundMusicPaths];
    for (let i = 0; i < retries; i++) {
        try {
            if (tracks.length === 0) tracks = [...backgroundMusicPaths];
            const path = tracks.splice(Math.floor(Math.random()*tracks.length), 1)[0];
            if (currentBGMPlayer) { currentBGMPlayer.stop(); currentBGMPlayer.dispose(); }
            currentBGMPlayer = new Tone.Player({ url: path, loop: true, autostart: false, volume: -10 }).toDestination();
            musicVolumeSlider.dispatchEvent(new Event('input'));
            await Tone.loaded(); startBGM(); return;
        } catch (e) { console.error(`Music load failed attempt ${i+1}`, e); }
    }
}

// ---- Canvas ----
function resizeCanvas() {
    canvas.width  = 1125; canvas.height = 676;
    player.x = Math.max(player.size/2, Math.min(WORLD_WIDTH  - player.size/2, player.x));
    player.y = Math.max(player.size/2, Math.min(WORLD_HEIGHT - player.size/2, player.y));
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ---- UI helpers ----
function triggerAnimation(element, animationClass) {
    if (!element) return;
    element.classList.add(animationClass);
    element.addEventListener('animationend', () => element.classList.remove(animationClass), { once: true });
}

function updateUIStats() {
    const newLevel = player.level;
    if (currentLevelSpan.textContent !== newLevel.toString()) { currentLevelSpan.textContent = newLevel; triggerAnimation(currentLevelSpan,'stat-updated'); }
    let livesHTML = player.lives > 0 ? '<span class="pulsating-heart">❤️</span>' + '❤️'.repeat(player.lives-1) : '';
    if (playerLivesIcon.innerHTML !== livesHTML) playerLivesIcon.innerHTML = livesHTML;
    const newXp = player.xp;
    if (currentXpSpan.textContent !== newXp.toString()) { currentXpSpan.textContent = newXp; triggerAnimation(currentXpSpan,'stat-updated'); }
    requiredXpSpan.textContent = player.xpToNextLevel;
    currentScoreSpan.textContent = Math.floor(score);
    if (appleCounterSpan) appleCounterSpan.textContent = player.appleCount;
    if (coinCounterSpan)  coinCounterSpan.textContent  = player.coins;
    if (xpBar) xpBar.style.width = `${(player.xp / player.xpToNextLevel) * 100}%`;
}

function updatePowerupIconsUI() {
    powerupIconsDiv.innerHTML = '';
    if (shotgunBlastActive) { powerupIconsDiv.innerHTML += '<span>💥</span>'; }
    else {
        if (rocketLauncherActive)    powerupIconsDiv.innerHTML += '<span>🚀</span>';
        if (vShapeProjectileLevel>0) powerupIconsDiv.innerHTML += `<span>🕊️${vShapeProjectileLevel>1?`x${vShapeProjectileLevel}`:''}</span>`;
    }
    if (dogCompanionActive && magneticProjectileActive) { powerupIconsDiv.innerHTML += '<span>🎯🐶</span>'; }
    else {
        if (dogCompanionActive)      powerupIconsDiv.innerHTML += '<span>🐶</span>';
        if (magneticProjectileActive)powerupIconsDiv.innerHTML += '<span>🧲</span>';
    }
    if (doppelgangerActive)      powerupIconsDiv.innerHTML += '<span>👯</span>';
    if (temporalWardActive)      powerupIconsDiv.innerHTML += '<span>⏱️</span>';
    if (bombEmitterActive)       powerupIconsDiv.innerHTML += '<span>💣</span>';
    if (orbitingPowerUpActive)   powerupIconsDiv.innerHTML += '<span>💫</span>';
    if (damagingCircleActive)    powerupIconsDiv.innerHTML += '<span>⭕</span>';
    if (lightningProjectileActive)powerupIconsDiv.innerHTML += '<span>⚡️</span>';
    if (player.swordActive)      powerupIconsDiv.innerHTML += '<span>🗡️</span>';
    if (iceProjectileActive)     powerupIconsDiv.innerHTML += '<span>❄️</span>';
    if (puddleTrailActive)       powerupIconsDiv.innerHTML += '<span>💧</span>';
    if (laserPointerActive)      powerupIconsDiv.innerHTML += '<span>🔴</span>';
    if (autoAimActive)           powerupIconsDiv.innerHTML += '<span>🎯</span>';
    if (explosiveBulletsActive)  powerupIconsDiv.innerHTML += '<span>💥</span>';
    if (vengeanceNovaActive)     powerupIconsDiv.innerHTML += '<span>🛡️</span>';
    if (antiGravityActive)       powerupIconsDiv.innerHTML += '<span>💨</span>';
    if (ricochetActive)          powerupIconsDiv.innerHTML += '<span>🔄</span>';
    if (blackHoleActive)         powerupIconsDiv.innerHTML += '<span>⚫</span>';
    if (dualGunActive)           powerupIconsDiv.innerHTML += '<span>🔫</span>';
    if (flamingBulletsActive)    powerupIconsDiv.innerHTML += '<span>🔥</span>';
    if (bugSwarmActive)          powerupIconsDiv.innerHTML += '<span>🪰</span>';
    if (nightOwlActive)          powerupIconsDiv.innerHTML += '<span>🦉</span>';
    if (whirlwindAxeActive)      powerupIconsDiv.innerHTML += '<span>🪓</span>';
    if (lightningStrikeActive)   powerupIconsDiv.innerHTML += '<span>⚡</span>';
    if (hasDashInvincibility)    powerupIconsDiv.innerHTML += '<span>🛡️💨</span>';
    if (powerupIconsDiv.scrollHeight > powerupIconsDiv.clientHeight) powerupIconsDiv.classList.add('small-icons');
    else powerupIconsDiv.classList.remove('small-icons');
}

function updateUpgradeStatsUI() {
    upgradeStatsDiv.innerHTML = '';
    const names = { speed:'SPD', fireRate:'FR', magnetRadius:'MAG', damage:'DMG', projectileSpeed:'P.SPD', knockback:'KB', luck:'LUCK' };
    for (const [type, level] of Object.entries(player.upgradeLevels)) {
        if (level > 0) { const p = document.createElement('p'); p.textContent = `${names[type]||type.toUpperCase()}: ${'⭐'.repeat(level)}`; upgradeStatsDiv.appendChild(p); }
    }
}

// ---- Level up ----
function levelUp() {
    gamePaused = true;
    player.level++;
    checkAchievements();
    player.xp -= player.xpToNextLevel;
    if (player.xp < 0) player.xp = 0;
    player.xpToNextLevel += 1;
    Tone.Transport.bpm.value = 120 * (player.level >= 30 ? 2.5 : player.level >= 20 ? 2 : player.level >= 10 ? 1.5 : 1);
    updateUIStats(); vibrate(50); playSound('levelUp');
    showUpgradeMenu();
}

function showUpgradeMenu() {
    if (upgradeOptionsContainer) upgradeOptionsContainer.innerHTML = '';
    let available = [...UPGRADE_OPTIONS];
    const count = 3;
    const selected = [];
    for (let i = 0; i < count; i++) {
        if (!available.length) break;
        selected.push(available.splice(Math.floor(Math.random()*available.length), 1)[0]);
    }
    selected.forEach((upgrade, index) => {
        const card = document.createElement('div');
        card.classList.add('upgrade-card');
        const borderColor = UPGRADE_BORDER_COLORS[upgrade.type] || "#66bb6a";
        card.style.border = `2.5px solid ${borderColor}`;
        card.innerHTML = `<div class="upgrade-icon">${upgrade.icon}</div><h3>${upgrade.name}</h3><p>${upgrade.desc}</p><button>Choose</button>`;
        card.querySelector('button').onclick = () => { applyUpgrade(upgrade); vibrate(10); };
        card.addEventListener('click', () => {
            document.querySelectorAll('.upgrade-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected'); selectedUpgradeIndex = index; vibrate(10); playUISound('uiClick');
        });
        card.addEventListener('mouseover', () => playUISound('uiClick'));
        if (upgradeOptionsContainer) upgradeOptionsContainer.appendChild(card);
    });
    if (upgradeMenu) {
        levelUpBoxImage.classList.add('animate'); levelUpBoxImage.style.display = 'block';
        isGamepadUpgradeMode = true; selectedUpgradeIndex = 0;
        const firstCard = upgradeOptionsContainer.querySelector('.upgrade-card');
        if (firstCard) firstCard.classList.add('selected');
        upgradeMenu.style.display = 'flex';
    }
}

function applyUpgrade(upgrade) {
    playUISound('levelUpSelect');
    if (upgrade.type === "speed")          { player.speed *= (1 + upgrade.value); player.originalPlayerSpeed = player.speed; }
    else if (upgrade.type === "fireRate")  weaponFireInterval = Math.max(50, weaponFireInterval * (1 - upgrade.value));
    else if (upgrade.type === "magnetRadius") player.magnetRadius *= (1 + upgrade.value);
    else if (upgrade.type === "damage")    player.damageMultiplier *= (1 + upgrade.value);
    else if (upgrade.type === "projectileSpeed") player.projectileSpeedMultiplier *= (1 + upgrade.value);
    else if (upgrade.type === "knockback") player.knockbackStrength += upgrade.value;
    else if (upgrade.type === "luck")      { boxDropChance += upgrade.value; appleDropChance += upgrade.value; }
    if (player.upgradeLevels.hasOwnProperty(upgrade.type)) player.upgradeLevels[upgrade.type]++;
    updateUpgradeStatsUI();
    if (upgradeMenu) { levelUpBoxImage.classList.remove('animate'); levelUpBoxImage.style.display = 'none'; upgradeMenu.style.display = 'none'; }
    gamePaused = false; isGamepadUpgradeMode = false;
    joystickDirX = 0; joystickDirY = 0; aimDx = 0; aimDy = 0;
    if (movementStickCap) movementStickCap.style.transform = 'translate(0,0)';
    if (firestickCap)     firestickCap.style.transform     = 'translate(0,0)';
}

// ---- Cheats application ----
function applyCheats() {
    if (cheats.hearts_start_10) { player.lives = 10; player.maxLives = 10; }
    if (cheats.all_powerups_start) {
        for (const key in ALWAYS_AVAILABLE_PICKUPS) activatePowerup(key);
        for (const key in UNLOCKABLE_PICKUPS) { if (playerData.unlockedPickups[key]) activatePowerup(key); }
    }
    if (cheats.dog_companion_start) activatePowerup('dog_companion');
    if (cheats.magnet_mode) player.magnetRadius = WORLD_WIDTH;
}

// ---- High scores ----
function saveHighScore(finalScore, finalLevel) {
    try {
        const hs = JSON.parse(localStorage.getItem('highScores')) || { easy:{score:0,level:1}, medium:{score:0,level:1}, hard:{score:0,level:1} };
        if (finalScore > hs[currentDifficulty].score) { hs[currentDifficulty] = { score: finalScore, level: finalLevel }; localStorage.setItem('highScores', JSON.stringify(hs)); }
    } catch (e) { console.error("Could not save high score:", e); }
}
function displayHighScores() {
    try {
        const hs = JSON.parse(localStorage.getItem('highScores')) || { easy:{score:0,level:1}, medium:{score:0,level:1}, hard:{score:0,level:1} };
        document.getElementById('easyHighScore').textContent   = hs.easy.score;   document.getElementById('easyHighLevel').textContent   = hs.easy.level;
        document.getElementById('mediumHighScore').textContent = hs.medium.score; document.getElementById('mediumHighLevel').textContent = hs.medium.level;
        document.getElementById('hardHighScore').textContent   = hs.hard.score;   document.getElementById('hardHighLevel').textContent   = hs.hard.level;
    } catch (e) { console.error("Could not display high scores:", e); }
}

// ---- Screens ----
function showInitialScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('startScreen').style.display   = 'none';
    const splash = document.getElementById('splashScreen');
    if (!window.hasLoadedOnce) {
        splash.style.display = 'flex'; playUISound('levelUp'); playUISound('levelUpSelect'); vibrate(50);
        setTimeout(() => { splash.style.display = 'none'; difficultyContainer.style.display = 'block'; window.hasLoadedOnce = true; startMainMenuBGM(); }, 3000);
    } else { difficultyContainer.style.display = 'block'; startMainMenuBGM(); }
}

async function showDifficultyScreen() {
    document.querySelector('.bottom-menu-buttons').style.display = 'flex';
    [gameContainer, gameStats, movementStickBase, firestickBase, upgradeMenu, gameOverlay, gameGuideModal, achievementsModal, cheatsModal, pauseOverlay, upgradeShop, mapSelectContainer, characterSelectContainer].forEach(el => { if (el) el.style.display = 'none'; });
    if (pauseButton) pauseButton.style.display = 'none';
    if (mobileResetButton) mobileResetButton.style.display = 'block';
    stopBGM(); startMainMenuBGM(); displayHighScores();
    if (difficultyContainer) difficultyContainer.style.display = 'block';
    if (canvas) canvas.style.cursor = 'default';
    isMouseInCanvas = false; cameraZoom = 1.0;
}

function showMapSelectScreen() {
    difficultyContainer.style.display   = 'none';
    mapSelectContainer.style.display    = 'block';
    mapTilesContainer.innerHTML         = '';
    const mapNames = ["Grass Map 1","Desert Map 1","Desert Map 2","Lava Map 1","Lava Map 2","Desert Map 2","Ice Map 1","Grass Map 1","Ice Map 2"];
    backgroundPaths.forEach((path, index) => {
        const tile = document.createElement('div');
        tile.className = 'map-tile';
        tile.style.backgroundImage = `url('${backgroundImages[index].src}')`;
        tile.dataset.mapIndex = index;
        const label = document.createElement('p');
        label.textContent = mapNames[index] || `Map ${index+1}`;
        tile.appendChild(label);
        tile.addEventListener('click', () => { playUISound('uiClick'); vibrate(10); selectedMapIndex = index; startGame(); });
        mapTilesContainer.appendChild(tile);
    });
}

function showCharacterSelectScreen() {
    difficultyContainer.style.display      = 'none';
    characterSelectContainer.style.display = 'block';
    characterTilesContainer.innerHTML      = '';
    Object.values(CHARACTERS).forEach(character => {
        let isUnlocked = character.unlockCondition.type === 'start' ||
            (character.unlockCondition.type === 'achievement' && ACHIEVEMENTS[character.unlockCondition.id]?.unlocked);
        const tile = document.createElement('div');
        tile.className = 'character-tile';
        if (!isUnlocked) tile.classList.add('locked');
        if (equippedCharacterID === character.id) tile.classList.add('selected');
        tile.innerHTML = `<p class="char-emoji">${character.emoji}</p><h4 class="char-name">${character.name}</h4><p class="char-perk">${isUnlocked ? character.perk : 'LOCKED'}</p>`;
        if (isUnlocked) {
            tile.addEventListener('click', () => {
                playUISound('levelUpSelect'); vibrate(10);
                equippedCharacterID = character.id;
                characterSelectContainer.style.display = 'none';
                difficultyContainer.style.display = 'block';
            });
        }
        characterTilesContainer.appendChild(tile);
    });
}

// ---- Pause ----
function togglePause() {
    vibrate(20); gamePaused = !gamePaused;
    if (gamePaused) { pauseOverlay.style.display = 'flex'; Tone.Transport.pause(); }
    else            { pauseOverlay.style.display = 'none';  Tone.Transport.start();  }
}

// ---- Game loop ----
function gameLoop() {
    update();
    handleGamepadInput();
    draw();
    updateUIStats();
    if (!gameOver && gameActive) animationFrameId = requestAnimationFrame(gameLoop);
}

// ---- Start game ----
async function startGame() {
    stopMainMenuBGM();
    if (Tone.context.state !== 'running') { await Tone.start(); }

    if (selectedMapIndex !== -1 && selectedMapIndex < backgroundImages.length) {
        currentBackgroundIndex = selectedMapIndex;
    } else if (backgroundImages.length > 0) {
        currentBackgroundIndex = Math.floor(Math.random() * backgroundImages.length);
    }

    await tryLoadMusic();
    document.querySelector('.bottom-menu-buttons').style.display = 'none';
    quadtree = new Quadtree({ x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT });

    [gameOverlay, difficultyContainer, mapSelectContainer, characterSelectContainer, gameGuideModal, achievementsModal, cheatsModal].forEach(el => { if (el) el.style.display = 'none'; });
    if (pauseButton)    pauseButton.style.display    = 'block';
    if (gameContainer)  gameContainer.style.display  = 'block';
    if (gameStats)      gameStats.style.display      = 'block';

    if (isMobileDevice) {
        if (movementStickBase) movementStickBase.style.display = 'flex';
        if (firestickBase)     firestickBase.style.display     = 'flex';
        if (mobileResetButton) mobileResetButton.style.display = 'block';
        cameraZoom = 1.4; zoomToggle.checked = true;
    } else {
        if (movementStickBase) movementStickBase.style.display = 'none';
        if (firestickBase)     firestickBase.style.display     = 'none';
        if (canvas)            canvas.style.cursor             = 'none';
        cameraZoom = 1.0; zoomToggle.checked = false;
    }
    isMouseInCanvas = false;

    gameActive = true; gameOver = false; gamePaused = false;
    applyPermanentUpgrades();
    let diffMultiplier = currentDifficulty === 'medium' ? 1.1 : currentDifficulty === 'hard' ? 1.2 : 1.0;

    Object.assign(player, {
        xp: 0, level: 1, xpToNextLevel: 3, projectileSizeMultiplier: 1, projectileSpeedMultiplier: 1,
        speed: 1.4 * diffMultiplier, lives: player.maxLives, orbitAngle: 0, boxPickupsCollectedCount: 0,
        bgmFastModeActive: false, swordActive: false, lastSwordSwingTime: 0, currentSwordSwing: null,
        isSlowedByMosquitoPuddle: false, facing: 'down', appleCount: 0, coins: 0,
        isDashing: false, dashEndTime: 0, lastDashTime: 0 - (playerData.hasReducedDashCooldown ? 3000 : 6000),
        dashCooldown: playerData.hasReducedDashCooldown ? 3000 : 6000,
        isInvincible: false, spinStartTime: null, spinDirection: 0,
        upgradeLevels: { speed:0, fireRate:0, magnetRadius:0, damage:0, projectileSpeed:0, knockback:0, luck:0 }
    });
    player.originalPlayerSpeed = player.speed;
    boxDropChance = 0.01; appleDropChance = 0.05;

    [enemies, pickupItems, appleItems, eyeProjectiles, playerPuddles, snailPuddles, mosquitoPuddles, bombs,
     floatingTexts, visualWarnings, explosions, blackHoles, bloodSplatters, bloodPuddles, antiGravityPulses,
     vengeanceNovas, dogHomingShots, destructibles, flameAreas, flies, owlProjectiles, lightningStrikes, smokeParticles, merchants
    ].forEach(arr => arr.length = 0);

    spawnInitialObstacles();

    score = 0; lastEnemySpawnTime = 0; enemySpawnInterval = 1000;
    lastWeaponFireTime = 0; weaponFireInterval = 400; enemiesDefeatedCount = 0;
    for (const w of weaponPool) { w.active = false; w.hitEnemies.length = 0; }

    fireRateBoostActive = false; fireRateBoostEndTime = 0;
    bombEmitterActive = false; orbitingPowerUpActive = false; damagingCircleActive = false; lastDamagingCircleDamageTime = 0;
    lightningProjectileActive = false; lastLightningSpawnTime = 0; magneticProjectileActive = false;
    vShapeProjectileLevel = 0; iceProjectileActive = false; puddleTrailActive = false;
    laserPointerActive = false; autoAimActive = false; explosiveBulletsActive = false; vengeanceNovaActive = false;
    dogCompanionActive = false; antiGravityActive = false; ricochetActive = false; rocketLauncherActive = false;
    blackHoleActive = false; dualGunActive = false; flamingBulletsActive = false; hasDashInvincibility = false;
    lastAntiGravityPushTime = 0; lastBlackHoleTime = 0; shotgunBlastActive = false;
    doppelgangerActive = false; doppelganger = null;
    bugSwarmActive = false; nightOwlActive = false; whirlwindAxeActive = false; lightningStrikeActive = false; owl = null;
    dog = { x: player.x, y: player.y, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 };
    player2 = null; temporalWardActive = false; isTimeStopped = false; timeStopEndTime = 0;

    resetRunStats(); applyCheats();
    player.x = WORLD_WIDTH / 2; player.y = WORLD_HEIGHT / 2;
    aimDx = 0; aimDy = 0;

    updatePowerupIconsUI(); updateUpgradeStatsUI(); updateUIStats();

    gameStartText.textContent       = "Game Start!";
    gameStartDifficulty.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
    gameStartOverlay.style.display  = 'flex';
    setTimeout(() => { gameStartOverlay.style.display = 'none'; }, 2000);

    Tone.Transport.bpm.value = 120;
    const now = Date.now();
    gameStartTime = now; runStats.startTime = now; lastFrameTime = now;
    runStats.lastDamageTime = now; lastCircleSpawnEventTime = now; lastBarrelSpawnTime = now;
    lastDoppelgangerSpawnTime = now; lastMerchantSpawnTime = now;
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ---- End game ----
async function endGame() {
    playSound('gameOver'); vibrate([100, 30, 100]);
    playerStats.totalDeaths++;
    gameOver = true; gamePaused = true; gameActive = false;
    stopBGM(); cameraZoom = 1.0;
    if (canvas) canvas.style.cursor = 'default';
    isMouseInCanvas = false;
    if (pauseButton) pauseButton.style.display = 'none';
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    [gameContainer, movementStickBase, firestickBase].forEach(el => { if (el) el.style.display = 'none'; });

    const totalSecs = Math.floor((Date.now() - gameStartTime) / 1000);
    if (finalScoreSpan) finalScoreSpan.textContent = Math.floor(score);
    if (finalTimeSpan)  finalTimeSpan.textContent  = `${totalSecs}s`;
    const coins = enemiesDefeatedCount;
    if (coinsEarnedSpan) coinsEarnedSpan.textContent = coins;
    playerData.currency += coins;
    savePlayerData(); savePlayerStats();
    saveHighScore(Math.floor(score), player.level);
    if (gameOverlay) gameOverlay.style.display = 'flex';
    if (loadingStoryDiv) loadingStoryDiv.style.display = 'block';
    if (storytellerOutputDiv) storytellerOutputDiv.textContent = '';
    const msg = `Hark, a hero's tale is sung! For ${totalSecs} grueling seconds, a noble warrior battled the emoji hordes. With unmatched courage, they gathered ${player.xp} XP and etched a legendary score of ${Math.floor(score)} into the annals of history!`;
    if (storytellerOutputDiv) storytellerOutputDiv.textContent = msg;
    if (loadingStoryDiv) loadingStoryDiv.style.display = 'none';
}

// ---- window.onload ----
window.onload = function () {
    if (isMobileDevice) document.body.classList.add('is-mobile');
    loadPlayerData(); loadPlayerStats(); loadCheats(); displayHighScores();
    resizeCanvas();
    [gameContainer, difficultyContainer, mapSelectContainer, characterSelectContainer, movementStickBase,
     firestickBase, upgradeMenu, gameOverlay, gameGuideModal, achievementsModal, cheatsModal].forEach(el => { if (el) el.style.display = 'none'; });
    if (pauseButton) pauseButton.style.display = 'none';

    startButton.addEventListener('click', () => {
        Tone.start().then(() => { showInitialScreen(); });
    }, { once: true });

    [gameGuideModal, achievementsModal, cheatsModal, merchantShop].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { if (modal.id === 'merchantShop') closeMerchantShop(); else modal.style.display = 'none'; }
        });
        const content = modal.querySelector('.content-wrapper') || modal.querySelector('.merchant-options-container');
        if (content) { content.addEventListener('click', e => e.stopPropagation()); content.addEventListener('touchstart', e => e.stopPropagation()); }
    });

    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', e => { vibrate(10); playUISound('uiClick'); currentDifficulty = e.target.dataset.difficulty; if (playerData.unlockedPickups.map_select) showMapSelectScreen(); else { selectedMapIndex = -1; startGame(); } });
        btn.addEventListener('mouseover', () => playUISound('uiClick'));
    });

    if (howToPlayButton) {
        howToPlayButton.addEventListener('click', () => { vibrate(10); if (difficultyContainer) difficultyContainer.style.display='none'; if (gameGuideModal) gameGuideModal.style.display='flex'; });
        howToPlayButton.addEventListener('mouseover', () => playUISound('uiClick'));
    }
    if (backToDifficultyButton) {
        backToDifficultyButton.addEventListener('click', () => { vibrate(10); if (gameGuideModal) gameGuideModal.style.display='none'; if (difficultyContainer) difficultyContainer.style.display='block'; });
    }
    backToDifficultySelectButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); selectedMapIndex=-1; mapSelectContainer.style.display='none'; difficultyContainer.style.display='block'; });
    characterSelectButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); showCharacterSelectScreen(); });
    backToMenuFromCharsButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); characterSelectContainer.style.display='none'; difficultyContainer.style.display='block'; });

    const openShopAction = () => { vibrate(10); playUISound('uiClick'); openUpgradeShop(); };
    desktopUpgradesButton.addEventListener('click', openShopAction);
    if (mobileMenuUpgradesButton) mobileMenuUpgradesButton.addEventListener('click', openShopAction);

    backToMenuButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); showDifficultyScreen(); });
    const resetAction = () => { vibrate(20); resetAllData(); };
    desktopResetButton.addEventListener('click', resetAction);
    mobileResetButton.addEventListener('click', resetAction);

    const achAction = () => { vibrate(10); playUISound('uiClick'); difficultyContainer.style.display='none'; displayAchievements(); achievementsModal.style.display='flex'; };
    desktopAchievementsButton.addEventListener('click', achAction);
    if (mobileMenuTrophiesButton) mobileMenuTrophiesButton.addEventListener('click', achAction);

    const cheatsAction = () => { vibrate(10); playUISound('uiClick'); achievementsModal.style.display='none'; displayCheats(); cheatsModal.style.display='flex'; };
    cheatsMenuButton.addEventListener('click', cheatsAction);
    if (mobileMenuCheatsButton) mobileMenuCheatsButton.addEventListener('click', cheatsAction);

    backToMenuFromAchievements.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); achievementsModal.style.display='none'; difficultyContainer.style.display='block'; });
    backToAchievementsButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); cheatsModal.style.display='none'; displayAchievements(); achievementsModal.style.display='flex'; });

    if (pauseButton) {
        pauseButton.addEventListener('click', togglePause);
        pauseButton.addEventListener('touchstart', e => { e.preventDefault(); vibrate(10); togglePause(); });
    }
    if (resumeButton) {
        const ra = e => { e.preventDefault(); vibrate(10); playUISound('uiClick'); togglePause(); };
        resumeButton.addEventListener('click', ra); resumeButton.addEventListener('touchstart', ra);
    }
    leaveMerchantButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); closeMerchantShop(); });

    musicVolumeSlider.addEventListener('input', e => { if (currentBGMPlayer) currentBGMPlayer.volume.value = e.target.value; });
    effectsVolumeSlider.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        for (const key in audioPlayers) { if (audioPlayers.hasOwnProperty(key)) audioPlayers[key].volume.value = v; }
        swordSwingSynth.volume.value = v; eyeProjectileHitSynth.volume.value = v; bombExplosionSynth.volume.value = v;
    });
    zoomToggle.addEventListener('change', e => { cameraZoom = e.target.checked ? 1.4 : 1.0; });
    pauseRestartButton.addEventListener('click', () => { playUISound('uiClick'); vibrate(10); togglePause(); endGame(); showDifficultyScreen(); });
    restartButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); showDifficultyScreen(); });
};
