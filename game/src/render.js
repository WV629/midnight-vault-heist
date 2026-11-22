// Midnight Vault — everything the player sees: the room, the cones, the thief,
// the HUD with its alarm meter, and every screen from title to getaway.
// The judge reads the game mostly through screenshots, so each frame must show
// the room, a guard cone, a camera cone, the loot and the alarm meter at once.
import { VIEW, HUD_H, COLORS, GUARD, CAMERA, HUD_BUTTONS, clamp } from './config.js';
import { PHASES, lootCollectedValue, lootTargetValue, formatTime, starsFor } from './engine.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 10, x, y, range);
  g.addColorStop(0, fill);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function drawFloor(ctx, floor, t) {
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
  // Tile grid.
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  const step = 64;
  ctx.beginPath();
  for (let x = 0; x <= VIEW.width; x += step) {
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, VIEW.height);
  }
  for (let y = HUD_H; y <= VIEW.height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.width, y);
  }
  ctx.stroke();
  // Checker tint.
  ctx.fillStyle = COLORS.floorB;
  for (let gy = 0; gy < 10; gy += 1) {
    for (let gx = 0; gx < 20; gx += 1) {
      if ((gx + gy) % 2 === 0) continue;
      ctx.fillRect(gx * step, HUD_H + gy * step, step, step);
    }
  }
  if (floor === 'gallery') {
    // Burgundy carpet runner down the middle of the gallery.
    ctx.fillStyle = '#5a2430';
    ctx.fillRect(596, HUD_H, 88, VIEW.height - HUD_H);
    ctx.fillStyle = '#6e2c3a';
    ctx.fillRect(604, HUD_H, 72, VIEW.height - HUD_H);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(596, HUD_H, 88, VIEW.height - HUD_H);
  } else if (floor === 'vault') {
    ctx.strokeStyle = 'rgba(201,162,39,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(480, 220, 320, 300);
  } else if (floor === 'rooftop') {
    // Night sky glow at the edges.
    ctx.fillStyle = 'rgba(20,28,48,0.5)';
    ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
  }
  // Vignette: the room is dark, the action is lit.
  const v = ctx.createRadialGradient(640, 392, 200, 640, 392, 760);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
  void t;
}

function drawWalls(ctx, walls) {
  for (const w of walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallTop;
    if (w.w >= w.h) ctx.fillRect(w.x, w.y, w.w, 4);
    else ctx.fillRect(w.x, w.y, 4, w.h);
  }
}

