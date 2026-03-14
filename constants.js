// ============================================================
// constants.js — All game-wide constants and configuration
// ============================================================

const WORLD_WIDTH  = 1125 * 1.5;
const WORLD_HEIGHT = 845  * 1.5;

// --- Camera ---
const CAMERA_PULL_STRENGTH = 35;
const CAMERA_LERP_FACTOR   = 0.05;

// --- Player hit shake ---
const PLAYER_HIT_SHAKE_DURATION    = 300;
const MAX_PLAYER_HIT_SHAKE_OFFSET  = 5;
const BOB_AMPLITUDE                = 2.5;

// --- Joystick ---
const joystickRadius = 51;

// --- Pickups ---
const COIN_SIZE          = 10;
const COIN_EMOJI         = '🔸';
const COIN_XP_VALUE      = 1;

const DIAMOND_SIZE       = 12;
const DIAMOND_EMOJI      = '🔹';
const DIAMOND_XP_VALUE   = 2;

const RING_SYMBOL_SIZE       = 11;
const RING_SYMBOL_EMOJI      = '💍';
const RING_SYMBOL_XP_VALUE   = 3;

const DEMON_XP_EMOJI = '♦️';
const DEMON_XP_VALUE = 4;

// --- Orbiter / Circle ---
const ORBIT_POWER_UP_SIZE = 20;
const ORBIT_RADIUS        = 35;
const ORBIT_SPEED         = 0.05;

const DAMAGING_CIRCLE_SPIN_SPEED       = 0.03;
const DAMAGING_CIRCLE_RADIUS           = 70;
const DAMAGING_CIRCLE_DAMAGE_INTERVAL  = 2000;

// --- Lightning ---
const LIGHTNING_EMOJI          = '⚡️';
const LIGHTNING_SIZE           = 10;
const LIGHTNING_SPAWN_INTERVAL = 3000;

// --- V-Shape ---
const V_SHAPE_INCREMENT_ANGLE = Math.PI / 18;

// --- Sword ---
const SWORD_SIZE           = 35 * 0.75;   // player.size * 0.75  (player not yet created)
const SWORD_SWING_INTERVAL = 2000;
const SWORD_SWING_DURATION = 200;
const SWORD_THRUST_DISTANCE = 35 * 0.7;

// --- Eye enemy ---
const EYE_EMOJI               = '👁️';
const EYE_SIZE                = 25 * 0.6;
const EYE_HEALTH              = 4;
const EYE_SPEED_MULTIPLIER    = 1.1;
const EYE_SAFE_DISTANCE       = 35 * 6;
const EYE_TOO_FAR_DISTANCE    = WORLD_WIDTH / 4;
const EYE_PROJECTILE_EMOJI    = '🧿';
const EYE_PROJECTILE_SIZE     = EYE_SIZE / 2;
const EYE_PROJECTILE_SPEED    = 5.6;
const EYE_PROJECTILE_LIFETIME = 4000;
const EYE_PROJECTILE_INTERVAL = 2000;

// --- Vampire ---
const VAMPIRE_EMOJI                  = '🧛‍♀️';
const VAMPIRE_SIZE                   = 20;
const VAMPIRE_HEALTH                 = 5;
const VAMPIRE_SPEED_MULTIPLIER       = 1.2;
const VAMPIRE_DODGE_DETECTION_RADIUS = 200;
const VAMPIRE_DODGE_STRENGTH         = 1.5;

// --- Female Zombie ---
const FEMALE_ZOMBIE_EMOJI             = '🧟‍♀️';
const FEMALE_ZOMBIE_SIZE              = 17 * 1.75;
const FEMALE_ZOMBIE_HEALTH            = 6;
const FEMALE_ZOMBIE_SPEED_MULTIPLIER  = 0.5;

// --- Puddle (player) ---
const PLAYER_PUDDLE_SIZE           = 35 / 1.5;
const PLAYER_PUDDLE_SPAWN_INTERVAL = 80;
const PLAYER_PUDDLE_LIFETIME       = 3000;
const PLAYER_PUDDLE_SLOW_FACTOR    = 0.5;

// --- Mosquito ---
const MOSQUITO_EMOJI                    = '🦟';
const MOSQUITO_SIZE                     = 15;
const MOSQUITO_HEALTH                   = 2;
const MOSQUITO_SPEED_MULTIPLIER         = 1.5;
const MOSQUITO_DIRECTION_UPDATE_INTERVAL = 3000;

