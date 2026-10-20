// Small painted illustrations shown on the examine cards.
import { t, tv } from '../i18n.js';

const TAU = Math.PI * 2;

function bg(ctx, w, h, a, b) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.5, w * 0.62);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

function grain(ctx, w, h, amt = 0.06) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function desk(ctx, w, h) {
  bg(ctx, w, h, '#3a2b22', '#120c0b');
  // desk top in perspective
  ctx.fillStyle = '#5b3f2a';
  ctx.beginPath(); ctx.moveTo(40, 250); ctx.lineTo(110, 95); ctx.lineTo(410, 95); ctx.lineTo(480, 250); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, 95, 0, 250); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(255,220,170,0.08)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(30,18,10,0.5)'; ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(60 + i * 30, 250); ctx.lineTo(118 + i * 21, 95); ctx.stroke(); }
  // dust everywhere, except where things used to be
  ctx.fillStyle = 'rgba(210,200,180,0.16)';
  ctx.beginPath(); ctx.moveTo(40, 250); ctx.lineTo(110, 95); ctx.lineTo(410, 95); ctx.lineTo(480, 250); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  const quad = (x, y, ww, hh, sk) => { ctx.beginPath(); ctx.moveTo(x, y + hh); ctx.lineTo(x + sk, y); ctx.lineTo(x + sk + ww, y); ctx.lineTo(x + ww, y + hh); ctx.closePath(); ctx.fill(); };
  quad(150, 140, 110, 70, 14); quad(285, 150, 80, 56, 10); quad(375, 120, 50, 40, 8);
  ctx.globalCompositeOperation = 'source-over';
  // the outlines left in the dust
  ctx.strokeStyle = 'rgba(240,225,200,0.35)'; ctx.lineWidth = 1.5;
  const qs = (x, y, ww, hh, sk) => { ctx.beginPath(); ctx.moveTo(x, y + hh); ctx.lineTo(x + sk, y); ctx.lineTo(x + sk + ww, y); ctx.lineTo(x + ww, y + hh); ctx.closePath(); ctx.stroke(); };
  qs(150, 140, 110, 70, 14); qs(285, 150, 80, 56, 10); qs(375, 120, 50, 40, 8);
  // a lonely pencil and an open empty drawer
  ctx.save(); ctx.translate(120, 200); ctx.rotate(-0.25);
  ctx.fillStyle = '#d9a43b'; ctx.fillRect(0, 0, 70, 6); ctx.fillStyle = '#f0d9b0'; ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(80, 3); ctx.lineTo(70, 6); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#3d2a1c'; ctx.fillRect(170, 250, 180, 34);
  ctx.fillStyle = '#1a110b'; ctx.fillRect(178, 254, 164, 26);
  ctx.fillStyle = '#b08850'; ctx.fillRect(250, 262, 20, 4);
  // lamp light
  const l = ctx.createRadialGradient(420, 60, 5, 420, 60, 260); l.addColorStop(0, 'rgba(255,210,150,0.35)'); l.addColorStop(1, 'rgba(255,210,150,0)');
  ctx.fillStyle = l; ctx.fillRect(0, 0, w, h);
}

// Painted pictures (loaded by the game) used instead of the drawn ones when available.
const PICS = {};
export function setIllustrationImages(map) { Object.assign(PICS, map); }

