// Midnight Vault — keyboard and mouse. One shared input object: the engine
// reads the held keys, the main loop reads the edge-triggered presses.
import { HUD_BUTTONS, VIEW } from './config.js';

export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    useSmoke: false, // edge-triggered: consumed by the engine
    useEmp: false,
    pausePressed: false,
    confirmPressed: false,
    restartPressed: false,
    mutePressed: false,
    click: null, // {x, y} in canvas pixels, consumed by the main loop
    mouse: { x: 0, y: 0 },
  };
}

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
};

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const held = KEYMAP[e.code];
    if (held) input[held] = true;
    if (e.repeat) return;
    if (e.code === 'Digit1') input.useSmoke = true;
    if (e.code === 'Digit2') input.useEmp = true;
    if (e.code === 'KeyP' || e.code === 'Escape') input.pausePressed = true;
    if (e.code === 'Enter' || e.code === 'Space') input.confirmPressed = true;
    if (e.code === 'KeyR') input.restartPressed = true;
    if (e.code === 'KeyM') input.mutePressed = true;
  });
  window.addEventListener('keyup', (e) => {
    const held = KEYMAP[e.code];
    if (held) input[held] = false;
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.sprint = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * VIEW.width;
    input.mouse.y = ((e.clientY - r.top) / r.height) * VIEW.height;
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VIEW.width;
    const y = ((e.clientY - r.top) / r.height) * VIEW.height;
    input.click = { x, y };
  });
}

export function hitButton(click, b) {
  return click && click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h;
}

export function clickedTool(input) {
  if (!input.click) return null;
  if (hitButton(input.click, HUD_BUTTONS.smoke)) return 'smoke';
  if (hitButton(input.click, HUD_BUTTONS.emp)) return 'emp';
  if (hitButton(input.click, HUD_BUTTONS.pause)) return 'pause';
  return null;
}