const MOSQUITO_PUDDLE_EMOJI         = '♨️';
const MOSQUITO_PUDDLE_SIZE          = 35 * 0.7;
const MOSQUITO_PUDDLE_SPAWN_INTERVAL = 500;
const MOSQUITO_PUDDLE_LIFETIME       = 2000;
const MOSQUITO_PUDDLE_SLOW_FACTOR    = 0.5;

// --- Apple ---
const APPLE_ITEM_EMOJI = '🍎';
const APPLE_ITEM_SIZE  = 15;
const APPLE_LIFETIME   = 5000;

// --- Enemy base stats ---
const BASE_ZOMBIE_HEALTH = 1;
const BASE_SKULL_HEALTH  = 2;
const BASE_BAT_HEALTH    = 3;
const BASE_DEMON_HEALTH  = 4;

const SKULL_EMOJI            = '💀';
const SKULL_SIZE             = 20;
const SKULL_SPEED_MULTIPLIER = 1.15;

const BAT_EMOJI                = '🦇';
const BAT_SIZE                 = 25 * 0.85;
const BAT_SPEED_MULTIPLIER     = 2;
const BAT_PAUSE_DURATION_FRAMES = 30;
const BAT_MOVE_DURATION_FRAMES  = 30;

const DEMON_EMOJI             = '👹';
const DEMON_SIZE              = 28 * 0.7;
const DEMON_SPEED_MULTIPLIER  = 1.8975;

// --- Magnet ---
const MAGNET_STRENGTH = 0.5;

// --- Bomb ---
const BOX_SIZE          = 25;
const BOMB_SIZE         = 14;
const BOMB_LIFETIME_MS  = 8000;
const BOMB_INTERVAL_MS  = 5000;

// --- Anti-gravity ---
const ANTI_GRAVITY_INTERVAL = 5000;
const ANTI_GRAVITY_RADIUS   = 200;
const ANTI_GRAVITY_STRENGTH = 60;

// --- Black Hole ---
const BLACK_HOLE_INTERVAL      = 10000;
const BLACK_HOLE_PULL_DURATION = 3000;
const BLACK_HOLE_DELAY         = 3000;
const BLACK_HOLE_RADIUS        = 167;
const BLACK_HOLE_PULL_STRENGTH = 2.5;

// --- Boss ---
const BOSS_HEALTH               = 20;
const BOSS_XP_DROP              = 20;
const BOSS_XP_EMOJI             = '🎇';
const BOSS_SPAWN_INTERVAL_LEVELS = 11;

// --- Merchant ---
const MERCHANT_SPAWN_INTERVAL = 140000;

// --- Doppelganger ---
const DOPPELGANGER_SPAWN_INTERVAL = 14000;
const DOPPELGANGER_DURATION       = 8000;
const DOPPELGANGER_FIRE_INTERVAL  = 500;

// --- Dog companion ---
const DOG_HOMING_SHOT_INTERVAL = 3000;

// --- Bug Swarm ---
const BUG_SWARM_INTERVAL = 9000;
const BUG_SWARM_COUNT    = 6;
const FLY_DAMAGE         = 0.34;
const FLY_SPEED          = 3.5;
const FLY_SIZE           = 8;

// --- Night Owl ---
const OWL_FIRE_INTERVAL       = 1500;
const OWL_PROJECTILE_SPEED    = 6;
const OWL_PROJECTILE_SIZE     = 15;
const OWL_FOLLOW_DISTANCE     = 60;

// --- Whirlwind Axe ---
const WHIRLWIND_AXE_RADIUS = ORBIT_RADIUS * 2;
const WHIRLWIND_AXE_SPEED  = 0.04;
const WHIRLWIND_AXE_SIZE   = 30;

// --- Lightning Strike ---
const LIGHTNING_STRIKE_INTERVAL = 7000;
const LIGHTNING_STRIKE_DAMAGE   = 1;

// --- Weapon pool ---
const MAX_WEAPONS = 500;

// --- Fire rate boost ---
const FIRE_RATE_BOOST_DURATION = 3000;

// --- Gamepad ---
const GAMEPAD_DEADZONE    = 0.2;
const GAMEPAD_INPUT_DELAY = 200;

