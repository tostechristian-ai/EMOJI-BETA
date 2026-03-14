// ============================================================
// gamepad.js — Gamepad connection tracking and per-frame input
// ============================================================

let gamepadIndex = null;
let isGamepadUpgradeMode = false;
let selectedUpgradeIndex = 0;
let lastGamepadUpdate    = 0;

function applyDeadzone(v, dz = GAMEPAD_DEADZONE) {
    return Math.abs(v) < dz ? 0 : v;
}

window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);
    gamepadIndex = e.gamepad.index;
});

window.addEventListener('gamepaddisconnected', (e) => {
    if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
});

function handleGamepadInput() {
    if (gamepadIndex == null) return;
    const gp = navigator.getGamepads?.()[gamepadIndex];
    if (!gp) return;

    // ---- Upgrade menu navigation ----
    if (isGamepadUpgradeMode) {
        const now = Date.now();
        if (now - lastGamepadUpdate > GAMEPAD_INPUT_DELAY) {
            let moved = false;
            const prevIndex  = selectedUpgradeIndex;
            const numOptions = document.querySelectorAll('.upgrade-card').length;
            const cardsPerRow = 3;

            if (gp.buttons[15].pressed || gp.axes[0] > 0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex + 1) % numOptions;
                moved = true;
            } else if (gp.buttons[14].pressed || gp.axes[0] < -0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex - 1 + numOptions) % numOptions;
                moved = true;
            }
            if (gp.buttons[12].pressed) {
                selectedUpgradeIndex = Math.max(0, selectedUpgradeIndex - cardsPerRow);
                moved = true;
            } else if (gp.buttons[13].pressed) {
                selectedUpgradeIndex = Math.min(numOptions - 1, selectedUpgradeIndex + cardsPerRow);
                moved = true;
            }

            if (moved && prevIndex !== selectedUpgradeIndex) {
                const prevCard = document.querySelectorAll('.upgrade-card')[prevIndex];
                if (prevCard) prevCard.classList.remove('selected');
                const newCard  = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (newCard) {
                    newCard.classList.add('selected');
                    playUISound('uiClick');
                    vibrate(10);
                }
                lastGamepadUpdate = now;
            }

            if (gp.buttons[0].pressed) {
                const selectedCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (selectedCard) {
                    selectedCard.querySelector('button').click();
                    isGamepadUpgradeMode = false;
                    lastGamepadUpdate    = now;
                    return;
                }
            }
        }
        return; // Don't process movement while upgrade menu is open
    }

    // ---- Movement (left stick) ----
    let lx = applyDeadzone(gp.axes[0] || 0);
    let ly = applyDeadzone(gp.axes[1] || 0);
    const lmag = Math.hypot(lx, ly);
    if (lmag > 0) { joystickDirX = lx / lmag; joystickDirY = ly / lmag; }
    else           { joystickDirX = 0;          joystickDirY = 0;          }

    // ---- Aim (right stick) ----
    let rx = applyDeadzone(gp.axes[2] || 0);
    let ry = applyDeadzone(gp.axes[3] || 0);
    const rmag = Math.hypot(rx, ry);
    if (rmag > 0) { aimDx = rx / rmag; aimDy = ry / rmag; }
    else           { aimDx = 0;         aimDy = 0;          }

    // ---- Dash (right trigger) ----
    const pressed = (i) => !!gp.buttons?.[i]?.pressed;
    if (pressed(7) && !gp._rTriggerLatch) {
        gp._rTriggerLatch = true;
        triggerDash(player);
    } else if (!pressed(7)) {
        gp._rTriggerLatch = false;
    }

    // ---- Pause (Start / B button) ----
    if ((pressed(9) || pressed(1)) && !gp._pauseLatch) {
        gp._pauseLatch = true;
        if (gameActive && !gameOver) togglePause();
    } else if (!pressed(9) && !pressed(1)) {
        gp._pauseLatch = false;
    }
}
