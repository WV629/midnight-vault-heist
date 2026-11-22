// Midnight Vault — the rules: movement and collision, patrols, vision cones,
// the alarm meter, tools, loot and the win/lose flow. No drawing here; the
// renderer reads this state, and the shot stager drives it with fixed steps.
import {
  THIEF,
  GUARD,
  CAMERA,
  ALARM,
  TOOLS,
  clamp,
  angleDiff,
  segmentBlocked,
} from './config.js';
import { LEVELS, requiredLoot } from './levels.js';

export const PHASES = {
  TITLE: 'title',
  INTRO: 'intro',
  PLAY: 'play',
  CAUGHT: 'caught',
  LEVEL_CLEAR: 'level-clear',
  WIN: 'win',
  GAME_OVER: 'game-over',
};

export function createGame() {
  return {
    phase: PHASES.TITLE,
    levelIndex: 0,
    state: null,
    lives: 3,
    totalLoot: 0,
    totalTime: 0,
    phaseT: 0, // seconds spent in the current phase
    message: '',
    muted: false,
  };
}

export function startLevel(game, index) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.state = {
    level,
    thief: { x: level.thief.x, y: level.thief.y, angle: -Math.PI / 2, moving: false, sprinting: false },
    guards: level.guards.map((g) => ({
      path: g.path,
      speed: g.speed,
      x: g.path[0][0],
      y: g.path[0][1],
      wp: 1,
      waitT: 0,
      angle: 0,
      alert: 0,
    })),
    cameras: level.cameras.map((c, ci) => ({
      ...c,
      angle: c.base,
      // Fixed per level and camera so a staged shot replays the same frame.
      t: ((1337 + index * 101 + ci * 233) % 100) / 10,
      disabledT: 0,
    })),
    loot: level.loot.map((l) => ({ ...l, taken: false })),
    doors: level.doors.map((d) => ({ ...d, openT: 0, open: false })),
    alarm: level.alarmStart,
    time: 0,
    smokeUses: TOOLS.smoke.uses,
    empUses: TOOLS.emp.uses,
    smokeT: 0,
    empT: 0,
    stamina: THIEF.staminaMax,
    hasKeycard: false,
    seen: false, // any watcher has the thief in its cone right now
    seenBy: '',
    caughtT: 0,
    exitOpen: false,
    seed: 1337 + index * 101,
  };
  // Face each guard along its first leg.
  for (const g of game.state.guards) {
    const [x2, y2] = g.path[1];
    g.angle = Math.atan2(y2 - g.y, x2 - g.x);
  }
  game.phase = PHASES.INTRO;
  game.phaseT = 0;
}

function solidsOf(state) {
  const solids = [...state.level.walls, ...state.level.covers];
  for (const d of state.doors) {
    if (!d.open) solids.push({ x: d.x, y: d.y, w: d.w, h: d.h });
  }
  return solids;
}

function watcherSees(state, wx, wy, angle, range, halfAngle, rate, falloff) {
  const t = state.thief;
  const dx = t.x - wx;
  const dy = t.y - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return 0;
  if (segmentBlocked(wx, wy, t.x, t.y, solidsOf(state))) return 0;
  const closeness = 1 - dist / range;
  return rate * (falloff + (1 - falloff) * closeness);
}

