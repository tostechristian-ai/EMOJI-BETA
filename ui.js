/**
 * ui.js
 * Centralized UI management for menus, upgrades, stats, and dialogs
 * Depends on: constants.js, state.js, audio.js
 */

import { 
  INITIAL_XP_TO_NEXT_LEVEL, 
  XP_LEVEL_MULTIPLIER,
  PLAYER_MAX_LIVES 
} from './constants.js';

import { 
  gameState, 
  player, 
  setGamePaused, 
  addScore,
  addEnemyDefeated 
} from './state.js';

import { playSound, playUISound } from './audio.js';

// ============================================
// UI STATE
// ============================================

export const uiState = {
  isMenuOpen: false,
  isPauseMenuOpen: false,
  isUpgradeMenuOpen: false,
  isGameOverMenuOpen: false,
  currentMenu: null,
};

// ============================================
// GAME STATS UI
// ============================================

/**
 * Update in-game stats display
 */
export function updateGameStatsUI() {
  const statsDiv = document.getElementById('gameStats');
  if (!statsDiv) return;

  const xpPercent = Math.floor((player.xp / player.xpToNextLevel) * 100);
  
  statsDiv.innerHTML = `
    <div class="stat-item">
      <span>Level: <strong>${player.level}</strong></span>
    </div>
    <div class="stat-item">
      <span>Lives: <strong>${player.lives}/${player.maxLives}</strong></span>
    </div>
    <div class="stat-item">
      <span>Score: <strong>${Math.floor(gameState.score)}</strong></span>
    </div>
    <div class="stat-item">
      <span>XP: <strong>${player.xp}/${player.xpToNextLevel}</strong> (${xpPercent}%)</span>
      <div class="xp-bar" style="width: ${xpPercent}%"></div>
    </div>
  `;
}

/**
 * Update permanent upgrade display
 */
export function updateUpgradeStatsUI() {
  const upgradeStatsDiv = document.getElementById('upgradeStats');
  if (!upgradeStatsDiv) return;

  upgradeStatsDiv.innerHTML = '';
  
  const upgradeNames = {
    speed: 'SPD',
    fireRate: 'FR',
    magnetRadius: 'MAG',
    damage: 'DMG',
    projectileSpeed: 'P.SPD',
    knockback: 'KB',
    luck: 'LUCK',
  };

  for (const [type, level] of Object.entries(player.upgradeLevels)) {
    if (level > 0) {
      const p = document.createElement('p');
      p.textContent = `${upgradeNames[type] || type.toUpperCase()}: ${'⭐'.repeat(level)}`;
      upgradeStatsDiv.appendChild(p);
    }
  }
}

/**
 * Update active powerups display
 */
export function updatePowerupIconsUI() {
  const powerupIconsDiv = document.getElementById('powerupIcons');
  if (!powerupIconsDiv) return;

  powerupIconsDiv.innerHTML = '';

  // Check for active powerups (customize as needed)
  const checks = [
    { val: player.isInvincible, icon: '🛡️' },
    { val: player.isDashing, icon: '💨' },
    { val: player.swordActive, icon: '⚔️' },
  ];

  checks.forEach(c => {
    if (c.val) {
      powerupIconsDiv.innerHTML += `<span>${c.icon}</span>`;
    }
  });

  // Adjust font size if overflow
  if (powerupIconsDiv.scrollHeight > powerupIconsDiv.clientHeight) {
    powerupIconsDiv.classList.add('small-icons');
  } else {
    powerupIconsDiv.classList.remove('small-icons');
  }
}

// ============================================
// LEVEL UP SYSTEM
// ============================================

/**
 * Define level up upgrade options
 */
const LEVELUP_OPTIONS = [
  {
    text: 'Speed +10%',
    emoji: '⚡',
    action: () => {
      player.speed *= 1.1;
      player.upgradeLevels.speed++;
    },
  },
  {
    text: 'Damage +10%',
    emoji: '💥',
    action: () => {
      player.damageMultiplier *= 1.1;
      player.upgradeLevels.damage++;
    },
  },
  {
    text: 'Heal 1 Heart',
    emoji: '❤️',
    action: () => {
      if (player.lives < player.maxLives) {
        player.lives++;
      }
    },
  },
  {
    text: 'Fire Rate +10%',
    emoji: '🔫',
    action: () => {
      player.projectileSpeedMultiplier *= 1.1;
      player.upgradeLevels.fireRate++;
    },
  },
  {
    text: 'Magnet Radius +10%',
    emoji: '🧲',
    action: () => {
      player.magnetRadius *= 1.1;
      player.upgradeLevels.magnetRadius++;
    },
  },
];