// --- Enemy configs ---
const ENEMY_CONFIGS = {
    '🧟': { size: 17, baseHealth: 1, speedMultiplier: 1, type: 'pursuer', minLevel: 1 },
    '💀': { size: 20, baseHealth: 2, speedMultiplier: 1.15, type: 'pursuer', minLevel: 5 },
    '🌀': { size: 22, baseHealth: 4, speedMultiplier: 0.3, type: 'snail', minLevel: 4,
            initialProps: () => ({ lastPuddleSpawnTime: Date.now(), directionAngle: Math.random() * 2 * Math.PI }) },
    '🦟': { size: 15, baseHealth: 2, speedMultiplier: 1.5, type: 'mosquito', minLevel: 7,
            initialProps: () => ({ lastDirectionUpdateTime: Date.now(), currentMosquitoDirection: null, lastPuddleSpawnTime: Date.now() }) },
    '🦇': { size: 25 * 0.85, baseHealth: 3, speedMultiplier: 2, type: 'bat', minLevel: 10,
            initialProps: () => ({ isPaused: false, pauseTimer: 0, pauseDuration: 30, moveDuration: 30 }) },
    '😈': { size: 20 * 0.8, baseHealth: 3, speedMultiplier: 1.84, type: 'devil', minLevel: 12,
            initialProps: () => ({ moveAxis: 'x', lastAxisSwapTime: Date.now() }) },
    '👹': { size: 28 * 0.7, baseHealth: 4, speedMultiplier: 1.8975, type: 'demon', minLevel: 15,
            initialProps: () => ({ moveState: 'following', lastStateChangeTime: Date.now(), randomDx: 0, randomDy: 0 }) },
    '👻': { size: 22, baseHealth: 4, speedMultiplier: 1.2, type: 'ghost', minLevel: 12,
            initialProps: () => ({ isVisible: true, lastPhaseChange: Date.now(), phaseDuration: 3000, bobOffset: 0 }) },
    '👁️': { size: 25 * 0.6, baseHealth: 4, speedMultiplier: 1.1 * 1.1, type: 'eye', minLevel: 20,
            initialProps: () => ({ lastEyeProjectileTime: Date.now() }) },
    '🧟‍♀️': { size: 17 * 1.75, baseHealth: 6, speedMultiplier: 0.5, type: 'pursuer', minLevel: 25 },
    '🧛‍♀️': { size: 20, baseHealth: 5, speedMultiplier: 1.2, type: 'vampire', minLevel: 30 }
};

const BOSSED_ENEMY_TYPES = ['🧟', SKULL_EMOJI, DEMON_EMOJI, FEMALE_ZOMBIE_EMOJI, BAT_EMOJI, MOSQUITO_EMOJI];

// --- Upgrade options (per-run) ---
const UPGRADE_BORDER_COLORS = {
    "speed": "#66bb6a", "fireRate": "#8B4513", "magnetRadius": "#800080",
    "damage": "#ff0000", "projectileSpeed": "#007bff", "knockback": "#808080", "luck": "#FFD700"
};

const UPGRADE_OPTIONS = [
    { name: "Fast Runner",       desc: "Increase movement speed by 8%",           type: "speed",           value: 0.08,  icon: '🏃' },
    { name: "Rapid Fire",        desc: "Increase fire rate by 8%",                type: "fireRate",        value: 0.08,  icon: '🔫' },
    { name: "Magnet Field",      desc: "Increase pickup radius by 8%",            type: "magnetRadius",    value: 0.08,  icon: '🧲' },
    { name: "Increased Damage",  desc: "Increase projectile damage by 15%",       type: "damage",          value: 0.15,  icon: '💥' },
    { name: "Swift Shots",       desc: "Increase projectile speed by 8%",         type: "projectileSpeed", value: 0.08,  icon: '💨' },
    { name: "Power Shot",        desc: "Projectiles knock enemies back by 8%",    type: "knockback",       value: 0.08,  icon: '💪' },
    { name: "Lucky Charm",       desc: "Increase pickup drop rate by 0.5%",       type: "luck",            value: 0.005, icon: '🍀' }
];

