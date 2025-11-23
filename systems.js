// systems.js - Input, Audio, Quadtree, and Render Utilities
import { gameState, player, WORLD_WIDTH, WORLD_HEIGHT, ASSETS } from './data.js';

// ================================================================================= //
// ======================= OPTIMIZATION: QUADTREE IMPLEMENTATION =================== //
// ================================================================================= //
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
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clear();
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
            if (topQuadrant) index = 1;
            else if (bottomQuadrant) index = 2;
        } else if (pRect.x > verticalMidpoint) {
            if (topQuadrant) index = 0;
            else if (bottomQuadrant) index = 3;
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
            if (!this.nodes.length) this.split();
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
        if (this.nodes.length) {
            if (index !== -1) {
                returnObjects = returnObjects.concat(this.nodes[index].retrieve(pRect));
            } else {
                for (let i = 0; i < this.nodes.length; i++) {
                    returnObjects = returnObjects.concat(this.nodes[i].retrieve(pRect));
                }
            }
        }
        return returnObjects;
    }
}

// ================================================================================= //
// ======================= INPUT MANAGER =========================================== //
// ================================================================================= //
export const inputs = {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    keys: {},
    activeTouches: {},
    isFiring: false,
    lastFireStickTap: 0,
    gamepadIndex: null
};

// Internal Joystick Logic
function getJoystickInput(touchClientX, touchClientY, baseElement, capElement) {
    const rect = baseElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touchClientX - centerX;
    let dy = touchClientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = 51; // Hardcoded match to CSS
    
    if (distance > radius) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * radius;
        dy = Math.sin(angle) * radius;
    }
    if (capElement) capElement.style.transform = `translate(${dx}px, ${dy}px)`;
    return { dx, dy };
}

export function setupInput(triggerDashCallback) {
    const movementStickBase = document.getElementById('movement-stick-base');
    const movementStickCap = document.getElementById('movement-stick-cap');
    const firestickBase = document.getElementById('fire-stick-base');
    const firestickCap = document.getElementById('fire-stick-cap');

    // Keyboard
    window.addEventListener('keydown', (e) => inputs.keys[e.key] = true);
    window.addEventListener('keyup', (e) => inputs.keys[e.key] = false);

    // Mouse
    window.addEventListener('mousemove', (e) => {
        if (!gameState.gameActive) return;
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        gameState.mouseX = e.clientX - rect.left;
        gameState.mouseY = e.clientY - rect.top;
        // Aim calculation happens in game loop based on camera offset
    });

    // Touch
    document.body.addEventListener('touchstart', (e) => {
        if (!gameState.gameActive || gameState.gamePaused) return;
        // Simple check to ensure we aren't touching a modal
        if (document.getElementById('gameGuideModal').style.display === 'flex') return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const moveRect = movementStickBase.getBoundingClientRect();
            const fireRect = firestickBase.getBoundingClientRect();

            if (touch.clientX > moveRect.left && touch.clientX < moveRect.right && 
                touch.clientY > moveRect.top && touch.clientY < moveRect.bottom) {
                inputs.activeTouches[touch.identifier] = 'movement';
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                const mag = Math.hypot(dx, dy);
                if (mag > 0) { inputs.moveX = dx/mag; inputs.moveY = dy/mag; }
            } 
            else if (touch.clientX > fireRect.left && touch.clientX < fireRect.right &&
                     touch.clientY > fireRect.top && touch.clientY < fireRect.bottom) {
                inputs.activeTouches[touch.identifier] = 'fire';
                
                // Double tap dodge logic
                const now = Date.now();
                if (now - inputs.lastFireStickTap < 300) {
                    if(triggerDashCallback) triggerDashCallback(player);
                }
                inputs.lastFireStickTap = now;

                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                inputs.aimX = dx; inputs.aimY = dy;
            }
        }
    }, { passive: false });

    document.body.addEventListener('touchmove', (e) => {
        if (!gameState.gameActive) return;
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const type = inputs.activeTouches[touch.identifier];
            if (type === 'movement') {
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                const mag = Math.hypot(dx, dy);
                if (mag > 0) { inputs.moveX = dx/mag; inputs.moveY = dy/mag; }
                else { inputs.moveX = 0; inputs.moveY = 0; }
            } else if (type === 'fire') {
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                inputs.aimX = dx; inputs.aimY = dy;
            }
        }
    }, { passive: false });

    const endTouch = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const type = inputs.activeTouches[touch.identifier];
            if (type === 'movement') {
                inputs.moveX = 0; inputs.moveY = 0;
                movementStickCap.style.transform = 'translate(0,0)';
            } else if (type === 'fire') {
                inputs.aimX = 0; inputs.aimY = 0;
                firestickCap.style.transform = 'translate(0,0)';
            }
            delete inputs.activeTouches[touch.identifier];
        }
    };
    document.body.addEventListener('touchend', endTouch);
    document.body.addEventListener('touchcancel', endTouch);

    // Gamepad Connection
    window.addEventListener("gamepadconnected", (e) => inputs.gamepadIndex = e.gamepad.index);
    window.addEventListener("gamepaddisconnected", (e) => { if (inputs.gamepadIndex === e.gamepad.index) inputs.gamepadIndex = null; });
}

