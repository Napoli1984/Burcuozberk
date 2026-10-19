// Paints every body part of every character into canvas textures, at twice the display size.
// Coordinates inside a part are in "rig units" (1 unit = 1 world pixel), with the pivot at (0,0),
// x pointing forward (the way the character faces) and y pointing down.
import { rng } from '../util.js';

const S = 2; // paint resolution

function makeTex(scene, key, box, draw) {
  // box: [left, top, right, bottom] in rig units around the pivot
  const [l, t, r, b] = box;
  const w = Math.ceil((r - l) * S), h = Math.ceil((b - t) * S);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.scale(S, S);
  ctx.translate(-l, -t);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
  return { key, ox: -l / (r - l), oy: -t / (b - t), scale: 1 / S };
}

function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

// A tapered limb pointing down from the pivot: rounded at both ends.
function limbPath(ctx, len, wTop, wBot, extTop = 0, extBot = 0) {
  const a = wTop / 2, b = wBot / 2;
  ctx.beginPath();
  ctx.moveTo(-a, -extTop + a * 0.2);
  ctx.quadraticCurveTo(-a, -extTop - a * 0.9, 0, -extTop - a);
  ctx.quadraticCurveTo(a, -extTop - a * 0.9, a, -extTop + a * 0.2);
  ctx.lineTo(b, len + extBot - b * 0.2);
  ctx.quadraticCurveTo(b, len + extBot + b * 0.9, 0, len + extBot + b);
  ctx.quadraticCurveTo(-b, len + extBot + b * 0.9, -b, len + extBot - b * 0.2);
  ctx.closePath();
}

function shadeLimb(ctx, len, w, light, mid, dark) {
  ctx.fillStyle = grad(ctx, -w / 2, 0, w / 2, 0, [[0, dark], [0.45, mid], [0.8, light], [1, mid]]);
  ctx.fill();
}