export function updatePlay(game, input, dt) {
  const s = game.state;
  if (!s) return;
  s.time += dt;
  game.totalTime += dt;

  // --- tools tick down ---
  if (s.smokeT > 0) s.smokeT -= dt;
  if (s.empT > 0) s.empT -= dt;
  for (const c of s.cameras) if (c.disabledT > 0) c.disabledT -= dt;

  // --- thief movement ---
  const ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const wantSprint = input.sprint && s.stamina > 1 && (ix !== 0 || iy !== 0);
  const speed = wantSprint ? THIEF.sprint : THIEF.walk;
  if (ix !== 0 || iy !== 0) {
    const len = Math.hypot(ix, iy);
    const mx = (ix / len) * speed * dt;
    const my = (iy / len) * speed * dt;
    applyMove(s, mx, my);
    s.thief.angle = Math.atan2(iy, ix);
    s.thief.moving = true;
    s.thief.sprinting = wantSprint;
  } else {
    s.thief.moving = false;
    s.thief.sprinting = false;
  }
  if (wantSprint) s.stamina = Math.max(0, s.stamina - THIEF.staminaDrain * dt);
  else s.stamina = Math.min(THIEF.staminaMax, s.stamina + THIEF.staminaRegen * dt);

  // --- tools on key press ---
  if (input.useSmoke && s.smokeUses > 0 && s.smokeT <= 0) {
    s.smokeUses -= 1;
    s.smokeT = TOOLS.smoke.duration;
    input.useSmoke = false;
  }
  if (input.useEmp && s.empUses > 0 && s.empT <= 0) {
    s.empUses -= 1;
    s.empT = TOOLS.emp.duration;
    for (const c of s.cameras) c.disabledT = TOOLS.emp.duration;
    input.useEmp = false;
  }

  // --- guards patrol ---
  for (const g of s.guards) {
    if (g.waitT > 0) {
      g.waitT -= dt;
      continue;
    }
    const [tx, ty] = g.path[g.wp];
    const dx = tx - g.x;
    const dy = ty - g.y;
    const dist = Math.hypot(dx, dy);
    const step = g.speed * dt;
    if (dist <= step) {
      g.x = tx;
      g.y = ty;
      g.wp = (g.wp + 1) % g.path.length;
      g.waitT = GUARD.patrolWait;
    } else {
      g.x += (dx / dist) * step;
      g.y += (dy / dist) * step;
      g.angle = Math.atan2(dy, dx);
    }
  }

  // --- cameras sweep ---
  for (const c of s.cameras) {
    c.t += dt;
    c.angle = c.base + Math.sin(c.t * c.speed) * c.sweep;
  }

  // --- doors: open when the thief waits beside an unlocked one ---
  for (const d of s.doors) {
    const cx = d.x + d.w / 2;
    const cy = d.y + d.h / 2;
    const near = Math.hypot(s.thief.x - cx, s.thief.y - cy) < 64;
    const unlocked = !d.locked || s.hasKeycard;
    if (near && unlocked) {
      d.openT += dt;
      if (d.openT > 0.9) d.open = true;
    } else {
      d.openT = Math.max(0, d.openT - dt * 2);
    }
  }

  // --- loot pickup ---
  for (const l of s.loot) {
    if (l.taken) continue;
    if (Math.hypot(s.thief.x - l.x, s.thief.y - l.y) < 30) {
      l.taken = true;
      game.totalLoot += l.value;
      if (l.kind === 'keycard') s.hasKeycard = true;
      s.lastPickup = l.name;
      s.lastPickupT = 1.6;
    }
  }
  if (s.lastPickupT > 0) s.lastPickupT -= dt;

  // --- detection: cones, line of sight, alarm ---
  const hidden = s.smokeT > 0;
  let seenRate = 0;
  let seenBy = '';
  if (!hidden) {
    for (const g of s.guards) {
      const r = watcherSees(s, g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle, GUARD.detectRate, GUARD.detectFalloff);
      if (r > 0) {
        seenRate = Math.max(seenRate, r);
        seenBy = 'guard';
        g.alert = 1;
      } else {
        g.alert = Math.max(0, g.alert - dt * 2);
      }
    }
    for (const c of s.cameras) {
      if (c.disabledT > 0) continue;
      const r = watcherSees(s, c.x, c.y, c.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, CAMERA.detectRate, CAMERA.detectFalloff);
      if (r > 0) {
        seenRate = Math.max(seenRate, r);
        seenBy = 'camera';
      }
    }
  }
  s.seen = seenRate > 0;
  s.seenBy = seenBy;
  if (seenRate > 0) s.alarm = Math.min(ALARM.caughtAt, s.alarm + seenRate * dt);
  else s.alarm = Math.max(0, s.alarm - ALARM.decay * dt);

  // --- exit opens once the required loot is taken ---
  const need = requiredLoot(s.level);
  s.exitOpen = need.every((l) => s.loot.find((x) => x.name === l.name && x.taken));
  const e = s.level.exit;
  if (s.exitOpen && s.thief.x > e.x - 6 && s.thief.x < e.x + e.w + 6 && s.thief.y > e.y - 6 && s.thief.y < e.y + e.h + 6) {
    if (game.levelIndex + 1 < LEVELS.length) {
      game.phase = PHASES.LEVEL_CLEAR;
      game.phaseT = 0;
    } else {
      game.phase = PHASES.WIN;
      game.phaseT = 0;
    }
    return;
  }

  // --- caught ---
  if (s.alarm >= ALARM.caughtAt) {
    game.lives -= 1;
    s.caughtT = 0;
    game.phase = game.lives <= 0 ? PHASES.GAME_OVER : PHASES.CAUGHT;
    game.phaseT = 0;
  }
}

