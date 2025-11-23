// ui.js - Menus, HUD, Shops, Saving
// =================================
import { 
    gameState, player, playerData, playerStats, cheats,
    UPGRADE_OPTIONS, PERMANENT_UPGRADES, UNLOCKABLE_PICKUPS, ACHIEVEMENTS, CHARACTERS 
} from './data.js';
import { playUISound, vibrate } from './systems.js';

// DOM Elements
const els = {
    difficulty: document.getElementById('difficultyContainer'),
    startScreen: document.getElementById('startScreen'),
    hud: document.getElementById('gameStats'),
    upgradeMenu: document.getElementById('upgradeMenu'),
    upgradeContainer: document.getElementById('upgradeOptionsContainer'),
    merchant: document.getElementById('merchantShop'),
    merchantOpts: document.getElementById('merchantOptionsContainer'),
    shop: document.getElementById('upgradeShop'),
    charSelect: document.getElementById('characterSelectContainer'),
    mapSelect: document.getElementById('mapSelectContainer'),
    achievements: document.getElementById('achievementsModal'),
    cheats: document.getElementById('cheatsModal'),
    gameOver: document.getElementById('gameOverlay')
};

// === SAVE/LOAD ===
export function loadGameData() {
    try {
        const d = localStorage.getItem('emojiSurvivorData');
        if(d) {
            const p = JSON.parse(d);
            playerData.currency = p.currency || 0;
            playerData.upgrades = p.upgrades || {};
            playerData.unlockedPickups = p.unlockedPickups || {};
            playerData.hasReducedDashCooldown = p.hasReducedDashCooldown || false;
        }
        const s = localStorage.getItem('emojiSurvivorStats');
        if(s) {
            const stats = JSON.parse(s);
            Object.assign(playerStats, stats);
            // Sync unlocked achievements
            for(const id in ACHIEVEMENTS) {
                if(playerStats.achievements && playerStats.achievements[id]) ACHIEVEMENTS[id].unlocked = true;
            }
        }
        const c = localStorage.getItem('emojiSurvivorCheats');
        if(c) Object.assign(cheats, JSON.parse(c));
    } catch(e) { console.error("Load failed", e); }
}

export function saveGameData() {
    // Sync achievement state
    for(const id in ACHIEVEMENTS) {
        if(!playerStats.achievements) playerStats.achievements = {};
        playerStats.achievements[id] = ACHIEVEMENTS[id].unlocked;
    }
    localStorage.setItem('emojiSurvivorData', JSON.stringify(playerData));
    localStorage.setItem('emojiSurvivorStats', JSON.stringify(playerStats));
    localStorage.setItem('emojiSurvivorCheats', JSON.stringify(cheats));
}

// === HUD ===
export function updateHUD() {
    if(!gameState.gameActive) return;
    document.getElementById('currentScore').textContent = Math.floor(gameState.score);
    document.getElementById('currentLevel').textContent = player.level;
    document.getElementById('coinCounter').textContent = player.coins;
    
    // XP Bar
    const xpPct = (player.xp / player.xpToNextLevel) * 100;
    document.getElementById('xpBar').style.width = `${Math.min(100, xpPct)}%`;
    
    // Lives
    let hearts = '';
    if(player.lives > 0) hearts = '<span class="pulsating-heart">❤️</span>' + '❤️'.repeat(Math.max(0, player.lives-1));
    document.getElementById('playerLivesIcon').innerHTML = hearts;
}

// === UPGRADE MENU (Level Up) ===
export function showLevelUpMenu(applyCallback) {
    gameState.gamePaused = true;
    els.upgradeMenu.style.display = 'flex';
    els.upgradeContainer.innerHTML = '';

    const choices = [];
    const pool = [...UPGRADE_OPTIONS];
    const count = cheats.hardcoreMode ? 2 : 3;
    
    for(let i=0; i<count; i++) {
        if(!pool.length) break;
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
    }

    choices.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `<div class="upgrade-icon">${opt.icon}</div><h3>${opt.name}</h3><p>${opt.desc}</p><button>Select</button>`;
        card.onclick = () => {
            playUISound('uiClick');
            applyCallback(opt);
            els.upgradeMenu.style.display = 'none';
            gameState.gamePaused = false;
        };
        els.upgradeContainer.appendChild(card);
    });
}

// === MERCHANT ===
export function showMerchantMenu(closeCallback, buyCallback) {
    gameState.gamePaused = true;
    els.merchant.style.display = 'flex';
    els.merchantOpts.innerHTML = '';
    
    // Sample Logic: XP or Random Powerups
    const ops = [
        { type: 'xp', name: 'Buy XP', desc: 'Trade 3 Apples', cost: 3, currency: 'apple', icon: '📈' }
    ];
    // Add logic to pick random purchaseable powerups here based on your script...

    ops.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'merchant-card';
        div.innerHTML = `<h3>${opt.name}</h3><p>${opt.desc}</p><button>Buy</button>`;
        div.onclick = () => buyCallback(opt);
        els.merchantOpts.appendChild(div);
    });

    document.getElementById('leaveMerchantButton').onclick = () => {
        els.merchant.style.display = 'none';
        gameState.gamePaused = false;
        closeCallback();
    };
}

