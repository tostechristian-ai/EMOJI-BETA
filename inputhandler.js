// ============================================================
// inputhandler.js — Keyboard / mouse / touch input events
// ============================================================

// ---- Shared input state ----
let joystickDirX = 0, joystickDirY = 0;
let aimDx = 0,        aimDy = 0;
let p2aimDx = 0,      p2aimDy = 0;

let lastMoveStickTapTime  = 0;
let lastFireStickTapTime  = 0;
let lastMoveStickDirection = { x: 0, y: 0 };

let fireRateBoostActive  = false;
let fireRateBoostEndTime = 0;

let mouseX = 0, mouseY = 0;
let isMouseInCanvas = false;

const keys = {};

// ---- Joystick helper ----
function getJoystickInput(touchClientX, touchClientY, baseElement, capElement) {
    const rect    = baseElement.getBoundingClientRect();
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;
    let dx = touchClientX - centerX;
    let dy = touchClientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > joystickRadius) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * joystickRadius;
        dy = Math.sin(angle) * joystickRadius;
    }
    if (capElement) capElement.style.transform = `translate(${dx}px, ${dy}px)`;
    return { dx, dy, distance };
}

// ---- Keyboard ----
window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameActive && !gameOver) togglePause();
        return;
    }
    if (e.key === 'o') { triggerDash(player2); }

    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (gameActive && !gamePaused && !gameOver) triggerDash(player);
    }

    if (e.key === '-' && keys['=']) {
        playerData.currency += 5000;
        savePlayerData();
        floatingTexts.push({ text: "+5000 Coins!", x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 2000, color: '#FFD700' });
    }

    if (e.key === 'Insert' && gameActive && !gameOver && !gamePaused) {
        if (player.lives > 1 && (!player2 || !player2.active)) {
            player.lives--;
            updateUIStats();
            player2 = {
                active: true, x: player.x, y: player.y, size: 35, speed: 1.4,
                facing: 'down', stepPhase: 0, gunAngle: -Math.PI / 2,
                lastFireTime: 0, fireInterval: 400,
                isDashing: false, dashEndTime: 0, lastDashTime: 0, dashCooldown: 6000,
                spinStartTime: null, spinDirection: 0, dx: 0, dy: 0
            };
            floatingTexts.push({ text: "Player 2 has joined!", x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 2000, color: '#FFFF00' });
        }
    }

    keys[e.key] = true;
    if      (e.key === 'ArrowUp')    aimDy = -1;
    else if (e.key === 'ArrowDown')  aimDy =  1;
    else if (e.key === 'ArrowLeft')  aimDx = -1;
    else if (e.key === 'ArrowRight') aimDx =  1;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if      (keys['ArrowDown'])  aimDy =  1;
        else if (keys['ArrowUp'])    aimDy = -1;
        else                         aimDy =  0;
        if      (keys['ArrowRight']) aimDx =  1;
        else if (keys['ArrowLeft'])  aimDx = -1;
        else                         aimDx =  0;
    }
});

// ---- Mouse movement / aim ----
window.addEventListener('mousemove', (e) => {
    if (gamePaused || gameOver || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    const playerScreenX = player.x - cameraOffsetX;
    const playerScreenY = player.y - cameraOffsetY;
    aimDx = mouseX - playerScreenX;
    aimDy = mouseY - playerScreenY;
});

canvas.addEventListener('mouseenter', () => { if (gameActive && !document.body.classList.contains('is-mobile')) isMouseInCanvas = true; });
canvas.addEventListener('mouseleave', () => { if (gameActive) isMouseInCanvas = false; });
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gameActive && !gamePaused && !gameOver) triggerDash(player);
});

// ---- Touch ----
let activeTouches   = {};
let mouseActiveStick = null;

