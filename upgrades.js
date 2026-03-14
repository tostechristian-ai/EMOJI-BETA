// ============================================================
// upgrades.js — Persistent shop upgrades, unlockable pickups,
//               powerup activation and level-up menu
// ============================================================

let playerData = {};

// ---- Persistence ----
function loadPlayerData() {
    try {
        const savedData = localStorage.getItem('emojiSurvivorData');
        if (savedData) {
            playerData = JSON.parse(savedData);
            for (const key in PERMANENT_UPGRADES) {
                if (!playerData.upgrades.hasOwnProperty(key)) playerData.upgrades[key] = 0;
            }
            if (!playerData.unlockedPickups) playerData.unlockedPickups = {};
            for (const key in UNLOCKABLE_PICKUPS) {
                if (!playerData.unlockedPickups.hasOwnProperty(key)) playerData.unlockedPickups[key] = false;
            }
        } else { initializePlayerData(); }
    } catch (e) { console.error("Failed to load player data", e); initializePlayerData(); }
}

function initializePlayerData() {
    playerData = { currency: 0, upgrades: {}, unlockedPickups: {}, hasReducedDashCooldown: false };
    for (const key in PERMANENT_UPGRADES)  playerData.upgrades[key]         = 0;
    for (const key in UNLOCKABLE_PICKUPS)  playerData.unlockedPickups[key]  = false;
}

function savePlayerData() {
    try { localStorage.setItem('emojiSurvivorData', JSON.stringify(playerData)); }
    catch (e) { console.error("Failed to save player data.", e); }
}

// ---- Shop display ----
function openUpgradeShop() {
    difficultyContainer.style.display = 'none';
    upgradeShop.style.display = 'flex';
    displayUpgrades();
}

function displayUpgrades() {
    currencyDisplay.textContent = `Coins: ${playerData.currency} 🪙`;
    permanentUpgradesContainer.innerHTML = '';
    unlockablePickupsContainer.innerHTML = '';

    for (const key in PERMANENT_UPGRADES) {
        const config       = PERMANENT_UPGRADES[key];
        const currentLevel = playerData.upgrades[key] || 0;
        const cost         = Math.floor(config.baseCost * Math.pow(config.costIncrease, currentLevel));
        const card         = document.createElement('div');
        card.className     = 'permanent-upgrade-card';
        let buttonHTML     = `<button onclick="buyUpgrade('${key}')">Buy (${cost} 🪙)</button>`;
        if (currentLevel >= config.maxLevel)      buttonHTML = `<button disabled>MAX</button>`;
        else if (playerData.currency < cost)      buttonHTML = `<button disabled>Buy (${cost} 🪙)</button>`;
        card.innerHTML = `<h4>${config.icon} ${config.name}</h4><p>${config.desc}</p><div class="upgrade-level">Level: ${currentLevel} / ${config.maxLevel}</div>${buttonHTML}`;
        permanentUpgradesContainer.appendChild(card);
    }

    for (const key in UNLOCKABLE_PICKUPS) {
        const config    = UNLOCKABLE_PICKUPS[key];
        const isUnlocked = playerData.unlockedPickups[key];
        const card      = document.createElement('div');
        card.className  = 'permanent-upgrade-card';
        card.style.borderColor = isUnlocked ? '#FFD700' : '#F44336';
        let buttonHTML  = `<button onclick="buyUnlockable('${key}')">Unlock (${config.cost} 🪙)</button>`;
        if (isUnlocked)                    buttonHTML = `<button disabled>Unlocked</button>`;
        else if (playerData.currency < config.cost)  buttonHTML = `<button disabled>Unlock (${config.cost} 🪙)</button>`;
        card.innerHTML = `<h4>${config.icon} ${config.name}</h4><p>${config.desc}</p>${buttonHTML}`;
        unlockablePickupsContainer.appendChild(card);
    }
}

function buyUpgrade(key) {
    const config       = PERMANENT_UPGRADES[key];
    const currentLevel = playerData.upgrades[key] || 0;
    const cost         = Math.floor(config.baseCost * Math.pow(config.costIncrease, currentLevel));
    if (playerData.currency >= cost && currentLevel < config.maxLevel) {
        playerData.currency -= cost;
        playerData.upgrades[key]++;
        savePlayerData();
        displayUpgrades();
        playUISound('levelUpSelect');
    }
}

function buyUnlockable(key) {
    const config    = UNLOCKABLE_PICKUPS[key];
    const isUnlocked = playerData.unlockedPickups[key];
    if (playerData.currency >= config.cost && !isUnlocked) {
        playerData.currency -= config.cost;
        playerData.unlockedPickups[key] = true;
        savePlayerData();
        displayUpgrades();
        playUISound('levelUpSelect');
        checkAchievements();
    }
}

