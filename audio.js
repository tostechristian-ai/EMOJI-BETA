/**
 * audio.js
 * Audio system and sound management using Tone.js
 * Depends on: constants.js, state.js
 */

import { gameState } from './state.js';

// ============================================
// AUDIO STATE
// ============================================

export const audioState = {
  players: {},
  currentBGM: null,
  masterVolume: 1.0,
  effectsVolume: 1.0,
  musicVolume: 0.7,
  isInitialized: false,
};

// ============================================
// AUDIO INITIALIZATION
// ============================================

/**
 * Initialize Tone.js audio context
 */
export async function initializeAudio() {
  if (audioState.isInitialized) return;

  try {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    audioState.isInitialized = true;
    console.log('Audio system initialized');
  } catch (e) {
    console.error('Failed to initialize audio:', e);
  }
}

/**
 * Load a sound effect
 */
export function loadSoundEffect(name, path) {
  if (audioState.players[name]) {
    return; // Already loaded
  }

  try {
    const player = new Tone.Player({
      url: path,
      autostart: false,
      loop: false,
      volume: -8,
    }).toDestination();

    audioState.players[name] = player;
  } catch (e) {
    console.error(`Failed to load sound effect "${name}":`, e);
  }
}

/**
 * Load background music (loops)
 */
export function loadMusic(name, path) {
  if (audioState.players[name]) {
    return; // Already loaded
  }

  try {
    const player = new Tone.Player({
      url: path,
      autostart: false,
      loop: true,
      volume: -10,
    }).toDestination();

    audioState.players[name] = player;
  } catch (e) {
    console.error(`Failed to load music "${name}":`, e);
  }
}

// ============================================
// SOUND PLAYBACK
// ============================================

/**
 * Play a sound effect (only during gameplay)
 */
export function playSound(name) {
  if (!gameState.active || gameState.paused) return;
  if (!audioState.players[name]) {
    console.warn(`Sound not loaded: ${name}`);
    return;
  }

  try {
    const player = audioState.players[name];
    if (player.state === 'started') {
      player.stop();
    }
    player.start(getSafeToneTime());
  } catch (e) {
    console.error(`Error playing sound "${name}":`, e);
  }
}

/**
 * Play a UI sound (anytime, regardless of game state)
 */
export function playUISound(name) {
  if (!audioState.players[name]) {
    console.warn(`Sound not loaded: ${name}`);
    return;
  }

  try {
    const player = audioState.players[name];
    if (player.state === 'started') {
      player.stop();
    }
    player.start(getSafeToneTime());
  } catch (e) {
    console.error(`Error playing UI sound "${name}":`, e);
  }
}

// ============================================
// MUSIC SYSTEM
// ============================================

/**
 * Start background music
 */
export async function playMusic(name) {
  if (!audioState.players[name]) {
    console.warn(`Music not loaded: ${name}`);
    return;
  }

  try {
    // Stop current music
    if (audioState.currentBGM) {
      audioState.currentBGM.stop();
    }

    const player = audioState.players[name];
    audioState.currentBGM = player;
    player.start(getSafeToneTime());
  } catch (e) {
    console.error(`Error playing music "${name}":`, e);
  }
}

/**
 * Stop current background music
 */
export function stopMusic() {
  if (audioState.currentBGM) {
    try {
      audioState.currentBGM.stop();
      audioState.currentBGM = null;
    } catch (e) {
      console.error('Error stopping music:', e);
    }
  }
}

/**
 * Load random background music track
 */
export async function loadRandomBackgroundMusic(musicPaths) {
  const path = musicPaths[Math.floor(Math.random() * musicPaths.length)];

  try {
    if (audioState.currentBGM) {
      audioState.currentBGM.stop();
      audioState.currentBGM.dispose();
    }

    const player = new Tone.Player({
      url: path,
      loop: true,
      autostart: false,
      volume: -10,
    }).toDestination();

    audioState.currentBGM = player;
    await Tone.loaded();

    if (gameState.active && !gameState.paused) {
      player.start(getSafeToneTime());
    }
  } catch (e) {
    console.error('Failed to load background music:', e);
  }
}

// ============================================
// VOLUME CONTROL
// ============================================

/**
 * Set master volume (0.0 - 1.0)
 */
export function setMasterVolume(volume) {
  audioState.masterVolume = Math.max(0, Math.min(1, volume));
  updateAllVolumes();
}

/**
 * Set effects volume (0.0 - 1.0)
 */
export function setEffectsVolume(volume) {
  audioState.effectsVolume = Math.max(0, Math.min(1, volume));
  updateAllVolumes();
}

/**
 * Set music volume (0.0 - 1.0)
 */
export function setMusicVolume(volume) {
  audioState.musicVolume = Math.max(0, Math.min(1, volume));
  updateAllVolumes();
}

/**
 * Update all audio player volumes
 */
function updateAllVolumes() {
  for (const [name, player] of Object.entries(audioState.players)) {
    let volume = -8; // Default effect volume
    if (name.includes('music') || name === 'mainMenu') {
      volume = -10; // Music volume
    }

    const dbVolume = volume + (audioState.masterVolume * 20 - 20);
    player.volume.value = dbVolume;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get safe Tone.js time offset
 */
function getSafeToneTime() {
  return Tone.context.now() + 0.05;
}

/**
 * Cleanup audio resources
 */
export function disposeAllAudio() {
  if (audioState.currentBGM) {
    audioState.currentBGM.stop();
    audioState.currentBGM.dispose();
    audioState.currentBGM = null;
  }

  for (const [name, player] of Object.entries(audioState.players)) {
    player.dispose();
  }

  audioState.players = {};
  audioState.isInitialized = false;
}