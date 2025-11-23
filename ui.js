// ui.js - User Interface, Menus, and Save System
import { 
    gameState, player, playerData, playerStats, 
    UPGRADE_OPTIONS, PERMANENT_UPGRADES, UNLOCKABLE_PICKUPS, 
    ACHIEVEMENTS, CHARACTERS 
} from './data.js';
import { playUISound, vibrate } from './systems.js';

// === DOM ELEMENTS ===
const elements = {
    startScreen: document.getElementById('startScreen'),
    difficultyContainer: document.getElementById('difficultyContainer'),
    gameStats: document.getElementById('gameStats'),
    upgradeMenu: document.getElementById('upgradeMenu'),
    upgradeOptionsContainer: document.getElementById('upgradeOptionsContainer'),
    gameOverOverlay: document.getElementById('gameOverlay'),
    merchantShop: document.getElementById('merchantShop'),
    merchantOptions: document.getElementById('merchantOptionsContainer'),
    
    // HUD
    score: document.getElementById('currentScore'),
    level: document.getElementById('currentLevel'),
    xpBar: document.getElementById('xpBar'),
    lives: document.getElementById('playerLivesIcon'),
    coins: document.getElementById('coinCounter'),
    
    // Shop / Menus
    upgradeShop: document.getElementById('upgradeShop'),
    currencyDisplay: document.getElementById('currencyDisplay'),
    permUpgrades: document.getElementById('permanentUpgradesContainer'),
    unlockables: document.getElementById('unlockablePickupsContainer'),
    
    // Character Select
    charSelectScreen: document.getElementById('characterSelectContainer'),
    charTiles: document.getElementById('characterTilesContainer')
};

// === SAVE SYSTEM ===
export function loadGameData() {
    try {
        const data = localStorage.getItem('emojiSurvivorData');
        if (data) {
            const parsed = JSON.parse(data);
            playerData.currency = parsed.currency || 0;
            playerData.upgrades = parsed.upgrades || {};
            playerData.unlockedPickups = parsed.unlockedPickups || {};
            playerData.hasReducedDashCooldown = parsed.hasReducedDashCooldown || false;
        }
        
        const stats = localStorage.getItem('emojiSurvivorStats');
        if (stats) {
            const parsedStats = JSON.parse(stats);
            Object.assign(playerStats, parsedStats);
            // Sync achievements
            for(const id in ACHIEVEMENTS) {
                if(playerStats.achievements && playerStats.achievements[id]) {
                    ACHIEVEMENTS[id].unlocked = true;
                }
            }
        }
    } catch (e) {
        console.error("Save load error", e);
    }
}

export function saveGameData() {
    // Sync achievement state to stats before saving
    for(const id in ACHIEVEMENTS) {
        if(!playerStats.achievements) playerStats.achievements = {};
        playerStats.achievements[id] = ACHIEVEMENTS[id].unlocked;
    }
    
    localStorage.setItem('emojiSurvivorData', JSON.stringify(playerData));
    localStorage.setItem('emojiSurvivorStats', JSON.stringify(playerStats));
}

// === UI UPDATES ===
export function updateHUD() {
    if (!gameState.gameActive) return;
    
    elements.score.textContent = Math.floor(gameState.score);
    elements.level.textContent = player.level;
    elements.coins.textContent = player.coins;
    
    // XP Bar
    const xpPercent = (player.xp / player.xpToNextLevel) * 100;
    elements.xpBar.style.width = `${Math.min(100, xpPercent)}%`;
    
    // Lives
    let hearts = '';
    if (player.lives > 0) {
        hearts = '<span class="pulsating-heart">❤️</span>' + '❤️'.repeat(Math.max(0, player.lives - 1));
    }
    elements.lives.innerHTML = hearts;
}