// --- Permanent shop upgrades ---
const PERMANENT_UPGRADES = {
    playerDamage:  { name: "Weapon Power",     desc: "Permanently increase base damage by 2%.",               baseCost: 100, costIncrease: 1.2,  effect: 0.02,  maxLevel: 10, icon: '💥' },
    playerSpeed:   { name: "Movement Speed",   desc: "Permanently increase base movement speed by 1.5%.",     baseCost: 80,  costIncrease: 1.2,  effect: 0.015, maxLevel: 10, icon: '🏃' },
    xpGain:        { name: "XP Gain",          desc: "Gain 3% more experience from all sources.",             baseCost: 90,  costIncrease: 1.2,  effect: 0.03,  maxLevel: 10, icon: '📈' },
    enemyHealth:   { name: "Weaken Foes",      desc: "Enemies spawn with 2% less health.",                   baseCost: 150, costIncrease: 1.25, effect: -0.02, maxLevel: 5,  icon: '💔' },
    magnetRadius:  { name: "Pickup Radius",    desc: "Increase pickup attraction radius by 4%.",              baseCost: 60,  costIncrease: 1.2,  effect: 0.04,  maxLevel: 10, icon: '🧲' },
    luck:          { name: "Luck",             desc: "Increase the chance for better drops by 0.1%.",         baseCost: 200, costIncrease: 1.3,  effect: 0.001, maxLevel: 5,  icon: '🍀' }
};

const ALWAYS_AVAILABLE_PICKUPS = {
    v_shape_projectile:  { id:'v_shape_projectile',  name: 'V-Shape Shots' },
    magnetic_projectile: { id:'magnetic_projectile', name: 'Magnetic Shots' },
    ice_projectile:      { id:'ice_projectile',      name: 'Ice Projectiles' },
    ricochet:            { id:'ricochet',            name: 'Ricochet Shots' },
    explosive_bullets:   { id:'explosive_bullets',   name: 'Explosive Bullets' },
    puddle_trail:        { id:'puddle_trail',         name: 'Slime Trail' },
    sword:               { id:'sword',               name: 'Auto-Sword' },
    laser_pointer:       { id:'laser_pointer',       name: 'Laser Pointer' },
    auto_aim:            { id:'auto_aim',            name: 'Auto Aim' },
    dual_gun:            { id:'dual_gun',            name: 'Dual Gun' },
    bomb:                { id:'bomb',                name: 'Bomb Emitter' },
    orbiter:             { id:'orbiter',             name: 'Spinning Orbiter' },
    lightning_projectile:{ id:'lightning_projectile',name: 'Lightning Projectile' }
};

const UNLOCKABLE_PICKUPS = {
    map_select:     { name: "Map Select",      desc: "Unlocks the ability to choose your map.",            cost: 1500, icon: '🗺️' },
    night_owl:      { name: "Night Owl",       desc: "Unlocks a companion that snipes enemies.",           cost: 1300, icon: '🦉' },
    whirlwind_axe:  { name: "Whirlwind Axe",   desc: "Unlocks a large, damaging orbiting axe.",           cost: 1000, icon: '🪓' },
    doppelganger:   { name: "Doppelganger",    desc: "Unlocks the doppelganger pickup.",                  cost: 1200, icon: '👯' },
    dog_companion:  { name: "Dog Companion",   desc: "Unlocks the loyal dog companion pickup.",            cost: 500,  icon: '🐶' },
    anti_gravity:   { name: "Anti-Gravity",    desc: "Unlocks the enemy-repelling pulse pickup.",         cost: 600,  icon: '💨' },
    temporal_ward:  { name: "Temporal Ward",   desc: "Unlocks the time-freezing defensive pickup.",       cost: 800,  icon: '⏱️' },
    rocket_launcher:{ name: "Heavy Shells",    desc: "Unlocks the powerful heavy shells pickup.",         cost: 1100, icon: '🚀' },
    circle:         { name: "Damaging Circle", desc: "Unlocks the persistent damaging aura pickup.",      cost: 900,  icon: '⭕' },
    flaming_bullets:{ name: "Flaming Bullets", desc: "Unlocks bullets that ignite enemies.",              cost: 1150, icon: '🔥' },
    black_hole:     { name: "Black Hole",      desc: "Unlocks the enemy-vortex pickup.",                  cost: 1180, icon: '⚫' },
    vengeance_nova: { name: "Vengeance Nova",  desc: "Unlocks the defensive blast pickup.",               cost: 700,  icon: '🛡️' }
};

// --- Characters ---
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

