// Small generated textures: light glows, alert icons, debris. (The props are painted: img/props.)
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
