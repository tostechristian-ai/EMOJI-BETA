// data.js - Config, Constants, and Game State
// ==========================================

export const WORLD_WIDTH = 1125 * 1.5;
export const WORLD_HEIGHT = 845 * 1.5;

export const CONSTANTS = {
    PLAYER_BASE_SPEED: 1.4,
    JOYSTICK_RADIUS: 51,
    MERCHANT_SPAWN_INTERVAL: 140000, 
    BOSS_SPAWN_INTERVAL_LEVELS: 11,
    CAMERA_PULL_STRENGTH: 35,
    CAMERA_LERP_FACTOR: 0.05,
    DOPPELGANGER_DURATION: 8000
};

// === GAME STATE ===
// Shared variables that change during gameplay
export const gameState = {
    gameActive: false,
    gamePaused: false,
    gameOver: false,
    score: 0,
    startTime: 0,
    lastFrameTime: 0,
    enemiesDefeated: 0,
    cameraZoom: 1.0,
    currentDifficulty: 'easy',
    selectedMapIndex: -1,
    currentBackgroundIndex: 0,
    equippedCharacterID: 'cowboy',
    isMouseInCanvas: false,
    mouseX: 0,
    mouseY: 0
};

export const runStats = {
    startTime: 0,
    killsThisRun: 0,
    bossesKilledThisRun: 0,
    coinsThisRun: 0,
    levelsGainedThisRun: 0,
    lastDamageTime: 0,
    xpCollectedThisRun: 0
};

// === ENTITIES ===
export const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    size: 35,
    speed: 1.4,
    originalPlayerSpeed: 1.4,
    xp: 0,
    level: 1,
    xpToNextLevel: 3,
    lives: 3,
    maxLives: 3,
    appleCount: 0,
    coins: 0,
    magnetRadius: 46,
    facing: 'down',
    rotationAngle: 0,
    isDashing: false,
    dashCooldown: 6000,
    lastDashTime: -6000,
    dashEndTime: 0,
    isInvincible: false,
    damageMultiplier: 1,
    projectileSizeMultiplier: 1,
    projectileSpeedMultiplier: 1,
    knockbackStrength: 0,
    // Powerup flags
    swordActive: false,
    orbitingPowerUpActive: false,
    boxPickupsCollectedCount: 0,
    upgradeLevels: { speed: 0, fireRate: 0, magnetRadius: 0, damage: 0, projectileSpeed: 0, knockback: 0, luck: 0 }
};

export const entities = {
    enemies: [],
    projectiles: [],
    pickups: [],
    destructibles: [], // Barrels, walls
    visualEffects: [], // Floating text, explosions, blood
    merchants: [],
    bombs: [],
    lightingBolts: [],
    eyeProjectiles: [],
    playerPuddles: [],
    mosquitoPuddles: [],
    snailPuddles: [],
    flameAreas: [],
    flies: [], // Bug swarm
    owlProjectiles: [],
    lightningStrikes: [],
    smokeParticles: [],
    dogHomingShots: [],
    appleItems: []
};

export const companionState = {
    player2: null,
    doppelganger: null,
    dog: { x: 0, y: 0, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 },
    owl: null
};

// === CONFIGURATION DATA ===

export const CHARACTERS = {
    cowboy: {
        id: 'cowboy',
        name: 'The Cowboy',
        emoji: '🤠',
        description: 'The original survivor. Balanced and reliable.',
        perk: 'Standard bullets and dash.',
        unlockCondition: { type: 'start' }
    },
    skull: {
        id: 'skull',
        name: 'The Skeleton',
        emoji: '💀',
        description: 'A bony warrior who uses its own body as a weapon.',
        perk: 'Shoots bones. Dodge fires a nova of bones.',
        unlockCondition: { type: 'achievement', id: 'slayer' }
    }
};

