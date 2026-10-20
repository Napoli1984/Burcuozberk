// The four puzzle panels, drawn with HTML over the paused game:
// the resin shelf (Lale's riddle), the trunk's padlock, the photo and the altarpiece (differences)
// and the torn letter. Each one is opened by the scene with callbacks; the scene keeps the state.
import { t, tv } from './i18n.js';

const X = '×';

// Positions on the pictures, as fractions of their size (see the puzzle build script).
const JARS = {
  cols: [[0.0421, 0.1289], [0.1579, 0.3342], [0.3632, 0.4895], [0.5184, 0.6211], [0.6526, 0.7763], [0.8026, 0.9553]],
  labels: [[0.0621, 0.428, 0.1105, 0.7196], [0.1789, 0.5769, 0.3105, 0.763], [0.3747, 0.5211, 0.4763, 0.7072], [0.5326, 0.6328, 0.6089, 0.7506], [0.6753, 0.5645, 0.7516, 0.7692], [0.8274, 0.5831, 0.9237, 0.7568]],
};
const LOCK = { wheels: [0.3125, 0.4479, 0.5833, 0.7208], y: 0.7058, code: [1, 5, 0, 8] };
export const DIFFS = [
  { id: 'faro', x: 1046, y: 346, r: 44 },
  { id: 'anello', x: 383, y: 571, r: 32 },
  { id: 'orecchino', x: 496, y: 281, r: 32 },
  { id: 'fascia', x: 601, y: 666, r: 78 },
  { id: 'cartellino', x: 574, y: 814, r: 56 },
];
const PW = 1152, PH = 848;          // size of the altarpiece pictures
const BW = 1000, BH = 480;          // the table the torn pieces lie on (board units)
const PAPER = { x: 412, y: 50, w: 560, h: 380 };

const TEMPLATE = `
<div class="sheet pz" id="jars" hidden>
  <div class="card pz-card jars-card">
    <header><h2 data-t="pz.jars.title"></h2><button class="x" id="jars-x" data-ta="aria-label:ui.close">${X}</button></header>
    <div class="jars-body">
      <p class="pz-riddle" id="jars-riddle"></p>
      <div class="jars-right">
        <div class="pz-pic jars-pic" id="jars-pic"><img src="img/puzzles/jars.webp" alt="" draggable="false"><div id="jar-labels"></div><div id="jar-hots"></div></div>
        <p class="pz-msg" id="jars-msg"></p>
        <p class="pz-hint" id="jars-hint"></p>
      </div>
    </div>
  </div>
</div>
<div class="sheet pz" id="lock" hidden>
  <div class="card pz-card lock-card">
    <header><h2 data-t="pz.lock.title"></h2><button class="x" id="lock-x" data-ta="aria-label:ui.close">${X}</button></header>
    <div class="lock-body">
      <div class="lock-pic" id="lock-pic"><img src="img/puzzles/padlock.webp" alt="" draggable="false"><div id="lock-digits"></div></div>
      <div class="lock-side">
        <p class="lock-tag" data-t="pz.lock.tag"></p>
        <div class="wheels" id="wheels"></div>
        <button class="btn" id="lock-pull" data-t="pz.lock.pull"></button>
        <p class="pz-msg" id="lock-msg"></p>
        <p class="pz-hint" id="lock-hint"></p>
      </div>
    </div>
  </div>
</div>
<div class="sheet pz" id="diff" hidden>
  <div class="card pz-card diff-card">
    <header><h2 data-t="pz.diff.title"></h2><span class="pz-count" id="diff-n"></span><button class="x" id="diff-x" data-ta="aria-label:ui.close">${X}</button></header>
    <div class="diff-body" id="diff-body">
      <figure class="diff-pic"><div class="diff-frame" data-side="0"><img src="img/puzzles/pala-1998.webp" alt="" draggable="false"><svg viewBox="0 0 ${PW} ${PH}"></svg></div><figcaption data-t="pz.diff.left"></figcaption></figure>
      <figure class="diff-pic"><div class="diff-frame" data-side="1"><img src="img/puzzles/pala-oggi.webp" alt="" draggable="false"><svg viewBox="0 0 ${PW} ${PH}"></svg><div class="diff-cross" id="diff-cross"></div></div><figcaption data-t="pz.diff.right"></figcaption></figure>
    </div>
    <p class="pz-msg" id="diff-msg"></p>
    <p class="pz-hint" id="diff-hint"></p>
  </div>
</div>
<div class="sheet pz" id="scraps" hidden>
  <div class="card pz-card scraps-card">
    <header><h2 data-t="pz.scraps.title"></h2><p class="pz-msg" id="scraps-msg"></p><button class="btn" id="scraps-ok" hidden data-t="ui.cont"></button><button class="x" id="scraps-x" data-ta="aria-label:ui.close">${X}</button></header>
    <div class="scraps-board" id="scraps-board"><div class="scraps-inner" id="scraps-inner"><div class="scraps-target" id="scraps-target"></div></div></div>
    <p class="pz-hint" id="scraps-hint"></p>
  </div>
</div>`;

