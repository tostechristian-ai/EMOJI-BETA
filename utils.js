// ==========================================
// UTILS.JS
// Core constants, configuration, and helpers
// ==========================================

// --- Global World Constants ---
const WORLD_WIDTH = 1125 * 1.5;
const WORLD_HEIGHT = 845 * 1.5;
const JOYSTICK_RADIUS = 51;
const GAMEPAD_DEADZONE = 0.2;

// --- Asset Configuration ---
const spritePaths = {
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
};

const audioPaths = {
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
};

const backgroundPaths = [ 
    'sprites/Background6.png', 
    'sprites/Background2.png', 
    'sprites/Background3.png', 
    'sprites/Background4.png', 
    'sprites/Background5.png',  
    'sprites/Background8.png',  
    'sprites/Background1.png',  
    'sprites/Background7.png', 
    'sprites/Background9.png'  
];

// --- Input State Globals ---
// These are accessed by main.js and entities.js
const keys = {};
let joystickDirX = 0; 
let joystickDirY = 0;
let aimDx = 0; 
let aimDy = 0;
let isGamepadUpgradeMode = false;

// --- Helper Classes ---

class Quadtree {
    constructor(bounds, maxObjects = 10, maxLevels = 4, level = 0) {
        this.bounds = bounds;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
    }