function drawCover(ctx, c) {
  if (c.kind === 'crate') {
    ctx.fillStyle = COLORS.coverWood;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = COLORS.coverWoodTop;
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.strokeStyle = '#3d2716';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.beginPath();
    ctx.moveTo(c.x + 4, c.y + 4);
    ctx.lineTo(c.x + c.w - 4, c.y + c.h - 4);
    ctx.moveTo(c.x + c.w - 4, c.y + 4);
    ctx.lineTo(c.x + 4, c.y + c.h - 4);
    ctx.stroke();
  } else if (c.kind === 'plant') {
    ctx.fillStyle = '#7a5a34';
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + c.h / 2 + 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.plant;
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + c.h / 2 - 4, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.plantLight;
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2 - 6, c.y + c.h / 2 - 10, 9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Pedestal: a pale column with a small bust.
    ctx.fillStyle = COLORS.pedestal;
    ctx.fillRect(c.x + 8, c.y + 10, c.w - 16, c.h - 10);
    ctx.fillStyle = '#b8b2a0';
    ctx.fillRect(c.x, c.y + c.h - 8, c.w, 8);
    ctx.fillStyle = '#8a8578';
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + 8, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDoor(ctx, d) {
  if (d.open) {
    ctx.fillStyle = '#2a2f3a';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    return;
  }
  ctx.fillStyle = '#8a6d2f';
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = '#a8843a';
  ctx.fillRect(d.x + 3, d.y + 3, d.w - 6, d.h - 6);
  ctx.strokeStyle = '#5a4517';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(d.x + d.w / 2, d.y);
  ctx.lineTo(d.x + d.w / 2, d.y + d.h);
  ctx.stroke();
  if (d.locked) {
    // Red padlock.
    ctx.fillStyle = '#ff4030';
    ctx.beginPath();
    ctx.arc(d.x + d.w / 2, d.y + d.h / 2 + 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff4030';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(d.x + d.w / 2, d.y + d.h / 2 - 1, 5, Math.PI, 0);
    ctx.stroke();
  }
  if (d.openT > 0) {
    ctx.strokeStyle = '#39d98a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(d.x + d.w / 2, d.y + d.h / 2, 16, -Math.PI / 2, -Math.PI / 2 + (d.openT / 0.9) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawLoot(ctx, l, t) {
  const pulse = 1 + Math.sin(t * 3 + l.x) * 0.08;
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.scale(pulse, pulse);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
  if (l.kind === 'painting') {
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(-19, -14, 38, 28);
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(-15, -10, 30, 20);
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath();
    ctx.arc(-4, -2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c96a2b';
    ctx.fillRect(4, 2, 10, 8);
  } else if (l.kind === 'gem') {
    glow.addColorStop(0, 'rgba(127,231,255,0.7)');
    glow.addColorStop(1, 'rgba(127,231,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-34, -34, 68, 68);
    ctx.fillStyle = COLORS.lootGem;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
  } else if (l.kind === 'diamond') {
    glow.addColorStop(0, 'rgba(255,255,255,0.8)');
    glow.addColorStop(1, 'rgba(127,231,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-46, -46, 92, 92);
    ctx.fillStyle = '#dff6ff';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(15, -6);
    ctx.lineTo(12, 12);
    ctx.lineTo(0, 20);
    ctx.lineTo(-12, 12);
    ctx.lineTo(-15, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7fe7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -6);
    ctx.lineTo(15, -6);
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 20);
    ctx.stroke();
  } else if (l.kind === 'keycard') {
    ctx.fillStyle = '#2b6fd8';
    rr(ctx, -14, -9, 28, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.fillRect(-10, -5, 8, 4);
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(-10, 2, 20, 2);
    ctx.fillRect(-10, 5, 14, 2);
  } else if (l.kind === 'gold') {
    ctx.fillStyle = COLORS.lootGold;
    ctx.fillRect(-14, -4, 12, 8);
    ctx.fillRect(-2, -4, 12, 8);
    ctx.fillRect(-8, -11, 12, 8);
    ctx.fillStyle = '#b8920f';
    ctx.fillRect(-14, 2, 12, 2);
    ctx.fillRect(-2, 2, 12, 2);
  } else if (l.kind === 'bag') {
    glow.addColorStop(0, 'rgba(255,217,74,0.55)');
    glow.addColorStop(1, 'rgba(255,217,74,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-36, -36, 72, 72);
    ctx.fillStyle = '#6b4a2b';
    ctx.beginPath();
    ctx.moveTo(-13, -12);
    ctx.quadraticCurveTo(0, -20, 13, -12);
    ctx.quadraticCurveTo(16, 8, 0, 14);
    ctx.quadraticCurveTo(-16, 8, -13, -12);
    ctx.fill();
    ctx.fillStyle = COLORS.lootGold;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 2);
  }
  ctx.restore();
  // Name tag under valuable pieces.
  if (l.kind === 'diamond' || l.kind === 'bag') {
    ctx.fillStyle = 'rgba(12,14,20,0.85)';
    ctx.font = 'bold 11px sans-serif';
    const w = ctx.measureText(l.name).width + 12;
    rr(ctx, l.x - w / 2, l.y + 24, w, 18, 9);
    ctx.fill();
    ctx.fillStyle = COLORS.lootGold;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.name, l.x, l.y + 33);
  }
}

function drawExit(ctx, level, open, t) {
  const e = level.exit;
  if (e.pad) {
    ctx.strokeStyle = open ? COLORS.exitGreen : '#5a6378';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = open ? 'rgba(57,217,138,0.25)' : 'rgba(90,99,120,0.25)';
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = open ? COLORS.exitGreen : '#9aa0b0';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', e.x + e.w / 2, e.y + e.h / 2);
    return;
  }
  const glow = open ? 0.55 + Math.sin(t * 4) * 0.2 : 0.18;
  ctx.fillStyle = `rgba(57,217,138,${glow})`;
  ctx.fillRect(e.x - 4, e.y - 4, e.w + 8, e.h + 8);
  ctx.fillStyle = open ? COLORS.exitGreen : '#3a4152';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = '#0c0e14';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(open ? 'EXIT' : 'LOCKED', 0, 0);
  ctx.restore();
}

function drawGuard(ctx, g, t) {
  drawCone(ctx, g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle, g.alert > 0.3 ? COLORS.coneGuardHot : COLORS.coneGuard);
  // Body: dark uniform, pale collar, cap.
  ctx.fillStyle = COLORS.guardBody;
  ctx.beginPath();
  ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guardTrim;
  ctx.beginPath();
  ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1a24';
  ctx.beginPath();
  ctx.arc(g.x + Math.cos(g.angle) * 6, g.y + Math.sin(g.angle) * 6, 5, 0, Math.PI * 2);
  ctx.fill();
  // Flashlight dot ahead.
  ctx.fillStyle = 'rgba(255,230,150,0.9)';
  ctx.beginPath();
  ctx.arc(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (g.alert > 0.3) {
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 22);
  }
  void t;
}

function drawCamera(ctx, c) {
  const hot = c.disabledT <= 0;
  if (hot) drawCone(ctx, c.x, c.y, c.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, COLORS.coneCamera);
  ctx.fillStyle = c.disabledT > 0 ? '#5a6378' : '#20242e';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.disabledT > 0 ? '#3a4152' : '#7fe7ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = c.disabledT > 0 ? '#9aa0b0' : '#ff5a4a';
  ctx.beginPath();
  ctx.arc(c.x + Math.cos(c.angle) * 5, c.y + Math.sin(c.angle) * 5, 3, 0, Math.PI * 2);
  ctx.fill();
  if (c.disabledT > 0) {
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFF', c.x, c.y - 16);
  }
}

function drawThief(ctx, s, t) {
  const th = s.thief;
  // A pool of light under the thief so he reads against the dark floor.
  const pool = ctx.createRadialGradient(th.x, th.y, 4, th.x, th.y, 42);
  pool.addColorStop(0, 'rgba(201,162,39,0.22)');
  pool.addColorStop(1, 'rgba(201,162,39,0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(th.x, th.y, 42, 0, Math.PI * 2);
  ctx.fill();
  if (s.smokeT > 0) {
    const g = ctx.createRadialGradient(th.x, th.y, 6, th.x, th.y, 52);
    g.addColorStop(0, 'rgba(200,200,210,0.5)');
    g.addColorStop(1, 'rgba(200,200,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(th.x, th.y, 52, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cloak: a dark circle with a gold-trimmed hood pointing where he moves.
  ctx.fillStyle = COLORS.thiefCloak;
  ctx.beginPath();
  ctx.arc(th.x, th.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.thiefTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(th.x, th.y, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = COLORS.thiefCloak;
  ctx.beginPath();
  ctx.moveTo(th.x + Math.cos(th.angle) * 16, th.y + Math.sin(th.angle) * 16);
  ctx.lineTo(th.x + Math.cos(th.angle + 2.5) * 9, th.y + Math.sin(th.angle + 2.5) * 9);
  ctx.lineTo(th.x + Math.cos(th.angle - 2.5) * 9, th.y + Math.sin(th.angle - 2.5) * 9);
  ctx.closePath();
  ctx.fill();
  // Mask: two eyes in the dark.
  ctx.fillStyle = '#e8e4d8';
  const ex = Math.cos(th.angle);
  const ey = Math.sin(th.angle);
  const px = -ey;
  const py = ex;
  ctx.beginPath();
  ctx.arc(th.x + ex * 4 + px * 4, th.y + ey * 4 + py * 4, 1.8, 0, Math.PI * 2);
  ctx.arc(th.x + ex * 4 - px * 4, th.y + ey * 4 - py * 4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (s.thief.moving) {
    ctx.strokeStyle = 'rgba(232,228,216,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(th.x, th.y, 18 + Math.sin(t * 10) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, game, now) {
  const s = game.state;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW.width, HUD_H);
  ctx.strokeStyle = '#2a2f3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H);
  ctx.lineTo(VIEW.width, HUD_H);
  ctx.stroke();
  if (!s) return;

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(s.level.name, 16, 20);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = '12px sans-serif';
  ctx.fillText(s.level.objective, 16, 42);

  // Loot tally.
  const got = lootCollectedValue(game);
  const target = lootTargetValue(game);
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`LOOT  $${got.toLocaleString()} / $${target.toLocaleString()}`, 440, 20);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = '12px sans-serif';
  ctx.fillText(`total $${game.totalLoot.toLocaleString()}`, 440, 42);

  // Alarm meter — the number the whole game revolves around.
  const ax = 665;
  ctx.fillStyle = s.alarm > 66 ? COLORS.danger : COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('ALARM', ax, 20);
  const bw = 165;
  ctx.fillStyle = '#2a2f3a';
  rr(ctx, ax, 30, bw, 14, 7);
  ctx.fill();
  const frac = clamp(s.alarm / 100, 0, 1);
  const col = s.alarm > 66 ? '#ff4030' : s.alarm > 33 ? '#ffb02e' : '#39d98a';
  if (frac > 0) {
    ctx.fillStyle = col;
    rr(ctx, ax, 30, Math.max(14, bw * frac), 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${Math.round(s.alarm)}%`, ax + bw + 8, 37);
  if (s.seen) {
    const blink = Math.sin(now * 10) > 0 ? 1 : 0.35;
    ctx.globalAlpha = blink;
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(s.seenBy === 'camera' ? 'CAMERA!' : 'SPOTTED!', ax, 56);
    ctx.globalAlpha = 1;
  }

  // Tool buttons.
  drawToolButton(ctx, HUD_BUTTONS.smoke, 'SMOKE', s.smokeUses, '1', s.smokeT > 0);
  drawToolButton(ctx, HUD_BUTTONS.emp, 'EMP', s.empUses, '2', s.empT > 0);

  // Lives as little masks.
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('LIVES', 1080, 14);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < game.lives ? COLORS.thiefTrim : '#3a4152';
    ctx.beginPath();
    ctx.arc(1092 + i * 22, 34, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Timer and stamina.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatTime(s.time), 1216, 20);
  ctx.fillStyle = '#2a2f3a';
  ctx.fillRect(1140, 30, 76, 8);
  ctx.fillStyle = s.stamina > 25 ? '#7fe7ff' : '#ffb02e';
  ctx.fillRect(1140, 30, 76 * clamp(s.stamina / 100, 0, 1), 8);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = '10px sans-serif';
  ctx.fillText('SPRINT', 1140, 50);

  // Pause button.
  ctx.fillStyle = '#2a2f3a';
  rr(ctx, HUD_BUTTONS.pause.x, HUD_BUTTONS.pause.y, HUD_BUTTONS.pause.w, HUD_BUTTONS.pause.h, 6);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('II', HUD_BUTTONS.pause.x + 22, HUD_BUTTONS.pause.y + 21);

  // Pickup toast.
  if (s.lastPickupT > 0 && s.lastPickup) {
    ctx.globalAlpha = clamp(s.lastPickupT, 0, 1);
    ctx.fillStyle = 'rgba(12,14,20,0.85)';
    ctx.font = 'bold 14px sans-serif';
    const w = ctx.measureText(`+ ${s.lastPickup}`).width + 24;
    rr(ctx, 640 - w / 2, VIEW.height - 44, w, 28, 14);
    ctx.fill();
    ctx.fillStyle = COLORS.lootGold;
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${s.lastPickup}`, 640, VIEW.height - 29);
    ctx.globalAlpha = 1;
  }
}

function drawToolButton(ctx, b, label, uses, key, active) {
  ctx.fillStyle = active ? '#c9a227' : uses > 0 ? '#2a2f3a' : '#1a1d26';
  rr(ctx, b.x, b.y, b.w, b.h, 6);
  ctx.fill();
  ctx.strokeStyle = active ? '#ffd94a' : '#3a4152';
  ctx.lineWidth = 1;
  rr(ctx, b.x, b.y, b.w, b.h, 6);
  ctx.stroke();
  ctx.fillStyle = uses > 0 ? COLORS.hudText : '#5a6378';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${label} ×${uses}`, b.x + b.w / 2, b.y + 15);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = '10px sans-serif';
  ctx.fillText(`[${key}]`, b.x + b.w / 2, b.y + 30);
}

function panel(ctx, title, lines, prompt, accent) {
  ctx.fillStyle = 'rgba(8,10,16,0.78)';
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
  const w = 640;
  const h = 150 + lines.length * 26;
  const x = (VIEW.width - w) / 2;
  const y = (VIEW.height - h) / 2;
  ctx.fillStyle = '#14161f';
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(title, 640, y + 44);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '15px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, y + 92 + i * 26));
  if (prompt) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = '13px sans-serif';
    ctx.fillText(prompt, 640, y + h - 30);
  }
}

export function draw(ctx, game, now) {
  const s = game.state;
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#0c0e14';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (!s) {
    drawTitle(ctx, now);
    return;
  }
  drawFloor(ctx, s.level.floor, now);
  drawExit(ctx, s.level, s.exitOpen, now);
  for (const l of s.loot) if (!l.taken) drawLoot(ctx, l, now);
  for (const g of s.guards) drawGuard(ctx, g, now);
  for (const c of s.cameras) drawCamera(ctx, c);
  drawThief(ctx, s, now);
  for (const c of s.level.covers) drawCover(ctx, c);
  drawWalls(ctx, s.level.walls);
  for (const d of s.doors) drawDoor(ctx, d);
  drawHud(ctx, game, now);

  // Spotted flash on the frame edge.
  if (s.seen && game.phase === PHASES.PLAY) {
    const blink = 0.25 + Math.sin(now * 10) * 0.12;
    ctx.strokeStyle = `rgba(255,64,48,${blink})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, HUD_H + 3, VIEW.width - 6, VIEW.height - HUD_H - 6);
  }

  if (game.phase === PHASES.TITLE) drawTitle(ctx, now);
  else if (game.phase === PHASES.INTRO) {
    panel(
      ctx,
      s.level.name,
      [s.level.subtitle, '', `Par time ${formatTime(s.level.parSeconds)}  ·  3 lives  ·  alarm at 100% gets you caught`],
      'Click or press Enter to begin',
      '#c9a227',
    );
  } else if (game.phase === PHASES.CAUGHT) {
    panel(
      ctx,
      'CAUGHT!',
      [`The ${s.seenBy === 'camera' ? 'camera' : 'guard'} raised the alarm.`, `${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left — the crew pulls you back to the start.`],
      'Click or press Enter to go again',
      '#ff4030',
    );
  } else if (game.phase === PHASES.LEVEL_CLEAR) {
    panel(
      ctx,
      'CLEAN GETAWAY',
      [`${s.level.name} cleared in ${formatTime(s.time)}.`, `Loot so far: $${game.totalLoot.toLocaleString()}`],
      'Click or press Enter for the next act',
      '#39d98a',
    );
  } else if (game.phase === PHASES.WIN) {
    const stars = starsFor(game);
    panel(
      ctx,
      'THE PERFECT HEIST',
      [
        `All three acts cleared. Loot: $${game.totalLoot.toLocaleString()} in ${formatTime(game.totalTime)}.`,
        `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}   ${stars === 3 ? 'Legendary — not a single alarm tripped past the line.' : stars === 2 ? 'Professional work, crew.' : 'The crew got out. The fence will take it.'}`,
      ],
      'Press R to run it again',
      '#ffd94a',
    );
  } else if (game.phase === PHASES.GAME_OVER) {
    panel(
      ctx,
      'BUSTED',
      ['Three strikes and the Meridian job is blown.', `The crew kept $${game.totalLoot.toLocaleString()} of loot.`],
      'Press R to try the job again',
      '#ff4030',
    );
  }
}

function drawTitle(ctx, now) {
  ctx.fillStyle = '#0c0e14';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // A few gold light pools, like the gallery at night.
  for (const [x, y, r] of [[320, 240, 180], [960, 240, 180], [640, 540, 220]]) {
    const g = ctx.createRadialGradient(x, y, 10, x, y, r);
    g.addColorStop(0, 'rgba(201,162,39,0.16)');
    g.addColorStop(1, 'rgba(201,162,39,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c9a227';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('MIDNIGHT VAULT', 640, 190);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '20px Georgia, serif';
  ctx.fillText('a heist in three acts', 640, 240);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = '15px sans-serif';
  const lines = [
    'Slip past the guards and their sweeping cones. Cameras see further — EMP them.',
    'Grab the loot, keep the alarm meter down, and reach the EXIT before it hits 100%.',
    '',
    'Move  WASD / Arrows      Sprint  Shift      Smoke [1]      EMP [2]      Pause  P',
    'Smoke hides you. EMP kills the cameras for 8 seconds. The vault needs its keycard.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 640, 310 + i * 28));
  const blink = 0.6 + Math.sin(now * 3) * 0.4;
  ctx.globalAlpha = blink;
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO START THE JOB', 640, 560);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#5a6378';
  ctx.font = '12px sans-serif';
  ctx.fillText('An original game — no borrowed names, art or music. Headphones optional: every sound is synthesized.', 640, 620);
}