export const ENEMY_CONFIGS = {
    '🧟': { size: 17, baseHealth: 1, speedMultiplier: 1, type: 'pursuer', minLevel: 1 },
    '💀': { size: 20, baseHealth: 2, speedMultiplier: 1.15, type: 'pursuer', minLevel: 5 },
    '🌀': { size: 22, baseHealth: 4, speedMultiplier: 0.3, type: 'snail', minLevel: 4 },
    '🦟': { size: 15, baseHealth: 2, speedMultiplier: 1.5, type: 'mosquito', minLevel: 7, initialProps: () => ({ lastDirectionUpdateTime: Date.now(), currentMosquitoDirection: null, lastPuddleSpawnTime: Date.now() }) },
    '🦇': { size: 25 * 0.85, baseHealth: 3, speedMultiplier: 2, type: 'bat', minLevel: 10, initialProps: () => ({ isPaused: false, pauseTimer: 0, pauseDuration: 30, moveDuration: 30 }) },
    '😈': { size: 20 * 0.8, baseHealth: 3, speedMultiplier: 1.84, type: 'devil', minLevel: 12, initialProps: () => ({ moveAxis: 'x', lastAxisSwapTime: Date.now() }) },
    '👹': { size: 28 * 0.7, baseHealth: 4, speedMultiplier: 1.8975, type: 'demon', minLevel: 15, initialProps: () => ({ moveState: 'following', lastStateChangeTime: Date.now(), randomDx: 0, randomDy: 0 }) },
    '👻': { size: 22, baseHealth: 4, speedMultiplier: 1.2, type: 'ghost', minLevel: 12, initialProps: () => ({ isVisible: true, lastPhaseChange: Date.now(), phaseDuration: 3000, bobOffset: 0 }) },
    '👁️': { size: 25 * 0.6, baseHealth: 4, speedMultiplier: 1.1 * 1.1, type: 'eye', minLevel: 20, initialProps: () => ({ lastEyeProjectileTime: Date.now() }) },
    '🧟‍♀️': { size: 17 * 1.75, baseHealth: 6, speedMultiplier: 0.5, type: 'pursuer', minLevel: 25 },
    '🧛‍♀️': { size: 20, baseHealth: 5, speedMultiplier: 1.2, type: 'vampire', minLevel: 30 }
};

export const UPGRADE_OPTIONS = [
    { name: "Fast Runner", desc: "Increase movement speed by 8%", type: "speed", value: 0.08, icon: '🏃' },
    { name: "Rapid Fire", desc: "Increase fire rate by 8%", type: "fireRate", value: 0.08, icon: '🔫' },
    { name: "Magnet Field", desc: "Increase pickup radius by 8%", type: "magnetRadius", value: 0.08, icon: '🧲' },
    { name: "Increased Damage", desc: "Increase projectile damage by 15%", type: "damage", value: 0.15, icon: '💥' },
    { name: "Swift Shots", desc: "Increase projectile speed by 8%", type: "projectileSpeed", value: 0.08, icon: '💨' },
    { name: "Power Shot", desc: "Projectiles knock enemies back by 8%", type: "knockback", value: 0.08, icon: '💪' },
    { name: "Lucky Charm", desc: "Increase pickup drop rate by 0.5%", type: "luck", value: 0.005, icon: '🍀' }
];

export const PERMANENT_UPGRADES = {
    playerDamage: { name: "Weapon Power", desc: "Permanently increase base damage by 2%.", baseCost: 100, costIncrease: 1.2, effect: 0.02, maxLevel: 10, icon: '💥' },
    playerSpeed: { name: "Movement Speed", desc: "Permanently increase base movement speed by 1.5%.", baseCost: 80, costIncrease: 1.2, effect: 0.015, maxLevel: 10, icon: '🏃' },
    xpGain: { name: "XP Gain", desc: "Gain 3% more experience from all sources.", baseCost: 90, costIncrease: 1.2, effect: 0.03, maxLevel: 10, icon: '📈' },
    enemyHealth: { name: "Weaken Foes", desc: "Enemies spawn with 2% less health.", baseCost: 150, costIncrease: 1.25, effect: -0.02, maxLevel: 5, icon: '💔' },
    magnetRadius: { name: "Pickup Radius", desc: "Increase pickup attraction radius by 4%.", baseCost: 60, costIncrease: 1.2, effect: 0.04, maxLevel: 10, icon: '🧲' },
    luck: { name: "Luck", desc: "Increase the chance for better drops by 0.1%.", baseCost: 200, costIncrease: 1.3, effect: 0.001, maxLevel: 5, icon: '🍀' }
};

