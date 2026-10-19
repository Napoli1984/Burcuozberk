// Paints the convent of San Domenico in code: back walls, floors, props and baked light, cut into
// chunks so each texture stays at most 1600 px wide. Also paints the sky, the far town and the
// sprites that must sit in front of Ada (hedges, the big canvas, the curtain, the crates).
import { TILE } from '../config.js';
import { T } from '../level5.js';
import { rng } from '../util.js';

export const CHUNK = 1600;
const TAU = Math.PI * 2;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
const rgba = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
function vgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function hgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function glow(ctx, x, y, r, rgb, a, op = 'lighter') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(rgb[0], rgb[1], rgb[2], a));
  g.addColorStop(0.35, rgba(rgb[0], rgb[1], rgb[2], a * 0.45));
  g.addColorStop(1, rgba(rgb[0], rgb[1], rgb[2], 0));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function archPath(ctx, x0, x1, yTop, yBottom) {
  const r = (x1 - x0) / 2, cx = (x0 + x1) / 2;
  ctx.moveTo(x0, yBottom); ctx.lineTo(x0, yTop + r); ctx.arc(cx, yTop + r, r, Math.PI, 0); ctx.lineTo(x1, yBottom);
}

// ---------------------------------------------------------------- patterns

function makePatterns() {
  const P = {};
  const r = rng(91);
  // Ashlar stone blocks.
  const stone = (base, seed, bw = 64, bh = 28, mortar = '#14131a', jitter = 18) => {
    const c = canvas(256, 224); const x = c.getContext('2d'); const rr = rng(seed);
    x.fillStyle = mortar; x.fillRect(0, 0, 256, 224);
    for (let row = 0; row < 224 / bh; row++) {
      let px = row % 2 ? -bw / 2 : 0;
      while (px < 256) {
        const w = bw * (0.75 + rr() * 0.5);
        const j = (rr() - 0.5) * jitter;
        x.fillStyle = rgba(base[0] + j, base[1] + j, base[2] + j * 0.9);
        x.fillRect(px + 1.5, row * bh + 1.5, w - 3, bh - 3);
        x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(px + 1.5, row * bh + 1.5, w - 3, 2);
        x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(px + 1.5, row * bh + bh - 4, w - 3, 2.5);
        for (let k = 0; k < 6; k++) { x.fillStyle = `rgba(0,0,0,${0.06 + rr() * 0.08})`; x.beginPath(); x.arc(px + rr() * w, row * bh + rr() * bh, 1 + rr() * 2.2, 0, TAU); x.fill(); }
        px += w;
      }
    }
    return c;
  };
  P.stone = stone([86, 82, 92], 1);
  P.stoneWarm = stone([118, 100, 82], 2, 70, 30, '#2a2018');
  P.stoneDark = stone([52, 50, 60], 3, 60, 26, '#0e0d12', 14);
  P.marble = stone([150, 142, 132], 4, 90, 40, '#4a443e', 12);
  P.crypt = stone([70, 64, 66], 5, 56, 30, '#120f10', 16);
  // Plaster.
  const plaster = (base, seed, stains = 18) => {
    const c = canvas(256, 256); const x = c.getContext('2d'); const rr = rng(seed);
    x.fillStyle = rgba(...base); x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) {
      const s = 6 + rr() * 26; const d = (rr() - 0.5) * stains;
      x.fillStyle = rgba(base[0] + d, base[1] + d, base[2] + d, 0.25);
      x.beginPath(); x.ellipse(rr() * 256, rr() * 256, s, s * (0.5 + rr()), rr() * 3, 0, TAU); x.fill();
    }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${rr() * 0.07})`; x.fillRect(rr() * 256, rr() * 256, 1.5, 1.5); }
    return c;
  };
  P.plaster = plaster([132, 108, 82], 11);
  P.plasterCool = plaster([88, 88, 104], 12);
  P.plasterDark = plaster([70, 58, 52], 13);
  P.plasterLab = plaster([150, 124, 96], 14);
  // Bricks for the aqueduct.
  const brick = canvas(128, 64); { const x = brick.getContext('2d'); const rr = rng(21); x.fillStyle = '#160f0e'; x.fillRect(0, 0, 128, 64); for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) { const j = (rr() - 0.5) * 22; x.fillStyle = rgba(92 + j, 52 + j * 0.6, 42 + j * 0.5); x.fillRect(col * 32 + (row % 2) * 16 + 1, row * 8 + 1, 30, 6.5); } }
  P.brick = brick;
  // Cobblestones for the street.
  const cob = canvas(160, 40); { const x = cob.getContext('2d'); const rr = rng(31); x.fillStyle = '#1a1922'; x.fillRect(0, 0, 160, 40); for (let i = 0; i < 26; i++) { const j = (rr() - 0.5) * 24; x.fillStyle = rgba(84 + j, 82 + j, 92 + j); x.beginPath(); x.ellipse((i % 13) * 12.5 + (i > 12 ? 6 : 0) + 6, i > 12 ? 30 : 11, 5.8, 7.5, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,0.08)'; x.beginPath(); x.ellipse((i % 13) * 12.5 + (i > 12 ? 6 : 0) + 5, i > 12 ? 27 : 8, 3, 2.5, 0, 0, TAU); x.fill(); } }
  P.cobble = cob;
  // Floor slabs.
  const slab = canvas(240, 40); { const x = slab.getContext('2d'); const rr = rng(41); x.fillStyle = '#1b1715'; x.fillRect(0, 0, 240, 40); let px = 0; while (px < 240) { const w = 50 + rr() * 40; const j = (rr() - 0.5) * 16; x.fillStyle = rgba(110 + j, 98 + j, 86 + j); x.fillRect(px + 1, 1, w - 2, 38); px += w; } }
  P.slab = slab;
  // Wooden planks.
  const wood = canvas(200, 40); { const x = wood.getContext('2d'); const rr = rng(51); for (let i = 0; i < 5; i++) { const j = (rr() - 0.5) * 18; x.fillStyle = rgba(104 + j, 72 + j * 0.8, 46 + j * 0.6); x.fillRect(0, i * 8, 200, 8); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, i * 8 + 7, 200, 1); for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(rr() * 200, i * 8 + 2, 12 + rr() * 30, 0.8); } } }
  P.wood = wood;
  // Rough earth under the floors.
  const earth = canvas(160, 160); { const x = earth.getContext('2d'); const rr = rng(61); x.fillStyle = '#0d0c11'; x.fillRect(0, 0, 160, 160); for (let i = 0; i < 90; i++) { const j = rr() * 14; x.fillStyle = rgba(22 + j, 20 + j, 26 + j, 0.9); x.beginPath(); x.ellipse(rr() * 160, rr() * 160, 4 + rr() * 9, 3 + rr() * 6, rr() * 3, 0, TAU); x.fill(); } }
  P.earth = earth;
  // Grain used over everything.
  const grain = canvas(256, 256); { const x = grain.getContext('2d'); const id = x.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); }
  P.grain = grain;
  return P;
}

// ---------------------------------------------------------------- what material each solid tile shows

function materialFor(tx, ty) {
  if (tx <= 1) return 'plaster';                                 // house across the street
  if (tx === 14) return 'stoneWarm';
  if (tx >= 15 && tx <= 24 && ty <= 17) return 'plasterWing';    // closed upper floor of the left wing
  if (tx >= 38 && tx <= 51 && ty <= 16) return 'stoneWarm';
  if (tx >= 52 && tx <= 66 && ty <= 21) return 'stoneWarm';
  if (tx >= 66 && tx <= 104 && ty <= 3) return 'vault';
  if (tx >= 82 && tx <= 103 && ty >= 17 && ty <= 21) return 'marble';
  if (tx === 104 && ty <= 21) return 'stone';
  if (tx >= 119) return 'stone';
  if (ty >= 22) {
    if (tx >= 102 && tx <= 103 && ty >= 25 && ty <= 30) return 'crypt';
    if (tx >= 78 && tx <= 104 && ty <= 31) return 'crypt';
    if (tx >= 103 && ty >= 24) return 'brickDeep';
    return 'earth';
  }
  return 'stone';
}

function floorFor(tx) {
  if (tx < 14) return 'cobble';
  if ((tx >= 25 && tx <= 37) || tx >= 105) return 'grass';
  if (tx >= 53 && tx <= 65) return 'wood';
  return 'slab';
}

// ---------------------------------------------------------------- painting

export function paintWorld(scene, level, map) {
  const P = makePatterns();
  const pat = {};
  const tmp = canvas(4, 4).getContext('2d');
  for (const k in P) pat[k] = tmp.createPattern(P[k], 'repeat');
  const chunks = [];
  const n = Math.ceil(level.width / CHUNK);
  let wallCanvas = null;
  for (let i = 0; i < n; i++) {
    const c = canvas(CHUNK, level.height);
    const ctx = c.getContext('2d');
    ctx.translate(-i * CHUNK, 0);
    const view = { x0: i * CHUNK, x1: (i + 1) * CHUNK };
    paintBack(ctx, view, level, pat, P);
    paintTiles(ctx, view, level, map, pat);
    paintDecor(ctx, view, level, pat);
    paintLight(ctx, view, level);
    // grain over painted pixels only
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.07; ctx.fillStyle = pat.grain;
    ctx.fillRect(view.x0, 0, CHUNK, level.height); ctx.restore();
    // The breakable wall: copy it to its own sprite, then paint the passage it hides.
    const wx = 102 * TILE, wy = 25 * TILE, ww = 2 * TILE, wh = 6 * TILE;
    if (wx >= view.x0 && wx < view.x1) {
      wallCanvas = canvas(ww, wh);
      wallCanvas.getContext('2d').drawImage(c, wx - view.x0, wy, ww, wh, 0, 0, ww, wh);
      ctx.save();
      ctx.fillStyle = pat.crypt; ctx.fillRect(wx, wy, ww, wh);
      vgrad(ctx, wx, wy, ww, wh, [[0, 'rgba(6,5,8,0.92)'], [1, 'rgba(10,8,10,0.85)']]);
      ctx.fillStyle = 'rgba(40,36,40,0.9)';
      for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(wx + 8 + k * 11, wy + wh - 6 - (k % 3) * 3, 9, 6, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    chunks.push(c);
  }
  // Earth painted over the hidden passage and the aqueduct, so the side view does not give the secret away.
  const cover = { x: 104 * TILE, y: 23 * TILE, w: 12 * TILE, h: 13 * TILE };
  cover.canvas = canvas(cover.w, cover.h);
  {
    const ctx = cover.canvas.getContext('2d');
    ctx.translate(-cover.x, -cover.y);
    ctx.fillStyle = pat.earth; ctx.fillRect(cover.x, cover.y, cover.w, cover.h);
    ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = pat.grain; ctx.fillRect(cover.x, cover.y, cover.w, cover.h); ctx.restore();
  }
  return {
    chunks,
    cover,
    wall: { canvas: wallCanvas, x: 102 * TILE, y: 25 * TILE },
    sky: paintSky(),
    far: paintFar(),
    front: paintFrontSprites(),
    fg: paintForeground(level),
  };
}

function paintBack(ctx, view, level, pat, P) {
  const g = level.ground;
  const vis = (x0, x1) => x1 > view.x0 && x0 < view.x1;
  // --- Street: houses across the alley (exterior, sky shows above them).
  if (vis(80, 560)) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(80, g); ctx.lineTo(80, 470); ctx.lineTo(150, 470); ctx.lineTo(150, 440); ctx.lineTo(330, 440); ctx.lineTo(330, 486); ctx.lineTo(560, 486); ctx.lineTo(560, g); ctx.closePath();
    ctx.fillStyle = pat.plasterDark; ctx.fill();
    ctx.clip();
    vgrad(ctx, 80, 440, 480, g - 440, [[0, 'rgba(20,24,52,0.55)'], [1, 'rgba(8,8,16,0.35)']]);
    // windows
    const win = (x, y, lit) => {
      ctx.fillStyle = '#16131a'; ctx.fillRect(x - 3, y - 3, 40, 58);
      ctx.fillStyle = lit ? '#e7a85a' : '#1d2236'; ctx.fillRect(x, y, 34, 52);
      if (lit) { ctx.fillStyle = 'rgba(255,220,160,0.6)'; ctx.fillRect(x + 3, y + 3, 12, 46); }
      ctx.fillStyle = '#2a2219'; ctx.fillRect(x + 15.5, y, 3, 52); ctx.fillRect(x, y + 24, 34, 3);
      ctx.fillStyle = '#3c2e22'; ctx.fillRect(x - 8, y - 2, 6, 56); ctx.fillRect(x + 36, y - 2, 6, 56);
    };
    win(118, 520, true); win(236, 512, false); win(400, 540, true); win(486, 540, false);
    win(236, 640, false);
    // a balcony with plants
    ctx.fillStyle = '#1b1612'; ctx.fillRect(380, 600, 120, 6);
    for (let k = 0; k < 12; k++) ctx.fillRect(384 + k * 10, 606, 2, 26);
    ctx.fillRect(380, 630, 120, 3);
    ctx.fillStyle = '#25331f'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(392 + k * 24, 596, 11, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#7a2d3a'; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(388 + k * 17, 590 - (k % 2) * 4, 3, 0, TAU); ctx.fill(); }
    // door with a little shrine light
    ctx.fillStyle = '#20180f'; ctx.fillRect(170, 760, 62, 120); ctx.fillStyle = '#2d2216'; ctx.fillRect(176, 766, 50, 114);
    ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.arc(254, 720, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(244, 720, 20, 18);
    ctx.restore();
    // roof edges
    ctx.fillStyle = '#2b1a17'; ctx.fillRect(74, 462, 82, 10); ctx.fillRect(144, 432, 192, 10); ctx.fillRect(324, 478, 240, 10);
  }
  // --- Left wing walkway (under the closed upper floor): back wall with a fresco and a door.
  if (vis(600, 1000)) {
    ctx.fillStyle = pat.plaster; ctx.fillRect(600, 720, 400, 160);
    vgrad(ctx, 600, 720, 400, 160, [[0, 'rgba(10,8,14,0.65)'], [0.4, 'rgba(10,8,14,0.25)'], [1, 'rgba(10,8,14,0.45)']]);
    // fresco
    ctx.save(); ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#6b4a3a'; ctx.beginPath(); archPath(ctx, 860, 950, 740, 840); ctx.fill();
    ctx.fillStyle = '#2c3b5c'; ctx.beginPath(); ctx.ellipse(905, 800, 18, 34, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d1b08a'; ctx.beginPath(); ctx.arc(905, 768, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(905, 768, 12, 0, TAU); ctx.stroke();
    ctx.restore();
    // door
    ctx.fillStyle = '#1c140e'; ctx.beginPath(); archPath(ctx, 680, 740, 760, 880); ctx.fill();
    ctx.fillStyle = '#2e2216'; ctx.beginPath(); archPath(ctx, 686, 734, 766, 880); ctx.fill();
  }
  // --- Garden: the far wing of the cloister seen across the garden.
  if (vis(1000, 1520)) {
    ctx.save();
    ctx.fillStyle = pat.plasterCool; ctx.fillRect(1000, 470, 520, g - 470);
    vgrad(ctx, 1000, 470, 520, g - 470, [[0, 'rgba(14,18,40,0.55)'], [1, 'rgba(6,6,14,0.75)']]);
    // roof line
    ctx.fillStyle = '#2a1714'; ctx.fillRect(990, 452, 540, 20);
    ctx.fillStyle = '#3a221c'; for (let x = 990; x < 1530; x += 14) { ctx.beginPath(); ctx.arc(x + 7, 452, 7, Math.PI, 0); ctx.fill(); }
    // upper windows
    for (let x = 1040; x < 1500; x += 110) { ctx.fillStyle = '#121528'; ctx.fillRect(x, 520, 30, 52); ctx.fillStyle = 'rgba(120,140,200,0.25)'; ctx.fillRect(x + 3, 523, 10, 46); }
    ctx.fillStyle = '#d9a35c'; ctx.fillRect(1260, 520, 30, 52); ctx.fillStyle = 'rgba(255,230,180,0.5)'; ctx.fillRect(1263, 523, 10, 46);
    // arcade: dark openings between columns
    ctx.fillStyle = '#07070d';
    for (let x = 1010; x < 1500; x += 100) { ctx.beginPath(); archPath(ctx, x, x + 78, 660, g); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,190,110,0.22)'; ctx.beginPath(); archPath(ctx, 1210, 1288, 660, g); ctx.fill();
    ctx.restore();
  }
  // --- Right wing: walkway back wall, loggia back wall.
  if (vis(1520, 2080)) {
    ctx.fillStyle = pat.plaster; ctx.fillRect(1520, 680, 560, 200);
    vgrad(ctx, 1520, 680, 560, 200, [[0, 'rgba(10,8,14,0.7)'], [0.5, 'rgba(10,8,14,0.2)'], [1, 'rgba(10,8,14,0.4)']]);
    ctx.fillStyle = '#1c140e'; ctx.beginPath(); archPath(ctx, 1640, 1704, 732, 880); ctx.fill();
    ctx.fillStyle = '#33261a'; ctx.beginPath(); archPath(ctx, 1646, 1698, 738, 880); ctx.fill();
    ctx.fillStyle = '#c9a24e'; ctx.fillRect(1690, 810, 3, 8);
    // bench
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(1880, 846, 110, 8); ctx.fillRect(1888, 854, 8, 26); ctx.fillRect(1974, 854, 8, 26);
    // loggia back wall
    ctx.fillStyle = pat.plaster; ctx.fillRect(1520, 440, 560, 160);
    vgrad(ctx, 1520, 440, 560, 160, [[0, 'rgba(10,8,14,0.75)'], [1, 'rgba(10,8,14,0.3)']]);
    for (let x = 1580; x < 2040; x += 150) { ctx.fillStyle = '#16121a'; ctx.fillRect(x, 470, 40, 70); ctx.fillStyle = '#4a3423'; ctx.fillRect(x - 10, 470, 9, 70); ctx.fillRect(x + 41, 470, 9, 70); }
  }
  // --- Lab: ground room and storage room.
  if (vis(2120, 2640)) {
    ctx.fillStyle = pat.plasterLab; ctx.fillRect(2120, 680, 520, 200);
    vgrad(ctx, 2120, 680, 520, 200, [[0, 'rgba(14,10,10,0.6)'], [0.6, 'rgba(14,10,10,0.15)'], [1, 'rgba(14,10,10,0.4)']]);
    ctx.fillStyle = pat.wood; ctx.fillRect(2120, 832, 520, 48);
    vgrad(ctx, 2120, 832, 520, 48, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.55)']]);
    ctx.fillStyle = '#2b1d12'; ctx.fillRect(2120, 830, 520, 3);
    // shelves with jars and bottles
    for (const sy of [716, 760]) {
      ctx.fillStyle = '#4a3220'; ctx.fillRect(2140, sy, 170, 5);
      const rr = rng(sy);
      for (let x = 2146; x < 2300; x += 14 + rr() * 8) {
        const h = 12 + rr() * 14; const hue = rr();
        ctx.fillStyle = hue < 0.33 ? 'rgba(170,120,60,0.85)' : hue < 0.66 ? 'rgba(90,120,110,0.8)' : 'rgba(210,200,180,0.8)';
        ctx.fillRect(x, sy - h, 9, h);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 1.5, sy - h + 2, 2, h - 4);
      }
    }
    // cork board with Lale's photos
    ctx.fillStyle = '#6e4c2e'; ctx.fillRect(2412, 700, 96, 66);
    const rr = rng(77);
    for (let k = 0; k < 7; k++) { ctx.save(); ctx.translate(2422 + rr() * 72, 708 + rr() * 44); ctx.rotate((rr() - 0.5) * 0.3); ctx.fillStyle = '#e8e2d6'; ctx.fillRect(-8, -6, 16, 12); ctx.fillStyle = k % 2 ? '#5d6b86' : '#8a6a4a'; ctx.fillRect(-6.5, -4.5, 13, 8); ctx.restore(); }
    ctx.fillStyle = '#c0392b'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(2424 + k * 19, 706 + (k % 2) * 30, 1.6, 0, TAU); ctx.fill(); }
    // storage room above
    ctx.fillStyle = pat.plasterDark; ctx.fillRect(2120, 440, 520, 160);
    vgrad(ctx, 2120, 440, 520, 160, [[0, 'rgba(6,6,10,0.75)'], [1, 'rgba(6,6,10,0.5)']]);
    ctx.fillStyle = '#10131f'; ctx.fillRect(2512, 466, 44, 64); ctx.fillStyle = 'rgba(140,165,230,0.35)'; ctx.fillRect(2516, 470, 36, 56);
    ctx.fillStyle = '#2a2018'; ctx.fillRect(2532, 466, 3, 64); ctx.fillRect(2512, 496, 44, 3);
  }
  // --- Nave.
  if (vis(2680, 4160)) {
    ctx.fillStyle = pat.stone; ctx.fillRect(2680, 160, 1480, 720);
    vgrad(ctx, 2680, 160, 1480, 720, [[0, 'rgba(8,8,18,0.72)'], [0.55, 'rgba(8,8,18,0.35)'], [1, 'rgba(8,8,18,0.55)']]);
    // pilasters and tall windows
    for (let x = 2760; x <= 4100; x += 320) {
      hgrad(ctx, x - 18, 160, 36, 720, [[0, 'rgba(0,0,0,0.35)'], [0.4, 'rgba(255,255,255,0.05)'], [1, 'rgba(0,0,0,0.4)']]);
      ctx.fillStyle = 'rgba(30,28,36,0.5)'; ctx.fillRect(x - 24, 160, 4, 720);
    }
    for (let x = 2920; x <= 3900; x += 320) {
      ctx.fillStyle = '#0b0c16'; ctx.beginPath(); archPath(ctx, x - 34, x + 34, 220, 500); ctx.fill();
      const wg = ctx.createLinearGradient(0, 230, 0, 500); wg.addColorStop(0, 'rgba(150,175,235,0.55)'); wg.addColorStop(1, 'rgba(80,100,170,0.35)');
      ctx.fillStyle = wg; ctx.beginPath(); archPath(ctx, x - 28, x + 28, 228, 494); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,30,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, 236); ctx.lineTo(x, 494); for (let y = 280; y < 494; y += 52) { ctx.moveTo(x - 28, y); ctx.lineTo(x + 28, y); } ctx.stroke();
    }
    // the side door the recoverer comes through
    ctx.fillStyle = '#140e0a'; ctx.beginPath(); archPath(ctx, 2872, 2948, 740, 880); ctx.fill();
    ctx.fillStyle = pat.wood; ctx.beginPath(); archPath(ctx, 2878, 2942, 746, 880); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); archPath(ctx, 2878, 2942, 746, 880); ctx.fill();
    ctx.fillStyle = '#8a7a5a'; for (let y = 770; y < 880; y += 24) for (let x = 2886; x < 2940; x += 16) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); }
    // the covered altarpiece
    ctx.fillStyle = '#2a1d10'; ctx.fillRect(3712, 176, 296, 460);
    const sheet = ctx.createLinearGradient(3712, 0, 4008, 0); sheet.addColorStop(0, '#9da0a6'); sheet.addColorStop(0.5, '#d9d6cf'); sheet.addColorStop(1, '#8f9298');
    ctx.fillStyle = sheet; ctx.beginPath(); ctx.moveTo(3700, 186); ctx.quadraticCurveTo(3860, 160, 4020, 186); ctx.lineTo(4030, 640); ctx.quadraticCurveTo(3860, 662, 3690, 640); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(70,70,80,0.35)'; ctx.lineWidth = 3;
    for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(3716 + k * 34, 196); ctx.quadraticCurveTo(3708 + k * 34 + (k % 2 ? 16 : -10), 420, 3712 + k * 35, 640); ctx.stroke(); }
    // the vault: ribs
    ctx.strokeStyle = 'rgba(160,150,140,0.25)'; ctx.lineWidth = 6;
    for (let x = 2760; x <= 4100; x += 320) { ctx.beginPath(); ctx.arc(x + 160, 200, 165, Math.PI, 0); ctx.stroke(); }
  }
  // --- Ramp corridor and crypt.
  if (vis(3120, 4160)) {
    ctx.fillStyle = pat.crypt; ctx.fillRect(3120, 880, 1040, 360);
    vgrad(ctx, 3120, 880, 1040, 360, [[0, 'rgba(6,5,8,0.7)'], [1, 'rgba(6,5,8,0.5)']]);
    // vault arches along the back wall; the last one is cut by the end wall
    ctx.strokeStyle = 'rgba(150,135,120,0.35)'; ctx.lineWidth = 10;
    for (let x = 3480; x <= 3960; x += 160) { ctx.beginPath(); ctx.moveTo(x, 1240); ctx.lineTo(x, 1080); ctx.arc(x + 80, 1080, 80, Math.PI, 0); ctx.lineTo(x + 160, 1240); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 3480; x <= 3960; x += 160) { ctx.beginPath(); ctx.moveTo(x + 8, 1240); ctx.lineTo(x + 8, 1082); ctx.arc(x + 80, 1082, 72, Math.PI, 0); ctx.lineTo(x + 152, 1240); ctx.fill(); }
    // shelves with frames and crates stamped PA
    for (const [x, y, w, h] of [[3560, 1176, 70, 64], [3640, 1196, 54, 44], [3800, 1186, 64, 54], [3870, 1206, 46, 34]]) {
      ctx.fillStyle = '#4c3722'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke();
      ctx.fillStyle = 'rgba(20,14,10,0.8)'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('PA', x + w / 2 - 9, y + h / 2 + 5);
    }
    ctx.fillStyle = '#3b2a1a'; ctx.fillRect(3950, 1060, 90, 6); ctx.fillRect(3950, 1120, 90, 6);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = '#5c4329'; ctx.fillRect(3956 + k * 20, 1066, 6, 54); }
  }
  // --- Shaft and aqueduct.
  if (vis(4160, 4600)) {
    ctx.fillStyle = pat.brick; ctx.fillRect(4160, 1000, 440, 400);
    vgrad(ctx, 4160, 1000, 440, 400, [[0, 'rgba(4,6,8,0.86)'], [1, 'rgba(4,6,8,0.7)']]);
    ctx.fillStyle = 'rgba(30,60,70,0.55)'; ctx.fillRect(4160, 1384, 440, 16);
    ctx.fillStyle = 'rgba(150,190,200,0.18)'; for (let x = 4170; x < 4590; x += 36) ctx.fillRect(x, 1388, 18, 1.5);
  }
  // --- Garden behind the apse: the garden wall with ivy.
  if (vis(4200, 4760)) {
    ctx.fillStyle = pat.stoneWarm; ctx.fillRect(4200, 690, 560, g - 690);
    vgrad(ctx, 4200, 690, 560, g - 690, [[0, 'rgba(12,16,34,0.55)'], [1, 'rgba(6,6,14,0.7)']]);
    ctx.fillStyle = '#2d1b17'; ctx.fillRect(4196, 682, 568, 12);
    const rr = rng(808);
    for (let k = 0; k < 160; k++) { ctx.fillStyle = `rgba(${30 + rr() * 30},${60 + rr() * 40},${36 + rr() * 20},0.8)`; ctx.beginPath(); ctx.ellipse(4210 + rr() * 300, 700 + rr() * 150, 5, 3.5, rr() * 3, 0, TAU); ctx.fill(); }
  }
}

function paintTiles(ctx, view, level, map, pat) {
  const tx0 = Math.max(0, Math.floor(view.x0 / TILE) - 1), tx1 = Math.min(level.W - 1, Math.ceil(view.x1 / TILE) + 1);
  for (let ty = 0; ty < level.H; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = map.get(tx, ty);
      const x = tx * TILE, y = ty * TILE;
      if (t === T.SOLID || t === T.BREAK) {
        const m = materialFor(tx, ty);
        if (m === 'plasterWing') { ctx.fillStyle = pat.plaster; ctx.fillRect(x, y, TILE, TILE); }
        else if (m === 'vault') { ctx.fillStyle = pat.stoneDark; ctx.fillRect(x, y, TILE, TILE); }
        else if (m === 'brickDeep') { ctx.fillStyle = pat.earth; ctx.fillRect(x, y, TILE, TILE); }
        else { ctx.fillStyle = pat[m] || pat.stone; ctx.fillRect(x, y, TILE, TILE); }
      } else if (t === T.SLOPE_UP || t === T.SLOPE_DOWN) {
        ctx.fillStyle = pat.crypt;
        ctx.beginPath();
        if (t === T.SLOPE_DOWN) { ctx.moveTo(x, y); ctx.lineTo(x + TILE, y + TILE); ctx.lineTo(x, y + TILE); }
        else { ctx.moveTo(x, y + TILE); ctx.lineTo(x + TILE, y); ctx.lineTo(x + TILE, y + TILE); }
        ctx.closePath(); ctx.fill();
        // steps
        ctx.fillStyle = 'rgba(190,175,150,0.35)';
        for (let k = 0; k < 4; k++) {
          const sx = t === T.SLOPE_DOWN ? x + k * 10 : x + TILE - (k + 1) * 10;
          const sy = y + k * 10;
          ctx.fillRect(sx, sy + (t === T.SLOPE_DOWN ? 0 : 0), 10, 2.5);
        }
      } else if (t === T.ONEWAY) {
        ctx.fillStyle = pat.wood; ctx.fillRect(x, y, TILE, 9);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y + 9, TILE, 2);
      } else if (t === T.LADDER) {
        ctx.fillStyle = '#4a3420'; ctx.fillRect(x + 6, y, 4, TILE); ctx.fillRect(x + 30, y, 4, TILE);
        ctx.fillStyle = '#6b4c2e'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 6, y + 6 + k * 10, 28, 3);
      }
    }
  }
  // Floors, edges and shading of blocks.
  for (let ty = 0; ty < level.H; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!map.isBlock(map.get(tx, ty))) continue;
      const x = tx * TILE, y = ty * TILE;
      const above = map.get(tx, ty - 1), below = map.get(tx, ty + 1), left = map.get(tx - 1, ty), right = map.get(tx + 1, ty);
      if (!map.isBlock(above) && !map.isSlope(above)) {
        const f = ty >= 22 ? floorFor(tx) : null;
        if (f === 'grass') {
          ctx.fillStyle = '#1f2a1a'; ctx.fillRect(x, y, TILE, 12);
          ctx.fillStyle = '#2f4224'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + k * 5, y + 2); ctx.lineTo(x + k * 5 + 2, y - 6 - (k * 7 % 5)); ctx.lineTo(x + k * 5 + 4, y + 2); ctx.fill(); }
        } else if (f) {
          ctx.fillStyle = pat[f]; ctx.fillRect(x, y, TILE, 12);
        } else {
          ctx.fillStyle = 'rgba(220,205,180,0.18)'; ctx.fillRect(x, y, TILE, 3);
        }
        vgrad(ctx, x, y + 10, TILE, 18, [[0, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
      }
      if (!map.isBlock(below) && !map.isSlope(below) && below !== T.ONEWAY) vgrad(ctx, x, y + TILE - 10, TILE, 10, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]);
      if (!map.isBlock(left) && !map.isSlope(left)) hgrad(ctx, x, y, 8, TILE, [[0, 'rgba(255,240,220,0.08)'], [1, 'rgba(0,0,0,0)']]);
      if (!map.isBlock(right) && !map.isSlope(right)) hgrad(ctx, x + TILE - 10, y, 10, TILE, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
    }
  }
}

function lanternFixture(ctx, x, y, hang = 26) {
  ctx.strokeStyle = '#141210'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - hang); ctx.lineTo(x, y - 10); ctx.stroke();
  ctx.fillStyle = '#1d1a16'; ctx.beginPath(); ctx.moveTo(x - 9, y - 10); ctx.lineTo(x + 9, y - 10); ctx.lineTo(x + 6, y - 15); ctx.lineTo(x - 6, y - 15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd38a'; ctx.fillRect(x - 7, y - 10, 14, 18);
  ctx.fillStyle = '#fff1c9'; ctx.fillRect(x - 3, y - 8, 6, 12);
  ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 7, y - 10, 14, 18);
  ctx.fillStyle = '#1d1a16'; ctx.fillRect(x - 9, y + 8, 18, 3);
}

function column(ctx, x, y0, y1, w = 18, tone = [120, 104, 88]) {
  hgrad(ctx, x - w / 2, y0, w, y1 - y0, [[0, rgba(tone[0] * 0.5, tone[1] * 0.5, tone[2] * 0.5)], [0.45, rgba(...tone)], [1, rgba(tone[0] * 0.4, tone[1] * 0.4, tone[2] * 0.4)]]);
  ctx.fillStyle = rgba(tone[0] * 0.8, tone[1] * 0.8, tone[2] * 0.8); ctx.fillRect(x - w / 2 - 5, y0, w + 10, 8); ctx.fillRect(x - w / 2 - 4, y1 - 8, w + 8, 8);
}

function paintDecor(ctx, view, level, pat) {
  const g = level.ground;
  const vis = (x0, x1) => x1 > view.x0 && x0 < view.x1;
  // Street lamp.
  if (vis(250, 360)) {
    ctx.fillStyle = '#121014'; ctx.fillRect(296, 640, 6, g - 640); ctx.fillRect(290, g - 14, 18, 14);
    ctx.fillRect(298, 636, 26, 4);
    lanternFixture(ctx, 321, 664, 24);
  }
  // Sign on the convent wall.
  if (vis(500, 600)) {
    ctx.fillStyle = '#121014'; ctx.fillRect(536, 658, 24, 3);
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(500, 662, 56, 40);
    ctx.strokeStyle = '#9a7b3c'; ctx.lineWidth = 1.5; ctx.strokeRect(502, 664, 52, 36);
    ctx.fillStyle = '#5a4520'; ctx.font = 'italic 600 15px Georgia, serif'; ctx.fillText('FA', 517, 684);
    ctx.font = '5.5px sans-serif'; ctx.fillText('LABORATORIO', 509, 692); ctx.fillText('DI RESTAURO', 510, 698);
  }
  // Cloister: arches under the left wing, columns, lanterns.
  if (vis(600, 1000)) {
    ctx.save(); ctx.fillStyle = pat.plaster;
    for (let x = 600; x < 1000; x += 100) { ctx.beginPath(); ctx.moveTo(x, 700); ctx.lineTo(x + 100, 700); ctx.lineTo(x + 100, 720); ctx.lineTo(x, 720); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (let x = 600; x < 1000; x += 100) { ctx.beginPath(); ctx.moveTo(x + 6, 722); ctx.quadraticCurveTo(x + 50, 690, x + 94, 722); ctx.lineTo(x + 94, 730); ctx.lineTo(x + 6, 730); ctx.fill(); }
    // closed upper floor: windows and roof
    for (const x of [680, 860]) { ctx.fillStyle = '#16121a'; ctx.fillRect(x, 420, 44, 76); ctx.fillStyle = '#5a3f2a'; ctx.fillRect(x - 12, 420, 11, 76); ctx.fillRect(x + 45, 420, 11, 76); }
    ctx.fillStyle = '#e1a95f'; ctx.fillRect(864, 424, 36, 68); ctx.fillStyle = 'rgba(255,230,190,0.45)'; ctx.fillRect(867, 427, 12, 62);
    ctx.fillStyle = '#2d1a16'; ctx.fillRect(596, 270, 410, 12);
    ctx.fillStyle = '#4a2a22'; for (let x = 598; x < 1004; x += 14) { ctx.beginPath(); ctx.arc(x + 7, 272, 7, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = 'rgba(210,190,160,0.22)'; ctx.fillRect(600, 690, 400, 6);
    lanternFixture(ctx, 780, 752, 30);
  }
  if (vis(1000, 1520)) {
    // fountain
    ctx.fillStyle = '#3c3a42'; ctx.beginPath(); ctx.ellipse(1260, g - 6, 70, 10, 0, 0, TAU); ctx.fill();
    vgrad(ctx, 1192, g - 34, 136, 30, [[0, '#6b6670'], [1, '#3a363e']]);
    ctx.fillStyle = 'rgba(120,160,210,0.35)'; ctx.fillRect(1196, g - 32, 128, 6);
    ctx.fillStyle = '#58545e'; ctx.fillRect(1252, g - 86, 16, 54);
    ctx.fillStyle = '#6b6670'; ctx.beginPath(); ctx.ellipse(1260, g - 88, 30, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(170,200,240,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(1236, g - 86); ctx.quadraticCurveTo(1224, g - 60, 1220, g - 34); ctx.moveTo(1284, g - 86); ctx.quadraticCurveTo(1296, g - 60, 1300, g - 34); ctx.stroke();
    // cypress in pots at the garden corners
    for (const x of [1030, 1490]) { ctx.fillStyle = '#5a3a28'; ctx.fillRect(x - 12, g - 26, 24, 26); ctx.fillStyle = '#16231a'; ctx.beginPath(); ctx.ellipse(x, g - 70, 14, 48, 0, 0, TAU); ctx.fill(); }
  }
  if (vis(1520, 2080)) {
    // loggia floor edge, balustrade, roof
    ctx.fillStyle = 'rgba(220,200,170,0.2)'; ctx.fillRect(1520, 600, 560, 4);
    ctx.fillStyle = '#3e3630';
    ctx.fillRect(1520, 560, 560, 6);
    for (let x = 1530; x < 2070; x += 18) { ctx.beginPath(); ctx.ellipse(x, 584, 5, 13, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2d1a16'; ctx.fillRect(1514, 348, 572, 12);
    ctx.fillStyle = '#4a2a22'; for (let x = 1516; x < 2084; x += 14) { ctx.beginPath(); ctx.arc(x + 7, 350, 7, Math.PI, 0); ctx.fill(); }
    // arches under the loggia
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    for (let x = 1520; x < 2080; x += 112) { ctx.beginPath(); ctx.moveTo(x + 8, 682); ctx.quadraticCurveTo(x + 56, 650, x + 104, 682); ctx.lineTo(x + 104, 690); ctx.lineTo(x + 8, 690); ctx.fill(); }
    for (let x = 1520; x <= 2080; x += 112) column(ctx, x, 682, 880, 16);
    lanternFixture(ctx, 1800, 712, 28);
    lanternFixture(ctx, 1840, 476, 30);
  }
  // Lab.
  if (vis(2080, 2640)) {
    // door frames
    ctx.fillStyle = '#3a2716'; ctx.fillRect(2078, 716, 46, 6); ctx.fillRect(2078, 436, 46, 6);
    // easel with a painting
    ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(2256, g); ctx.lineTo(2278, 760); ctx.lineTo(2300, g); ctx.moveTo(2278, 760); ctx.lineTo(2278, g - 10); ctx.stroke();
    ctx.fillStyle = '#2b2114'; ctx.fillRect(2244, 768, 68, 56);
    vgrad(ctx, 2248, 772, 60, 48, [[0, '#7b8fa8'], [0.6, '#b59a6e'], [1, '#5e4630']]);
    ctx.fillStyle = 'rgba(40,30,20,0.6)'; ctx.beginPath(); ctx.ellipse(2278, 800, 9, 14, 0, 0, TAU); ctx.fill();
    // Lale's desk with lamp, papers and a magnifier stand
    ctx.fillStyle = '#4a3220'; ctx.fillRect(2372, 812, 100, 8); ctx.fillRect(2378, 820, 6, 60); ctx.fillRect(2460, 820, 6, 60);
    ctx.fillStyle = '#e9e2d4'; ctx.save(); ctx.translate(2400, 808); ctx.rotate(-0.08); ctx.fillRect(0, 0, 26, 4); ctx.restore(); ctx.fillRect(2430, 806, 20, 5);
    ctx.strokeStyle = '#26221c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2452, 812); ctx.lineTo(2444, 780); ctx.lineTo(2420, 772); ctx.stroke();
    ctx.fillStyle = '#26221c'; ctx.beginPath(); ctx.moveTo(2412, 766); ctx.lineTo(2428, 770); ctx.lineTo(2424, 784); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,150,0.8)'; ctx.beginPath(); ctx.ellipse(2420, 784, 7, 2.5, 0.2, 0, TAU); ctx.fill();
    // UV lamp on a stand
    ctx.fillStyle = '#1e1c22'; ctx.fillRect(2486, 730, 4, 150); ctx.fillRect(2474, g - 4, 28, 4);
    ctx.fillStyle = '#2a2830'; ctx.fillRect(2476, 722, 34, 10);
    ctx.fillStyle = '#c9a6ff'; ctx.fillRect(2478, 730, 30, 3);
    // the cabinet with jars (the jar of dammar is a separate sprite)
    ctx.fillStyle = '#3e2a19'; ctx.fillRect(2500, 742, 98, 138);
    ctx.fillStyle = 'rgba(150,170,190,0.18)'; ctx.fillRect(2506, 750, 41, 120); ctx.fillRect(2551, 750, 41, 120);
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(2506, 788, 86, 4); ctx.fillRect(2506, 830, 86, 4);
    const rr = rng(5);
    for (const sy of [788, 830, 870]) for (let x = 2510; x < 2588; x += 12) { if (sy === 788 && x > 2528 && x < 2552) continue; const h = 10 + rr() * 12; ctx.fillStyle = rr() < 0.5 ? 'rgba(190,150,80,0.8)' : 'rgba(200,190,170,0.75)'; ctx.fillRect(x, sy - h, 8, h); }
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(2547, 750, 4, 120);
    // storage room: stacked frames, rolled canvases, crates
    for (let k = 0; k < 5; k++) { ctx.strokeStyle = `rgb(${120 - k * 8},${92 - k * 6},${50})`; ctx.lineWidth = 5; ctx.strokeRect(2150 + k * 10, 500 + k * 6, 70, 94 - k * 6); }
    ctx.fillStyle = '#4c3722'; ctx.fillRect(2380, 544, 70, 56); ctx.fillRect(2450, 560, 50, 40);
    ctx.fillStyle = 'rgba(20,14,10,0.85)'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('PA', 2404, 578); ctx.fillText('PA', 2466, 586);
    ctx.fillStyle = '#d8ccb0'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(2270 + k * 26, 594 - k * 2, 10, 6, 0, 0, TAU); ctx.fill(); }
  }
  // Nave.
  if (vis(2680, 4160)) {
    // pews
    for (let x = 2960; x < 3100; x += 44) { ctx.fillStyle = '#2b1d12'; ctx.fillRect(x, 838, 34, 6); ctx.fillRect(x + 28, 800, 6, 80); ctx.fillRect(x, 844, 5, 36); }
    // candles at the presbytery
    for (const x of [3360, 3400]) { ctx.fillStyle = '#c9a24e'; ctx.fillRect(x - 2, 616, 4, 64); ctx.fillRect(x - 10, 676, 20, 4); ctx.fillStyle = '#efe6d0'; ctx.fillRect(x - 3, 596, 6, 20); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(x, 590, 3, 6, 0, 0, TAU); ctx.fill(); }
    // altar
    vgrad(ctx, 3520, 610, 140, 70, [[0, '#cfc6b8'], [1, '#8d857a']]);
    ctx.fillStyle = '#b3243a'; ctx.fillRect(3520, 610, 140, 8);
    // scaffolding poles
    ctx.fillStyle = '#6a4b2c';
    for (const x of [3684, 3760, 3860, 3960, 4036]) ctx.fillRect(x, 200, 6, 480);
    ctx.strokeStyle = 'rgba(106,75,44,0.8)'; ctx.lineWidth = 3;
    for (const [y0, y1] of [[520, 360], [360, 200]]) { ctx.beginPath(); ctx.moveTo(3690, y0); ctx.lineTo(3860, y1); ctx.moveTo(3860, y0); ctx.lineTo(4036, y1); ctx.stroke(); }
    // stone balustrade at the head of the ramp
    ctx.fillStyle = '#5e5650'; ctx.fillRect(3080, 846, 6, 34);
  }
  // Crypt bulb.
  if (vis(3760, 3840)) { ctx.strokeStyle = '#151214'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(3800, 1000); ctx.lineTo(3800, 1020); ctx.stroke(); ctx.fillStyle = '#ffe2a8'; ctx.beginPath(); ctx.arc(3800, 1026, 6, 0, TAU); ctx.fill(); }
  // Garden behind the apse: apse window, cypresses, well, gate.
  if (vis(4160, 4800)) {
    ctx.fillStyle = '#0d0e18'; ctx.beginPath(); archPath(ctx, 4168, 4196, 480, 600); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,110,0.55)'; ctx.beginPath(); archPath(ctx, 4171, 4193, 484, 596); ctx.fill();
    for (const [x, h] of [[4300, 330], [4470, 280], [4250, 240]]) {
      ctx.fillStyle = '#0f1812'; ctx.beginPath(); ctx.ellipse(x, g - h / 2, 24, h / 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(80,110,90,0.25)'; ctx.beginPath(); ctx.ellipse(x + 8, g - h / 2 - 10, 9, h / 2 - 20, 0, 0, TAU); ctx.fill();
    }
    // well around the shaft at x 4560-4600
    ctx.fillStyle = '#4e4a52'; ctx.fillRect(4532, g - 30, 24, 30); ctx.fillRect(4604, g - 30, 24, 30);
    ctx.fillStyle = '#6a6570'; ctx.fillRect(4528, g - 34, 32, 6); ctx.fillRect(4600, g - 34, 32, 6);
    ctx.fillStyle = '#3a2716'; ctx.fillRect(4536, g - 120, 6, 90); ctx.fillRect(4618, g - 120, 6, 90);
    ctx.beginPath(); ctx.moveTo(4524, g - 116); ctx.lineTo(4580, g - 146); ctx.lineTo(4636, g - 116); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4580, g - 116); ctx.lineTo(4580, g - 60); ctx.stroke();
    // gate
    ctx.fillStyle = '#2d2a2f'; ctx.fillRect(4676, 700, 18, g - 700); ctx.fillRect(4746, 700, 14, g - 700);
    ctx.strokeStyle = '#141216'; ctx.lineWidth = 3;
    for (let x = 4700; x < 4744; x += 9) { ctx.beginPath(); ctx.moveTo(x, 724); ctx.lineTo(x, g); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(4694, 740); ctx.lineTo(4746, 740); ctx.moveTo(4694, 830); ctx.lineTo(4746, 830); ctx.stroke();
    lanternFixture(ctx, 4668, 704, 18);
  }
}

function paintLight(ctx, view, level) {
  for (const L of level.lights) {
    if (L.x + L.r < view.x0 || L.x - L.r > view.x1) continue;
    glow(ctx, L.x, L.y, L.r * 1.05, L.color, 0.34 * L.i, 'lighter');
  }
  // moonlight shafts in the nave
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let x = 2920; x <= 3900; x += 320) {
    if (x + 300 < view.x0 || x - 100 > view.x1) continue;
    const gr = ctx.createLinearGradient(x, 300, x + 180, 880);
    gr.addColorStop(0, 'rgba(120,150,230,0.12)'); gr.addColorStop(1, 'rgba(120,150,230,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - 26, 300); ctx.lineTo(x + 26, 300); ctx.lineTo(x + 220, 880); ctx.lineTo(x + 120, 880); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- sky, town, front sprites

function paintSky() {
  const W = 2600, H = 1100;
  const c = canvas(W, H); const ctx = c.getContext('2d');
  vgrad(ctx, 0, 0, W, H, [[0, '#070a1c'], [0.45, '#141a3d'], [0.7, '#2b2a55'], [0.85, '#4a3b66'], [1, '#2a2340']]);
  const r = rng(3);
  for (let i = 0; i < 420; i++) {
    const y = r() * H * 0.7; const a = 0.25 + r() * 0.6 * (1 - y / (H * 0.7));
    ctx.fillStyle = `rgba(230,235,255,${a})`; ctx.fillRect(r() * W, y, r() < 0.08 ? 2 : 1.2, r() < 0.08 ? 2 : 1.2);
  }
  // moon
  glow(ctx, 1850, 230, 260, [170, 190, 255], 0.35, 'lighter');
  ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.arc(1850, 230, 38, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(180,170,150,0.35)'; ctx.beginPath(); ctx.arc(1838, 222, 9, 0, TAU); ctx.arc(1862, 244, 6, 0, TAU); ctx.fill();
  // thin clouds
  ctx.fillStyle = 'rgba(120,120,170,0.12)';
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(200 + i * 290, 300 + (i % 3) * 70, 180, 14, 0, 0, TAU); ctx.fill(); }
  return c;
}

function paintFar() {
  const W = 3000, H = 520;
  const c = canvas(W, H); const ctx = c.getContext('2d');
  const r = rng(17);
  // distant hills and sea glow
  ctx.fillStyle = '#121633'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 230 + Math.sin(x * 0.004) * 40 + r() * 20); ctx.lineTo(W, H); ctx.fill();
  // rooftops
  ctx.fillStyle = '#0d1029';
  let x = 0;
  while (x < W) {
    const w = 60 + r() * 120, h = 120 + r() * 160;
    ctx.fillRect(x, H - h, w, h);
    if (r() < 0.5) { ctx.beginPath(); ctx.moveTo(x - 4, H - h); ctx.lineTo(x + w / 2, H - h - 24 - r() * 20); ctx.lineTo(x + w + 4, H - h); ctx.fill(); }
    for (let k = 0; k < 4; k++) if (r() < 0.35) { ctx.fillStyle = `rgba(255,${180 + r() * 40},${100 + r() * 40},${0.5 + r() * 0.4})`; ctx.fillRect(x + 8 + r() * (w - 20), H - h + 14 + r() * (h - 40), 6, 8); ctx.fillStyle = '#0d1029'; }
    x += w + r() * 10;
  }
  // bell tower
  ctx.fillStyle = '#0d1029'; ctx.fillRect(1320, 120, 54, H - 120); ctx.beginPath(); ctx.moveTo(1316, 120); ctx.lineTo(1347, 64); ctx.lineTo(1378, 120); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,120,0.6)'; ctx.fillRect(1338, 150, 18, 26);
  return c;
}

// Sprites drawn in front of Ada when she hides (or simply in front of her).
function paintFrontSprites() {
  const out = {};
  const hedge = (w, h, seed) => {
    const c = canvas(w, h + 6); const ctx = c.getContext('2d'); const r = rng(seed);
    for (let i = 0; i < 70; i++) { const cx = 8 + r() * (w - 16), cy = h * 0.35 + r() * h * 0.6; const rad = 9 + r() * 14; ctx.fillStyle = `rgb(${18 + r() * 14},${34 + r() * 22},${22 + r() * 12})`; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.fill(); }
    for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(110,150,110,${0.15 + r() * 0.2})`; ctx.beginPath(); ctx.arc(8 + r() * (w - 16), h * 0.3 + r() * h * 0.4, 3 + r() * 4, 0, TAU); ctx.fill(); }
    return c;
  };
  out.hedge = hedge(110, 70, 4);
  out.hedgeWide = hedge(118, 70, 9);
  // big canvas on an easel, seen from behind
  { const c = canvas(74, 136); const ctx = c.getContext('2d');
    ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(10, 136); ctx.lineTo(37, 6); ctx.lineTo(64, 136); ctx.stroke();
    ctx.fillStyle = '#c9bca2'; ctx.fillRect(4, 18, 66, 92); ctx.fillStyle = '#8f7b5a'; ctx.fillRect(4, 18, 66, 4); ctx.fillRect(4, 18, 4, 92); ctx.fillRect(66, 18, 4, 92); ctx.fillRect(4, 106, 66, 4); ctx.fillRect(35, 18, 4, 92);
    ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fillRect(8, 22, 58, 84);
    out.canvas = c; }
  // curtain
  { const c = canvas(68, 164); const ctx = c.getContext('2d');
    ctx.fillStyle = '#2a1416'; ctx.fillRect(0, 0, 68, 6);
    for (let k = 0; k < 6; k++) { const g = ctx.createLinearGradient(k * 11, 0, k * 11 + 11, 0); g.addColorStop(0, '#4a1a20'); g.addColorStop(0.5, '#7a2a32'); g.addColorStop(1, '#3a1218'); ctx.fillStyle = g; ctx.fillRect(k * 11 + 1, 6, 12, 158); }
    out.curtain = c; }
  // crates
  { const c = canvas(96, 100); const ctx = c.getContext('2d');
    for (const [x, y, w, h] of [[0, 40, 56, 60], [40, 52, 56, 48], [10, 0, 48, 42]]) { ctx.fillStyle = '#5a4128'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#2e2014'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + w - 3, y + h - 3); ctx.stroke(); ctx.fillStyle = 'rgba(20,14,10,0.8)'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('PA', x + w / 2 - 9, y + h / 2 + 4); }
    out.crates = c; }
  return out;
}