    clear() {
        this.objects = [];
        if (this.nodes.length) {
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i].clear();
            }
        }
        this.nodes = [];
    }

    split() {
        const nextLevel = this.level + 1;
        const subWidth = this.bounds.width / 2;
        const subHeight = this.bounds.height / 2;
        const x = this.bounds.x;
        const y = this.bounds.y;

        this.nodes[0] = new Quadtree({ x: x + subWidth, y: y, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
        this.nodes[1] = new Quadtree({ x: x, y: y, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
        this.nodes[2] = new Quadtree({ x: x, y: y + subHeight, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
        this.nodes[3] = new Quadtree({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
    }

    getIndex(pRect) {
        let index = -1;
        const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
        const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

        const topQuadrant = (pRect.y < horizontalMidpoint && pRect.y + pRect.height < horizontalMidpoint);
        const bottomQuadrant = (pRect.y > horizontalMidpoint);

        if (pRect.x < verticalMidpoint && pRect.x + pRect.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;
            } else if (bottomQuadrant) {
                index = 2;
            }
        } else if (pRect.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;
            } else if (bottomQuadrant) {
                index = 3;
            }
        }
        return index;
    }

    insert(pRect) {
        if (this.nodes.length) {
            const index = this.getIndex(pRect);
            if (index !== -1) {
                this.nodes[index].insert(pRect);
                return;
            }
        }

        this.objects.push(pRect);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (!this.nodes.length) {
                this.split();
            }
            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }

    retrieve(pRect) {
        let returnObjects = this.objects;
        const index = this.getIndex(pRect);
        if (this.nodes.length && index !== -1) {
            returnObjects = returnObjects.concat(this.nodes[index].retrieve(pRect));
        } else if (this.nodes.length) {
             for(let i=0; i < this.nodes.length; i++) {
                 returnObjects = returnObjects.concat(this.nodes[i].retrieve(pRect));
             }
        }
        return returnObjects;
    }
}

// --- Audio Helper ---

function getSafeToneTime() {
    if (typeof Tone === 'undefined') return 0;
    let now = Tone.now();
    let lastTime = getSafeToneTime.lastTime || 0;
    if (now <= lastTime) {
        now = lastTime + 0.001;
    }
    getSafeToneTime.lastTime = now;
    return now;
}

// --- Input Helper Functions ---

function getJoystickInput(touchClientX, touchClientY, baseElement, capElement) {
    const rect = baseElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touchClientX - centerX;
    let dy = touchClientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > JOYSTICK_RADIUS) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * JOYSTICK_RADIUS;
        dy = Math.sin(angle) * JOYSTICK_RADIUS;
    }
    if (capElement) capElement.style.transform = `translate(${dx}px, ${dy}px)`;
    return { dx, dy, distance };
}

function applyDeadzone(v, dz = GAMEPAD_DEADZONE) {
  return Math.abs(v) < dz ? 0 : v;
}

function vibrate(duration) { 
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice && navigator.vibrate) { 
        navigator.vibrate(duration); 
    } 
}

// --- Data Persistence Helpers ---

function saveHighScore(finalScore, finalLevel, currentDifficulty) {
    try {
        const highScores = JSON.parse(localStorage.getItem('highScores')) || {
            easy: { score: 0, level: 1 }, medium: { score: 0, level: 1 }, hard: { score: 0, level: 1 }
        };
        if (finalScore > highScores[currentDifficulty].score) {
            highScores[currentDifficulty] = { score: finalScore, level: finalLevel };
            localStorage.setItem('highScores', JSON.stringify(highScores));
        }
    } catch (error) { console.error("Could not save high score:", error); }
}

function savePlayerData(playerData) { 
    try { localStorage.setItem('emojiSurvivorData', JSON.stringify(playerData)); } 
    catch (e) { console.error("Failed to save player data.", e); } 
}

function savePlayerStats(playerStats, ACHIEVEMENTS) {
    try {
        for(const id in ACHIEVEMENTS) {
            playerStats.achievements[id] = ACHIEVEMENTS[id].unlocked;
        }
        localStorage.setItem('emojiSurvivorStats', JSON.stringify(playerStats));
    } catch (e) { console.error("Failed to save player stats.", e); }
}

function saveCheats(cheats) {
    try {
        localStorage.setItem('emojiSurvivorCheats', JSON.stringify(cheats));
    } catch (e) { console.error("Failed to save cheats.", e); }
}

// --- Game Configurations ---

const CHARACTERS = {
    cowboy: {
        id: 'cowboy',
        name: 'The Cowboy',
        emoji: '🤠',
        description: 'The original survivor. Balanced and reliable.',
        perk: 'Standard bullets and dash.',
        unlockCondition: { type: 'start' },
        shootLogic: null,
        dodgeLogic: null,
    },
    skull: {
        id: 'skull',
        name: 'The Skeleton',
        emoji: '💀',
        description: 'A bony warrior who uses its own body as a weapon.',
        perk: 'Shoots bones. Dodge fires a nova of bones.',
        unlockCondition: { type: 'achievement', id: 'slayer' },
        shootLogic: null,
        dodgeLogic: null, 
    }
};

const ENEMY_CONFIGS = {
    '🧟': { size: 17, baseHealth: 1, speedMultiplier: 1, type: 'pursuer', minLevel: 1 },
    '💀': { size: 20, baseHealth: 2, speedMultiplier: 1.15, type: 'pursuer', minLevel: 5 },
    '🌀': { size: 22, baseHealth: 4, speedMultiplier: 0.3, type: 'snail', minLevel: 4, initialProps: () => ({ lastPuddleSpawnTime: Date.now(), directionAngle: Math.random() * 2 * Math.PI }) },
    '🦟': { size: 15, baseHealth: 2, speedMultiplier: 1.5, type: 'mosquito', minLevel: 7, initialProps: () => ({ lastDirectionUpdateTime: Date.now(), currentMosquitoDirection: null, lastPuddleSpawnTime: Date.now() }) },
    '🦇': { size: 25 * 0.85, baseHealth: 3, speedMultiplier: 2, type: 'bat', minLevel: 10, initialProps: () => ({ isPaused: false, pauseTimer: 0, pauseDuration: 30, moveDuration: 30 }) },
    '😈': { size: 20 * 0.8, baseHealth: 3, speedMultiplier: 1.84, type: 'devil', minLevel: 12, initialProps: () => ({ moveAxis: 'x', lastAxisSwapTime: Date.now() }) }, 
    '👹': { size: 28 * 0.7, baseHealth: 4, speedMultiplier: 1.8975, type: 'demon', minLevel: 15, initialProps: () => ({ moveState: 'following', lastStateChangeTime: Date.now(), randomDx: 0, randomDy: 0 }) },
    '👻': { size: 22, baseHealth: 4, speedMultiplier: 1.2, type: 'ghost', minLevel: 12, initialProps: () => ({ isVisible: true, lastPhaseChange: Date.now(), phaseDuration: 3000, bobOffset: 0 }) },
    '👁️': { size: 25 * 0.6, baseHealth: 4, speedMultiplier: 1.1 * 1.1, type: 'eye', minLevel: 20, initialProps: () => ({ lastEyeProjectileTime: Date.now() }) },
    '🧟‍♀️': { size: 17 * 1.75, baseHealth: 6, speedMultiplier: 0.5, type: 'pursuer', minLevel: 25 },
    '🧛‍♀️': { size: 20, baseHealth: 5, speedMultiplier: 1.2, type: 'vampire', minLevel: 30 }
};

const ACHIEVEMENTS = {
    'first_blood': { name: "First Blood", desc: "Kill 1 enemy.", icon: '🔫', unlocked: false },
    'hunter': { name: "Hunter", desc: "Kill 100 enemies.", icon: '🔫', unlocked: false },
    'slayer': { name: "Slayer", desc: "Kill 1,000 enemies.", icon: '🔫', unlocked: false },
    'exterminator': { name: "Exterminator", desc: "Kill 10,000 enemies.", icon: '🔫', unlocked: false },
    'boss_breaker': { name: "Boss Breaker", desc: "Defeat your first boss.", icon: '👑', unlocked: false },
    'boss_crusher': { name: "Boss Crusher", desc: "Defeat 10 bosses.", icon: '👑', unlocked: false },
    'untouchable': { name: "Untouchable", desc: "Kill 100 enemies without taking damage.", icon: '🧘', unlocked: false },
    'sharpshooter': { name: "Sharpshooter", desc: "Land 500 bullets on enemies without missing.", icon: '🎯', unlocked: false },
    'sword_master': { name: "Sword Master", desc: "Kill 500 enemies using Sword Thrust (melee class).", icon: '⚔️', unlocked: false },
    'bone_collector': { name: "Bone Collector", desc: "Kill 1,000 enemies while using Skull & Bones mode.", icon: '☠️', unlocked: false },
    'power_hungry': { name: "Power Hungry", desc: "Pick up 10 power-ups in one game.", icon: '⚡', unlocked: false },
    'fully_loaded': { name: "Fully Loaded", desc: "Unlock every power-up in a single run.", icon: '⚡', unlocked: false },
    'dog_lover': { name: "Dog Lover", desc: "Summon the Dog Companion.", icon: '🐶', unlocked: false },
    'pack_leader': { name: "Pack Leader", desc: "Have 3+ Dog Companions active at once.", icon: '🐶', unlocked: false },
    'dashing_demon': { name: "Dashing Demon", desc: "Dash 500 times in total.", icon: '💨', unlocked: false },
    'survivor': { name: "Survivor", desc: "Last 5 minutes in one run.", icon: '❤️', unlocked: false },
    'endurer': { name: "Endurer", desc: "Last 10 minutes.", icon: '❤️', unlocked: false },
    'unbreakable': { name: "Unbreakable", desc: "Last 20 minutes.", icon: '❤️', unlocked: false },
    'heart_hoarder': { name: "Heart Hoarder", desc: "Reach 10+ hearts at once.", icon: '❤️', unlocked: false },
    'second_wind': { name: "Second Wind", desc: "Recover from 1 heart back up to full health.", icon: '❤️', unlocked: false },
    'treasure_hunter': { name: "Treasure Hunter", desc: "Collect 100 coins.", icon: '💰', unlocked: false },
    'rich_kid': { name: "Rich Kid", desc: "Collect 1,000 coins.", icon: '💰', unlocked: false },
    'millionaire': { name: "Millionaire", desc: "Collect 10,000 coins across all runs.", icon: '💰', unlocked: false },
    'quick_learner': { name: "Quick Learner", desc: "Level up 10 times in one run.", icon: '📈', unlocked: false },
    'xp_god': { name: "XP God", desc: "Reach max level in one game.", icon: '📈', unlocked: false },
    'night_walker': { name: "Night Walker", desc: "Survive 5 minutes in Night Mode.", icon: '🌙', unlocked: false },
    'speed_demon': { name: "Speed Demon", desc: "Win a run while Double Speed cheat is on.", icon: '👟', unlocked: false },
    'chaos_survivor': { name: "Chaos Survivor", desc: "Survive 2 minutes in Chaos Mode.", icon: '🌀', unlocked: false },
    'friend_or_foe': { name: "Friend or Foe", desc: "Player 2 (enemy possession) defeats Player 1's boss.", icon: '👾', unlocked: false },
    'immortal_legend': { name: "Immortal Legend", desc: "Beat a full run without losing a single heart.", icon: '🏆', unlocked: false }
};

const CHEATS = {
    'click_to_fire': { name: "Click to Fire", desc: "Mouse click fires bullets (no auto-fire). Dodge disabled." },
    'no_gun_mode': { name: "No Gun Mode (Melee Class)", desc: "Gun replaced with Sword Thrust." },
    'skull_bones_mode': { name: "Skull & Bones Mode", desc: "Player sprite = ☠. Bullets replaced with 💀 bones." },
    'one_hit_kill': { name: "One-Hit Kill", desc: "All bullets instantly kill enemies." },
    'rainbow_bullets': { name: "Rainbow Bullets", desc: "Bullets cycle through colors every shot." },
    'rain_of_bullets': { name: "Rain of Bullets", desc: "Bullets randomly fall from the sky every second." },
    'nuke_touch': { name: "Nuke Touch", desc: "If touched by an enemy, all alive enemies are wiped out." },
    'all_powerups_start': { name: "All Power-Ups Start", desc: "Player spawns with every power-up unlocked." },
    'infinite_dash': { name: "Infinite Dash", desc: "Dash has no cooldown; invincible while dashing." },
    'god_mode': { name: "God Mode", desc: "Player cannot take damage (immortal)." },
    'ghost_mode': { name: "Ghost Mode", desc: "Player can walk through enemies & walls." },
    'explosive_player': { name: "Explosive Player", desc: "Dashing creates a small explosion around the player." },
    'shield_aura': { name: "Shield Aura", desc: "Shield blocks one hit every 10s (auto refresh)." },
    'dog_companion_start': { name: "Dog Companion Start", desc: "Always start with dog companion." },
    'clone_army': { name: "Clone Army", desc: "Spawns 3–5 permanent doppelgangers that fight with you." },
    'hearts_start_10': { name: "10 Hearts Start", desc: "Begin game with 10 lives." },
    'vampire_mode': { name: "Vampire Mode", desc: "Killing enemies restores small health." },
    'double_game_speed': { name: "Double Game Speed", desc: "Game runs at 2x movement/action speed." },
    'slow_mo_mode': { name: "Slow-Mo Mode", desc: "Game runs at 50% speed (bullet-time)." },
    'tiny_mode': { name: "Tiny Mode", desc: "Player sprite shrinks to 50%." },
    'giant_mode': { name: "Giant Mode", desc: "Player sprite doubles in size." },
    'enemy_possession': { name: "Enemy Possession Mode", desc: "Player 2 controls a random enemy. Press Insert to swap." },
    'boss_rush_mode': { name: "Boss Rush Mode", desc: "Only bosses spawn." },
    'zombie_enemies': { name: "Zombie Enemies", desc: "Enemies revive once with half health." },
    'magnet_mode': { name: "Magnet Mode", desc: "XP gems & coins fly to player automatically." },
    'coin_rain': { name: "Coin Rain", desc: "Coins drop randomly from the sky." },
    'xp_boost': { name: "XP Boost", desc: "XP gain is doubled." },
    'night_mode': { name: "Night Mode", desc: "Dark overlay simulates nighttime." },
    'mirror_mode': { name: "Mirror Mode", desc: "Map & controls flipped left ↔ right." },
    'chaos_mode': { name: "Chaos Mode", desc: "Random mix of cheats activates at once." }
};

const TROPHY_UNLOCKS_CHEAT = {
    'first_blood': 'click_to_fire', 'hunter': 'no_gun_mode', 'slayer': 'skull_bones_mode', 'exterminator': 'one_hit_kill', 'boss_breaker': 'rainbow_bullets', 'boss_crusher': 'rain_of_bullets', 'untouchable': 'god_mode', 'sharpshooter': 'infinite_dash', 'sword_master': 'explosive_player', 'bone_collector': 'shield_aura', 'power_hungry': 'all_powerups_start', 'fully_loaded': 'chaos_mode', 'dog_lover': 'dog_companion_start', 'pack_leader': 'clone_army', 'dashing_demon': 'ghost_mode', 'survivor': 'hearts_start_10', 'endurer': 'double_game_speed', 'unbreakable': 'slow_mo_mode', 'heart_hoarder': 'giant_mode', 'second_wind': 'tiny_mode', 'treasure_hunter': 'magnet_mode', 'rich_kid': 'coin_rain', 'millionaire': 'xp_boost', 'quick_learner': 'nuke_touch', 'xp_god': 'boss_rush_mode', 'night_walker': 'night_mode', 'speed_demon': 'mirror_mode',
    'chaos_survivor': 'zombie_enemies', 'friend_or_foe': 'enemy_possession', 'immortal_legend': 'mirror_mode'
};

const PERMANENT_UPGRADES = {
    playerDamage: { name: "Weapon Power", desc: "Permanently increase base damage by 2%.", baseCost: 100, costIncrease: 1.2, effect: 0.02, maxLevel: 10, icon: '💥' },
    playerSpeed: { name: "Movement Speed", desc: "Permanently increase base movement speed by 1.5%.", baseCost: 80, costIncrease: 1.2, effect: 0.015, maxLevel: 10, icon: '🏃' },
    xpGain: { name: "XP Gain", desc: "Gain 3% more experience from all sources.", baseCost: 90, costIncrease: 1.2, effect: 0.03, maxLevel: 10, icon: '📈' },
    enemyHealth: { name: "Weaken Foes", desc: "Enemies spawn with 2% less health.", baseCost: 150, costIncrease: 1.25, effect: -0.02, maxLevel: 5, icon: '💔' },
    magnetRadius: { name: "Pickup Radius", desc: "Increase pickup attraction radius by 4%.", baseCost: 60, costIncrease: 1.2, effect: 0.04, maxLevel: 10, icon: '🧲' },
    luck: { name: "Luck", desc: "Increase the chance for better drops by 0.1%.", baseCost: 200, costIncrease: 1.3, effect: 0.001, maxLevel: 5, icon: '🍀' }
};

const ALWAYS_AVAILABLE_PICKUPS = {
    v_shape_projectile: { id:'v_shape_projectile', name: 'V-Shape Shots'}, magnetic_projectile: { id:'magnetic_projectile', name: 'Magnetic Shots'},
    ice_projectile: { id:'ice_projectile', name: 'Ice Projectiles'}, ricochet: { id:'ricochet', name: 'Ricochet Shots'},
    explosive_bullets: { id: 'explosive_bullets', name: 'Explosive Bullets'}, puddle_trail: { id:'puddle_trail', name: 'Slime Trail'},
    sword: { id:'sword', name: 'Auto-Sword'}, laser_pointer: { id: 'laser_pointer', name: 'Laser Pointer'},
    auto_aim: { id: 'auto_aim', name: 'Auto Aim'}, dual_gun: { id: 'dual_gun', name: 'Dual Gun'},
    bomb: { id:'bomb', name: 'Bomb Emitter'}, orbiter: { id:'orbiter', name: 'Spinning Orbiter'},
    lightning_projectile: { id:'lightning_projectile', name: 'Lightning Projectile'}
};

const UNLOCKABLE_PICKUPS = {
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

const BOSS_HEALTH = 20;
const BOSS_XP_DROP = 20;
const BOSS_XP_EMOJI = '🎇';
const BOSS_SPAWN_INTERVAL_LEVELS = 11;
const BOSSED_ENEMY_TYPES = ['🧟', '💀', '👹', '🧟‍♀️', '🦇', '🦟'];