function circleOverlaps(x, y, r, rect) {
  const cx = clamp(x, rect.x, rect.x + rect.w);
  const cy = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

// The real move: step both axes, then push out of any wall the step landed in.
// The push goes along the axis the circle entered from — a circle whose
// centre is left of a wall's face is pushed left, one squarely under a wall
// is pushed down — so the thief slides around a corner instead of getting
// pinned under it by a diagonal push.
function applyMove(s, mx, my) {
  const solids = solidsOf(s);
  const r = THIEF.radius;
  let x = s.thief.x + mx;
  let y = s.thief.y + my;
  for (const rect of solids) {
    if (!circleOverlaps(x, y, r, rect)) continue;
    if (x < rect.x) x = rect.x - r;
    else if (x > rect.x + rect.w) x = rect.x + rect.w + r;
    // Centre inside the wall's x-range: leave it for the y pass.
  }
  for (const rect of solids) {
    if (!circleOverlaps(x, y, r, rect)) continue;
    if (y < rect.y) y = rect.y - r;
    else if (y > rect.y + rect.h) y = rect.y + rect.h + r;
    else if (x < rect.x) x = rect.x - r;
    else if (x > rect.x + rect.w) x = rect.x + rect.w + r;
    else y = y < rect.y + rect.h / 2 ? rect.y - r : rect.y + rect.h + r;
  }
  s.thief.x = clamp(x, 16 + r, 1264 - r);
  s.thief.y = clamp(y, 80 + r, 704 - r);
}

export function respawnAfterCaught(game) {
  const s = game.state;
  s.thief.x = s.level.thief.x;
  s.thief.y = s.level.thief.y;
  s.alarm = ALARM.resetAfterCaught;
  s.smokeT = 0;
  s.empT = 0;
  for (const g of s.guards) {
    g.x = g.path[0][0];
    g.y = g.path[0][1];
    g.wp = 1;
    g.waitT = 0;
    g.alert = 0;
  }
  game.phase = PHASES.PLAY;
  game.phaseT = 0;
}

export function lootCollectedValue(game) {
  if (!game.state) return 0;
  return game.state.loot.filter((l) => l.taken).reduce((sum, l) => sum + l.value, 0);
}

export function lootTargetValue(game) {
  if (!game.state) return 0;
  return requiredLoot(game.state.level).reduce((sum, l) => sum + l.value, 0);
}

export function starsFor(game) {
  if (game.phase !== PHASES.WIN) return 0;
  const s = game.state;
  const underPar = s.time <= s.level.parSeconds;
  const clean = game.lives === 3;
  const fullLoot = s.loot.every((l) => l.taken);
  return 1 + (underPar ? 1 : 0) + (clean && fullLoot ? 1 : 0);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
