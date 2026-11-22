// Midnight Vault — tiny WebAudio synth. Every sound is generated, no audio
// files ship with the game. All calls are guarded: in a headless screenshot
// run there is no user gesture, so the context simply stays suspended.
let ctx = null;
let muted = false;

export function setMuted(m) {
  muted = m;
}

function audio() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  const c = audio();
  if (!c) return;
  try {
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Sound is garnish; never break the game.
  }
}

export const sfx = {
  pickup() {
    tone(880, 0.12, 'sine', 0.12);
    tone(1318, 0.16, 'sine', 0.1, 0.07);
  },
  keycard() {
    tone(660, 0.1, 'square', 0.06);
    tone(990, 0.14, 'square', 0.06, 0.09);
  },
  diamond() {
    tone(1046, 0.14, 'sine', 0.12);
    tone(1568, 0.2, 'sine', 0.1, 0.08);
    tone(2093, 0.26, 'sine', 0.08, 0.16);
  },
  door() {
    tone(220, 0.18, 'triangle', 0.08, 0, 330);
  },
  smoke() {
    tone(320, 0.35, 'sine', 0.07, 0, 120);
  },
  emp() {
    tone(1200, 0.3, 'sawtooth', 0.05, 0, 180);
  },
  spotted() {
    tone(520, 0.16, 'square', 0.07);
    tone(520, 0.16, 'square', 0.07, 0.2);
  },
  caught() {
    tone(392, 0.22, 'sawtooth', 0.09, 0, 196);
    tone(196, 0.4, 'sawtooth', 0.09, 0.2, 98);
  },
  levelClear() {
    tone(523, 0.14, 'sine', 0.11);
    tone(659, 0.14, 'sine', 0.11, 0.12);
    tone(784, 0.22, 'sine', 0.11, 0.24);
  },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.24, 'sine', 0.11, i * 0.13));
  },
  click() {
    tone(700, 0.06, 'triangle', 0.06);
  },
};
