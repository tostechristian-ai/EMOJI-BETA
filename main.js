/**
 * main.js
 * Game entry point - initialization and main game loop
 * Orchestrates all modules to run the game
 * 
 * This file is clean and focused:
 * - Only handles initialization
 * - Only handles the game loop
 * - Delegates logic to specialized modules
 */

// ============================================
// IMPORTS
// ============================================

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  INITIAL_XP_TO_NEXT_LEVEL,
} from './constants.js';

import {
  gameState,
  cameraState,
  player,
  entities,
  weaponPool,
  setGameActive,
  setGamePaused,
  setGameOver,
  updateGameTime,
  clearAllEntities,
  createWeaponPool,
} from './state.js';

import { inputState, setupInputListeners, handleGamepadInput } from './input.js';

import {
  updatePlayerMovement,
  updateDashMechanics,
  updateCamera,
  updateCameraShake,
  updatePlayerRotation,
  updatePlayerFacing,
  updateQuadtree,
} from './physics.js';

import {
  initializeAudio,
  loadRandomBackgroundMusic,
  stopMusic,
  playSound,
  playUISound,
  loadSoundEffect,
} from './audio.js';

import {
  loadAllAssets,
  getAssetLoadProgress,
  hideLoadingScreen,
  initializePreRenderedEmojis,
} from './assets.js';

import {
  updateGameStatsUI,
  updateUpgradeStatsUI,
  updatePowerupIconsUI,
  showMainMenu,
  hideMainMenu,
  showDifficultyMenu,
  hideDifficultyMenu,
  showGameOverScreen,
  hideGameOverScreen,
  setupUIButtons,
  showLoadingScreen,
  updateLoadingProgress,
} from './ui.js';

import {
  updateSpawning,
  setDifficulty,
  resetSpawner,
  ENEMY_CONFIGS,
} from './spawner.js';

import {
  updateEnemies,
  updateWeapons,
  updateDashMechanics as updateEntityDash,
  cleanupEntities,
  resetPlayer,
  levelUpPlayer,
} from './entities.js';

import { QuadtreeManager } from './quadtree.js';

// ============================================
// GLOBAL VARIABLES
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let quadtreeManager = null;
let currentDifficulty = 'easy';
let animationFrameId = null;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize all game systems
 */
async function initializeGame() {
  console.log('🎮 Initializing game...');

  // Setup canvas
  if (canvas) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }

  // Initialize audio
  await initializeAudio();
  console.log('✓ Audio initialized');

  // Load all assets with progress tracking
  showLoadingScreen();
  const loadingInterval = setInterval(() => {
    const progress = getAssetLoadProgress();
    updateLoadingProgress(progress);
  }, 100);

  const assetsLoaded = await loadAllAssets();
  clearInterval(loadingInterval);

  if (assetsLoaded) {
    console.log('✓ Assets loaded');
    initializePreRenderedEmojis();
    console.log('✓ Emojis pre-rendered');
  }

  // Initialize weapon pool
  entityPool = createWeaponPool(500);

  // Initialize quadtree
  quadtreeManager = new QuadtreeManager(WORLD_WIDTH, WORLD_HEIGHT);

  // Setup input handlers
  setupInputListeners();
  console.log('✓ Input system ready');

  // Setup UI buttons
  setupUIButtons(onStartGameClick, onCharacterSelected);
  console.log('✓ UI initialized');

  // Show main menu
  hideLoadingScreen();
  showMainMenu();

  console.log('✅ Game initialized successfully!');
}

// ============================================
// GAME LIFECYCLE
// ============================================

/**
 * Start a new game
 */