document.body.addEventListener('touchstart', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch    = e.changedTouches[i];
        const moveRect = movementStickBase.getBoundingClientRect();
        const fireRect = firestickBase.getBoundingClientRect();

        if (touch.clientX > moveRect.left && touch.clientX < moveRect.right &&
            touch.clientY > moveRect.top  && touch.clientY < moveRect.bottom) {
            if (!activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = { type: 'movement' };
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                const magnitude = Math.hypot(dx, dy);
                if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; }
            }
        } else if (touch.clientX > fireRect.left && touch.clientX < fireRect.right &&
                   touch.clientY > fireRect.top  && touch.clientY < fireRect.bottom) {
            if (!activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = { type: 'fire' };
                const now = Date.now();
                if (now - lastFireStickTapTime < 300) triggerDash(player);
                lastFireStickTapTime = now;
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                aimDx = dx; aimDy = dy;
            }
        }
    }
}, { passive: false });

document.body.addEventListener('touchmove', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch     = e.changedTouches[i];
        const touchInfo = activeTouches[touch.identifier];
        if (touchInfo) {
            if (touchInfo.type === 'movement') {
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                const magnitude = Math.hypot(dx, dy);
                if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; }
                else               { joystickDirX = 0;              joystickDirY = 0;              }
            } else if (touchInfo.type === 'fire') {
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                aimDx = dx; aimDy = dy;
            }
        }
    }
}, { passive: false });

function _clearTouch(touch) {
    const info = activeTouches[touch.identifier];
    if (info) {
        if (info.type === 'movement') { if (movementStickCap) movementStickCap.style.transform = 'translate(0,0)'; joystickDirX = 0; joystickDirY = 0; }
        else if (info.type === 'fire') { if (firestickCap) firestickCap.style.transform = 'translate(0,0)'; aimDx = 0; aimDy = 0; }
        delete activeTouches[touch.identifier];
    }
}

document.body.addEventListener('touchend',    (e) => { if (!gameActive || gamePaused || gameOver) return; Array.from(e.changedTouches).forEach(_clearTouch); });
document.body.addEventListener('touchcancel', (e) => { if (!gameActive || gamePaused || gameOver) return; Array.from(e.changedTouches).forEach(_clearTouch); });

// ---- Mouse joystick simulation ----
document.body.addEventListener('mousedown', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    const moveRect = movementStickBase.getBoundingClientRect();
    const fireRect = firestickBase.getBoundingClientRect();
    if (e.clientX > moveRect.left && e.clientX < moveRect.right && e.clientY > moveRect.top && e.clientY < moveRect.bottom) {
        mouseActiveStick = 'movement';
        activeTouches['mouse'] = { type: 'movement' };
        const { dx, dy } = getJoystickInput(e.clientX, e.clientY, movementStickBase, movementStickCap);
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; }
    } else if (e.clientX > fireRect.left && e.clientX < fireRect.right && e.clientY > fireRect.top && e.clientY < fireRect.bottom) {
        mouseActiveStick = 'fire';
        activeTouches['mouse'] = { type: 'fire' };
        const { dx, dy } = getJoystickInput(e.clientX, e.clientY, firestickBase, firestickCap);
        aimDx = dx; aimDy = dy;
    }
});

window.addEventListener('mousemove', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver || !mouseActiveStick) return;
    if (mouseActiveStick === 'movement') {
        const { dx, dy } = getJoystickInput(e.clientX, e.clientY, movementStickBase, movementStickCap);
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; }
        else               { joystickDirX = 0;              joystickDirY = 0;              }
    } else if (mouseActiveStick === 'fire') {
        const { dx, dy } = getJoystickInput(e.clientX, e.clientY, firestickBase, firestickCap);
        aimDx = dx; aimDy = dy;
    }
});

window.addEventListener('mouseup', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    if (mouseActiveStick === 'movement') { if (movementStickCap) movementStickCap.style.transform = 'translate(0,0)'; joystickDirX = 0; joystickDirY = 0; }
    else if (mouseActiveStick === 'fire') { if (firestickCap) firestickCap.style.transform = 'translate(0,0)'; aimDx = 0; aimDy = 0; }
    mouseActiveStick = null;
    delete activeTouches['mouse'];
});