// --- Achievements ---
const ACHIEVEMENTS = {
    'first_blood':     { name: "First Blood",      desc: "Kill your first enemy.",                                       icon: '🩸', unlocked: false },
    'hunter':          { name: "Hunter",            desc: "Kill 100 enemies in one run.",                                 icon: '🎯', unlocked: false },
    'slayer':          { name: "Slayer",            desc: "Kill 1,000 enemies total.",                                    icon: '⚔️', unlocked: false },
    'exterminator':    { name: "Exterminator",      desc: "Kill 10,000 enemies total.",                                   icon: '💀', unlocked: false },
    'boss_breaker':    { name: "Boss Breaker",      desc: "Defeat a boss.",                                               icon: '🏆', unlocked: false },
    'boss_crusher':    { name: "Boss Crusher",      desc: "Defeat 10 bosses total.",                                      icon: '🏆', unlocked: false },
    'untouchable':     { name: "Untouchable",       desc: "Beat a run without being hit.",                                icon: '🛡️', unlocked: false },
    'sharpshooter':    { name: "Sharpshooter",      desc: "Achieve 90% accuracy in a run.",                              icon: '🎯', unlocked: false },
    'sword_master':    { name: "Sword Master",      desc: "Kill 50 enemies with a sword.",                               icon: '🗡️', unlocked: false },
    'bone_collector':  { name: "Bone Collector",    desc: "Kill 100 enemies with bones.",                                icon: '🦴', unlocked: false },
    'power_hungry':    { name: "Power Hungry",      desc: "Collect 5 power-ups in a single run.",                        icon: '💪', unlocked: false },
    'fully_loaded':    { name: "Fully Loaded",      desc: "Have every power-up active at once.",                         icon: '🔋', unlocked: false },
    'dog_lover':       { name: "Dog Lover",         desc: "Use the Dog Companion for a full run.",                       icon: '🐶', unlocked: false },
    'pack_leader':     { name: "Pack Leader",       desc: "Have the Dog and Doppelganger active at once.",               icon: '🐺', unlocked: false },
    'dashing_demon':   { name: "Dashing Demon",     desc: "Dash 50 times in one run.",                                   icon: '💨', unlocked: false },
    'survivor':        { name: "Survivor",          desc: "Last 5 minutes in one run.",                                  icon: '❤️', unlocked: false },
    'endurer':         { name: "Endurer",           desc: "Last 10 minutes.",                                            icon: '❤️', unlocked: false },
    'unbreakable':     { name: "Unbreakable",       desc: "Last 20 minutes.",                                            icon: '❤️', unlocked: false },
    'heart_hoarder':   { name: "Heart Hoarder",     desc: "Reach 10+ hearts at once.",                                   icon: '❤️', unlocked: false },
    'second_wind':     { name: "Second Wind",       desc: "Recover from 1 heart back up to full health.",                icon: '❤️', unlocked: false },
    'treasure_hunter': { name: "Treasure Hunter",   desc: "Collect 100 coins.",                                          icon: '💰', unlocked: false },
    'rich_kid':        { name: "Rich Kid",          desc: "Collect 1,000 coins.",                                        icon: '💰', unlocked: false },
    'millionaire':     { name: "Millionaire",       desc: "Collect 10,000 coins across all runs.",                       icon: '💰', unlocked: false },
    'quick_learner':   { name: "Quick Learner",     desc: "Level up 10 times in one run.",                               icon: '📈', unlocked: false },
    'xp_god':          { name: "XP God",            desc: "Reach max level in one game.",                                icon: '📈', unlocked: false },
    'night_walker':    { name: "Night Walker",      desc: "Survive 5 minutes in Night Mode.",                            icon: '🌙', unlocked: false },
    'speed_demon':     { name: "Speed Demon",       desc: "Win a run while Double Speed cheat is on.",                   icon: '👟', unlocked: false },
    'chaos_survivor':  { name: "Chaos Survivor",    desc: "Survive 2 minutes in Chaos Mode.",                            icon: '🌀', unlocked: false },
    'friend_or_foe':   { name: "Friend or Foe",     desc: "Player 2 (enemy possession) defeats Player 1's boss.",       icon: '👾', unlocked: false },
    'immortal_legend': { name: "Immortal Legend",   desc: "Beat a full run without losing a single heart.",              icon: '🏆', unlocked: false }
};

