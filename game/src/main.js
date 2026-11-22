// Midnight Vault — the loop: title, intro, play, caught, clear, win, over.
// Wires the engine, the renderer, the input and the synth together, and stages
// a frozen frame when the page is opened with ?shot=<scene> for screenshots.
import { VIEW } from './config.js';
import { PHASES, createGame, startLevel, updatePlay, respawnAfterCaught } from './engine.js';
import { draw } from './render.js';
import { createInput, attachInput, clickedTool } from './input.js';
import { sfx, setMuted } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

const input = createInput();
attachInput(input, canvas);

let game;
let last = performance.now();
let now = 0;

function beginJob() {
  game = createGame();
  startLevel(game, 0);
  game.phase = PHASES.TITLE;
}

if (shotName) {
  // A staged frame: play the scene forward, render it once, say ready.
  game = stageShot(shotName);
  draw(ctx, game, 0);
  window.__shotReady = true;
  window.__game = game;
} else {
  beginJob();
  window.__game = game; // debug handle: lets a playtest read the live state
  requestAnimationFrame(frame);
}

function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  now = t / 1000;
  step(dt);
  draw(ctx, game, now);
  requestAnimationFrame(frame);
}

function step(dt) {
  game.phaseT += dt;

  if (input.mutePressed) {
    input.mutePressed = false;
    game.muted = !game.muted;
    setMuted(game.muted);
  }

  // HUD tool buttons (mouse).
  const tool = clickedTool(input);
  if (tool === 'smoke' && game.phase === PHASES.PLAY) input.useSmoke = true;
  if (tool === 'emp' && game.phase === PHASES.PLAY) input.useEmp = true;
  if (tool === 'pause' && game.phase === PHASES.PLAY) input.pausePressed = true;
  const clicked = !!input.click;
  input.click = null;

  const confirm = input.confirmPressed || clicked;
  input.confirmPressed = false;

  switch (game.phase) {
    case PHASES.TITLE:
      if (confirm) {
        sfx.click();
        startLevel(game, 0);
      }
      break;
    case PHASES.INTRO:
      if (confirm && game.phaseT > 0.4) {
        sfx.click();
        game.phase = PHASES.PLAY;
        game.phaseT = 0;
      }
      break;
    case PHASES.PLAY: {
      if (game.frozen) break;
      if (input.pausePressed) {
        game.phase = PHASES.INTRO;
        game.phaseT = 0;
        break;
      }
      const before = game.state.alarm;
      const lootBefore = game.state.loot.filter((l) => l.taken).length;
      updatePlay(game, input, dt);
      const lootAfter = game.state.loot.filter((l) => l.taken).length;
      if (lootAfter > lootBefore) {
        const last = game.state.loot.filter((l) => l.taken).pop();
        if (last.kind === 'diamond') sfx.diamond();
        else if (last.kind === 'keycard') sfx.keycard();
        else sfx.pickup();
      }
      if (!game.state.seen && before < 60 && game.state.alarm >= 60) sfx.spotted();
      if (game.state.seen && before < 1 && game.state.alarm >= 1) sfx.spotted();
      if (game.phase === PHASES.CAUGHT) sfx.caught();
      if (game.phase === PHASES.LEVEL_CLEAR) sfx.levelClear();
      if (game.phase === PHASES.WIN) sfx.win();
      break;
    }
    case PHASES.CAUGHT:
      if (confirm && game.phaseT > 0.8) {
        sfx.click();
        respawnAfterCaught(game);
      }
      break;
    case PHASES.LEVEL_CLEAR:
      if (confirm && game.phaseT > 0.8) {
        sfx.click();
        startLevel(game, game.levelIndex + 1);
      }
      break;
    case PHASES.WIN:
    case PHASES.GAME_OVER:
      if (input.restartPressed) {
        input.restartPressed = false;
        sfx.click();
        game.lives = 3;
        game.totalLoot = 0;
        game.totalTime = 0;
        startLevel(game, 0);
      }
      break;
    default:
      break;
  }
  input.pausePressed = false;
  input.restartPressed = false;
}