export function showUpgradeMenu(applyUpgradeCallback) {
    gameState.gamePaused = true;
    elements.upgradeMenu.style.display = 'flex';
    elements.upgradeOptionsContainer.innerHTML = '';
    
    // Pick 3 random upgrades
    const choices = [];
    const pool = [...UPGRADE_OPTIONS];
    for (let i = 0; i < 3; i++) {
        if (pool.length === 0) break;
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
    }
    
    choices.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <div class="upgrade-icon">${opt.icon}</div>
            <h3>${opt.name}</h3>
            <p>${opt.desc}</p>
            <button>Select</button>
        `;
        card.onclick = () => {
            playUISound('uiClick');
            applyUpgradeCallback(opt);
            elements.upgradeMenu.style.display = 'none';
            gameState.gamePaused = false;
        };
        elements.upgradeOptionsContainer.appendChild(card);
    });
}

// === MAIN MENUS ===
export function setupUI(startGameCallback) {
    // 1. Difficulty Buttons
    document.querySelectorAll('.difficulty-buttons button').forEach(btn => {
        if (btn.dataset.difficulty) {
            btn.onclick = () => {
                playUISound('uiClick');
                gameState.currentDifficulty = btn.dataset.difficulty;
                elements.difficultyContainer.style.display = 'none';
                elements.gameStats.style.display = 'block';
                startGameCallback();
            };
        }
    });

    // 2. Character Select
    document.getElementById('characterSelectButton').onclick = () => {
        playUISound('uiClick');
        elements.difficultyContainer.style.display = 'none';
        elements.charSelectScreen.style.display = 'block';
        renderCharacterTiles();
    };

    document.getElementById('backToMenuFromCharsButton').onclick = () => {
        elements.charSelectScreen.style.display = 'none';
        elements.difficultyContainer.style.display = 'block';
    };

    // 3. Upgrade Shop (Permanent)
    document.getElementById('desktopUpgradesButton').onclick = () => {
        playUISound('uiClick');
        elements.difficultyContainer.style.display = 'none';
        elements.upgradeShop.style.display = 'flex';
        renderShop();
    };
    
    document.getElementById('backToMenuButton').onclick = () => {
        elements.upgradeShop.style.display = 'none';
        elements.difficultyContainer.style.display = 'block';
    };

    // 4. Game Over Restart
    document.getElementById('restartButton').onclick = () => {
        elements.gameOverOverlay.style.display = 'none';
        elements.difficultyContainer.style.display = 'block';
    };
    
    // 5. Initialize
    loadGameData();
}

function renderCharacterTiles() {
    elements.charTiles.innerHTML = '';
    Object.values(CHARACTERS).forEach(char => {
        const isUnlocked = char.unlockCondition.type === 'start' || 
                           (char.unlockCondition.type === 'achievement' && ACHIEVEMENTS[char.unlockCondition.id]?.unlocked);
        
        const tile = document.createElement('div');
        tile.className = `character-tile ${isUnlocked ? '' : 'locked'} ${gameState.equippedCharacterID === char.id ? 'selected' : ''}`;
        tile.innerHTML = `
            <p class="char-emoji">${char.emoji}</p>
            <h4>${char.name}</h4>
            <p>${isUnlocked ? char.perk : 'LOCKED'}</p>
        `;
        
        if (isUnlocked) {
            tile.onclick = () => {
                gameState.equippedCharacterID = char.id;
                playUISound('uiClick');
                renderCharacterTiles(); // Re-render to show selection
            };
        }
        elements.charTiles.appendChild(tile);
    });
}

function renderShop() {
    elements.currencyDisplay.textContent = `Coins: ${playerData.currency} 🪙`;
    elements.permUpgrades.innerHTML = '';
    elements.unlockables.innerHTML = '';

    // Permanent Upgrades
    for (const key in PERMANENT_UPGRADES) {
        const upg = PERMANENT_UPGRADES[key];
        const lvl = playerData.upgrades[key] || 0;
        const cost = Math.floor(upg.baseCost * Math.pow(upg.costIncrease, lvl));
        
        const div = document.createElement('div');
        div.className = 'permanent-upgrade-card';
        div.innerHTML = `
            <h4>${upg.icon} ${upg.name}</h4>
            <p>${upg.desc}</p>
            <p>Lvl: ${lvl}/${upg.maxLevel}</p>
            <button ${playerData.currency < cost || lvl >= upg.maxLevel ? 'disabled' : ''}>
                ${lvl >= upg.maxLevel ? 'MAX' : `Buy ${cost}🪙`}
            </button>
        `;
        div.querySelector('button').onclick = () => {
            if (playerData.currency >= cost) {
                playerData.currency -= cost;
                playerData.upgrades[key] = lvl + 1;
                saveGameData();
                renderShop();
                playUISound('levelUpSelect');
            }
        };
        elements.permUpgrades.appendChild(div);
    }
    
    // Unlockables
    for (const key in UNLOCKABLE_PICKUPS) {
        const item = UNLOCKABLE_PICKUPS[key];
        const unlocked = playerData.unlockedPickups[key];
        
        const div = document.createElement('div');
        div.className = 'permanent-upgrade-card';
        div.innerHTML = `
            <h4>${item.icon} ${item.name}</h4>
            <p>${item.desc}</p>
            <button ${playerData.currency < item.cost || unlocked ? 'disabled' : ''}>
                ${unlocked ? 'Owned' : `Unlock ${item.cost}🪙`}
            </button>
        `;
        if (!unlocked) {
            div.querySelector('button').onclick = () => {
                if (playerData.currency >= item.cost) {
                    playerData.currency -= item.cost;
                    playerData.unlockedPickups[key] = true;
                    saveGameData();
                    renderShop();
                    playUISound('levelUpSelect');
                }
            };
        }
        elements.unlockables.appendChild(div);
    }
}

export function showGameOverScreen() {
    elements.gameOverOverlay.style.display = 'flex';
    document.getElementById('finalScore').textContent = Math.floor(gameState.score);
    document.getElementById('coinsEarned').textContent = gameState.enemiesDefeated; // 1 coin per kill
}
