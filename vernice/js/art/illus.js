// Small painted illustrations shown on the examine cards.
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

function jar(ctx, w, h) {
  bg(ctx, w, h, '#2c1f45', '#0b0814');
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
  panel(100, 52, 150, 168, true, '1998 · riflettografia');
  panel(272, 52, 150, 168, false, 'oggi · riflettografia');
  ctx.fillStyle = '#ec9fa8'; ctx.font = '700 13px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('7 opere · «laboratorio esterno PA»', 260, 262);
}

function sketch(ctx, w, h) {
  bg(ctx, w, h, '#2a2620', '#0d0b09');
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

const PAINTERS = { desk, jar, card, sketch };

export function paintIllustration(canvas, kind) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  const sx = w / 520, sy = h / 300;
  ctx.scale(sx, sy);
  (PAINTERS[kind] || desk)(ctx, 520, 300);
  ctx.restore();
  grain(ctx, w, h, 0.05);
}