function darken(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ---------------------------------------------------------------- Ada

const ADA = {
  skin: '#d9a27c', skinLight: '#ecc09c', skinDark: '#b07752',
  hair: '#3a2217', hairMid: '#5b3621', hairLight: '#8a5a34',
  jean: '#a8c0da', jeanMid: '#91abc8', jeanDark: '#7590b0', jeanSeam: '#6f88a8', cuff: '#c5d6e8',
  leo: '#bf8f55', leoDark: '#3b2414', leoMid: '#8c5a2c',
  shoe: '#c48b58', shoeDark: '#94643a', shoeLight: '#dcaa78',
  bag: '#efe5d3', bagDark: '#cfc2aa', gold: '#d8b25c', lip: '#b8665c',
};

function leopard(ctx, x0, y0, x1, y1, seed) {
  const r = rng(seed);
  for (let i = 0; i < 46; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    const s = 0.9 + r() * 1.2;
    ctx.fillStyle = ADA.leoMid;
    ctx.beginPath(); ctx.ellipse(x, y, s * 1.1, s * 0.9, r() * 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ADA.leoDark; ctx.lineWidth = 0.75;
    ctx.beginPath();
    const parts = 2 + Math.floor(r() * 3);
    for (let k = 0; k < parts; k++) {
      const a0 = r() * Math.PI * 2, a1 = a0 + 0.8 + r() * 1.1;
      ctx.moveTo(x + Math.cos(a0) * s * 1.35, y + Math.sin(a0) * s * 1.2);
      ctx.arc(x, y, s * 1.3, a0, a1);
    }
    ctx.stroke();
  }
}

function adaParts(scene) {
  const P = {};
  const back = (hex) => darken(hex, 0.74);

  for (const side of ['F', 'B']) {
    const k = side === 'F' ? 1 : 0.74;
    const c = (hex) => (side === 'F' ? hex : darken(hex, k));
    // Thigh: wide-leg light jeans.
    P['thigh' + side] = makeTex(scene, 'ada-thigh' + side, [-10, -9, 10, 31], (ctx) => {
      limbPath(ctx, 27, 15.5, 13, 3, 2);
      shadeLimb(ctx, 27, 15, c(ADA.jean), c(ADA.jeanMid), c(ADA.jeanDark));
      ctx.strokeStyle = c(ADA.jeanSeam); ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(4.5, -2); ctx.quadraticCurveTo(5.5, 13, 4.2, 28); ctx.stroke();
      ctx.globalAlpha = 0.25; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(2, 6); ctx.lineTo(1.5, 18); ctx.stroke(); ctx.globalAlpha = 1;
    });
    // Shin: straight wide jeans with a rolled cuff.
    P['shin' + side] = makeTex(scene, 'ada-shin' + side, [-9, -7, 9, 32], (ctx) => {
      ctx.beginPath();
      ctx.moveTo(-6.4, -4); ctx.quadraticCurveTo(0, -7.5, 6.4, -4);
      ctx.lineTo(7.2, 25.5); ctx.lineTo(-7.4, 25.5); ctx.closePath();
      ctx.fillStyle = grad(ctx, -7, 0, 7, 0, [[0, c(ADA.jeanDark)], [0.5, c(ADA.jeanMid)], [0.85, c(ADA.jean)], [1, c(ADA.jeanMid)]]);
      ctx.fill();
      ctx.strokeStyle = c(ADA.jeanSeam); ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(4.2, -3); ctx.lineTo(5, 24); ctx.stroke();
      // cuff
      ctx.beginPath(); ctx.roundRect(-7.8, 22.5, 15.6, 5.2, 1.6);
      ctx.fillStyle = grad(ctx, 0, 22.5, 0, 27.7, [[0, c(ADA.cuff)], [1, c(ADA.jeanMid)]]); ctx.fill();
      ctx.strokeStyle = c(ADA.jeanSeam); ctx.lineWidth = 0.5; ctx.stroke();
    });
    // Foot: pointed pump with a stiletto heel. Pivot at the ankle.
    P['foot' + side] = makeTex(scene, 'ada-foot' + side, [-6, -4, 17, 12], (ctx) => {
      ctx.fillStyle = c(ADA.skinDark);
      ctx.beginPath(); ctx.ellipse(1, 0.5, 3.2, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4.5, 1.5); ctx.quadraticCurveTo(-4.8, 5.5, -2.5, 6.2);
      ctx.quadraticCurveTo(5, 7.5, 15.5, 9.6);
      ctx.quadraticCurveTo(10, 6, 6, 3.2);
      ctx.quadraticCurveTo(2, 0.5, -1.5, 0.8); ctx.closePath();
      ctx.fillStyle = grad(ctx, 0, 0, 0, 9, [[0, c(ADA.shoeLight)], [1, c(ADA.shoe)]]); ctx.fill();
      ctx.strokeStyle = c(ADA.shoeDark); ctx.lineWidth = 0.6; ctx.stroke();
      ctx.strokeStyle = c(ADA.shoeDark); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-3.6, 6); ctx.lineTo(-3.2, 10.6); ctx.stroke();
    });
    // Upper arm (bare).
    P['uarm' + side] = makeTex(scene, 'ada-uarm' + side, [-6, -6, 6, 25], (ctx) => {
      limbPath(ctx, 21.5, 7.2, 5.4, 2, 1);
      shadeLimb(ctx, 21, 7, c(ADA.skinLight), c(ADA.skin), c(ADA.skinDark));
    });
    // Forearm with hand.
    P['farm' + side] = makeTex(scene, 'ada-farm' + side, [-5, -4, 6, 29], (ctx) => {
      limbPath(ctx, 18.5, 5.4, 4.2, 1, 0);
      shadeLimb(ctx, 18, 5, c(ADA.skinLight), c(ADA.skin), c(ADA.skinDark));
      ctx.beginPath(); ctx.ellipse(0.6, 22.4, 2.7, 4.6, 0.12, 0, Math.PI * 2);
      ctx.fillStyle = c(ADA.skin); ctx.fill();
      ctx.strokeStyle = c(ADA.skinDark); ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(2.4, 20.5); ctx.lineTo(3.2, 25.6); ctx.stroke();
    });
  }

  // Pelvis: jeans hips with waistband, pivot at the hip joint.
  P.pelvis = makeTex(scene, 'ada-pelvis', [-12, -9, 12, 12], (ctx) => {
    ctx.beginPath();
    ctx.moveTo(-8.6, -6.5); ctx.lineTo(8.4, -6.5);
    ctx.quadraticCurveTo(10.6, 1, 8.4, 7.6);
    ctx.quadraticCurveTo(0, 11.5, -9.8, 7.2);
    ctx.quadraticCurveTo(-11.8, 0, -8.6, -6.5); ctx.closePath();
    ctx.fillStyle = grad(ctx, -11, 0, 11, 0, [[0, ADA.jeanDark], [0.55, ADA.jeanMid], [0.9, ADA.jean]]); ctx.fill();
    ctx.fillStyle = ADA.jeanDark;
    ctx.fillRect(-8.6, -6.5, 17, 2.3);
    ctx.strokeStyle = ADA.jeanSeam; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(-6.5, -3); ctx.quadraticCurveTo(-8, 2, -5, 5.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6.8, -4); ctx.quadraticCurveTo(4.5, 0, 6.5, 4.8); ctx.stroke();
  });

  // Torso from the hip (pivot) up to the neck base at y = -37.
  P.torso = makeTex(scene, 'ada-torso', [-12, -42, 13, 2], (ctx) => {
    // skin silhouette: waist, back, shoulders, neck base
    ctx.beginPath();
    ctx.moveTo(-6.6, -5);
    ctx.quadraticCurveTo(-8.6, -18, -7, -30);
    ctx.quadraticCurveTo(-5.4, -36.5, -1.5, -38);
    ctx.lineTo(3.2, -38);
    ctx.quadraticCurveTo(6.5, -35.5, 6.8, -31);
    ctx.quadraticCurveTo(9.8, -27.5, 9.2, -23);
    ctx.quadraticCurveTo(7.2, -17, 6.2, -12);
    ctx.quadraticCurveTo(6.4, -8, 6.8, -5);
    ctx.closePath();
    ctx.fillStyle = grad(ctx, -9, 0, 9, 0, [[0, ADA.skinDark], [0.55, ADA.skin], [0.9, ADA.skinLight]]); ctx.fill();
    // leopard corset with a pointed front hem
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-7.6, -13);
    ctx.quadraticCurveTo(-8.5, -22, -7.2, -30.5);
    ctx.lineTo(-3.5, -31.5);
    ctx.lineTo(4.6, -29.6);
    ctx.quadraticCurveTo(9.8, -27.5, 9.3, -22.8);
    ctx.quadraticCurveTo(7.6, -16.5, 6.8, -11.5);
    ctx.lineTo(3.2, -8.6);
    ctx.lineTo(-1.4, -11.4);
    ctx.closePath();
    ctx.fillStyle = ADA.leo; ctx.fill();
    ctx.clip();
    leopard(ctx, -10, -34, 11, -7, 7);
    ctx.fillStyle = grad(ctx, -9, 0, 10, 0, [[0, 'rgba(40,20,8,0.45)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(255,230,190,0.18)']]);
    ctx.fillRect(-10, -34, 21, 27);
    ctx.restore();
    ctx.strokeStyle = 'rgba(58,36,20,0.7)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-1.2, -30.5); ctx.lineTo(1.2, -9.6); ctx.stroke();
    // strap
    ctx.strokeStyle = ADA.leoDark; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0.5, -31); ctx.lineTo(0.8, -37.6); ctx.stroke();
  });

  // Head with neck, profile facing right. Pivot at the neck base.
  P.head = makeTex(scene, 'ada-head', [-13, -29, 13, 3], (ctx) => {
    // neck
    ctx.beginPath(); ctx.moveTo(-2.8, 1); ctx.lineTo(-2.4, -7); ctx.lineTo(3.4, -7); ctx.lineTo(3.6, 1); ctx.closePath();
    ctx.fillStyle = grad(ctx, -3, 0, 4, 0, [[0, ADA.skinDark], [1, ADA.skin]]); ctx.fill();
    // hair mass behind the head
    ctx.beginPath();
    ctx.moveTo(-1, -26.5);
    ctx.bezierCurveTo(-9.5, -27, -12.2, -18, -10.2, -8.5);
    ctx.quadraticCurveTo(-8.5, -3, -4, -4.8);
    ctx.quadraticCurveTo(-2, -13, 0, -20);
    ctx.closePath();
    ctx.fillStyle = ADA.hair; ctx.fill();
    // face and skull
    ctx.beginPath();
    ctx.moveTo(-3.2, -6.5);
    ctx.quadraticCurveTo(-5.6, -16, -1.5, -22.6);
    ctx.quadraticCurveTo(4.2, -26.6, 7.6, -21.4);
    ctx.quadraticCurveTo(8.6, -18.8, 8.1, -16.2);   // forehead
    ctx.quadraticCurveTo(8.7, -15, 8.4, -14.1);     // brow
    ctx.lineTo(10.3, -11);                          // nose
    ctx.quadraticCurveTo(10.6, -10.1, 9.1, -9.8);
    ctx.quadraticCurveTo(9.6, -8.9, 9.2, -8.4);     // upper lip
    ctx.quadraticCurveTo(8.6, -7.8, 9.0, -7.1);     // lower lip
    ctx.quadraticCurveTo(8.7, -5.3, 7.4, -4.6);     // chin
    ctx.quadraticCurveTo(4.6, -3.4, 2.4, -5.2);     // jaw
    ctx.closePath();
    ctx.fillStyle = grad(ctx, -4, 0, 10, 0, [[0, ADA.skinDark], [0.55, ADA.skin], [1, ADA.skinLight]]); ctx.fill();
    // lips
    ctx.fillStyle = ADA.lip;
    ctx.beginPath(); ctx.ellipse(8.6, -8.3, 0.9, 0.55, 0.3, 0, Math.PI * 2); ctx.fill();
    // eye, lashes and brow
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath(); ctx.ellipse(6.1, -13.7, 1.15, 0.62, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1d120b'; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(4.9, -14.3); ctx.quadraticCurveTo(6.3, -14.9, 7.5, -14.1); ctx.stroke();
    ctx.strokeStyle = ADA.hair; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(4.4, -16.1); ctx.quadraticCurveTo(6.4, -16.9, 8, -15.9); ctx.stroke();
    // cheek light
    ctx.fillStyle = 'rgba(255,214,186,0.35)';
    ctx.beginPath(); ctx.ellipse(5.4, -10.8, 2.1, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    // hair over the top and side, parted, covering the ear
    ctx.beginPath();
    ctx.moveTo(8.2, -18.6);
    ctx.bezierCurveTo(7.2, -26.5, -2.5, -28.8, -7.5, -23.5);
    ctx.bezierCurveTo(-11.6, -18.5, -9.5, -9.5, -7.6, -5.6);
    ctx.quadraticCurveTo(-4, -8.5, -3.2, -12.8);
    ctx.quadraticCurveTo(-1.2, -17.6, 2.8, -19.8);
    ctx.quadraticCurveTo(5.8, -21, 8.2, -18.6);
    ctx.closePath();
    ctx.fillStyle = grad(ctx, -8, -26, 6, -12, [[0, ADA.hairLight], [0.45, ADA.hairMid], [1, ADA.hair]]); ctx.fill();
    ctx.strokeStyle = 'rgba(190,130,80,0.45)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(4, -23.4); ctx.quadraticCurveTo(-3, -24, -6.5, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.5, -21.2); ctx.quadraticCurveTo(-3.5, -19.5, -5, -11); ctx.stroke();
  });

  // Long wavy hair, three segments hanging from the back of the head.
  const hairSeg = (key, len, w0, w1, tip) => makeTex(scene, key, [-9, -4, 9, len + 5], (ctx) => {
    ctx.beginPath();
    ctx.moveTo(-w0 / 2, 0);
    ctx.bezierCurveTo(-w0 / 2 - 1.5, len * 0.35, -w1 / 2 + 1.2, len * 0.65, -w1 / 2, len);
    if (tip) {
      ctx.quadraticCurveTo(-1, len + 4.5, 1.2, len + 2.5);
      ctx.quadraticCurveTo(2.8, len + 4.2, w1 / 2, len);
    } else {
      ctx.lineTo(w1 / 2, len);
    }
    ctx.bezierCurveTo(w1 / 2 + 1.3, len * 0.6, w0 / 2 - 1.2, len * 0.3, w0 / 2, 0);
    ctx.closePath();
    ctx.fillStyle = grad(ctx, -w0 / 2, 0, w0 / 2, 0, [[0, ADA.hair], [0.5, ADA.hairMid], [0.8, ADA.hairLight], [1, ADA.hairMid]]); ctx.fill();
    ctx.strokeStyle = 'rgba(200,140,85,0.4)'; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(1, 1); ctx.bezierCurveTo(3, len * 0.4, -1, len * 0.6, 1.5, len); ctx.stroke();
    ctx.strokeStyle = 'rgba(25,12,6,0.45)';
    ctx.beginPath(); ctx.moveTo(-2.4, 1); ctx.bezierCurveTo(-0.5, len * 0.45, -3.5, len * 0.7, -1.5, len); ctx.stroke();
  });
  P.hair1 = hairSeg('ada-hair1', 14, 14, 12.5, false);
  P.hair2 = hairSeg('ada-hair2', 13, 12.5, 10.5, false);
  P.hair3 = hairSeg('ada-hair3', 12, 10.5, 6, true);

  // Shoulder bag hanging on its strap. Pivot at the shoulder.
  P.bag = makeTex(scene, 'ada-bag', [-9, -3, 9, 42], (ctx) => {
    ctx.strokeStyle = ADA.bagDark; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-0.5, 29); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-7.4, 28, 14, 11, 3);
    ctx.fillStyle = grad(ctx, 0, 28, 0, 39, [[0, ADA.bag], [1, ADA.bagDark]]); ctx.fill();
    ctx.strokeStyle = 'rgba(120,105,80,0.55)'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7.2, 31.5); ctx.quadraticCurveTo(-0.5, 36.4, 6.4, 31.5); ctx.stroke();
    ctx.fillStyle = ADA.gold; ctx.beginPath(); ctx.arc(-0.4, 34.2, 0.95, 0, Math.PI * 2); ctx.fill();
  });

  return {
    parts: P,
    bones: { thigh: 27, shin: 26, uarm: 21.5, farm: 18.5, torso: 37, ankle: 9.5, hairAttach: [-6.2, -16.5], hair: [14, 13, 12] },
    order: ['hair3', 'hair2', 'hair1', 'uarmB', 'farmB', 'footB', 'thighB', 'shinB', 'torso', 'pelvis', 'footF', 'thighF', 'shinF', 'bag', 'head', 'uarmF', 'farmF'],
  };
}