// --- Cheats ---
const CHEATS = {
    'click_to_fire':       { name: "Click to Fire",            desc: "Mouse click fires bullets (no auto-fire). Dodge disabled." },
    'no_gun_mode':         { name: "No Gun Mode (Melee Class)",desc: "Gun replaced with Sword Thrust." },
    'skull_bones_mode':    { name: "Skull & Bones Mode",       desc: "Player sprite = ☠. Bullets replaced with 💀 bones." },
    'one_hit_kill':        { name: "One-Hit Kill",             desc: "All bullets instantly kill enemies." },
    'rainbow_bullets':     { name: "Rainbow Bullets",          desc: "Bullets cycle through colors every shot." },
    'rain_of_bullets':     { name: "Rain of Bullets",          desc: "Bullets randomly fall from the sky every second." },
    'nuke_touch':          { name: "Nuke Touch",               desc: "If touched by an enemy, all alive enemies are wiped out." },
    'all_powerups_start':  { name: "All Power-Ups Start",      desc: "Player spawns with every power-up unlocked." },
    'infinite_dash':       { name: "Infinite Dash",            desc: "Dash has no cooldown; invincible while dashing." },
    'god_mode':            { name: "God Mode",                 desc: "Player cannot take damage (immortal)." },
    'ghost_mode':          { name: "Ghost Mode",               desc: "Player can walk through enemies & walls." },
    'explosive_player':    { name: "Explosive Player",         desc: "Dashing creates a small explosion around the player." },
    'shield_aura':         { name: "Shield Aura",              desc: "Shield blocks one hit every 10s (auto refresh)." },
    'dog_companion_start': { name: "Dog Companion Start",      desc: "Always start with dog companion." },
    'clone_army':          { name: "Clone Army",               desc: "Spawns 3–5 permanent doppelgangers that fight with you." },
    'hearts_start_10':     { name: "10 Hearts Start",          desc: "Begin game with 10 lives." },
    'vampire_mode':        { name: "Vampire Mode",             desc: "Killing enemies restores small health." },
    'double_game_speed':   { name: "Double Game Speed",        desc: "Game runs at 2x movement/action speed." },
    'slow_mo_mode':        { name: "Slow-Mo Mode",             desc: "Game runs at 50% speed (bullet-time)." },
    'tiny_mode':           { name: "Tiny Mode",                desc: "Player sprite shrinks to 50%." },
    'giant_mode':          { name: "Giant Mode",               desc: "Player sprite doubles in size." },
    'enemy_possession':    { name: "Enemy Possession Mode",    desc: "Player 2 controls a random enemy. Press Insert to swap." },
    'boss_rush_mode':      { name: "Boss Rush Mode",           desc: "Only bosses spawn." },
    'zombie_enemies':      { name: "Zombie Enemies",           desc: "Enemies revive once with half health." },
    'magnet_mode':         { name: "Magnet Mode",              desc: "XP gems & coins fly to player automatically." },
    'coin_rain':           { name: "Coin Rain",                desc: "Coins drop randomly from the sky." },
    'xp_boost':            { name: "XP Boost",                 desc: "XP gain is doubled." },
    'night_mode':          { name: "Night Mode",               desc: "Dark overlay simulates nighttime." },
    'mirror_mode':         { name: "Mirror Mode",              desc: "Map & controls flipped left ↔ right." },
    'chaos_mode':          { name: "Chaos Mode",               desc: "Random mix of cheats activates at once." }
};

const TROPHY_UNLOCKS_CHEAT = {
    'first_blood': 'click_to_fire', 'hunter': 'no_gun_mode', 'slayer': 'skull_bones_mode',
    'exterminator': 'one_hit_kill', 'boss_breaker': 'rainbow_bullets', 'boss_crusher': 'rain_of_bullets',
    'untouchable': 'god_mode', 'sharpshooter': 'infinite_dash', 'sword_master': 'explosive_player',
    'bone_collector': 'shield_aura', 'power_hungry': 'all_powerups_start', 'fully_loaded': 'chaos_mode',
    'dog_lover': 'dog_companion_start', 'pack_leader': 'clone_army', 'dashing_demon': 'ghost_mode',
    'survivor': 'hearts_start_10', 'endurer': 'double_game_speed', 'unbreakable': 'slow_mo_mode',
    'heart_hoarder': 'giant_mode', 'second_wind': 'tiny_mode', 'treasure_hunter': 'magnet_mode',
    'rich_kid': 'coin_rain', 'millionaire': 'xp_boost', 'quick_learner': 'nuke_touch',
    'xp_god': 'boss_rush_mode', 'night_walker': 'night_mode', 'speed_demon': 'mirror_mode',
    'chaos_survivor': 'zombie_enemies', 'friend_or_foe': 'enemy_possession', 'immortal_legend': 'mirror_mode'
};
