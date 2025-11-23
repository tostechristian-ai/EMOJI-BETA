// data.js - Configuration, Constants, and Game State

export const WORLD_WIDTH = 1125 * 1.5;
export const WORLD_HEIGHT = 845 * 1.5;

// === CONFIGURATION & CONSTANTS ===
export const CONSTANTS = {
    PLAYER_BASE_SPEED: 1.4,
    JOYSTICK_RADIUS: 51,
    DOPPELGANGER_DURATION: 8000,
    MERCHANT_SPAWN_INTERVAL: 140000,
    BOSS_SPAWN_INTERVAL_LEVELS: 11,
    CAMERA: {
        PULL_STRENGTH: 35,
        LERP_FACTOR: 0.05,
        ZOOM_MOBILE: 1.4,
        ZOOM_DESKTOP: 1.0
    },
    SIZES: {
        PLAYER: 35,
        COIN: 10,
        DIAMOND: 12,
        APPLE: 15,
        BOX: 25,
        BOMB: 14
    }
};

// === GAME STATE HOLDERS ===
// We use objects here so we can import them and modify their properties by reference
export const gameState = {
    score: 0,
    gameActive: false,
    gamePaused: false,
    gameOver: false,
    startTime: 0,
    lastFrameTime: 0,
    enemiesDefeated: 0,
    cameraZoom: 1.0,
    currentDifficulty: 'easy',
    selectedMapIndex: -1,
    equippedCharacterID: 'cowboy',
    isMouseInCanvas: false,
    mouseX: 0,
    mouseY: 0
};

export const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    size: 35,
    speed: 1.4,
    xp: 0,
    level: 1,
    xpToNextLevel: 3,
    lives: 3,
    maxLives: 3,
    appleCount: 0,
    coins: 0,
    magnetRadius: 46, // 23 * 2
    facing: 'down',
    isDashing: false,
    dashCooldown: 6000,
    lastDashTime: -6000,
    isInvincible: false,
    upgradeLevels: { speed: 0, fireRate: 0, magnetRadius: 0, damage: 0, projectileSpeed: 0, knockback: 0, luck: 0 },
    // Flags for active powerups
    swordActive: false,
    orbitingPowerUpActive: false,
    // Skull Character specific flags (integrated natively now)
    isSkullCharacter: false 
};

// Player 2 / Doppelganger states
export const companionState = {
    player2: null, // { active: false, x: 0, y: 0 ... }
    doppelganger: null,
    dog: { x: 0, y: 0, active: false, state: 'returning', target: null },
    owl: null
};

// Arrays to hold active game entities
export const entities = {
    enemies: [],
    pickups: [],
    projectiles: [], // Player bullets
    enemyProjectiles: [],
    destructibles: [], // Barrels, walls
    visualEffects: [], // Floating text, explosions, blood
    merchants: []
};

// === ASSET PATHS ===
export const ASSETS = {
    sprites: {
        gun: 'sprites/gun.png',
        bullet: 'sprites/bullet.png',
        circle: 'sprites/circle.png',
        pickupBox: 'sprites/pickupbox.png',
        slime: 'sprites/slime.png',
        playerUp: 'sprites/playerup.png',
        playerDown: 'sprites/playerdown.png',
        playerLeft: 'sprites/playerleft.png',
        playerRight: 'sprites/playerright.png',
        levelUpBox: 'sprites/levelupbox.png',
        spinninglight: 'sprites/spinninglight.png',
        bloodPuddle: 'sprites/blood.png',
        crosshair: 'sprites/crosshair.png'
    },
    audio: {
        playerShoot: 'audio/fire_shot.mp3',
        xpPickup: 'audio/pick_up_xp.mp3',
        boxPickup: 'audio/pick_up_power.mp3',
        levelUp: 'audio/level_up.mp3',
        levelUpSelect: 'audio/level_up_end.mp3',
        enemyDeath: 'audio/enemy_death.mp3',
        gameOver: 'audio/gameover.mp3',
        playerScream: 'audio/scream.mp3',
        uiClick: 'audio/click.mp3',
        mainMenu: 'audio/mainmenu.mp3',
        dodge: 'audio/dodge.mp3'
    },
    backgrounds: [
        'sprites/Background6.png', 'sprites/Background2.png', 'sprites/Background3.png',
        'sprites/Background4.png', 'sprites/Background5.png', 'sprites/Background8.png',
        'sprites/Background1.png', 'sprites/Background7.png', 'sprites/Background9.png'
    ]
};