export const UNLOCKABLE_PICKUPS = {
    map_select: { name: "Map Select", desc: "Unlocks the ability to choose your map.", cost: 1500, icon: '🗺️' },
    night_owl: { name: "Night Owl", desc: "Unlocks a companion that snipes enemies.", cost: 1300, icon: '🦉' },
    whirlwind_axe: { name: "Whirlwind Axe", desc: "Unlocks a large, damaging orbiting axe.", cost: 1000, icon: '🪓' },
    doppelganger: { name: "Doppelganger", desc: "Unlocks the doppelganger pickup.", cost: 1200, icon: '👯' },
    dog_companion: { name: "Dog Companion", desc: "Unlocks the loyal dog companion pickup.", cost: 500, icon: '🐶' },
    anti_gravity: { name: "Anti-Gravity", desc: "Unlocks the enemy-repelling pulse pickup.", cost: 600, icon: '💨' },
    temporal_ward: { name: "Temporal Ward", desc: "Unlocks the time-freezing defensive pickup.", cost: 800, icon: '⏱️' },
    rocket_launcher: { name: "Heavy Shells", desc: "Unlocks the powerful heavy shells pickup.", cost: 1100, icon: '🚀' },
    circle: { name: "Damaging Circle", desc: "Unlocks the persistent damaging aura pickup.", cost: 900, icon: '⭕' },
    flaming_bullets: { name: "Flaming Bullets", desc: "Unlocks bullets that ignite enemies.", cost: 1150, icon: '🔥' },
    black_hole: { name: "Black Hole", desc: "Unlocks the enemy-vortex pickup.", cost: 1180, icon: '⚫' },
    vengeance_nova: { name: "Vengeance Nova", desc: "Unlocks the defensive blast pickup.", cost: 700, icon: '🛡️' }
};

export const ALWAYS_AVAILABLE_PICKUPS = {
    v_shape_projectile: { id:'v_shape_projectile', name: 'V-Shape Shots'}, magnetic_projectile: { id:'magnetic_projectile', name: 'Magnetic Shots'},
    ice_projectile: { id:'ice_projectile', name: 'Ice Projectiles'}, ricochet: { id:'ricochet', name: 'Ricochet Shots'},
    explosive_bullets: { id: 'explosive_bullets', name: 'Explosive Bullets'}, puddle_trail: { id:'puddle_trail', name: 'Slime Trail'},
    sword: { id:'sword', name: 'Auto-Sword'}, laser_pointer: { id: 'laser_pointer', name: 'Laser Pointer'},
    auto_aim: { id: 'auto_aim', name: 'Auto Aim'}, dual_gun: { id: 'dual_gun', name: 'Dual Gun'},
    bomb: { id:'bomb', name: 'Bomb Emitter'}, orbiter: { id:'orbiter', name: 'Spinning Orbiter'},
    lightning_projectile: { id:'lightning_projectile', name: 'Lightning Projectile'}
};

// ACHIEVEMENTS
export const ACHIEVEMENTS = {
    'first_blood': { name: "First Blood", desc: "Kill 1 enemy.", icon: '🔫', unlocked: false },
    'hunter': { name: "Hunter", desc: "Kill 100 enemies.", icon: '🔫', unlocked: false },
    'slayer': { name: "Slayer", desc: "Kill 1,000 enemies.", icon: '🔫', unlocked: false },
    'boss_breaker': { name: "Boss Breaker", desc: "Defeat your first boss.", icon: '👑', unlocked: false },
    'survivor': { name: "Survivor", desc: "Last 5 minutes in one run.", icon: '❤️', unlocked: false },
    'treasure_hunter': { name: "Treasure Hunter", desc: "Collect 100 coins.", icon: '💰', unlocked: false },
    // ... (Keep other achievements from your list) ...
};

// DATA STORAGE OBJECTS
export let playerStats = { totalKills: 0, totalCoins: 0, totalDeaths: 0, achievements: {} };
export let playerData = { currency: 0, upgrades: {}, unlockedPickups: {}, hasReducedDashCooldown: false };
export let cheats = {};
