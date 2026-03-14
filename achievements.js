// ============================================================
// achievements.js — Achievement tracking, cheats, stats save/load
// ============================================================

let playerStats = {};
let runStats    = {};
let cheats      = {};

let achievementUnlockQueue = [];
let isBannerShowing        = false;

// ---- Player stats ----
function initializePlayerStats() {
    playerStats = {
        totalKills: 0, totalBossesKilled: 0, totalDashes: 0,
        totalCoins: 0, totalDeaths: 0, achievements: {}
    };
    for (const id in ACHIEVEMENTS) { playerStats.achievements[id] = false; }
}

function resetRunStats() {
    runStats = {
        killsThisRun: 0, bossesKilledThisRun: 0, powerupsPickedUp: 0,
        bulletsFired: 0, bulletsHit: 0, killsWithSword: 0, killsWithBones: 0,
        startTime: 0, maxHeartsReached: 0, hasBeenAtOneHeart: false,
        coinsThisRun: 0, levelsGainedThisRun: 0, lastDamageTime: 0,
        killsPerExplosion: {}, dashesThisRun: 0, vampiresKilledThisRun: 0,
        applesEatenThisRun: 0, xpCollectedThisRun: 0,
        doppelgangerActiveTimeThisRun: 0, lastDoppelgangerStartTime: 0
    };
}

function loadPlayerStats() {
    try {
        const savedStats = localStorage.getItem('emojiSurvivorStats');
        if (savedStats) {
            playerStats = JSON.parse(savedStats);
            for (const id in ACHIEVEMENTS) {
                if (playerStats.achievements && playerStats.achievements[id]) {
                    ACHIEVEMENTS[id].unlocked = true;
                } else if (!playerStats.achievements) {
                    playerStats.achievements = {};
                }
            }
        } else {
            initializePlayerStats();
        }
    } catch (e) {
        console.error("Failed to load player stats, initializing new data.", e);
        initializePlayerStats();
    }
}

function savePlayerStats() {
    try {
        for (const id in ACHIEVEMENTS) { playerStats.achievements[id] = ACHIEVEMENTS[id].unlocked; }
        localStorage.setItem('emojiSurvivorStats', JSON.stringify(playerStats));
    } catch (e) { console.error("Failed to save player stats.", e); }
}

// ---- Cheats ----
function loadCheats() {
    try {
        const savedCheats = localStorage.getItem('emojiSurvivorCheats');
        if (savedCheats) {
            cheats = JSON.parse(savedCheats);
        } else {
            for (const id in CHEATS) { cheats[id] = false; }
        }
    } catch (e) {
        console.error("Failed to load cheats.", e);
        for (const id in CHEATS) { cheats[id] = false; }
    }
}

function saveCheats() {
    try { localStorage.setItem('emojiSurvivorCheats', JSON.stringify(cheats)); }
    catch (e) { console.error("Failed to save cheats.", e); }
}

// ---- Achievement logic ----
function showAchievementBanner() {
    if (isBannerShowing || achievementUnlockQueue.length === 0) return;
    isBannerShowing = true;
    const trophyId  = achievementUnlockQueue.shift();
    const trophy    = ACHIEVEMENTS[trophyId];

    document.getElementById('achievement-banner-icon').textContent = trophy.icon;
    document.getElementById('achievement-banner-name').textContent = `Trophy Unlocked!`;
    document.getElementById('achievement-banner-desc').textContent = trophy.name;

    achievementBanner.classList.add('show');
    achievementBanner.addEventListener('animationend', () => {
        achievementBanner.classList.remove('show');
        isBannerShowing = false;
        setTimeout(showAchievementBanner, 500);
    }, { once: true });
}

function unlockAchievement(id) {
    if (ACHIEVEMENTS[id] && !ACHIEVEMENTS[id].unlocked) {
        ACHIEVEMENTS[id].unlocked = true;
        vibrate(50);
        playUISound('levelUpSelect');
        achievementUnlockQueue.push(id);
        showAchievementBanner();
        savePlayerStats();
    }
}

function checkAchievements() {
    if (!gameActive || gameOver) return;
    const now          = Date.now();
    const survivalTime = now - runStats.startTime;

    if (runStats.killsThisRun >= 1)                         unlockAchievement('first_blood');
    if (runStats.killsThisRun >= 100)                       unlockAchievement('hunter');
    if (playerStats.totalKills >= 1000)                     unlockAchievement('slayer');
    if (playerStats.totalKills >= 10000)                    unlockAchievement('exterminator');
    if (runStats.bossesKilledThisRun >= 1)                  unlockAchievement('boss_breaker');
    if (playerStats.totalBossesKilled >= 10)                unlockAchievement('boss_crusher');
    if (survivalTime >= 5 * 60 * 1000)                      unlockAchievement('survivor');
    if (survivalTime >= 10 * 60 * 1000)                     unlockAchievement('endurer');
    if (survivalTime >= 20 * 60 * 1000)                     unlockAchievement('unbreakable');
    if (runStats.coinsThisRun >= 100)                       unlockAchievement('treasure_hunter');
    if (runStats.coinsThisRun >= 1000)                      unlockAchievement('rich_kid');
    if (playerStats.totalCoins >= 10000)                    unlockAchievement('millionaire');
    if (runStats.levelsGainedThisRun >= 10)                 unlockAchievement('quick_learner');
    if (cheats.night_mode && survivalTime >= 5 * 60 * 1000) unlockAchievement('night_walker');
}

// ---- UI display ----
function displayAchievements() {
    achievementsContainer.innerHTML = '';
    for (const id in ACHIEVEMENTS) {
        const achievement = ACHIEVEMENTS[id];
        const card = document.createElement('div');
        card.className = 'achievement-card' + (achievement.unlocked ? ' unlocked' : '');
        card.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-details">
                <h4>${achievement.name}</h4>
                <p>${achievement.desc}</p>
            </div>
        `;
        achievementsContainer.appendChild(card);
    }
}

function displayCheats() {
    cheatsContainer.innerHTML = '';
    for (const id in CHEATS) {
        const cheat = CHEATS[id];
        const unlockedByTrophyId = Object.keys(TROPHY_UNLOCKS_CHEAT).find(key => TROPHY_UNLOCKS_CHEAT[key] === id);
        const isUnlocked = unlockedByTrophyId && ACHIEVEMENTS[unlockedByTrophyId]?.unlocked;

        const card = document.createElement('div');
        card.className = 'cheat-card' + (isUnlocked ? '' : ' locked');

        const toggleHTML = isUnlocked ? `
            <label class="switch">
                <input type="checkbox" id="cheat-${id}" ${cheats[id] ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
        ` : '<span>🔒</span>';

        card.innerHTML = `
            <div class="cheat-info">
                <h4>${cheat.name}</h4>
                <p>${isUnlocked ? cheat.desc : `Unlock the "${ACHIEVEMENTS[unlockedByTrophyId]?.name}" trophy.`}</p>
            </div>
            ${toggleHTML}
        `;
        cheatsContainer.appendChild(card);

        if (isUnlocked) {
            document.getElementById(`cheat-${id}`).addEventListener('change', (e) => {
                cheats[id] = e.target.checked;
                saveCheats();
            });
        }
    }
}
