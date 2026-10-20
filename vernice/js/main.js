// Starts the game: fonts, input, sound, the HTML interface and the Phaser scene.
import { Input } from './input.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { bindTouch } from './touch.js';
import { WorldScene } from './scene.js';
import { t } from './i18n.js';

// Older Safari versions miss roundRect, used by the painted art.
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rr = Math.min(typeof r === 'number' ? r : Array.isArray(r) ? r[0] || 0 : 0, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + rr, y);
    this.arcTo(x + w, y, x + w, y + h, rr);
    this.arcTo(x + w, y + h, x, y + h, rr);
    this.arcTo(x, y + h, x, y, rr);
    this.arcTo(x, y, x + w, y, rr);
    this.closePath();
    return this;
  };
}

const inp = new Input();
const snd = new Sound();
const ui = new UI(document.getElementById('ui'), inp, snd);
bindTouch(ui, inp);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Renderer settings. One texture per draw batch: with several, some graphics drivers draw pieces of
// the painted characters from the wrong picture. The scene has few textures, so this costs little.
// ?mt=N and ?mip=0 in the address are only for testing.
function renderConfig() {
  const q = new URLSearchParams(location.search);
  const r = { antialias: true, powerPreference: 'high-performance', maxTextures: 1 };
  if (q.get('mip') !== '0') r.mipmapFilter = 'LINEAR_MIPMAP_LINEAR';
  if (q.get('mt')) r.maxTextures = parseInt(q.get('mt'), 10);
  return r;
}

async function boot() {
  ui.loading(t('boot.fonts'));
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('italic 600 32px "Cormorant Garamond"'),
        document.fonts.load('600 16px Manrope'),
        document.fonts.load('700 16px Manrope'),
      ]),
      wait(2500),
    ]);
  } catch (e) { /* the game still works with fallback fonts */ }
  ui.loading(t('boot.doors'));
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));

  // The canvas draws at the screen's real resolution (up to 2x, and never more than ~2.6 million
  // pixels, for small graphics cards); the camera then shows the same slice of the world everywhere.
  const host = document.getElementById('game');
  const measure = () => {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    let d = Math.min(window.devicePixelRatio || 1, 2);
    const cap = 2.6e6;
    if (w * h * d * d > cap) d = Math.max(0.6, Math.sqrt(cap / (w * h)));
    return { w, h, d };
  };
  const m0 = measure();
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    backgroundColor: '#07060c',
    scale: { mode: Phaser.Scale.NONE, width: Math.round(m0.w * m0.d), height: Math.round(m0.h * m0.d), zoom: 1 / m0.d },
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    render: renderConfig(),
    banner: false,
    fps: { target: 60, smoothStep: true },
  });
  let fitT = 0;
  const fit = () => {
    const m = measure();
    game.scale.setZoom(1 / m.d);
    game.scale.resize(Math.round(m.w * m.d), Math.round(m.h * m.d));
  };
  addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fit, 60); });
  addEventListener('orientationchange', () => setTimeout(fit, 250));
  game.registry.set('ui', ui);
  game.registry.set('inp', inp);
  game.registry.set('snd', snd);
  game.scene.add('world', WorldScene, true, { mode: 'title' });
  window.__game = game;

  const world = () => game.scene.getScene('world');
  ui.on('play', (cont) => {
    snd.unlock();
    const s = world();
    const save = cont ? s.loadSave() : null;
    if (!cont) s.clearSave();
    ui.hideTitle();
    s.scene.restart({ mode: 'play', save });
  });
  ui.on('again', () => { snd.unlock(); world().scene.restart({ mode: 'play', skipIntro: true }); });
  ui.on('title', () => world().scene.restart({ mode: 'title' }));
  ui.on('checkpoint', () => world().restartCheckpoint());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    const s = world();
    if (s && s.mode === 'play' && !ui.modal) ui.openPause();
  });
  // any first tap or key can wake the sound up (browsers need a gesture)
  const wake = () => { if (snd.ctx) snd.unlock(); };
  addEventListener('pointerdown', wake);
  addEventListener('keydown', wake);
}

boot();