function jar(ctx, w, h) {
  bg(ctx, w, h, '#2c1f45', '#0b0814');
  if (PICS.jar) return paintedJar(ctx, w, h);
  // UV glow
  const uv = ctx.createRadialGradient(200, 120, 10, 200, 140, 230); uv.addColorStop(0, 'rgba(160,110,255,0.5)'); uv.addColorStop(1, 'rgba(160,110,255,0)');
  ctx.fillStyle = uv; ctx.fillRect(0, 0, w, h);
  // jar
  ctx.save(); ctx.translate(200, 155);
  ctx.fillStyle = '#2a1d10'; ctx.beginPath(); ctx.roundRect(-52, -112, 104, 24, 6); ctx.fill();
  const g = ctx.createLinearGradient(-70, 0, 70, 0);
  g.addColorStop(0, 'rgba(120,200,120,0.55)'); g.addColorStop(0.45, 'rgba(200,255,190,0.75)'); g.addColorStop(1, 'rgba(110,190,120,0.5)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-66, -92, 132, 186, 18); ctx.fill();
  // resin crystals glowing pale green under UV (dammar fluoresces)
  for (let i = 0; i < 46; i++) {
    const x = -54 + Math.random() * 108, y = -20 + Math.random() * 104, r = 4 + Math.random() * 9;
    ctx.fillStyle = `rgba(${190 + Math.random() * 50},255,${170 + Math.random() * 60},${0.35 + Math.random() * 0.4})`;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 0.8); ctx.lineTo(x - r * 0.9, y); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#efe4c8'; ctx.fillRect(-50, -60, 100, 40);
  ctx.fillStyle = '#4a3a1a'; ctx.font = '700 17px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DAMMAR', 0, -34);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-56, -84, 8, 168);
  // fingerprint on the lid
  ctx.strokeStyle = 'rgba(220,255,210,0.85)'; ctx.lineWidth = 1.2;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(18, -100, 4 + k * 2.6, 2 + k * 1.4, 0.2, 0, TAU); ctx.stroke(); }
  ctx.restore();
  // the memory card in its little bag
  ctx.save(); ctx.translate(390, 170); ctx.rotate(-0.18);
  ctx.fillStyle = 'rgba(230,240,255,0.18)'; ctx.strokeStyle = 'rgba(230,240,255,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-58, -66, 116, 132, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(230,240,255,0.5)'; ctx.fillRect(-58, -56, 116, 4);
  ctx.fillStyle = '#1b1c22'; ctx.beginPath(); ctx.moveTo(-26, -40); ctx.lineTo(18, -40); ctx.lineTo(26, -32); ctx.lineTo(26, 40); ctx.lineTo(-26, 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9a54a'; for (let i = 0; i < 8; i++) ctx.fillRect(-22 + i * 5.6, -36, 3, 12);
  ctx.fillStyle = '#e6e6ea'; ctx.font = '700 11px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('microSD', 0, 12);
  ctx.fillStyle = '#9aa0ad'; ctx.font = '600 9px Manrope, sans-serif'; ctx.fillText('64 GB', 0, 28);
  ctx.restore();
}

function paintedJar(ctx, w, h) {
  const uv = ctx.createRadialGradient(190, 120, 10, 190, 140, 240); uv.addColorStop(0, 'rgba(160,110,255,0.55)'); uv.addColorStop(1, 'rgba(160,110,255,0)');
  ctx.fillStyle = uv; ctx.fillRect(0, 0, w, h);
  const im = PICS.jar, hh = 236, ww = hh * im.width / im.height;
  const x = 190 - ww / 2, y = 150 - hh / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(150,100,255,0.6)'; ctx.shadowBlur = 24;
  ctx.drawImage(im, x, y, ww, hh);
  ctx.restore();
  // under UV light dammar resin glows a pale green
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(178, 200, 4, 178, 200, 70); gl.addColorStop(0, 'rgba(150,255,140,0.42)'); gl.addColorStop(1, 'rgba(150,255,140,0)');
  ctx.fillStyle = gl; ctx.fillRect(100, 120, 160, 160);
  ctx.restore();
  // a fresh fingerprint on the lid
  ctx.strokeStyle = 'rgba(220,255,210,0.8)'; ctx.lineWidth = 1.1;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(210, 47, 3 + k * 2.4, 1.6 + k * 1.1, 0.2, 0, TAU); ctx.stroke(); }
  // the memory card in its little bag
  ctx.save(); ctx.translate(395, 170); ctx.rotate(-0.18);
  ctx.fillStyle = 'rgba(230,240,255,0.18)'; ctx.strokeStyle = 'rgba(230,240,255,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-58, -66, 116, 132, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(240,230,190,0.35)'; ctx.beginPath(); ctx.roundRect(-46, -50, 92, 104, 10); ctx.fill();
  ctx.fillStyle = '#1b1c22'; ctx.beginPath(); ctx.moveTo(-26, -40); ctx.lineTo(18, -40); ctx.lineTo(26, -32); ctx.lineTo(26, 40); ctx.lineTo(-26, 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9a54a'; for (let i = 0; i < 8; i++) ctx.fillRect(-22 + i * 5.6, -36, 3, 12);
  ctx.fillStyle = '#e6e6ea'; ctx.font = '700 11px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('microSD', 0, 12);
  ctx.fillStyle = '#9aa0ad'; ctx.font = '600 9px Manrope, sans-serif'; ctx.fillText('64 GB', 0, 28);
  ctx.restore();
}