// Dark shapes very close to the camera that pass in front of everything.
function paintForeground(level) {
  const items = [];
  const col = (h) => { const c = canvas(30, h); const ctx = c.getContext('2d'); hgrad(ctx, 0, 0, 30, h, [[0, '#07060a'], [0.5, '#15121a'], [1, '#07060a']]); ctx.fillStyle = '#0b0a0e'; ctx.fillRect(0, 0, 30, 10); return c; };
  items.push({ canvas: col(220), x: 1560, y: level.ground - 220, sf: 1.18 });
  items.push({ canvas: col(220), x: 1960, y: level.ground - 220, sf: 1.18 });
  items.push({ canvas: col(180), x: 760, y: level.ground - 180, sf: 1.18 });
  const bush = () => { const c = canvas(220, 120); const ctx = c.getContext('2d'); const r = rng(77); for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgb(${6 + r() * 6},${10 + r() * 8},${8 + r() * 6})`; ctx.beginPath(); ctx.arc(20 + r() * 180, 50 + r() * 70, 16 + r() * 22, 0, TAU); ctx.fill(); } return c; };
  items.push({ canvas: bush(), x: 1120, y: level.ground - 64, sf: 1.22 });
  items.push({ canvas: bush(), x: 4380, y: level.ground - 64, sf: 1.22 });
  return items;
}