async function startNewGame(difficulty = 'easy') {
  console.log(`🎮 Starting game (${difficulty})`);

  currentDifficulty = difficulty;
  setDifficulty(difficulty);

  // Stop menu music
  stopMusic();

  // Initialize audio context if needed
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }

  // Reset all game systems
  resetPlayer();
  clearAllEntities();
  resetSpawner();
  quadtreeManager.reset();

  // Initialize player
  player.x = WORLD_WIDTH / 2;
  player.y = WORLD_HEIGHT / 2;
  player.xpToNextLevel = INITIAL_XP_TO_NEXT_LEVEL;

  // Reset game state
  gameState.score = 0;
  gameState.enemiesDefeatedCount = 0;
  gameState.startTime = Date.now();
  gameState.lastFrameTime = gameState.startTime;

  // UI setup
  hideDifficultyMenu();
  document.getElementById('gameContainer')?.style.display = 'block';
  document.getElementById('gameStats')?.style.display = 'block';
  hideGameOverScreen();

  // Mobile joysticks
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    const moveStick = document.getElementById('movement-stick-base');
    const fireStick = document.getElementById('fire-stick-base');
    if (moveStick) moveStick.style.display = 'flex';
    if (fireStick) fireStick.style.display = 'flex';
  }

  // Load background music
  await loadRandomBackgroundMusic([
    'audio/background_music.mp3',
    'audio/background_music2.mp3',
    'audio/background_music3.mp3',
    'audio/background_music4.mp3',
  ]);

  // Set game state
  setGameActive(true);
  setGamePaused(false);
  setGameOver(false);

  // Start game loop
  gameState.lastFrameTime = Date.now();
  requestAnimationFrame(gameLoop);
}

/**
 * End the current game
 */
function endGame() {
  console.log('💀 Game Over');

  setGameOver(true);
  setGameActive(false);

  stopMusic();
  playSound('gameOver');

  showGameOverScreen();
}

// ============================================
// GAME LOOP
// ============================================

/**
 * Main game loop - called every frame
 */
function gameLoop() {
  if (!gameState.active) return;

  const now = Date.now();
  updateGameTime(now);

  // ===== UPDATE PHASE =====
  update();

  // ===== RENDER PHASE =====
  render();

  // Continue loop unless game is over
  if (!gameState.over) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

/**
 * Update all game logic
 */
function update() {
  // Skip if paused
  if (gameState.paused || gameState.over) return;

  const now = gameState.now;

  // 1. Input processing
  handleGamepadInput();

  // 2. Player movement & abilities
  updatePlayerMovement(gameState.deltaTime);
  updateDashMechanics(now);
  updatePlayerRotation();
  updatePlayerFacing();

  // 3. Weapon updates
  updateWeapons(now);

  // 4. Enemy updates
  updateEnemies(now);

  // 5. Spawning system
  updateSpawning(now);

  // 6. Camera system
  updateCamera(canvas);
  updateCameraShake(now);

  // 7. Collision detection
  updateQuadtree();
  quadtreeManager.update(
    entities.enemies,
    entities.destructibles,
    entities.pickupItems,
    entities.weaponPool,
    player
  );

  // 8. UI updates
  updateGameStatsUI();
  updateUpgradeStatsUI();
  updatePowerupIconsUI();

  // 9. Cleanup
  cleanupEntities();

  // 10. Check win/loss conditions
  if (player.lives <= 0) {
    endGame();
  }
}

/**
 * Render the game to canvas
 */
function render() {
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply camera transforms
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(cameraState.zoom, cameraState.zoom);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  // Draw game world
  drawWorld();

  ctx.restore();

  // Draw UI (non-camera affected)
  drawUI();
}

/**
 * Draw all game world elements
 */
function drawWorld() {
  // Draw background
  drawBackground();

  // Draw enemies
  drawEnemies();

  // Draw player
  drawPlayer();

  // Draw weapons
  drawWeapons();

  // Draw pickups
  drawPickups();

  // Draw effects
  drawEffects();
}

/**
 * Draw background
 */
function drawBackground() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-WORLD_WIDTH / 2, -WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT);

  // Grid pattern for visual reference (optional)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD_WIDTH; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x - cameraState.offsetX, -WORLD_HEIGHT / 2);
    ctx.lineTo(x - cameraState.offsetX, WORLD_HEIGHT - cameraState.offsetY);
    ctx.stroke();
  }
}

/**
 * Draw all enemies
 */
