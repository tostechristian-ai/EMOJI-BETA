// systems.js - Input, Audio, Quadtree, and Render Utilities
// ========================================================
import { gameState, player, WORLD_WIDTH, WORLD_HEIGHT } from './data.js';

// === QUADTREE ===
export class Quadtree {
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
        for (let i = 0; i < this.nodes.length; i++) this.nodes[i].clear();
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
            if (topQuadrant) index = 1; else if (bottomQuadrant) index = 2;
        } else if (pRect.x > verticalMidpoint) {
            if (topQuadrant) index = 0; else if (bottomQuadrant) index = 3;
        }
        return index;
    }

    insert(pRect) {
        if (this.nodes.length) {
            const index = this.getIndex(pRect);
            if (index !== -1) { this.nodes[index].insert(pRect); return; }
        }
        this.objects.push(pRect);
        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (!this.nodes.length) this.split();
            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                else i++;
            }
        }
    }

    retrieve(pRect) {
        let returnObjects = this.objects;
        const index = this.getIndex(pRect);
        if (this.nodes.length) {
            if (index !== -1) returnObjects = returnObjects.concat(this.nodes[index].retrieve(pRect));
            else for (let i = 0; i < this.nodes.length; i++) returnObjects = returnObjects.concat(this.nodes[i].retrieve(pRect));
        }
        return returnObjects;
    }
}

// === INPUT STATE ===
export const inputs = {
    moveX: 0, moveY: 0,
    aimX: 0, aimY: 0,
    keys: {},
    gamepadIndex: null,
    activeTouches: {},
    lastFireTap: 0
};

// === ASSETS & AUDIO ===
export const ASSETS = {
    sprites: {
        gun: 'sprites/gun.png', bullet: 'sprites/bullet.png', circle: 'sprites/circle.png',
        pickupBox: 'sprites/pickupbox.png', slime: 'sprites/slime.png',
        playerUp: 'sprites/playerup.png', playerDown: 'sprites/playerdown.png',
        playerLeft: 'sprites/playerleft.png', playerRight: 'sprites/playerright.png',
        levelUpBox: 'sprites/levelupbox.png', spinninglight: 'sprites/spinninglight.png',
        bloodPuddle: 'sprites/blood.png', crosshair: 'sprites/crosshair.png'
    },
    audio: {
        playerShoot: 'audio/fire_shot.mp3', xpPickup: 'audio/pick_up_xp.mp3',
        boxPickup: 'audio/pick_up_power.mp3', levelUp: 'audio/level_up.mp3',
        levelUpSelect: 'audio/level_up_end.mp3', enemyDeath: 'audio/enemy_death.mp3',
        gameOver: 'audio/gameover.mp3', playerScream: 'audio/scream.mp3',
        uiClick: 'audio/click.mp3', mainMenu: 'audio/mainmenu.mp3',
        dodge: 'audio/dodge.mp3'
    },
    backgrounds: [
        'sprites/Background6.png', 'sprites/Background2.png', 'sprites/Background3.png',
        'sprites/Background4.png', 'sprites/Background5.png', 'sprites/Background8.png',
        'sprites/Background1.png', 'sprites/Background7.png', 'sprites/Background9.png'
    ]
};

export const sprites = {};
export const audioPlayers = {};
export const backgroundImages = [];
export const preRenderedEntities = {};

// Helper to get safe time for Tone.js
export function getSafeToneTime() {
    let now = Tone.now();
    return now + 0.05;
}

export function playSound(name) {
    if (gameState.gameActive && !gameState.gamePaused && audioPlayers[name]) {
        if(audioPlayers[name].state === 'started') audioPlayers[name].stop();
        audioPlayers[name].start(getSafeToneTime());
    }
}
export function playUISound(name) {
    if (audioPlayers[name]) audioPlayers[name].start(getSafeToneTime());
}

export function preRenderEmoji(emoji, size) {
    const bufferCanvas = document.createElement('canvas');
    const bufferCtx = bufferCanvas.getContext('2d');
    const paddedSize = size * 1.3;
    bufferCanvas.width = paddedSize;
    bufferCanvas.height = paddedSize;
    bufferCtx.font = `${size}px sans-serif`;
    bufferCtx.textAlign = 'center';
    bufferCtx.textBaseline = 'middle';
    bufferCtx.fillText(emoji, paddedSize / 2, paddedSize / 2);
    preRenderedEntities[emoji] = bufferCanvas;
}

export function vibrate(duration) {
    if (navigator.vibrate) navigator.vibrate(duration);
}

// === INPUT SETUP ===
function getJoystickInput(clientX, clientY, base, cap) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const rad = 51; // Hardcoded radius
    if (dist > rad) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * rad;
        dy = Math.sin(angle) * rad;
    }
    if(cap) cap.style.transform = `translate(${dx}px, ${dy}px)`;
    return { dx, dy };
}

