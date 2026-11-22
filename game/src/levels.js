// Midnight Vault — the three rooms. Each level is data only: walls, cover that
// blocks sight, patrol routes, sweeping cameras, loot and the exit. The engine
// and renderer never hard-code a room, so a level is a layout, not a branch.
import { PLAY } from './config.js';

function borderWalls() {
  return [
    { x: 0, y: 64, w: 1280, h: 16 }, // top
    { x: 0, y: 704, w: 1280, h: 16 }, // bottom
    { x: 0, y: 64, w: 16, h: 656 }, // left
    { x: 1264, y: 64, w: 16, h: 656 }, // right
  ];
}

export const LEVELS = [
  {
    name: 'ACT I — THE MERIDIAN GALLERY',
    subtitle: 'Lift three paintings and the sapphire case, then slip out the east door.',
    objective: 'Steal the gallery pieces, then reach the EXIT.',
    parSeconds: 150,
    alarmStart: 0,
    floor: 'gallery',
    walls: [
      ...borderWalls(),
      // Tall divider, door gap in the middle.
      { x: 620, y: 180, w: 16, h: 160 },
      { x: 620, y: 420, w: 16, h: 140 },
      // Low divider on the left, gap for a second route.
      { x: 16, y: 420, w: 164, h: 16 },
      { x: 260, y: 420, w: 160, h: 16 },
    ],
    covers: [
      { x: 280, y: 190, w: 54, h: 54, kind: 'pedestal' },
      { x: 280, y: 540, w: 54, h: 54, kind: 'pedestal' },
      { x: 880, y: 190, w: 54, h: 54, kind: 'pedestal' },
      { x: 960, y: 540, w: 54, h: 54, kind: 'pedestal' },
      { x: 820, y: 470, w: 70, h: 44, kind: 'crate' },
      { x: 200, y: 480, w: 70, h: 44, kind: 'crate' },
      { x: 130, y: 130, w: 46, h: 46, kind: 'plant' },
      { x: 1100, y: 130, w: 46, h: 46, kind: 'plant' },
    ],
    doors: [],
    guards: [
      {
        path: [
          [120, 150],
          [480, 150],
          [480, 600],
          [120, 600],
        ],
        speed: 78,
      },
      {
        path: [
          [760, 150],
          [1150, 150],
          [1150, 600],
          [760, 600],
        ],
        speed: 86,
      },
    ],
    cameras: [
      { x: 628, y: 82, base: Math.PI / 2, sweep: 0.9, speed: 0.55 },
      { x: 1250, y: 400, base: Math.PI, sweep: 0.8, speed: 0.45 },
    ],
    loot: [
      { x: 90, y: 112, kind: 'painting', value: 1200, name: 'Portrait of the Duchess' },
      { x: 1190, y: 112, kind: 'painting', value: 1400, name: 'The Gilded Valley' },
      { x: 640, y: 648, kind: 'painting', value: 1100, name: 'Midnight over Meridian' },
      { x: 960, y: 300, kind: 'gem', value: 2500, name: 'Meridian Sapphire' },
    ],
    thief: { x: 80, y: 640 },
    exit: { x: 1224, y: 620, w: 40, h: 48 },
  },
  {
    name: 'ACT II — THE VAULT',
    subtitle: 'Take the keycard, crack the vault, lift the Star Diamond.',
    objective: 'Keycard first, then the Star Diamond inside the vault.',
    parSeconds: 180,
    alarmStart: 0,
    floor: 'vault',
    walls: [
      ...borderWalls(),
      // The vault: a room in the middle, one door at the bottom.
      { x: 480, y: 220, w: 320, h: 16 },
      { x: 480, y: 220, w: 16, h: 284 },
      { x: 784, y: 220, w: 16, h: 284 },
      { x: 480, y: 504, w: 120, h: 16 },
      { x: 680, y: 504, w: 120, h: 16 },
      // A side alcove wall, gap for a flanking route.
      { x: 16, y: 300, w: 220, h: 16 },
      { x: 1044, y: 300, w: 220, h: 16 },
    ],
    covers: [
      { x: 220, y: 480, w: 70, h: 44, kind: 'crate' },
      { x: 990, y: 480, w: 70, h: 44, kind: 'crate' },
      { x: 130, y: 560, w: 46, h: 46, kind: 'plant' },
      { x: 1100, y: 560, w: 46, h: 46, kind: 'plant' },
      { x: 520, y: 260, w: 54, h: 54, kind: 'pedestal' },
      { x: 726, y: 260, w: 54, h: 54, kind: 'pedestal' },
    ],
    doors: [
      // The vault door: locked until the keycard is held.
      { x: 600, y: 500, w: 80, h: 20, locked: 'keycard', id: 'vault-door' },
    ],
    guards: [
      {
        path: [
          [120, 140],
          [420, 140],
          [420, 640],
          [120, 640],
        ],
        speed: 84,
      },
      {
        path: [
          [860, 140],
          [1160, 140],
          [1160, 640],
          [860, 640],
        ],
        speed: 84,
      },
      {
        path: [
          [420, 580],
          [860, 580],
          [860, 640],
          [420, 640],
        ],
        speed: 70,
      },
    ],
    cameras: [
      { x: 640, y: 222, base: Math.PI / 2, sweep: 1.1, speed: 0.6 },
      { x: 60, y: 200, base: 0, sweep: 0.9, speed: 0.5 },
      { x: 1220, y: 200, base: Math.PI, sweep: 0.9, speed: 0.5 },
    ],
    loot: [
      { x: 200, y: 200, kind: 'keycard', value: 0, name: 'Vault keycard' },
      { x: 640, y: 360, kind: 'diamond', value: 8000, name: 'The Star Diamond' },
      { x: 540, y: 430, kind: 'gold', value: 1800, name: 'Gold bars' },
      { x: 740, y: 430, kind: 'gold', value: 1800, name: 'Gold bars' },
      { x: 100, y: 648, kind: 'painting', value: 1300, name: 'The Night Watchman' },
      { x: 1150, y: 120, kind: 'gem', value: 2200, name: 'Emerald cufflinks' },
    ],
    thief: { x: 80, y: 120 },
    exit: { x: 16, y: 120, w: 40, h: 48 },
  },
  {
    name: 'ACT III — ROOFTOP GETAWAY',
    subtitle: 'The alarm is already warm. Grab the bag and reach the pad.',
    objective: 'Grab the loot bag and reach the helicopter pad.',
    parSeconds: 150,
    alarmStart: 25,
    floor: 'rooftop',
    walls: [
      ...borderWalls(),
      // Rooftop plant rooms and duct blocks.
      { x: 300, y: 180, w: 16, h: 180 },
      { x: 300, y: 440, w: 16, h: 140 },
      { x: 964, y: 180, w: 16, h: 180 },
      { x: 964, y: 440, w: 16, h: 140 },
    ],
    covers: [
      { x: 180, y: 300, w: 76, h: 50, kind: 'crate' },
      { x: 1024, y: 300, w: 76, h: 50, kind: 'crate' },
      { x: 560, y: 150, w: 70, h: 44, kind: 'crate' },
      { x: 650, y: 480, w: 70, h: 44, kind: 'crate' },
      { x: 430, y: 300, w: 46, h: 46, kind: 'plant' },
      { x: 800, y: 300, w: 46, h: 46, kind: 'plant' },
    ],
    doors: [],
    guards: [
      {
        path: [
          [120, 140],
          [600, 140],
          [600, 300],
          [120, 300],
        ],
        speed: 92,
      },
      {
        path: [
          [1160, 140],
          [680, 140],
          [680, 300],
          [1160, 300],
        ],
        speed: 92,
      },
      {
        path: [
          [120, 640],
          [600, 640],
          [600, 480],
          [120, 480],
        ],
        speed: 92,
      },
      {
        path: [
          [1160, 640],
          [680, 640],
          [680, 480],
          [1160, 480],
        ],
        speed: 92,
      },
    ],
    cameras: [
      { x: 640, y: 82, base: Math.PI / 2, sweep: 1.2, speed: 0.7 },
      { x: 60, y: 360, base: 0, sweep: 1.0, speed: 0.6 },
      { x: 1220, y: 360, base: Math.PI, sweep: 1.0, speed: 0.6 },
    ],
    loot: [
      { x: 1150, y: 120, kind: 'bag', value: 5000, name: 'The loot bag' },
      { x: 120, y: 120, kind: 'gem', value: 2000, name: 'Loose diamonds' },
      { x: 640, y: 250, kind: 'gold', value: 1600, name: 'Gold bars' },
    ],
    thief: { x: 80, y: 640 },
    exit: { x: 600, y: 600, w: 80, h: 80, pad: true },
  },
];

// The loot that must be taken before the exit opens on each level.
export function requiredLoot(level) {
  if (level.name.startsWith('ACT I')) return level.loot.filter((l) => l.kind !== 'keycard');
  if (level.name.startsWith('ACT II')) {
    return level.loot.filter((l) => l.kind === 'diamond' || l.kind === 'gold');
  }
  return level.loot.filter((l) => l.kind === 'bag');
}

export function levelLootValue(level) {
  return level.loot.reduce((sum, l) => sum + l.value, 0);
}

export { PLAY };
