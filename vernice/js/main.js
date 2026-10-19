// Starts the game: fonts, input, sound, the HTML interface and the Phaser scene.
import { Input } from './input.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { bindTouch } from './touch.js';
import { WorldScene } from './scene.js';

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

async function boot() {
  ui.loading('Carico i caratteri…');
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
  ui.loading('Dipingo il convento…');
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    backgroundColor: '#07060c',
    scale: { mode: Phaser.Scale.EXPAND, width: 1280, height: 720, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    render: { antialias: true, powerPreference: 'high-performance' },
    banner: false,
    fps: { target: 60, smoothStep: true },
  });
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
