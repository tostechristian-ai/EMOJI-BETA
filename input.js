/**
 * input.js
 * Centralized input handling: keyboard, mouse, gamepad, touch
 * Exports: Input state and setup functions
 */

import { GAMEPAD_DEADZONE } from './constants.js';

// ============================================
// INPUT STATE
// ============================================

export const inputState = {
  // Keyboard
  keys: {},
  
  // Mouse
  mouseX: 0,
  mouseY: 0,
  isMouseInCanvas: false,
  
  // Aim direction (from mouse or gamepad)
  aimDx: 0,
  aimDy: 0,
  
  // Joystick (virtual or gamepad)
  joystickDirX: 0,
  joystickDirY: 0,
  
  // Touch
  activeTouches: {},
};

// ============================================
// INPUT HANDLERS
// ============================================

function handleKeyDown(e) {
  inputState.keys[e.key] = true;
  
  // Pause key
  if (e.key === 'p' || e.key === 'Escape') {
    window.dispatchEvent(new CustomEvent('gamePauseToggle'));
  }
  
  // Player 2 join
  if (e.key === 'Insert') {
    window.dispatchEvent(new CustomEvent('player2Join'));
  }
}

function handleKeyUp(e) {
  inputState.keys[e.key] = false;
}

function handleMouseMove(e) {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  inputState.mouseX = e.clientX - rect.left;
  inputState.mouseY = e.clientY - rect.top;
  inputState.isMouseInCanvas = true;
  
  // Calculate aim from screen center
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  inputState.aimDx = inputState.mouseX - centerX;
  inputState.aimDy = inputState.mouseY - centerY;
}

function handleMouseLeave() {
  inputState.isMouseInCanvas = false;
}

function handleMouseDown(e) {
  if (inputState.isMouseInCanvas) {
    window.dispatchEvent(new CustomEvent('playerDash'));
  }
}

function handleTouchStart(e) {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const moveBase = document.getElementById('movement-stick-base');
    const fireBase = document.getElementById('fire-stick-base');
    
    if (!moveBase || !fireBase) continue;
    
    // Movement Stick
    const mr = moveBase.getBoundingClientRect();
    if (t.clientX > mr.left && t.clientX < mr.right &&
        t.clientY > mr.top && t.clientY < mr.bottom) {
      inputState.activeTouches[t.identifier] = 'move';
    }
    
    // Fire Stick
    const fr = fireBase.getBoundingClientRect();
    if (t.clientX > fr.left && t.clientX < fr.right &&
        t.clientY > fr.top && t.clientY < fr.bottom) {
      inputState.activeTouches[t.identifier] = 'fire';
      window.dispatchEvent(new CustomEvent('playerDash'));
    }
  }
}

function handleTouchMove(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const type = inputState.activeTouches[t.identifier];
    
    if (type === 'move') {
      const base = document.getElementById('movement-stick-base');
      const cap = document.getElementById('movement-stick-cap');
      if (base && cap) {
        const input = getJoystickInput(t.clientX, t.clientY, base, cap);
        const mag = Math.hypot(input.dx, input.dy);
        if (mag > 0) {
          inputState.joystickDirX = input.dx / mag;
          inputState.joystickDirY = input.dy / mag;
        }
      }
    } else if (type === 'fire') {
      const base = document.getElementById('fire-stick-base');
      const cap = document.getElementById('fire-stick-cap');
      if (base && cap) {
        const input = getJoystickInput(t.clientX, t.clientY, base, cap);
        inputState.aimDx = input.dx;
        inputState.aimDy = input.dy;
      }
    }
  }
}

function handleTouchEnd(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const type = inputState.activeTouches[t.identifier];
    
    if (type === 'move') {
      inputState.joystickDirX = 0;
      inputState.joystickDirY = 0;
      const cap = document.getElementById('movement-stick-cap');
      if (cap) cap.style.transform = 'translate(0,0)';
    }
    
    if (type === 'fire') {
      inputState.aimDx = 0;
      inputState.aimDy = 0;
      const cap = document.getElementById('fire-stick-cap');
      if (cap) cap.style.transform = 'translate(0,0)';
    }
    
    delete inputState.activeTouches[t.identifier];
  }
}

export function handleGamepadInput() {
  const gp = navigator.getGamepads?.()[0];
  if (!gp) return;
  
  // Movement (Left Stick)
  let lx = Math.abs(gp.axes[0]) > GAMEPAD_DEADZONE ? gp.axes[0] : 0;
  let ly = Math.abs(gp.axes[1]) > GAMEPAD_DEADZONE ? gp.axes[1] : 0;
  inputState.joystickDirX = lx;
  inputState.joystickDirY = ly;
  
  // Aiming (Right Stick)
  let rx = Math.abs(gp.axes[2]) > GAMEPAD_DEADZONE ? gp.axes[2] : 0;
  let ry = Math.abs(gp.axes[3]) > GAMEPAD_DEADZONE ? gp.axes[3] : 0;
  inputState.aimDx = rx;
  inputState.aimDy = ry;
  
  // Dash (Button 0)
  if (gp.buttons[0].pressed) {
    window.dispatchEvent(new CustomEvent('playerDash'));
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getJoystickInput(clientX, clientY, baseElement, capElement) {
  const baseRect = baseElement.getBoundingClientRect();
  const baseCenterX = baseRect.left + baseRect.width / 2;
  const baseCenterY = baseRect.top + baseRect.height / 2;
  
  const dx = clientX - baseCenterX;
  const dy = clientY - baseCenterY;
  
  const maxRadius = baseRect.width / 2 * 0.8;
  const distance = Math.hypot(dx, dy);
  
  if (distance > maxRadius) {
    const scale = maxRadius / distance;
    return { dx: dx * scale, dy: dy * scale };
  }
  
  return { dx, dy };
}

// ============================================
// SETUP
// ============================================

export function setupInputListeners() {
  // Keyboard
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  // Mouse
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mousedown', handleMouseDown);
  }
  
  // Touch
  document.body.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.body.addEventListener('touchend', handleTouchEnd);
}