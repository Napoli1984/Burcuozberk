// One place that turns keyboard, touch buttons and gamepads into game actions.
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space'],
  punch: ['KeyJ'],
  kick: ['KeyK'],
  dodge: ['KeyL'],
  action: ['KeyE', 'Enter'],
  observe: ['KeyQ'],
  walk: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'Tab', 'KeyP'],
  dossier: ['KeyF'],
};
const BUTTONS = ['left', 'right', 'up', 'down', 'jump', 'punch', 'kick', 'dodge', 'action', 'observe', 'walk', 'pause', 'dossier'];
const PREVENT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab']);

export class Input {
  constructor() {
    this.keys = new Set();
    this.cur = {};
    this.prev = {};
    this.axisX = 0;
    this.axisY = 0;
    this.analogX = false;     // true when the horizontal axis comes from a stick (walk speed depends on how far it is pushed)
    this.virtual = { axisX: 0, axisY: 0, buttons: {} };
    this.lastDevice = 'keyboard';
    this.enabled = true;
    this.anyKey = false;
    for (const b of BUTTONS) { this.cur[b] = false; this.prev[b] = false; }
    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
      this.anyKey = true;
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.virtual.buttons = {}; this.virtual.axisX = 0; this.virtual.axisY = 0; });
  }

  keyDown(action) {
    const codes = KEYMAP[action];
    for (let i = 0; i < codes.length; i++) if (this.keys.has(codes[i])) return true;
    return false;
  }

  update() {
    for (const b of BUTTONS) this.prev[b] = this.cur[b];
    let ax = 0, ay = 0, analog = false;
    const kx = (this.keyDown('right') ? 1 : 0) - (this.keyDown('left') ? 1 : 0);
    const ky = (this.keyDown('down') ? 1 : 0) - (this.keyDown('up') ? 1 : 0);
    ax = kx; ay = ky;
    const v = this.virtual;
    if (Math.abs(v.axisX) > 0.12 || Math.abs(v.axisY) > 0.12) { ax = v.axisX; ay = v.axisY; analog = true; }
    const pad = this.readPad();
    if (pad) {
      if (Math.abs(pad.x) > 0.2 || Math.abs(pad.y) > 0.2) { ax = pad.x; ay = pad.y; analog = !pad.dpad; this.lastDevice = 'pad'; }
    }
    this.axisX = ax; this.axisY = ay; this.analogX = analog;
    for (const b of BUTTONS) {
      let d = this.keyDown(b) || !!v.buttons[b] || !!(pad && pad.buttons[b]);
      this.cur[b] = d;
    }
    this.cur.left = ax < -0.35; this.cur.right = ax > 0.35;
    this.cur.up = ay < -0.5; this.cur.down = ay > 0.5;
    if (!this.enabled) for (const b of BUTTONS) if (b !== 'pause' && b !== 'dossier') this.cur[b] = false;
  }

  readPad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    const p = pads && (pads[0] || pads[1]);
    if (!p || !p.connected) return null;
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    let x = p.axes[0] || 0, y = p.axes[1] || 0, dpad = false;
    if (b(14)) { x = -1; dpad = true; } else if (b(15)) { x = 1; dpad = true; }
    if (b(12)) { y = -1; dpad = true; } else if (b(13)) { y = 1; dpad = true; }
    const buttons = { jump: b(0), dodge: b(1), punch: b(2), kick: b(3), observe: b(4), action: b(5), pause: b(9), dossier: b(8) };
    if (Object.values(buttons).some(Boolean) || dpad) { this.lastDevice = 'pad'; this.anyKey = true; }
    return { x, y, dpad, buttons };
  }

  down(a) { return this.cur[a]; }
  pressed(a) { return this.cur[a] && !this.prev[a]; }
  released(a) { return !this.cur[a] && this.prev[a]; }
  // Let a press be seen only once (for example when a dialogue closes with the same key).
  consume(a) { this.prev[a] = this.cur[a]; }
  clear() { for (const b of BUTTONS) { this.prev[b] = this.cur[b] = false; } this.keys.clear(); this.virtual.buttons = {}; }
}
