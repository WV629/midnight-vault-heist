// Midnight Vault — shared tuning: canvas, movement, sight, alarm and tools.
// One place for every number the engine, the renderer and the shot stager use,
// so a tweak here changes the game and its screenshots together.
export const VIEW = { width: 1280, height: 720 };
export const HUD_H = 64;
export const PLAY = { x: 16, y: 80, w: 1248, h: 624 };

export const THIEF = {
  radius: 14,
  walk: 185,
  sprint: 268,
  staminaMax: 100,
  staminaDrain: 34,
  staminaRegen: 22,
};

export const GUARD = {
  radius: 14,
  speed: 78,
  viewRange: 235,
  viewHalfAngle: 0.61, // ~35 degrees each side
  detectRate: 46, // alarm points per second at point blank
  detectFalloff: 0.45, // rate at the edge of the cone
  patrolWait: 0.9, // seconds paused at each waypoint
};

export const CAMERA = {
  viewRange: 255,
  viewHalfAngle: 0.52,
  detectRate: 58,
  detectFalloff: 0.5,
};

export const ALARM = {
  decay: 7, // points per second while unseen
  caughtAt: 100,
  resetAfterCaught: 42,
};

export const TOOLS = {
  smoke: { uses: 3, duration: 4.5, key: '1', label: 'SMOKE' },
  emp: { uses: 2, duration: 8, key: '2', label: 'EMP' },
};

// HUD tool buttons (shared by render and input so clicks land where drawn).
export const HUD_BUTTONS = {
  smoke: { x: 880, y: 12, w: 92, h: 40 },
  emp: { x: 980, y: 12, w: 92, h: 40 },
  pause: { x: 1224, y: 12, w: 44, h: 40 },
};

export const COLORS = {
  floorA: '#20242e',
  floorB: '#1b1f28',
  floorLine: '#262b38',
  wall: '#3a4152',
  wallTop: '#5a6378',
  wallTrim: '#c9a227',
  coverWood: '#6b4a2b',
  coverWoodTop: '#8a6238',
  plant: '#2e6b34',
  plantLight: '#4a9a4f',
  pedestal: '#d8d3c3',
  coneGuard: 'rgba(255, 196, 66, 0.20)',
  coneGuardHot: 'rgba(255, 64, 48, 0.30)',
  coneCamera: 'rgba(96, 196, 255, 0.20)',
  coneCameraHot: 'rgba(255, 64, 48, 0.30)',
  thiefCloak: '#23202e',
  thiefTrim: '#c9a227',
  guardBody: '#4a2a2a',
  guardTrim: '#d8d3c3',
  lootGold: '#ffd94a',
  lootGem: '#7fe7ff',
  exitGreen: '#39d98a',
  danger: '#ff4030',
  hudBg: 'rgba(12, 14, 20, 0.92)',
  hudText: '#e8e4d8',
  hudMuted: '#9aa0b0',
};

// Seeded RNG (mulberry32) so shot scenes and replays are deterministic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the segment (x1,y1)-(x2,y2) touches any rect in `solids`.
export function segmentBlocked(x1, y1, x2, y2, solids) {
  for (const r of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  // Slab test on x then y.
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Circle (x,y,r) against a rect: push the circle out and report the hit.
export function circleRectResolve(x, y, r, rect) {
  const cx = clamp(x, rect.x, rect.x + rect.w);
  const cy = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - cx;
  const dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 < 1e-9) return { nx: 0, ny: -1, depth: r };
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d, depth: r - d };
}