/**
 * Trigger level up event and show upgrade menu
 */
export function triggerLevelUp() {
  gameState.paused = true;
  setGamePaused(true);
  
  player.level++;
  player.xp = 0;
  player.xpToNextLevel = Math.ceil(player.xpToNextLevel * XP_LEVEL_MULTIPLIER);
  
  updateGameStatsUI();
  playSound('levelUp');
  
  showLevelUpMenu();
}

/**
 * Display level up upgrade menu
 */
function showLevelUpMenu() {
  const menu = document.getElementById('upgradeMenu');
  const container = document.getElementById('upgradeOptionsContainer');
  
  if (!menu || !container) return;

  container.innerHTML = '';
  uiState.isUpgradeMenuOpen = true;

  // Shuffle and select 3 random options
  const selectedOptions = LEVELUP_OPTIONS
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  selectedOptions.forEach((option, index) => {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="upgrade-card-content">
        <div class="upgrade-emoji">${option.emoji}</div>
        <h3>${option.text}</h3>
        <button class="upgrade-select-btn">Select</button>
      </div>
    `;

    card.onclick = () => {
      option.action();
      updateGameStatsUI();
      updateUpgradeStatsUI();
      menu.style.display = 'none';
      gameState.paused = false;
      setGamePaused(false);
      uiState.isUpgradeMenuOpen = false;
      playUISound('levelUpSelect');
    };

    container.appendChild(card);
  });

  menu.style.display = 'flex';
}

// ============================================
// MAIN MENU SYSTEM
// ============================================

/**
 * Show main menu
 */
export function showMainMenu() {
  document.getElementById('startScreen')?.style.display === 'flex';
  uiState.isMenuOpen = true;
}

/**
 * Hide main menu
 */
export function hideMainMenu() {
  document.getElementById('startScreen')?.style.display = 'none';
  uiState.isMenuOpen = false;
}

/**
 * Show difficulty selection
 */
export function showDifficultyMenu() {
  const container = document.getElementById('difficultyContainer');
  if (container) {
    container.style.display = 'block';
  }
}

/**
 * Hide difficulty selection
 */
export function hideDifficultyMenu() {
  const container = document.getElementById('difficultyContainer');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * Show character selection menu
 */
export function showCharacterSelect() {
  const container = document.getElementById('characterSelectContainer');
  if (!container) return;

  hideDifficultyMenu();
  container.style.display = 'block';
}

/**
 * Hide character selection menu
 */
export function hideCharacterSelect() {
  const container = document.getElementById('characterSelectContainer');
  if (container) {
    container.style.display = 'none';
  }
}

// ============================================
// PAUSE MENU
// ============================================

/**
 * Show pause menu
 */
export function showPauseMenu() {
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) {
    pauseOverlay.style.display = 'flex';
    uiState.isPauseMenuOpen = true;
    setGamePaused(true);
    playUISound('uiClick');
  }
}

/**
 * Hide pause menu
 */
export function hidePauseMenu() {
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) {
    pauseOverlay.style.display = 'none';
    uiState.isPauseMenuOpen = false;
    setGamePaused(false);
    playUISound('uiClick');
  }
}

// ============================================
// GAME OVER MENU
// ============================================

/**
 * Show game over screen
 */
export function showGameOverScreen() {
  const overlay = document.getElementById('gameOverlay');
  if (!overlay) return;

  overlay.style.display = 'flex';
  uiState.isGameOverMenuOpen = true;

  // Update final stats
  document.getElementById('finalScore').textContent = Math.floor(gameState.score);
  document.getElementById('coinsEarned').textContent = gameState.enemiesDefeatedCount;
  document.getElementById('finalLevel').textContent = player.level;

  playUISound('gameOver');
}

/**
 * Hide game over screen
 */
export function hideGameOverScreen() {
  const overlay = document.getElementById('gameOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    uiState.isGameOverMenuOpen = false;
  }
}

// ============================================
// UPGRADES SHOP
// ============================================

/**
 * Show permanent upgrades shop
 */
export function showUpgradeShop() {
  const shop = document.getElementById('upgradeShop');
  if (shop) {
    shop.style.display = 'block';
    updateUpgradeShopUI();
  }
}

/**
 * Hide upgrades shop
 */
export function hideUpgradeShop() {
  const shop = document.getElementById('upgradeShop');
  if (shop) {
    shop.style.display = 'none';
  }
}

/**
 * Update upgrade shop display
 */
function updateUpgradeShopUI() {
  const currencyDisplay = document.getElementById('currencyDisplay');
  if (currencyDisplay) {
    currencyDisplay.textContent = `Coins: ${player.coins} 💰`;
  }
  
  const upgradesContainer = document.getElementById('permanentUpgradesContainer');
  if (upgradesContainer) {
    upgradesContainer.innerHTML = '<p>Permanent upgrades coming soon!</p>';
  }
}

// ============================================
// ACHIEVEMENTS MODAL
// ============================================

/**
 * Show achievements modal
 */
export function showAchievementsModal() {
  const modal = document.getElementById('achievementsModal');
  if (modal) {
    modal.style.display = 'flex';
    playUISound('uiClick');
  }
}

/**
 * Hide achievements modal
 */
export function hideAchievementsModal() {
  const modal = document.getElementById('achievementsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Update achievements display
 */
export function updateAchievementsUI(achievements) {
  const container = document.getElementById('achievementsContainer');
  if (!container) return;

  container.innerHTML = '';

  for (const [id, achievement] of Object.entries(achievements)) {
    const div = document.createElement('div');
    div.className = `achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`;
    div.innerHTML = `
      <div class="achievement-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
      <div class="achievement-info">
        <h4>${achievement.name}</h4>
        <p>${achievement.description}</p>
      </div>
    `;
    container.appendChild(div);
  }
}

// ============================================
// UI BUTTON HANDLERS
// ============================================

/**
 * Setup all UI button event listeners
 */
export function setupUIButtons(onStartGame, onCharacterSelected) {
  // Start button
  const startBtn = document.getElementById('startButton');
  if (startBtn) {
    startBtn.onclick = () => {
      hideMainMenu();
      showDifficultyMenu();
      playUISound('uiClick');
    };
  }

  // Difficulty buttons
  const difficultyBtns = document.querySelectorAll('.difficulty-buttons button');
  difficultyBtns.forEach(btn => {
    btn.onclick = () => {
      const difficulty = btn.dataset.difficulty;
      if (difficulty) {
        hideDifficultyMenu();
        onStartGame(difficulty);
        playUISound('uiClick');
      }
    };
  });

  // Character select button
  const charSelectBtn = document.getElementById('characterSelectButton');
  if (charSelectBtn) {
    charSelectBtn.onclick = () => {
      showCharacterSelect();
      playUISound('uiClick');
    };
  }

  // Character tiles
  const charContainer = document.getElementById('characterTilesContainer');
  if (charContainer) {
    charContainer.addEventListener('click', (e) => {
      const tile = e.target.closest('.character-tile');
      if (tile) {
        const charId = tile.dataset.characterId;
        hideCharacterSelect();
        onCharacterSelected(charId);
        playUISound('uiClick');
      }
    });
  }

  // Back buttons
  document.getElementById('backToMenuFromCharsButton')?.addEventListener('click', () => {
    hideCharacterSelect();
    showDifficultyMenu();
    playUISound('uiClick');
  });

  // Pause button (handled in main.js with event listener)

  // Resume button
  document.getElementById('resumeButton')?.addEventListener('click', () => {
    hidePauseMenu();
    playUISound('uiClick');
  });

  // Restart button
  document.getElementById('restartButton')?.addEventListener('click', () => {
    hideGameOverScreen();
    showMainMenu();
    playUISound('uiClick');
  });

  // Achievements button
  document.getElementById('desktopAchievementsButton')?.addEventListener('click', () => {
    showAchievementsModal();
  });

  document.getElementById('backToMenuFromAchievements')?.addEventListener('click', () => {
    hideAchievementsModal();
  });

  // Upgrades shop
  document.getElementById('desktopUpgradesButton')?.addEventListener('click', () => {
    showUpgradeShop();
  });

  document.getElementById('backToMenuButton')?.addEventListener('click', () => {
    hideUpgradeShop();
  });
}

// ============================================
// UTILITY UI FUNCTIONS
// ============================================

/**
 * Show loading screen
 */
export function showLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'flex';
  }
}

/**
 * Hide loading screen
 */
export function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}

/**
 * Update loading progress bar
 */
export function updateLoadingProgress(progress) {
  const progressBar = document.getElementById('loadingProgress');
  if (progressBar) {
    progressBar.style.width = `${progress * 100}%`;
  }
}

/**
 * Show notification/toast message
 */
export function showNotification(message, duration = 3000) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 9999;
    animation: slideUp 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, duration);
}