function card(ctx, w, h) {
  bg(ctx, w, h, '#1f2430', '#08090d');
  // a phone screen with infrared reflectograms: on the left the drawing under the paint, on the right nothing
  ctx.fillStyle = '#0d0f14'; ctx.beginPath(); ctx.roundRect(70, 30, 380, 240, 22); ctx.fill();
  ctx.strokeStyle = '#3a3f4c'; ctx.lineWidth = 3; ctx.stroke();
  const panel = (x, y, ww, hh, withDrawing, label) => {
    const g = ctx.createLinearGradient(x, y, x + ww, y + hh); g.addColorStop(0, '#c8c3b8'); g.addColorStop(1, '#8e897f');
    ctx.fillStyle = g; ctx.fillRect(x, y, ww, hh);
    ctx.strokeStyle = 'rgba(30,30,30,0.75)'; ctx.lineWidth = 1.3;
    if (withDrawing) {
      // underdrawing: a veiled face sketched with searching lines
      for (let k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.ellipse(x + ww / 2 + k, y + hh * 0.42, ww * 0.18, hh * 0.24, 0, 0, TAU); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x + ww * 0.25, y + hh * 0.3); ctx.quadraticCurveTo(x + ww / 2, y + hh * 0.05, x + ww * 0.75, y + hh * 0.3); ctx.lineTo(x + ww * 0.85, y + hh * 0.95); ctx.moveTo(x + ww * 0.25, y + hh * 0.3); ctx.lineTo(x + ww * 0.15, y + hh * 0.95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + ww * 0.42, y + hh * 0.4); ctx.lineTo(x + ww * 0.46, y + hh * 0.4); ctx.moveTo(x + ww * 0.54, y + hh * 0.4); ctx.lineTo(x + ww * 0.58, y + hh * 0.4); ctx.moveTo(x + ww * 0.45, y + hh * 0.55); ctx.quadraticCurveTo(x + ww / 2, y + hh * 0.6, x + ww * 0.55, y + hh * 0.55); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '600 11px Manrope, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, x, y + hh + 16);
  };
  panel(100, 52, 150, 168, true, t('art.r1998'));
  panel(272, 52, 150, 168, false, t('art.rToday'));
  ctx.fillStyle = '#ec9fa8'; ctx.font = '700 13px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t('art.works'), 260, 262);
}

// Pictures loaded as plain images (they are only used on the cards).
const IMGS = {};
export function loadIllustrationImages(map) {
  for (const [k, src] of Object.entries(map)) {
    if (IMGS[k]) continue;
    const im = new Image();
    im.decoding = 'async';
    im.src = src;
    IMGS[k] = im;
  }
}
const ready = (k) => { const im = IMGS[k]; return im && im.complete && im.naturalWidth > 0 ? im : null; };
const NEEDS = { panel: 'panel', panelUV: 'panelUV', photo: 'pala1998', pala: 'palaOggi' };

function paper(ctx, x, y, w, h, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, '#f1e7cf'); g.addColorStop(1, '#ddcca8');
  ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function fitFont(ctx, lines, maxW, size, face) {
  let s = size;
  for (; s > 9; s -= 0.5) {
    ctx.font = `italic 500 ${s}px ${face}`;
    if (lines.every((l) => ctx.measureText(l).width <= maxW)) break;
  }
  return s;
}

// Lale's note with the riddle, taped under the drawer.
function note(ctx, w, h) {
  bg(ctx, w, h, '#3a2b22', '#120c0b');
  ctx.save();
  ctx.translate(w / 2, h / 2 + 4); ctx.rotate(-0.035);
  paper(ctx, 0, 0, 450, 246, 0);
  ctx.fillStyle = 'rgba(230,215,160,0.55)';
  ctx.save(); ctx.translate(-200, -118); ctx.rotate(-0.5); ctx.fillRect(-28, -9, 56, 18); ctx.restore();
  ctx.save(); ctx.translate(200, -118); ctx.rotate(0.45); ctx.fillRect(-28, -9, 56, 18); ctx.restore();
  ctx.fillStyle = '#2c241c'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const face = '"Cormorant Garamond", Georgia, serif';
  ctx.font = `italic 600 19px ${face}`;
  ctx.fillText(t('art.forAda'), -196, -84);
  const lines = tv('riddle.lines');
  const s = fitFont(ctx, lines, 392, 18, face);
  lines.forEach((l, i) => ctx.fillText(l, -196, -46 + i * (s * 1.75)));
  ctx.font = `italic 600 20px ${face}`;
  ctx.textAlign = 'right'; ctx.fillText('— L.', 196, 104);
  ctx.restore();
  const l = ctx.createRadialGradient(420, 40, 5, 420, 40, 300); l.addColorStop(0, 'rgba(255,210,150,0.22)'); l.addColorStop(1, 'rgba(255,210,150,0)');
  ctx.fillStyle = l; ctx.fillRect(0, 0, w, h);
}

function panelArt(ctx, w, h, uv) {
  bg(ctx, w, h, uv ? '#2a1748' : '#33261d', uv ? '#09050f' : '#100b09');
  const im = ready(uv ? 'panelUV' : 'panel');
  if (!im) return;
  const hh = 280, ww = hh * im.width / im.height;
  ctx.save();
  ctx.shadowColor = uv ? 'rgba(140,90,255,0.55)' : 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
  ctx.drawImage(im, w / 2 - ww / 2, h / 2 - hh / 2, ww, hh);
  ctx.restore();
  if (uv) {
    const g = ctx.createRadialGradient(w / 2, 20, 10, w / 2, 40, 320); g.addColorStop(0, 'rgba(170,120,255,0.25)'); g.addColorStop(1, 'rgba(170,120,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
}

// The 1998 photograph of the altarpiece, found in the trunk, with a torn scrap beside it.
function photo(ctx, w, h) {
  bg(ctx, w, h, '#2b2420', '#0c0a09');
  const im = ready('pala1998');
  ctx.save();
  ctx.translate(222, 150); ctx.rotate(-0.05);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#f3efe6'; ctx.fillRect(-150, -114, 300, 236);
  ctx.shadowColor = 'transparent';
  if (im) ctx.drawImage(im, -140, -104, 280, 280 * im.height / im.width);
  ctx.restore();
  // the scrap of paper
  ctx.save();
  ctx.translate(430, 196); ctx.rotate(0.12);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ebdfc4';
  ctx.beginPath(); ctx.moveTo(-50, -34); ctx.lineTo(44, -40); ctx.lineTo(52, -6); ctx.lineTo(46, 30); ctx.lineTo(8, 36); ctx.lineTo(-44, 32); ctx.lineTo(-52, 2); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(44,36,28,0.75)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-38, -20 + i * 14); ctx.bezierCurveTo(-10, -24 + i * 14, 10, -16 + i * 14, 34 - (i % 2) * 14, -20 + i * 14); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(246,236,228,0.55)'; ctx.font = 'italic 600 15px "Cormorant Garamond", serif'; ctx.textAlign = 'left';
  ctx.fillText(t('art.photoBack'), 382, 92);
}

// The restored altarpiece under the lifted sheet.
function pala(ctx, w, h) {
  bg(ctx, w, h, '#1d2230', '#07080c');
  const im = ready('palaOggi');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#4a3418'; ctx.fillRect(84, 34, 352, 262);
  ctx.restore();
  if (im) ctx.drawImage(im, 96, 46, 328, 328 * im.height / im.width);
  // the sheet, pulled up to one side
  const g = ctx.createLinearGradient(240, 0, 520, 160);
  g.addColorStop(0, 'rgba(214,220,232,0.97)'); g.addColorStop(0.6, 'rgba(176,184,204,0.97)'); g.addColorStop(1, 'rgba(120,128,150,0.97)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(520, 0); ctx.lineTo(520, 300); ctx.lineTo(470, 300);
  ctx.bezierCurveTo(440, 220, 470, 150, 380, 110); ctx.bezierCurveTo(300, 76, 260, 40, 150, 30); ctx.bezierCurveTo(110, 26, 90, 14, 70, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(90,96,120,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(200 + i * 60, 8); ctx.bezierCurveTo(260 + i * 50, 60, 300 + i * 40, 120, 440 + i * 14, 200 + i * 18); ctx.stroke(); }
  const l = ctx.createRadialGradient(w * 0.3, 10, 5, w * 0.3, 10, 340); l.addColorStop(0, 'rgba(160,180,255,0.16)'); l.addColorStop(1, 'rgba(160,180,255,0)');
  ctx.fillStyle = l; ctx.fillRect(0, 0, w, h);
}

function sketch(ctx, w, h) {
  bg(ctx, w, h, '#2a2620', '#0d0b09');
  if (PICS.sketch) {
    const im = PICS.sketch, hh = 268, ww = hh * im.width / im.height;
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.04);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.drawImage(im, -ww / 2, -hh / 2, ww, hh);
    ctx.restore();
    const l = ctx.createRadialGradient(w * 0.3, 20, 5, w * 0.3, 20, 320); l.addColorStop(0, 'rgba(160,180,255,0.16)'); l.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = l; ctx.fillRect(0, 0, w, h);
    return;
  }
  ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.05);
  ctx.fillStyle = '#efe6d4'; ctx.fillRect(-190, -120, 380, 240);
  ctx.fillStyle = 'rgba(120,100,70,0.12)'; for (let i = 0; i < 20; i++) ctx.fillRect(-190, -120 + i * 12, 380, 1);
  ctx.strokeStyle = '#3c3428'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  // cliff and sea
  ctx.beginPath(); ctx.moveTo(-170, 70); ctx.lineTo(-60, 70); ctx.quadraticCurveTo(-20, 40, 10, 30); ctx.lineTo(80, 28); ctx.quadraticCurveTo(110, 40, 120, 70); ctx.lineTo(170, 70); ctx.stroke();
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-170 + i * 12, 82 + i * 6); ctx.quadraticCurveTo(-120 + i * 30, 76 + i * 6, -60 + i * 40, 84 + i * 6); ctx.stroke(); }
  // lighthouse
  ctx.beginPath(); ctx.moveTo(28, 28); ctx.lineTo(36, -60); ctx.lineTo(58, -60); ctx.lineTo(66, 28); ctx.stroke();
  ctx.strokeRect(34, -78, 26, 18); ctx.beginPath(); ctx.moveTo(30, -78); ctx.lineTo(47, -94); ctx.lineTo(64, -78); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(32, -30); ctx.lineTo(62, -30); ctx.moveTo(30, 0); ctx.lineTo(64, 0); ctx.stroke();
  // light rays
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(60, -70); ctx.lineTo(170, -100); ctx.moveTo(34, -70); ctx.lineTo(-90, -104); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = 'italic 600 26px "Cormorant Garamond", serif'; ctx.fillStyle = '#3c3428'; ctx.fillText('PA', 120, -30);
  ctx.font = 'italic 500 18px "Cormorant Garamond", serif'; ctx.fillText('— L.', 120, 104);
  ctx.restore();
}

const PAINTERS = {
  desk, jar, card, sketch, note, photo, pala,
  panel: (ctx, w, h) => panelArt(ctx, w, h, false),
  panelUV: (ctx, w, h) => panelArt(ctx, w, h, true),
};

export function paintIllustration(canvas, kind) {
  canvas.dataset.art = kind;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  const sx = w / 520, sy = h / 300;
  ctx.scale(sx, sy);
  (PAINTERS[kind] || desk)(ctx, 520, 300);
  ctx.restore();
  grain(ctx, w, h, 0.05);
  // a picture still on its way: paint again when it arrives
  const need = NEEDS[kind] && IMGS[NEEDS[kind]];
  if (need && !ready(NEEDS[kind])) need.addEventListener('load', () => { if (canvas.dataset.art === kind) paintIllustration(canvas, kind); }, { once: true });
}