export function updateGamepad(triggerDashCallback, togglePauseCallback) {
    if (inputs.gamepadIndex === null) return;
    const gp = navigator.getGamepads()[inputs.gamepadIndex];
    if (!gp) return;

    const deadzone = 0.2;
    const applyDZ = (v) => (Math.abs(v) < deadzone ? 0 : v);

    // Movement
    const lx = applyDZ(gp.axes[0]);
    const ly = applyDZ(gp.axes[1]);
    const lmag = Math.hypot(lx, ly);
    if (lmag > 0) { inputs.moveX = lx/lmag; inputs.moveY = ly/lmag; } 
    else { inputs.moveX = 0; inputs.moveY = 0; }

    // Aim
    const rx = applyDZ(gp.axes[2]);
    const ry = applyDZ(gp.axes[3]);
    const rmag = Math.hypot(rx, ry);
    if (rmag > 0) { inputs.aimX = rx/rmag; inputs.aimY = ry/rmag; }
    else { inputs.aimX = 0; inputs.aimY = 0; }

    // Dash (Right Trigger - Button 7)
    if (gp.buttons[7]?.pressed && !gp._rTriggerLatch) {
        gp._rTriggerLatch = true;
        if(triggerDashCallback) triggerDashCallback(player);
    } else if (!gp.buttons[7]?.pressed) gp._rTriggerLatch = false;

    // Pause (Start - 9, or Select - 8)
    if ((gp.buttons[9]?.pressed || gp.buttons[1]?.pressed) && !gp._pauseLatch) {
        gp._pauseLatch = true;
        if(togglePauseCallback) togglePauseCallback();
    } else if (!gp.buttons[9]?.pressed && !gp.buttons[1]?.pressed) gp._pauseLatch = false;
}


// ================================================================================= //
// ======================= AUDIO SYSTEM ============================================ //
// ================================================================================= //
export const audio = {
    players: {},
    bgmPlayer: null,
    contextStarted: false
};

export function getSafeToneTime() {
    let now = Tone.now();
    // Safety check for Tone.js timing issues
    return now + 0.05; 
}

export function loadAssets(onComplete) {
    let toLoad = Object.keys(ASSETS.sprites).length + Object.keys(ASSETS.audio).length + ASSETS.backgrounds.length;
    let loaded = 0;

    const checkDone = () => {
        loaded++;
        if (loaded >= toLoad) onComplete();
    };

    // Images
    export const sprites = {};
    export const backgrounds = [];

    for (const [key, path] of Object.entries(ASSETS.sprites)) {
        const img = new Image();
        img.src = path;
        img.onload = () => { sprites[key] = img; checkDone(); };
        img.onerror = () => { console.error("Missing sprite:", path); checkDone(); };
    }

    ASSETS.backgrounds.forEach((path, i) => {
        const img = new Image();
        img.src = path;
        img.onload = () => { backgrounds[i] = img; checkDone(); };
        img.onerror = checkDone;
    });

    // Audio
    for (const [key, path] of Object.entries(ASSETS.audio)) {
        audio.players[key] = new Tone.Player({
            url: path,
            autostart: false,
            loop: key === 'mainMenu',
            onload: checkDone
        }).toDestination();
    }
    
    // Synths for procedural sounds
    audio.swordSynth = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.01, release: 0.05 } }).toDestination();
    audio.explosionSynth = new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.2 } }).toDestination();
}

export function playSound(name) {
    if (gameState.gameActive && !gameState.gamePaused && audio.players[name]) {
        if(audio.players[name].state === "started") audio.players[name].stop();
        audio.players[name].start();
    }
}

export function playUISound(name) {
    if (audio.players[name]) {
         if(audio.players[name].state === "started") audio.players[name].stop();
         audio.players[name].start();
    }
}

// ================================================================================= //
// ======================= RENDERING UTILS ========================================= //
// ================================================================================= //
export const preRenderedEntities = {};

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
