// Small painted objects: interactive props, light glows, alert icons, debris.
const TAU = Math.PI * 2;

function tex(scene, key, w, h, draw, scale = 2) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
  return c;
}

export function paintProps(scene) {
  tex(scene, 'jar', 16, 22, (ctx) => {
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(3, 0, 10, 4);
    const g = ctx.createLinearGradient(1, 0, 15, 0); g.addColorStop(0, 'rgba(150,110,50,0.95)'); g.addColorStop(0.5, 'rgba(230,180,90,0.95)'); g.addColorStop(1, 'rgba(140,100,45,0.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(1, 4, 14, 18, 3); ctx.fill();
    ctx.fillStyle = '#efe4c8'; ctx.fillRect(3, 9, 10, 6);
    ctx.fillStyle = '#5a4520'; ctx.font = '600 3.6px sans-serif'; ctx.fillText('DAMMAR', 3.3, 13.3);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(3, 5, 1.6, 15);
  });
  tex(scene, 'can', 14, 16, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 14, 0); g.addColorStop(0, '#4f5560'); g.addColorStop(0.5, '#a7adb8'); g.addColorStop(1, '#4a505a');
    ctx.fillStyle = g; ctx.fillRect(1, 3, 12, 13);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(1, 7, 12, 5);
    ctx.fillStyle = '#2a2d33'; ctx.beginPath(); ctx.ellipse(7, 3, 6, 1.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(7, 4, 5, Math.PI, 0); ctx.stroke();
  });
  tex(scene, 'cart', 64, 50, (ctx) => {
    ctx.fillStyle = '#2b2d33';
    ctx.fillRect(4, 8, 4, 34); ctx.fillRect(56, 8, 4, 34);
    ctx.fillStyle = '#5e4630'; ctx.fillRect(2, 8, 60, 5); ctx.fillRect(2, 28, 60, 5);
    ctx.fillStyle = '#b8b0a0'; ctx.fillRect(8, 2, 14, 6); ctx.fillStyle = '#7b8fa8'; ctx.fillRect(26, 0, 10, 8); ctx.fillStyle = '#c0392b'; ctx.fillRect(40, 3, 9, 5);
    ctx.fillStyle = '#d8ccb0'; ctx.fillRect(10, 22, 30, 6);
    ctx.fillStyle = '#16171b'; for (const x of [10, 54]) { ctx.beginPath(); ctx.arc(x, 45, 5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#6a6e78'; for (const x of [10, 54]) { ctx.beginPath(); ctx.arc(x, 45, 1.6, 0, TAU); ctx.fill(); }
  });
  tex(scene, 'sketch', 20, 14, (ctx) => {
    ctx.save(); ctx.translate(10, 7); ctx.rotate(-0.08);
    ctx.fillStyle = '#efe6d4'; ctx.fillRect(-9, -6, 18, 12);
    ctx.strokeStyle = '#3c3428'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(7, 3); ctx.moveTo(2, 3); ctx.lineTo(2, -4); ctx.lineTo(3.5, -4); ctx.lineTo(3.5, 3);
    ctx.moveTo(-6, 4.5); ctx.arc(-6, 4.5, 1.2, 0, TAU); ctx.moveTo(-3, 4.5); ctx.arc(-3, 4.5, 1, 0, TAU); ctx.stroke();
    ctx.restore();
  });
  tex(scene, 'glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.25, 'rgba(255,255,255,0.42)'); g.addColorStop(0.6, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  }, 1);
  const bubble = (key, sym, color) => tex(scene, key, 26, 30, (ctx) => {
    ctx.fillStyle = 'rgba(12,10,16,0.85)'; ctx.beginPath(); ctx.arc(13, 13, 11.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, 22); ctx.lineTo(13, 29); ctx.lineTo(17, 22); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(13, 13, 11.5, 0, TAU); ctx.stroke();
    ctx.fillStyle = color; ctx.font = '700 16px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(sym, 13, 19);
  });
  bubble('icon-q', '?', '#f0c14b');
  bubble('icon-ex', '!', '#ff5a4f');
  tex(scene, 'stone', 8, 8, (ctx) => { ctx.fillStyle = '#4a4650'; ctx.beginPath(); ctx.moveTo(1, 2); ctx.lineTo(6, 0); ctx.lineTo(8, 5); ctx.lineTo(3, 8); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(2, 2, 3, 1.5); });
  tex(scene, 'dust', 16, 16, (ctx) => { const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, 'rgba(200,190,180,0.5)'); g.addColorStop(1, 'rgba(200,190,180,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16); });
  tex(scene, 'spark', 8, 8, (ctx) => { const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 8); });
  tex(scene, 'vignette', 256, 144, (ctx) => {
    const g = ctx.createRadialGradient(128, 72, 40, 128, 72, 160);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(4,3,10,0.18)'); g.addColorStop(1, 'rgba(4,3,10,0.72)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 144);
  }, 1);
}