export function setupInput(triggerDash) {
    const mBase = document.getElementById('movement-stick-base');
    const mCap = document.getElementById('movement-stick-cap');
    const fBase = document.getElementById('fire-stick-base');
    const fCap = document.getElementById('fire-stick-cap');

    // Keys
    window.addEventListener('keydown', e => inputs.keys[e.key] = true);
    window.addEventListener('keyup', e => inputs.keys[e.key] = false);

    // Mouse
    window.addEventListener('mousemove', e => {
        if (!gameState.gameActive) return;
        const rect = document.getElementById('gameCanvas').getBoundingClientRect();
        gameState.mouseX = e.clientX - rect.left;
        gameState.mouseY = e.clientY - rect.top;
    });

    // Touch
    document.body.addEventListener('touchstart', e => {
        if (!gameState.gameActive || gameState.gamePaused) return;
        // Don't interact through modals
        if (document.getElementById('gameGuideModal').style.display === 'flex') return;

        for (let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const mRect = mBase.getBoundingClientRect();
            const fRect = fBase.getBoundingClientRect();

            if (t.clientX > mRect.left && t.clientX < mRect.right && t.clientY > mRect.top && t.clientY < mRect.bottom) {
                inputs.activeTouches[t.identifier] = 'move';
                const {dx, dy} = getJoystickInput(t.clientX, t.clientY, mBase, mCap);
                const mag = Math.hypot(dx, dy);
                if(mag>0) { inputs.moveX = dx/mag; inputs.moveY = dy/mag; }
            } else if (t.clientX > fRect.left && t.clientX < fRect.right && t.clientY > fRect.top && t.clientY < fRect.bottom) {
                inputs.activeTouches[t.identifier] = 'fire';
                
                // Double tap to dash logic
                const now = Date.now();
                if(now - inputs.lastFireTap < 300) triggerDash(player);
                inputs.lastFireTap = now;

                const {dx, dy} = getJoystickInput(t.clientX, t.clientY, fBase, fCap);
                inputs.aimX = dx; inputs.aimY = dy;
            }
        }
    }, {passive:false});

    const endTouch = e => {
        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const type = inputs.activeTouches[t.identifier];
            if(type === 'move') {
                inputs.moveX = 0; inputs.moveY = 0;
                mCap.style.transform = 'translate(0,0)';
            } else if (type === 'fire') {
                inputs.aimX = 0; inputs.aimY = 0;
                fCap.style.transform = 'translate(0,0)';
            }
            delete inputs.activeTouches[t.identifier];
        }
    };
    document.body.addEventListener('touchend', endTouch);
    document.body.addEventListener('touchcancel', endTouch);

    // Gamepad
    window.addEventListener('gamepadconnected', e => inputs.gamepadIndex = e.gamepad.index);
    window.addEventListener('gamepaddisconnected', e => { if(inputs.gamepadIndex === e.gamepad.index) inputs.gamepadIndex = null; });
}

export function updateGamepad(triggerDash, togglePause) {
    if (inputs.gamepadIndex === null) return;
    const gp = navigator.getGamepads()[inputs.gamepadIndex];
    if (!gp) return;

    const deadzone = 0.2;
    const applyDZ = v => Math.abs(v) < deadzone ? 0 : v;

    const lx = applyDZ(gp.axes[0]);
    const ly = applyDZ(gp.axes[1]);
    const lmag = Math.hypot(lx, ly);
    if(lmag > 0) { inputs.moveX = lx/lmag; inputs.moveY = ly/lmag; } 
    else { inputs.moveX = 0; inputs.moveY = 0; }

    const rx = applyDZ(gp.axes[2]);
    const ry = applyDZ(gp.axes[3]);
    const rmag = Math.hypot(rx, ry);
    if(rmag > 0) { inputs.aimX = rx/rmag; inputs.aimY = ry/rmag; }
    else { inputs.aimX = 0; inputs.aimY = 0; }

    // Dash (Button 7 / R2)
    if(gp.buttons[7]?.pressed && !gp._rLatch) {
        gp._rLatch = true;
        triggerDash(player);
    } else if (!gp.buttons[7]?.pressed) gp._rLatch = false;

    // Pause
    if((gp.buttons[9]?.pressed || gp.buttons[1]?.pressed) && !gp._pLatch) {
        gp._pLatch = true;
        togglePause();
    } else if (!gp.buttons[9]?.pressed) gp._pLatch = false;
}

export function loadAssets(onComplete) {
    // A simplified loader
    let toLoad = Object.keys(ASSETS.sprites).length + Object.keys(ASSETS.audio).length + ASSETS.backgrounds.length;
    let loaded = 0;
    const check = () => { loaded++; if(loaded>=toLoad) onComplete(); };

    for(const [k, v] of Object.entries(ASSETS.sprites)) {
        const img = new Image(); img.src = v;
        img.onload = () => { sprites[k]=img; check(); };
        img.onerror = check; // proceed anyway
    }
    for(const [k, v] of Object.entries(ASSETS.audio)) {
        audioPlayers[k] = new Tone.Player({ url: v, loop: k==='mainMenu' }).toDestination();
        audioPlayers[k].onload = check;
    }
    ASSETS.backgrounds.forEach((path, i) => {
        const img = new Image(); img.src = path;
        img.onload = () => { backgroundImages[i]=img; check(); };
        img.onerror = check;
    });
}