// === MAIN MENU SETUP ===
export function setupUI(startCallback) {
    // Difficulty
    document.querySelectorAll('.difficulty-buttons button[data-difficulty]').forEach(btn => {
        btn.onclick = () => {
            playUISound('uiClick');
            gameState.currentDifficulty = btn.dataset.difficulty;
            if(playerData.unlockedPickups.map_select) {
                els.difficulty.style.display = 'none';
                els.mapSelect.style.display = 'block';
                renderMapSelect(startCallback);
            } else {
                els.difficulty.style.display = 'none';
                els.hud.style.display = 'block';
                startCallback();
            }
        };
    });

    // Character Select
    document.getElementById('characterSelectButton').onclick = () => {
        els.difficulty.style.display = 'none';
        els.charSelect.style.display = 'block';
        renderCharSelect();
    };
    document.getElementById('backToMenuFromCharsButton').onclick = () => {
        els.charSelect.style.display = 'none';
        els.difficulty.style.display = 'block';
    };

    // Permanent Shop
    document.getElementById('desktopUpgradesButton').onclick = () => {
        els.difficulty.style.display = 'none';
        els.shop.style.display = 'flex';
        renderShop();
    };
    document.getElementById('backToMenuButton').onclick = () => {
        els.shop.style.display = 'none';
        els.difficulty.style.display = 'block';
    };
    
    // Trophies
    document.getElementById('desktopAchievementsButton').onclick = () => {
        els.difficulty.style.display = 'none';
        els.achievements.style.display = 'flex';
        renderAchievements();
    };
    document.getElementById('backToMenuFromAchievements').onclick = () => {
        els.achievements.style.display = 'none';
        els.difficulty.style.display = 'block';
    };

    loadGameData();
}

function renderMapSelect(cb) {
    const container = document.getElementById('mapTilesContainer');
    container.innerHTML = '';
    // Maps
    const maps = ["Grass", "Desert", "Lava", "Ice", "Stone"];
    maps.forEach((m, i) => {
        const tile = document.createElement('div');
        tile.className = 'map-tile';
        tile.textContent = m; // Ideally use bg images
        tile.onclick = () => {
            gameState.selectedMapIndex = i;
            els.mapSelect.style.display = 'none';
            els.hud.style.display = 'block';
            cb();
        };
        container.appendChild(tile);
    });
}

function renderCharSelect() {
    const con = document.getElementById('characterTilesContainer');
    con.innerHTML = '';
    Object.values(CHARACTERS).forEach(c => {
        const unlocked = c.unlockCondition.type === 'start' || (ACHIEVEMENTS[c.unlockCondition.id]?.unlocked);
        const div = document.createElement('div');
        div.className = `character-tile ${unlocked?'':'locked'} ${gameState.equippedCharacterID===c.id?'selected':''}`;
        div.innerHTML = `<h4>${c.emoji} ${c.name}</h4>`;
        if(unlocked) div.onclick = () => { gameState.equippedCharacterID = c.id; renderCharSelect(); };
        con.appendChild(div);
    });
}

function renderShop() {
    const con = document.getElementById('permanentUpgradesContainer');
    con.innerHTML = '';
    for(const k in PERMANENT_UPGRADES) {
        const u = PERMANENT_UPGRADES[k];
        const lvl = playerData.upgrades[k] || 0;
        const cost = Math.floor(u.baseCost * Math.pow(u.costIncrease, lvl));
        const div = document.createElement('div');
        div.className = 'permanent-upgrade-card';
        div.innerHTML = `<h4>${u.icon} ${u.name}</h4><p>Lvl ${lvl}/${u.maxLevel}</p><button ${playerData.currency<cost?'disabled':''}>Buy ${cost}</button>`;
        div.querySelector('button').onclick = () => {
            if(playerData.currency >= cost) {
                playerData.currency -= cost;
                playerData.upgrades[k] = lvl+1;
                saveGameData();
                renderShop();
            }
        };
        con.appendChild(div);
    }
}

function renderAchievements() {
    const con = document.getElementById('achievementsContainer');
    con.innerHTML = '';
    for(const k in ACHIEVEMENTS) {
        const a = ACHIEVEMENTS[k];
        const div = document.createElement('div');
        div.className = `achievement-card ${a.unlocked?'unlocked':''}`;
        div.innerHTML = `<div>${a.icon}</div><div><h4>${a.name}</h4><p>${a.desc}</p></div>`;
        con.appendChild(div);
    }
}