const SVGNS = 'http://www.w3.org/2000/svg';

export class Puzzles {
  constructor(ui) {
    this.ui = ui;
    this.snd = ui.snd;
    ui.root.insertAdjacentHTML('beforeend', TEMPLATE);
    const $ = this.$ = ui.$;
    this.cur = null;            // the open panel's options
    const click = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); fn(e); });
    for (const n of ['jars', 'lock', 'diff', 'scraps']) click(n + '-x', () => { this.snd.play('ui'); this.close(); });

    // jar shelf: labels and the places to click
    const labels = $('jar-labels'), hots = $('jar-hots');
    JARS.labels.forEach(([x0, y0, x1, y1], i) => {
      const d = document.createElement('div');
      d.className = 'jar-label' + (i === 0 ? ' v' : '');
      Object.assign(d.style, { left: x0 * 100 + '%', top: y0 * 100 + '%', width: (x1 - x0) * 100 + '%', height: (y1 - y0) * 100 + '%' });
      d.innerHTML = '<span></span>';
      labels.appendChild(d);
    });
    JARS.cols.forEach(([x0, x1], i) => {
      const b = document.createElement('button');
      b.className = 'jar-hot';
      b.dataset.i = i;
      Object.assign(b.style, { left: x0 * 100 + '%', width: (x1 - x0) * 100 + '%' });
      b.addEventListener('click', (e) => { e.preventDefault(); this.pickJar(i); });
      b.addEventListener('pointerenter', () => this.selJar(i, false));
      hots.appendChild(b);
    });

    // padlock: digits drawn on the painted wheels, and the controls beside it
    const digits = $('lock-digits'), wheels = $('wheels');
    LOCK.wheels.forEach((x, i) => {
      const d = document.createElement('div');
      d.className = 'lock-digit';
      Object.assign(d.style, { left: x * 100 + '%', top: LOCK.y * 100 + '%' });
      digits.appendChild(d);
      const w = document.createElement('div');
      w.className = 'wheel';
      w.innerHTML = '<button class="w-up">▲</button><div class="w-dig"><span>0</span></div><button class="w-dn">▼</button>';
      w.querySelector('.w-up').addEventListener('click', (e) => { e.preventDefault(); this.turn(i, 1); });
      w.querySelector('.w-dn').addEventListener('click', (e) => { e.preventDefault(); this.turn(i, -1); });
      w.addEventListener('pointerenter', () => this.selWheel(i));
      wheels.appendChild(w);
    });
    click('lock-pull', () => this.pull());

    // differences: a tap on either picture
    for (const f of ui.root.querySelectorAll('.diff-frame')) {
      f.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = f.querySelector('img').getBoundingClientRect();
        this.diffAt((e.clientX - r.left) / r.width * PW, (e.clientY - r.top) / r.height * PH, r.width / PW, +f.dataset.side);
      });
    }

    // torn letter: dragging pieces
    click('scraps-ok', () => { this.snd.play('ui'); this.close(true); });
    addEventListener('resize', () => { if (this.ui.modal === 'scraps') this.fitBoard(); });
  }

  owns(m) { return m === 'jars' || m === 'lock' || m === 'diff' || m === 'scraps'; }

  device() { return this.ui.device(); }

  show(name, opts) {
    this.cur = opts;
    this.ui.modal = name;
    this.ui.prompt(null);
    const el = this.$(name);
    el.hidden = false;
    const card = el.firstElementChild;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    this.snd.play('page');
    const hint = this.$(name + '-hint');
    hint.textContent = t(`pz.${name}.${this.device()}`);
    hint.hidden = !hint.textContent;
  }

  // Closes the open panel; done = the puzzle was solved.
  close(done = false) {
    const name = this.ui.modal;
    if (!this.owns(name)) return;
    clearTimeout(this.timer);
    this.$(name).hidden = true;
    this.ui.modal = null;
    const o = this.cur; this.cur = null;
    if (o) { if (done && o.onDone) o.onDone(); else if (!done && o.onClose) o.onClose(); }
  }

  // Keyboard and gamepad while a panel is open.
  input(inp, dt) {
    const m = this.ui.modal;
    if (inp.pressed('pause') || inp.pressed('dodge')) { this.snd.play('ui'); this.close(); return; }
    const ok = inp.pressed('action') || inp.pressed('jump') || inp.pressed('punch');
    const L = inp.pressed('left'), R = inp.pressed('right'), U = inp.pressed('up'), D = inp.pressed('down');
    if (m === 'jars') {
      if (L) this.selJar((this.jarSel + 5) % 6);
      if (R) this.selJar((this.jarSel + 1) % 6);
      if (ok) this.pickJar(this.jarSel);
    } else if (m === 'lock') {
      if (L) this.selWheel((this.wheelSel + 3) % 4);
      if (R) this.selWheel((this.wheelSel + 1) % 4);
      if (U) this.turn(this.wheelSel, 1);
      if (D) this.turn(this.wheelSel, -1);
      if (ok) this.pull();
    } else if (m === 'diff') {
      const ax = inp.axisX, ay = inp.axisY;
      if (Math.abs(ax) > 0.2 || Math.abs(ay) > 0.2) {
        this.cross.x = Math.max(0, Math.min(PW, this.cross.x + ax * 560 * dt));
        this.cross.y = Math.max(0, Math.min(PH, this.cross.y + ay * 560 * dt));
        this.showCross(true);
      }
      if (ok) {
        const f = this.$('diff-cross').parentElement.querySelector('img').getBoundingClientRect();
        this.showCross(true);
        this.diffAt(this.cross.x, this.cross.y, f.width / PW, 1);
      }
    } else if (m === 'scraps') {
      const free = this.pieces ? this.pieces.filter((p) => !p.placed) : [];
      if (free.length && (L || R)) {
        let i = free.indexOf(this.pieces[this.pieceSel]);
        i = (i + (R ? 1 : free.length - 1)) % free.length;
        this.selPiece(this.pieces.indexOf(free[i]));
      }
      if (ok) {
        if (!this.$('scraps-ok').hidden) { this.snd.play('ui'); this.close(true); }
        else if (this.pieces && this.pieces[this.pieceSel] && !this.pieces[this.pieceSel].placed) this.place(this.pieces[this.pieceSel]);
      }
    }
  }

  // ------------------------------------------------------------ the resin shelf
  // o: { riddle: bool, tried: Set of jar indexes, answer, onPick(i) -> 'right' | 'wrong', onDone, onClose }
  openJars(o) {
    this.show('jars', o);
    this.jarBusy = false;
    this.$('jars-riddle').textContent = o.riddle ? tv('riddle.lines').join('\n') : t('pz.jars.noRiddle');
    this.$('jars-riddle').classList.toggle('plain', !o.riddle);
    const labels = tv('riddle.labels');
    this.$('jar-labels').querySelectorAll('span').forEach((s, i) => { s.textContent = labels[i]; });
    this.$('jar-hots').querySelectorAll('.jar-hot').forEach((b, i) => {
      b.className = 'jar-hot' + (o.tried.has(i) ? ' tried' : '');
      b.setAttribute('aria-label', t('pz.jars.jar', { n: i + 1 }));
    });
    this.$('jars-msg').textContent = t('pz.jars.pick');
    this.selJar(o.tried.has(0) ? [...Array(6).keys()].find((i) => !o.tried.has(i)) ?? 0 : 0, false);
  }

  selJar(i, sound = true) {
    if (this.jarSel === i && sound) return;
    this.jarSel = i;
    this.$('jar-hots').querySelectorAll('.jar-hot').forEach((b, k) => b.classList.toggle('sel', k === i));
    if (sound) this.snd.play('tick');
  }

  pickJar(i) {
    const o = this.cur;
    if (!o || this.jarBusy) return;
    this.selJar(i, false);
    const b = this.$('jar-hots').children[i];
    if (o.tried.has(i)) { this.$('jars-msg').textContent = t('pz.jars.tried'); this.snd.play('nope'); return; }
    const r = o.onPick(i);
    if (r === 'right') {
      this.jarBusy = true;
      b.classList.add('right');
      this.$('jars-msg').textContent = t('pz.jars.right');
      this.snd.play('glass');
      this.timer = setTimeout(() => this.close(true), 1100);
    } else {
      o.tried.add(i);
      b.classList.add('tried');
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      this.$('jars-msg').textContent = t('pz.jars.wrong');
      this.snd.play('squeak');
    }
  }

  // ------------------------------------------------------------ the padlock
  // o: { digits: [4 numbers] (kept between visits), onDone, onClose }
  openLock(o) {
    this.show('lock', o);
    this.lockOpen = false;
    this.$('lock-pic').classList.remove('open');
    this.$('lock-msg').textContent = '';
    this.$('wheels').querySelectorAll('.wheel').forEach((w, i) => {
      w.querySelector('.w-up').setAttribute('aria-label', t('pz.lock.wheel', { n: i + 1 }) + ' · ' + t('pz.lock.up'));
      w.querySelector('.w-dn').setAttribute('aria-label', t('pz.lock.wheel', { n: i + 1 }) + ' · ' + t('pz.lock.down'));
    });
    this.selWheel(0);
    this.drawDigits();
  }

  selWheel(i) {
    this.wheelSel = i;
    this.$('wheels').querySelectorAll('.wheel').forEach((w, k) => w.classList.toggle('sel', k === i));
  }

  drawDigits(changed = -1, dir = 1) {
    const d = this.cur.digits;
    this.$('lock-digits').querySelectorAll('.lock-digit').forEach((el, i) => { el.textContent = d[i]; });
    this.$('wheels').querySelectorAll('.w-dig').forEach((el, i) => {
      const s = el.firstElementChild;
      s.textContent = d[i];
      if (i === changed) { s.className = ''; void s.offsetWidth; s.className = dir > 0 ? 'roll-up' : 'roll-dn'; }
    });
  }

  turn(i, dir) {
    const o = this.cur;
    if (!o || this.lockOpen) return;
    this.selWheel(i);
    o.digits[i] = (o.digits[i] + dir + 10) % 10;
    this.drawDigits(i, dir);
    this.snd.play('tick');
    this.$('lock-msg').textContent = '';
    if (o.digits.every((v, k) => v === LOCK.code[k])) this.unlock();
  }

  pull() {
    const o = this.cur;
    if (!o || this.lockOpen) return;
    if (o.digits.every((v, k) => v === LOCK.code[k])) { this.unlock(); return; }
    this.$('lock-msg').textContent = t('pz.lock.wrong');
    const p = this.$('lock-pic');
    p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake');
    this.snd.play('nope');
  }

  unlock() {
    this.lockOpen = true;
    this.$('lock-pic').classList.add('open');
    this.$('lock-msg').textContent = t('pz.lock.open');
    this.snd.play('unlock');
    this.timer = setTimeout(() => this.close(true), 1300);
  }

  // ------------------------------------------------------------ the differences
  // o: { found: Set of ids, onFound(id), onDone, onClose }
  openDiff(o) {
    this.show('diff', o);
    for (const svg of this.ui.root.querySelectorAll('.diff-frame svg')) svg.innerHTML = '';
    for (const d of DIFFS) if (o.found.has(d.id)) this.ring(d, false);
    this.cross = { x: PW / 2, y: PH / 2 };
    this.showCross(false);
    this.diffCount();
    this.$('diff-msg').textContent = t('pz.diff.intro');
    this.diffBusy = false;
  }

  showCross(on) {
    const c = this.$('diff-cross');
    c.classList.toggle('on', on);
    c.style.left = (this.cross.x / PW) * 100 + '%';
    c.style.top = (this.cross.y / PH) * 100 + '%';
  }

  diffCount() { this.$('diff-n').textContent = `${this.cur.found.size}/${DIFFS.length}`; }

  ring(d, anim) {
    for (const svg of this.ui.root.querySelectorAll('.diff-frame svg')) {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', d.x); c.setAttribute('cy', d.y); c.setAttribute('r', d.r + 6);
      c.setAttribute('class', 'ring' + (anim ? ' new' : ''));
      svg.appendChild(c);
    }
  }

  diffAt(x, y, scale, side) {
    const o = this.cur;
    if (!o || this.diffBusy) return;
    let best = null, bd = Infinity;
    for (const d of DIFFS) {
      if (o.found.has(d.id)) continue;
      const dist = Math.hypot(x - d.x, y - d.y);
      const r = Math.max(d.r, 24 / Math.max(scale, 0.05));
      if (dist <= r && dist < bd) { bd = dist; best = d; }
    }
    if (best) {
      o.found.add(best.id);
      this.ring(best, true);
      this.diffCount();
      this.snd.play('found');
      if (o.onFound) o.onFound(best.id);
      if (o.found.size >= DIFFS.length) {
        this.diffBusy = true;
        this.$('diff-msg').textContent = t('pz.diff.done');
        this.snd.play('clue');
        this.timer = setTimeout(() => this.close(true), 1800);
      } else this.$('diff-msg').textContent = t('pz.diff.names.' + best.id);
      return;
    }
    // a miss: a small cross where the tap was
    const svg = this.ui.root.querySelectorAll('.diff-frame svg')[side];
    const g = document.createElementNS(SVGNS, 'path');
    const k = 14 / Math.max(scale, 0.05) / 1.6;
    g.setAttribute('d', `M${x - k} ${y - k}L${x + k} ${y + k}M${x + k} ${y - k}L${x - k} ${y + k}`);
    g.setAttribute('class', 'miss');
    svg.appendChild(g);
    setTimeout(() => g.remove(), 700);
    this.$('diff-msg').textContent = t('pz.diff.miss');
    this.snd.play('nope');
  }

  // ------------------------------------------------------------ the torn letter
  // o: { placed: Set of piece indexes, onPlace(i), onDone, onClose }
  openScraps(o) {
    this.show('scraps', o);
    this.$('scraps-ok').hidden = true;
    this.$('scraps-msg').textContent = t('pz.scraps.drag');
    this.$('scraps-target').classList.remove('done');
    this.buildPieces();
    this.fitBoard();
    if (this.pieces.every((p) => p.placed)) this.scrapsDone(false);
  }

  // The table is drawn at a fixed size and scaled to the room left in the panel.
  fitBoard() {
    const board = this.$('scraps-board');
    const card = board.parentElement, sheet = card.parentElement;
    const cs = getComputedStyle(card), ss = getComputedStyle(sheet);
    const px = (v) => parseFloat(v) || 0;
    const availW = card.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
    const others = [...card.children].filter((el) => el !== board).reduce((h, el) => h + el.offsetHeight + px(getComputedStyle(el).marginTop) + px(getComputedStyle(el).marginBottom), 0);
    const availH = sheet.clientHeight - px(ss.paddingTop) - px(ss.paddingBottom) - px(cs.paddingTop) - px(cs.paddingBottom) - others - 6;
    const k = Math.max(0.2, Math.min(availW / BW, availH / BH, 1.2));
    this.boardK = k;
    board.style.width = BW * k + 'px';
    board.style.height = BH * k + 'px';
    this.$('scraps-inner').style.transform = `scale(${k})`;
  }

  // Draws Lale's letter on paper and tears it into four pieces along ragged lines.
  buildPieces() {
    const inner = this.$('scraps-inner');
    for (const el of inner.querySelectorAll('.scrap')) el.remove();
    const { w, h } = PAPER;
    const paper = document.createElement('canvas');
    paper.width = w; paper.height = h;
    const c = paper.getContext('2d');
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#efe4cc'); g.addColorStop(1, '#e2d3b4');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,140,170,0.18)'; c.lineWidth = 1;
    for (let y = 58; y < h - 10; y += 34) { c.beginPath(); c.moveTo(18, y + 6); c.lineTo(w - 18, y + 6); c.stroke(); }
    c.fillStyle = '#2c241c';
    c.font = 'italic 500 23px "Cormorant Garamond", Georgia, serif';
    c.textBaseline = 'alphabetic';
    tv('letter.lines').forEach((line, i) => c.fillText(line, i === 8 ? w - 120 : 36, 52 + i * 34));
    // two ragged tears (a fixed pattern, so the pieces are always the same)
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const vx = [], hy = [];
    for (let y = 0; y <= h; y += 10) vx.push(272 + Math.sin(y * 0.031) * 10 + (rnd() - 0.5) * 9);
    for (let x = 0; x <= w; x += 10) hy.push(186 + Math.sin(x * 0.027 + 1) * 9 + (rnd() - 0.5) * 8);
    const V = (y) => { const i = Math.min(vx.length - 2, Math.floor(y / 10)), f = y / 10 - i; return vx[i] + (vx[i + 1] - vx[i]) * f; };
    const Hh = (x) => { const i = Math.min(hy.length - 2, Math.floor(x / 10)), f = x / 10 - i; return hy[i] + (hy[i + 1] - hy[i]) * f; };
    const src = c.getImageData(0, 0, w, h).data;
    const outs = [0, 1, 2, 3].map(() => new ImageData(w, h));
    const box = [0, 1, 2, 3].map(() => [w, h, 0, 0]);
    for (let y = 0; y < h; y++) {
      const v = V(y);
      for (let x = 0; x < w; x++) {
        const hh = Hh(x);
        const q = (y < hh ? 0 : 2) + (x < v ? 0 : 1);
        const o = (y * w + x) * 4;
        const d = outs[q].data;
        // white paper fibres along the tear
        const edge = Math.min(Math.abs(x - v), Math.abs(y - hh));
        const k = edge < 2.2 ? 0.55 : 0;
        d[o] = src[o] + (255 - src[o]) * k; d[o + 1] = src[o + 1] + (255 - src[o + 1]) * k; d[o + 2] = src[o + 2] + (250 - src[o + 2]) * k; d[o + 3] = 255;
        const b = box[q];
        if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
      }
    }
    const tray = [[22, 22, -7], [206, 52, 6], [30, 246, 5], [212, 268, -4]];
    const order = [2, 0, 3, 1];           // which piece lies where on the table
    this.pieces = [0, 1, 2, 3].map((q) => {
      const [x0, y0, x1, y1] = box[q];
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
      tmp.getContext('2d').putImageData(outs[q], 0, 0);
      cv.getContext('2d').drawImage(tmp, x0, y0, cw, ch, 0, 0, cw, ch);
      cv.className = 'scrap';
      inner.appendChild(cv);
      const [tx, ty, tr] = tray[order[q]];
      const p = { q, el: cv, homeX: PAPER.x + x0, homeY: PAPER.y + y0, x: tx, y: ty, r: tr, s: 0.66, placed: this.cur.placed.has(q) };
      if (p.placed) { p.x = p.homeX; p.y = p.homeY; p.r = 0; p.s = 1; cv.classList.add('placed'); }
      this.dragBind(p);
      this.pose(p);
      return p;
    });
    this.pieceSel = this.pieces.findIndex((p) => !p.placed);
    if (this.pieceSel < 0) this.pieceSel = 0;
    this.selPiece(this.pieceSel, false);
  }

  pose(p) { p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${p.s})`; }

  selPiece(i, sound = true) {
    this.pieceSel = i;
    this.pieces.forEach((p, k) => p.el.classList.toggle('sel', k === i && !p.placed && this.device() !== 'touch'));
    if (sound) this.snd.play('tick');
  }

  dragBind(p) {
    const el = p.el;
    let id = null, sx = 0, sy = 0, px = 0, py = 0;
    el.addEventListener('pointerdown', (e) => {
      if (p.placed || id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      try { el.setPointerCapture(id); } catch (err) { /* ignore */ }
      sx = e.clientX; sy = e.clientY;
      // grow to full size around the finger
      const k = this.boardK || 1;
      const bx = this.$('scraps-inner').getBoundingClientRect();
      const fx = (e.clientX - bx.left) / k, fy = (e.clientY - bx.top) / k;
      p.x = fx - (fx - p.x) / p.s; p.y = fy - (fy - p.y) / p.s;
      p.s = 1; p.r = 0;
      px = p.x; py = p.y;
      el.classList.add('drag');
      this.pieces.forEach((o) => { o.el.style.zIndex = o === p ? 5 : o.placed ? 1 : 2; });
      this.selPiece(this.pieces.indexOf(p), false);
      this.pose(p);
      this.snd.play('page');
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const k = this.boardK || 1;
      p.x = px + (e.clientX - sx) / k; p.y = py + (e.clientY - sy) / k;
      this.pose(p);
    });
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      el.classList.remove('drag');
      if (Math.hypot(p.x - p.homeX, p.y - p.homeY) < 46) this.place(p);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  place(p) {
    p.placed = true;
    p.x = p.homeX; p.y = p.homeY; p.r = 0; p.s = 1;
    p.el.classList.add('placed', 'snap');
    p.el.style.zIndex = 1;
    this.pose(p);
    setTimeout(() => p.el.classList.remove('snap'), 400);
    this.cur.placed.add(p.q);
    if (this.cur.onPlace) this.cur.onPlace(p.q);
    this.snd.play('page');
    const next = this.pieces.findIndex((o) => !o.placed);
    if (next >= 0) this.selPiece(next, false);
    else this.scrapsDone(true);
  }

  scrapsDone(fresh) {
    this.pieces.forEach((o) => o.el.classList.remove('sel'));
    this.$('scraps-target').classList.add('done');
    this.$('scraps-msg').textContent = t('pz.scraps.done');
    this.$('scraps-hint').textContent = '';
    this.$('scraps-ok').hidden = false;
    if (fresh) this.snd.play('clue');
  }
}