// ---------------------------------------------------------------- Men (guard, recoverer, Fausto)

function manParts(scene, prefix, pal, opts = {}) {
  const P = {};
  for (const side of ['F', 'B']) {
    const c = (hex) => (side === 'F' ? hex : darken(hex, 0.72));
    P['thigh' + side] = makeTex(scene, `${prefix}-thigh${side}`, [-10, -9, 10, 34], (ctx) => {
      limbPath(ctx, 30, 15, 12.5, 3, 2);
      shadeLimb(ctx, 30, 14, c(pal.legLight), c(pal.leg), c(pal.legDark));
    });
    P['shin' + side] = makeTex(scene, `${prefix}-shin${side}`, [-9, -7, 9, 31], (ctx) => {
      limbPath(ctx, 27, 12.5, 11.5, 3, 1);
      shadeLimb(ctx, 27, 12, c(pal.legLight), c(pal.leg), c(pal.legDark));
    });
    P['foot' + side] = makeTex(scene, `${prefix}-foot${side}`, [-7, -4, 16, 10], (ctx) => {
      ctx.beginPath();
      ctx.moveTo(-5.5, -1.5); ctx.lineTo(4, -1.5);
      ctx.quadraticCurveTo(12.5, 0.5, 13.5, 5.6); ctx.lineTo(13.5, 8.2); ctx.lineTo(-5.8, 8.2); ctx.closePath();
      ctx.fillStyle = grad(ctx, 0, -2, 0, 8, [[0, c(pal.shoeLight)], [1, c(pal.shoe)]]); ctx.fill();
      ctx.fillStyle = c(darken(pal.shoe, 0.6)); ctx.fillRect(-5.8, 6.6, 19.3, 1.6);
    });
    P['uarm' + side] = makeTex(scene, `${prefix}-uarm${side}`, [-7, -7, 7, 28], (ctx) => {
      limbPath(ctx, 24, 10.5, 8.4, 3, 1);
      shadeLimb(ctx, 24, 10, c(pal.coatLight), c(pal.coat), c(pal.coatDark));
    });
    P['farm' + side] = makeTex(scene, `${prefix}-farm${side}`, [-6, -5, 7, 33], (ctx) => {
      limbPath(ctx, 21, 8.4, 7.2, 1, 0);
      shadeLimb(ctx, 21, 8, c(pal.coatLight), c(pal.coat), c(pal.coatDark));
      ctx.beginPath(); ctx.ellipse(0.5, 25.2, 3.4, 5, 0.1, 0, Math.PI * 2);
      ctx.fillStyle = c(pal.skin); ctx.fill();
    });
  }
  P.pelvis = makeTex(scene, `${prefix}-pelvis`, [-13, -9, 13, 12], (ctx) => {
    ctx.beginPath(); ctx.roundRect(-10.5, -7, 21, 16, 6);
    ctx.fillStyle = grad(ctx, -11, 0, 11, 0, [[0, pal.legDark], [0.6, pal.leg], [1, pal.legLight]]); ctx.fill();
    if (pal.belt) { ctx.fillStyle = pal.belt; ctx.fillRect(-10.5, -7, 21, 2.6); }
  });
  const coatLen = opts.longCoat ? 22 : 0;
  P.torso = makeTex(scene, `${prefix}-torso`, [-14, -47, 15, 4 + coatLen], (ctx) => {
    ctx.beginPath();
    ctx.moveTo(-9.8, 2 + coatLen);
    ctx.quadraticCurveTo(-12, -20, -9.5, -36);
    ctx.quadraticCurveTo(-7, -43.5, -1.5, -44);
    ctx.lineTo(4, -44);
    ctx.quadraticCurveTo(10.8, -41.5, 11.2, -33);
    ctx.quadraticCurveTo(11.6, -20, 10.2, 2 + coatLen);
    ctx.closePath();
    ctx.fillStyle = grad(ctx, -11, 0, 11, 0, [[0, pal.coatDark], [0.55, pal.coat], [0.92, pal.coatLight]]); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(6.5, -40); ctx.lineTo(6, 1 + coatLen); ctx.stroke();
    if (pal.badge) { ctx.fillStyle = pal.badge; ctx.beginPath(); ctx.roundRect(4.2, -33, 4.6, 5.6, 1); ctx.fill(); }
    if (pal.collar) {
      ctx.fillStyle = pal.collar;
      ctx.beginPath(); ctx.moveTo(-1, -44.5); ctx.lineTo(6, -44.2); ctx.lineTo(4.4, -38.5); ctx.closePath(); ctx.fill();
    }
  });
  P.head = makeTex(scene, `${prefix}-head`, [-13, -31, 14, 3], (ctx) => {
    ctx.beginPath(); ctx.moveTo(-3.4, 1); ctx.lineTo(-3, -7.5); ctx.lineTo(4, -7.5); ctx.lineTo(4.2, 1); ctx.closePath();
    ctx.fillStyle = pal.skinDark; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4.2, -6.4);
    ctx.quadraticCurveTo(-7, -17, -2, -24);
    ctx.quadraticCurveTo(5, -28, 8.8, -22);
    ctx.quadraticCurveTo(9.4, -18.5, 9, -16.4);
    ctx.lineTo(11.3, -12.2);
    ctx.quadraticCurveTo(11.2, -10.8, 9.6, -10.6);
    ctx.quadraticCurveTo(10.2, -8.6, 9.4, -6.6);
    ctx.quadraticCurveTo(8.6, -3.6, 5.4, -3.8);
    ctx.quadraticCurveTo(2, -3.6, -1, -5.6);
    ctx.closePath();
    ctx.fillStyle = grad(ctx, -5, 0, 11, 0, [[0, pal.skinDark], [0.6, pal.skin], [1, pal.skinLight || pal.skin]]); ctx.fill();
    ctx.fillStyle = '#20150f';
    ctx.beginPath(); ctx.ellipse(6.6, -15.2, 1, 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.brow || '#2a1d14'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(4.6, -17.2); ctx.lineTo(8.4, -17.2); ctx.stroke();
    if (pal.beard) { ctx.fillStyle = pal.beard; ctx.beginPath(); ctx.moveTo(1, -6); ctx.quadraticCurveTo(5, -2.5, 9.4, -6.8); ctx.quadraticCurveTo(7, -9.4, 3, -8.6); ctx.closePath(); ctx.fill(); }
    if (pal.glasses) { ctx.strokeStyle = '#cfd6dc'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(6.6, -15, 2.1, 1.6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4.5, -15.2); ctx.lineTo(-1.2, -15.8); ctx.stroke(); }
    if (pal.hair) {
      ctx.fillStyle = pal.hair;
      ctx.beginPath(); ctx.moveTo(8.8, -21.5); ctx.bezierCurveTo(6.5, -28.5, -6, -29, -7.4, -18.5); ctx.quadraticCurveTo(-7.5, -11, -4.5, -8); ctx.quadraticCurveTo(-3, -15, 1, -20); ctx.quadraticCurveTo(5, -23.5, 8.8, -21.5); ctx.closePath(); ctx.fill();
    }
    if (pal.cap) {
      ctx.fillStyle = pal.cap;
      ctx.beginPath(); ctx.moveTo(-7.2, -18.8); ctx.quadraticCurveTo(-6, -29.5, 3, -28.6); ctx.quadraticCurveTo(9.2, -27.6, 9.4, -21);
      ctx.lineTo(14.2, -20.4); ctx.quadraticCurveTo(13.6, -18.6, 9, -18.4); ctx.lineTo(-7.2, -18.8); ctx.closePath(); ctx.fill();
      if (pal.capBadge) { ctx.fillStyle = pal.capBadge; ctx.beginPath(); ctx.arc(5.2, -23.6, 1.3, 0, Math.PI * 2); ctx.fill(); }
    }
    if (pal.beanie) {
      ctx.fillStyle = pal.beanie;
      ctx.beginPath(); ctx.moveTo(-7.6, -17.5); ctx.quadraticCurveTo(-7, -31, 3, -30.2); ctx.quadraticCurveTo(10, -29, 9.4, -19.8); ctx.lineTo(-7.6, -17.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = darken(pal.beanie, 0.75); ctx.fillRect(-7.8, -20.6, 17.4, 3);
    }
  });
  const res = {
    parts: P,
    bones: { thigh: 30, shin: 27, uarm: 24, farm: 21, torso: 41, ankle: 7, hairAttach: null, hair: [] },
    order: ['uarmB', 'farmB', 'thighB', 'shinB', 'footB', 'torso', 'pelvis', 'thighF', 'shinF', 'footF', 'head', 'uarmF', 'farmF'],
  };
  if (opts.lantern) {
    P.lantern = makeTex(scene, `${prefix}-lantern`, [-7, -3, 7, 22], (ctx) => {
      ctx.strokeStyle = '#2b2620'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 4.6, 2, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#3a2f22'; ctx.fillRect(-4.6, 6, 9.2, 2);
      ctx.fillStyle = grad(ctx, 0, 8, 0, 17, [[0, '#ffe7b0'], [1, '#ffb14e']]);
      ctx.fillRect(-3.8, 8, 7.6, 9);
      ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = 0.8; ctx.strokeRect(-3.8, 8, 7.6, 9);
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 17); ctx.stroke();
      ctx.fillStyle = '#3a2f22'; ctx.fillRect(-4.6, 17, 9.2, 2.2);
    });
    res.order.push('lantern');
  }
  if (opts.baton) {
    P.baton = makeTex(scene, `${prefix}-baton`, [-2, -3, 3, 26], (ctx) => {
      ctx.fillStyle = '#1b1b1f'; ctx.beginPath(); ctx.roundRect(-1.3, -1, 2.6, 25, 1.2); ctx.fill();
    });
  }
  return res;
}