function drawEnemies() {
  for (const enemy of entities.enemies) {
    if (enemy.isHit) continue;

    const screenX = enemy.x - cameraState.offsetX;
    const screenY = enemy.y - cameraState.offsetY;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Draw enemy emoji
    ctx.font = `${enemy.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(enemy.emoji, 0, 0);

    // Draw health bar
    if (enemy.maxHealth > 1) {
      const healthPercent = enemy.health / enemy.maxHealth;
      ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : '#FF6600';
      ctx.fillRect(-enemy.size / 2, enemy.size / 2 + 5, enemy.size * healthPercent, 3);

      ctx.strokeStyle = '#FFF';
      ctx.strokeRect(-enemy.size / 2, enemy.size / 2 + 5, enemy.size, 3);
    }

    ctx.restore();
  }
}

/**
 * Draw player
 */
function drawPlayer() {
  const screenX = player.x - cameraState.offsetX;
  const screenY = player.y - cameraState.offsetY;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(player.rotationAngle);

  // Draw player emoji
  ctx.font = `${player.size}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🤠', 0, 0);

  // Draw dash indicator
  if (player.isDashing) {
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.size, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw all weapons
 */
function drawWeapons() {
  for (const weapon of entities.weaponPool) {
    if (!weapon.active) continue;

    const screenX = weapon.x - cameraState.offsetX;
    const screenY = weapon.y - cameraState.offsetY;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Draw projectile
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, weapon.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Draw all pickups
 */
function drawPickups() {
  for (const pickup of entities.pickupItems) {
    const screenX = pickup.x - cameraState.offsetX;
    const screenY = pickup.y - cameraState.offsetY;

    ctx.save();
    ctx.translate(screenX, screenY);

    ctx.font = `${pickup.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pickup.emoji, 0, 0);

    ctx.restore();
  }
}

/**
 * Draw visual effects
 */
function drawEffects() {
  // Blood splatters
  for (const splatter of entities.bloodSplatters) {
    const screenX = splatter.x - cameraState.offsetX;
    const screenY = splatter.y - cameraState.offsetY;

    ctx.save();
    ctx.globalAlpha = splatter.life / splatter.maxLife;
    ctx.font = `${splatter.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(splatter.emoji, screenX, screenY);
    ctx.restore();
  }

  // Floating text
  for (const text of entities.floatingTexts) {
    const screenX = text.x - cameraState.offsetX;
    const screenY = text.y - cameraState.offsetY;

    ctx.save();
    ctx.globalAlpha = text.life / text.maxLife;
    ctx.fillStyle = text.color;
    ctx.font = `bold ${text.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(text.text, screenX, screenY);
    ctx.restore();
  }
}

/**
 * Draw UI (HUD, health, score, etc)
 */
function drawUI() {
  // Minimal UI drawn via HTML
  // Canvas-based UI can be added here
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle start game button click
 */
function onStartGameClick(difficulty) {
  startNewGame(difficulty);
}

/**
 * Handle character selection
 */
function onCharacterSelected(characterId) {
  console.log(`Character selected: ${characterId}`);

  if (characterId === 'skull') {
    player._isSkull = true;
    player.damageMultiplier *= 0.5;
  }

  startNewGame(currentDifficulty);
}

/**
 * Handle pause toggle
 */
function handlePauseToggle() {
  if (!gameState.active || gameState.over) return;

  const isPaused = !gameState.paused;
  setGamePaused(isPaused);

  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) {
    pauseOverlay.style.display = isPaused ? 'flex' : 'none';
  }

  if (isPaused) {
    playUISound('uiClick');
  }
}

// ============================================
// WINDOW EVENTS
// ============================================

/**
 * Initialize game on page load
 */
window.addEventListener('load', async () => {
  console.log('🎮 EMOJI BETA - Loading...');
  await initializeGame();
});

/**
 * Handle pause key
 */
window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'Escape') {
    e.preventDefault();
    handlePauseToggle();
  }
});

/**
 * Handle window resize
 */
window.addEventListener('resize', () => {
  if (canvas) {
    // Canvas maintains fixed size for pixel-perfect rendering
    // Scaling handled by CSS
  }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});

// ============================================
// EXPORT FOR TESTING
// ============================================

export {
  initializeGame,
  startNewGame,
  endGame,
  gameLoop,
  update,
  render,
  handlePauseToggle,
};