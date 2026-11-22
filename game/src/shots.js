// Midnight Vault — staged screenshots. Each scene plays the real game forward
// from a fresh level with a fixed script of moves, one fixed timestep at a
// time, then freezes: the frame is what a short real playthrough looks like,
// and the same scene always gives the same frame.
import { PHASES, createGame, startLevel, updatePlay } from './engine.js';

const DT = 1 / 60;

// A move: hold these keys until `until` seconds have passed.
const SCENES = {
  // The cover: the bottom painting lifted, the sapphire taken, the thief
  // holding still under the east camera's sweeping cone as the alarm climbs.
  cover: {
    level: 0,
    moves: [
      { until: 2.9, keys: { right: true } },
      { until: 4.3, keys: { up: true } },
      { until: 5.5, keys: { right: true } },
      { until: 6.0, keys: { up: true } },
      { until: 6.7, keys: { right: true } },
      { until: 7.2, keys: { right: true } },
      { until: 8.0, keys: {} },
    ],
  },
  // Mid-heist: up through the east gap, across the gallery and around the
  // plant to lift the Duchess portrait off the top-left wall.
  patrol: {
    level: 0,
    moves: [
      { until: 2.2, keys: { right: true } },
      { until: 3.8, keys: { up: true } },
      { until: 5.6, keys: { left: true } },
      { until: 6.8, keys: { up: true } },
      { until: 7.2, keys: { left: true } },
      { until: 7.7, keys: { up: true } },
    ],
  },
  // The vault: keycard in hand, the door open, the Star Diamond taken while
  // the vault camera sweeps across the thief.
  vault: {
    level: 1,
    moves: [
      { until: 0.7, keys: { right: true } },
      { until: 1.2, keys: { down: true } },
      { until: 2.9, keys: { right: true } },
      { until: 4.8, keys: { down: true } },
      { until: 5.7, keys: { right: true } },
      { until: 6.7, keys: {} },
      { until: 7.7, keys: { up: true } },
      { until: 7.8, keys: { left: true } },
    ],
  },
  // The getaway: the bag grabbed on the roof, the pad in sight, alarm warm.
  escape: {
    level: 2,
    moves: [
      { until: 1.0, keys: { up: true } },
      { until: 2.0, keys: { right: true } },
      { until: 2.4, keys: { up: true } },
      { until: 4.4, keys: { right: true } },
      { until: 5.1, keys: { up: true } },
      { until: 7.0, keys: { right: true } },
      { until: 7.6, keys: { up: true } },
      { until: 8.7, keys: { right: true } },
      { until: 8.8, keys: { up: true } },
    ],
  },
};

export const SHOT_NAMES = Object.keys(SCENES);

function blankInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    useSmoke: false,
    useEmp: false,
    pausePressed: false,
    confirmPressed: false,
    restartPressed: false,
    mutePressed: false,
    click: null,
    mouse: { x: 0, y: 0 },
  };
}

// Build the game, play the scene's script, freeze it mid-play and hand it back.
export function stageShot(name) {
  const scene = SCENES[name];
  if (!scene) throw new Error(`unknown shot scene: ${name}`);
  const game = createGame();
  startLevel(game, scene.level);
  game.phase = PHASES.PLAY;
  const input = blankInput();
  let elapsed = 0;
  const total = scene.moves[scene.moves.length - 1].until + 0.4;
  while (elapsed < total) {
    const move = scene.moves.find((m) => elapsed < m.until) ?? { keys: {} };
    input.up = !!move.keys.up;
    input.down = !!move.keys.down;
    input.left = !!move.keys.left;
    input.right = !!move.keys.right;
    input.sprint = !!move.keys.sprint;
    updatePlay(game, input, DT);
    if (game.phase !== PHASES.PLAY) break;
    elapsed += DT;
  }
  game.phase = PHASES.PLAY;
  game.frozen = true;
  return game;
}