// === GAME CONTENT DATA ===

export const CHARACTERS = {
    cowboy: {
        id: 'cowboy',
        name: 'The Cowboy',
        emoji: '🤠',
        description: 'The original survivor. Balanced and reliable.',
        perk: 'Standard bullets and dash.',
        unlockCondition: { type: 'start' }
    },
    // Natively integrated Skull Character
    skull: {
        id: 'skull',
        name: 'The Skeleton',
        emoji: '💀',
        description: 'A bony warrior who uses its own body as a weapon.',
        perk: 'Shoots bones (V-Spread). Dash releases a bone nova.',
        unlockCondition: { type: 'achievement', id: 'slayer' }
    }
};

export const ENEMY_CONFIGS = {
    '🧟': { size: 17, baseHealth: 1, speedMultiplier: 1, type: 'pursuer', minLevel: 1 },
    '💀': { size: 20, baseHealth: 2, speedMultiplier: 1.15, type: 'pursuer', minLevel: 5 },
    '🌀': { size: 22, baseHealth: 4, speedMultiplier: 0.3, type: 'snail', minLevel: 4 },
    '🦟': { size: 15, baseHealth: 2, speedMultiplier: 1.5, type: 'mosquito', minLevel: 7 },
    '🦇': { size: 25 * 0.85, baseHealth: 3, speedMultiplier: 2, type: 'bat', minLevel: 10 },
    '😈': { size: 20 * 0.8, baseHealth: 3, speedMultiplier: 1.84, type: 'devil', minLevel: 12 },
    '👹': { size: 28 * 0.7, baseHealth: 4, speedMultiplier: 1.8975, type: 'demon', minLevel: 15 },
    '👻': { size: 22, baseHealth: 4, speedMultiplier: 1.2, type: 'ghost', minLevel: 12 },
    '👁️': { size: 25 * 0.6, baseHealth: 4, speedMultiplier: 1.1 * 1.1, type: 'eye', minLevel: 20 },
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

// Achievements & Stats Data Storage
export let playerStats = {
    totalKills: 0,
    totalBossesKilled: 0,
    totalDashes: 0,
    totalCoins: 0,
    totalDeaths: 0,
    achievements: {}
};

export let playerData = { 
    currency: 0, 
    upgrades: {}, 
    unlockedPickups: {}, 
    hasReducedDashCooldown: false 
};

export const ACHIEVEMENTS = {
    'first_blood': { name: "First Blood", desc: "Kill 1 enemy.", icon: '🔫', unlocked: false },
    'hunter': { name: "Hunter", desc: "Kill 100 enemies.", icon: '🔫', unlocked: false },
    'slayer': { name: "Slayer", desc: "Kill 1,000 enemies (Unlocks Skeleton).", icon: '☠️', unlocked: false },
    'survivor': { name: "Survivor", desc: "Last 5 minutes in one run.", icon: '❤️', unlocked: false },
    // ... (You can add the rest of your achievements here)
};

export const PERMANENT_UPGRADES = {
    playerDamage: { name: "Weapon Power", desc: "Permanently increase base damage by 2%.", baseCost: 100, costIncrease: 1.2, effect: 0.02, maxLevel: 10, icon: '💥' },
    playerSpeed: { name: "Movement Speed", desc: "Permanently increase base movement speed by 1.5%.", baseCost: 80, costIncrease: 1.2, effect: 0.015, maxLevel: 10, icon: '🏃' },
    // ... (Add rest of permanent upgrades)
};

export const UNLOCKABLE_PICKUPS = {
    map_select: { name: "Map Select", desc: "Unlocks the ability to choose your map.", cost: 1500, icon: '🗺️' },
    skull: { name: "The Skeleton", desc: "Unlocks the Skeleton character.", cost: 500, icon: '💀' }, // Integrated Skull unlock
    doppelganger: { name: "Doppelganger", desc: "Unlocks the doppelganger pickup.", cost: 1200, icon: '👯' },
    // ... (Add rest of unlockables)
};