export function paintCharacters(scene) {
  return {
    ada: adaParts(scene),
    guard: manParts(scene, 'guard', {
      skin: '#c99272', skinDark: '#a2704f', skinLight: '#dca886',
      coat: '#26334a', coatLight: '#36486a', coatDark: '#172033',
      leg: '#222a37', legLight: '#2f3a4c', legDark: '#151a24',
      shoe: '#1c1a19', shoeLight: '#35302b', belt: '#141414',
      cap: '#1a2335', capBadge: '#d8b25c', badge: '#d8b25c', brow: '#2a1d14', beard: 'rgba(60,40,30,0.55)',
    }, { lantern: true }),
    recoverer: manParts(scene, 'recov', {
      skin: '#d0a07e', skinDark: '#a57653', skinLight: '#e0b493',
      coat: '#59606a', coatLight: '#717986', coatDark: '#3f454d',
      leg: '#2a3038', legLight: '#3a424c', legDark: '#1b2026',
      shoe: '#d9d9d6', shoeLight: '#f2f2ef', belt: '#1a1a1a',
      beanie: '#2c2c2e', collar: '#2d3238', brow: '#3a2a1f',
    }),
    fausto: manParts(scene, 'fausto', {
      skin: '#e0b192', skinDark: '#b98a6c', skinLight: '#efc5a8',
      coat: '#b9a582', coatLight: '#d2c09c', coatDark: '#8f7d5d',
      leg: '#4a4440', legLight: '#5d5650', legDark: '#35302c',
      shoe: '#3a2a20', shoeLight: '#57412f',
      hair: '#e9e4dc', glasses: true, brow: '#cfc8bd',
    }, { longCoat: true }),
  };
}