// ---- Powerup activation ----
function activatePowerup(id) {
    if (id === 'doppelganger') {
        doppelgangerActive = true;
        runStats.lastDoppelgangerStartTime = Date.now();
        doppelganger = {
            x: player.x - player.size * 2, y: player.y, size: player.size,
            rotationAngle: 0, lastFireTime: 0, endTime: Date.now() + DOPPELGANGER_DURATION
        };
    }
    else if (id === 'dash_invincibility')   { hasDashInvincibility = true; }
    else if (id === 'dash_cooldown')        { playerData.hasReducedDashCooldown = true; player.dashCooldown = 3000; savePlayerData(); }
    else if (id === 'temporal_ward')        temporalWardActive = true;
    else if (id === 'bomb')                 { bombEmitterActive = true; lastBombEmitMs = Date.now(); }
    else if (id === 'orbiter')              { orbitingPowerUpActive = true; player.orbitAngle = 0; }
    else if (id === 'circle')               { damagingCircleActive = true; lastDamagingCircleDamageTime = Date.now(); }
    else if (id === 'lightning_projectile') { lightningProjectileActive = true; lastLightningSpawnTime = Date.now(); }
    else if (id === 'magnetic_projectile')  magneticProjectileActive = true;
    else if (id === 'v_shape_projectile')   vShapeProjectileLevel = Math.min(4, vShapeProjectileLevel + 1);
    else if (id === 'sword')                { player.swordActive = true; player.lastSwordSwingTime = Date.now() - SWORD_SWING_INTERVAL; }
    else if (id === 'ice_projectile')       iceProjectileActive = true;
    else if (id === 'puddle_trail')         { puddleTrailActive = true; lastPlayerPuddleSpawnTime = Date.now() - PLAYER_PUDDLE_SPAWN_INTERVAL; }
    else if (id === 'laser_pointer')        laserPointerActive = true;
    else if (id === 'auto_aim')             autoAimActive = true;
    else if (id === 'explosive_bullets')    explosiveBulletsActive = true;
    else if (id === 'vengeance_nova')       vengeanceNovaActive = true;
    else if (id === 'dog_companion')        { dogCompanionActive = true; dog.x = player.x; dog.y = player.y; dog.state = 'returning'; }
    else if (id === 'anti_gravity')         { antiGravityActive = true; lastAntiGravityPushTime = Date.now(); }
    else if (id === 'ricochet')             ricochetActive = true;
    else if (id === 'rocket_launcher')      { rocketLauncherActive = true; weaponFireInterval *= 2; }
    else if (id === 'black_hole')           { blackHoleActive = true; lastBlackHoleTime = Date.now(); }
    else if (id === 'dual_gun')             dualGunActive = true;
    else if (id === 'flaming_bullets')      flamingBulletsActive = true;
    else if (id === 'bug_swarm')            { bugSwarmActive = true; lastBugSwarmSpawnTime = Date.now(); }
    else if (id === 'night_owl')            nightOwlActive = true;
    else if (id === 'whirlwind_axe')        whirlwindAxeActive = true;
    else if (id === 'lightning_strike')     { lightningStrikeActive = true; lastLightningStrikeTime = Date.now(); }
    updatePowerupIconsUI();
}

// ---- Level-up menu ----
function levelUp() {
    gamePaused = true;
    player.level++;
    player.xp -= player.xpToNextLevel;
    player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.4);
    runStats.levelsGainedThisRun++;
    playUISound('levelUp');
    vibrate(50);

    upgradeOptionsContainer.innerHTML = '';
    const shuffled = [...UPGRADE_OPTIONS].sort(() => Math.random() - 0.5).slice(0, 3);

    shuffled.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.style.borderColor = UPGRADE_BORDER_COLORS[opt.type] || '#fff';
        card.innerHTML = `
            <div class="upgrade-icon">${opt.icon}</div>
            <h3>${opt.name}</h3>
            <p>${opt.desc}</p>
            <button>Choose</button>
        `;
        card.querySelector('button').addEventListener('click', () => {
            player.upgradeLevels[opt.type] = (player.upgradeLevels[opt.type] || 0) + 1;
            if (opt.type === 'speed')           player.speed              *= (1 + opt.value);
            else if (opt.type === 'fireRate')   weaponFireInterval        = Math.max(50, weaponFireInterval * (1 - opt.value));
            else if (opt.type === 'magnetRadius') player.magnetRadius     *= (1 + opt.value);
            else if (opt.type === 'damage')     player.damageMultiplier   *= (1 + opt.value);
            else if (opt.type === 'projectileSpeed') player.projectileSpeedMultiplier *= (1 + opt.value);
            else if (opt.type === 'knockback')  player.knockbackStrength  += opt.value;
            else if (opt.type === 'luck')       { boxDropChance += opt.value; appleDropChance += opt.value; }

            playUISound('levelUpSelect');
            vibrate(20);
            upgradeMenu.style.display = 'none';
            gamePaused = false;
        });
        upgradeOptionsContainer.appendChild(card);
    });

    upgradeMenu.style.display = 'flex';
    isGamepadUpgradeMode   = true;
    selectedUpgradeIndex   = 0;
    const firstCard = document.querySelector('.upgrade-card');
    if (firstCard) firstCard.classList.add('selected');
}

// ---- Reset all data ----
function resetAllData() {
    const userConfirmed = window.confirm(
        "Are you sure you want to reset all your progress? This will erase your coins, upgrades, high scores, and ALL achievements permanently."
    );
    if (userConfirmed) {
        localStorage.removeItem('emojiSurvivorData');
        localStorage.removeItem('highScores');
        localStorage.removeItem('emojiSurvivorStats');
        localStorage.removeItem('emojiSurvivorCheats');
        initializePlayerData();
        initializePlayerStats();
        loadCheats();
        displayHighScores();
        console.log("All player data has been reset.");
    }
}
