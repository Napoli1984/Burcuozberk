// Everything drawn over the game with HTML: screens, HUD, dialogue, examine cards, dossier, menus.
import { paintIllustration } from './art/illus.js';

const ICON = {
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 6.5h6l2 2h10v10.5H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 13h10M7 16h6" stroke="currentColor" stroke-width="1.5"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  jump: '<svg viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const TEMPLATE = `
<div class="vignette" id="vignette"></div>
<div class="hurt" id="hurt"></div>
<div class="fade" id="fade"></div>
<div class="hud" id="hud">
  <div class="who">
    <div class="face"><img src="img/ada-ritratto.webp" alt=""></div>
    <div class="who-txt">
      <div class="name">Ada Demir</div>
      <div class="pips" id="pips"><i></i><i></i><i></i><i></i><i></i></div>
    </div>
  </div>
  <div class="obj" id="obj"><span class="obj-k">Obiettivo</span><span id="obj-t"></span></div>
</div>
<div class="topbtns" id="topbtns">
  <button class="ib touch-only" id="b-observe" aria-label="Osserva">${ICON.eye}</button>
  <button class="ib" id="b-dossier" aria-label="Dossier">${ICON.folder}<span class="dot" id="dossier-dot"></span></button>
  <button class="ib" id="b-pause" aria-label="Pausa">${ICON.pause}</button>
</div>
<div class="barks" id="barks"></div>
<div class="prompt" id="prompt"><span class="key" id="prompt-k">E</span><span id="prompt-t"></span></div>
<div class="toast" id="toast"></div>
<div class="area" id="area"><small id="area-k">San Domenico</small><span id="area-t"></span></div>
<div class="touch" id="touch">
  <div class="stick-zone" id="stick-zone"><div class="stick" id="stick"><div class="knob" id="knob"></div></div></div>
  <button class="tb tb-action" data-btn="action" id="tb-action"><span id="tb-action-t">Azione</span></button>
  <button class="tb tb-dodge" data-btn="dodge"><span>Schiva</span></button>
  <button class="tb tb-kick" data-btn="kick"><span>Calcio</span></button>
  <button class="tb tb-punch" data-btn="punch"><span>Pugno</span></button>
  <button class="tb tb-jump" data-btn="jump">${ICON.jump}<span>Salta</span></button>
</div>
<div class="dialog" id="dialog" hidden>
  <div class="dlg-box" id="dlg-box">
    <div class="dlg-who" id="dlg-who"></div>
    <div class="dlg-text" id="dlg-text"></div>
    <div class="dlg-next" id="dlg-next">Continua ▸</div>
  </div>
</div>
<div class="sheet" id="examine" hidden>
  <div class="card ex-card">
    <canvas id="ex-art" width="1040" height="600"></canvas>
    <div class="ex-body">
      <h2 id="ex-title"></h2>
      <p id="ex-text"></p>
      <p class="ex-note" id="ex-note"></p>
      <button class="btn" id="ex-ok">Continua</button>
    </div>
  </div>
</div>
<div class="sheet" id="dossier" hidden>
  <div class="card dos-card">
    <header><h2>Dossier</h2><button class="x" id="dos-x" aria-label="Chiudi">×</button></header>
    <ol id="dos-list"></ol>
  </div>
</div>
<div class="sheet" id="pause" hidden>
  <div class="card menu">
    <h2>Pausa</h2>
    <button class="btn" id="p-resume">Riprendi</button>
    <button class="btn ghost" id="p-controls">Comandi</button>
    <button class="btn ghost" id="p-checkpoint">Ricomincia dal checkpoint</button>
    <div class="vol"><span>Volume</span><input type="range" id="p-vol" min="0" max="100" step="5"><button class="mini" id="p-mute">Audio sì</button></div>
    <button class="btn ghost" id="p-title">Torna al titolo</button>
    <a class="btn ghost" href="../">Torna al sito</a>
  </div>
</div>
<div class="sheet" id="controls" hidden>
  <div class="card ctl-card">
    <header><h2>Comandi</h2><button class="x" id="ctl-x" aria-label="Chiudi">×</button></header>
    <table class="ctl">
      <thead><tr><th></th><th>Tastiera</th><th>Controller</th><th>Telefono</th></tr></thead>
      <tbody>
        <tr><td>Muoviti</td><td>A D · ← →</td><td>levetta</td><td>levetta a sinistra</td></tr>
        <tr><td>Cammina piano</td><td>Maiusc</td><td>levetta poco inclinata</td><td>levetta poco inclinata</td></tr>
        <tr><td>Salta · aggrappati</td><td>Spazio</td><td>A</td><td>Salta</td></tr>
        <tr><td>Sali · scendi</td><td>W S · ↑ ↓</td><td>levetta su/giù</td><td>levetta su/giù</td></tr>
        <tr><td>Accovacciati</td><td>S · ↓</td><td>levetta giù</td><td>levetta giù</td></tr>
        <tr><td>Azione</td><td>E · Invio</td><td>RB</td><td>tasto Azione</td></tr>
        <tr><td>Pugno · Calcio</td><td>J · K</td><td>X · Y</td><td>Pugno · Calcio</td></tr>
        <tr><td>Schivata</td><td>L</td><td>B</td><td>Schiva</td></tr>
        <tr><td>Osserva (tieni premuto)</td><td>Q</td><td>LB</td><td>occhio in alto</td></tr>
        <tr><td>Dossier · Pausa</td><td>F · Esc</td><td>Select · Start</td><td>in alto a destra</td></tr>
      </tbody>
    </table>
    <p class="ctl-note">Scendere da una piattaforma sottile: giù + salta. Lasciare un bordo: giù.</p>
  </div>
</div>
<div class="screen title" id="title" hidden>
  <div class="t-photo"><img src="img/ada-titolo.webp" alt="Burcu Özberk nel ruolo di Ada Demir"></div>
  <div class="t-col">
    <div class="t-kicker">Burcu Özberk</div>
    <h1>Sotto la<br>vernice</h1>
    <p class="t-sub">Un’avventura investigativa a Velaria</p>
    <p class="t-proto">Prototipo · Capitolo 5 · Il laboratorio di San Domenico</p>
    <div class="t-btns">
      <button class="btn" id="t-play">Gioca</button>
      <button class="btn ghost" id="t-continue" hidden>Continua dal checkpoint</button>
      <button class="btn ghost" id="t-controls">Comandi</button>
      <button class="btn ghost touch-only" id="t-full">Schermo intero</button>
      <a class="btn ghost" href="../">Torna al sito</a>
    </div>
    <p class="t-cast">Burcu Özberk interpreta Ada Demir, un personaggio di finzione.</p>
  </div>
</div>
<div class="screen intro" id="intro" hidden>
  <div class="in-card">
    <div class="in-k">Atto I · Capitolo 5</div>
    <h2>Il laboratorio di San Domenico</h2>
    <p>Velaria, notte. Lale Aydın, restauratrice e amica di Ada, non risponde da tre giorni.</p>
    <p>Il suo ultimo posto di lavoro è il laboratorio di restauro del vecchio convento di San Domenico. Di notte l’ala restauri è chiusa, e c’è una guardia.</p>
    <button class="btn" id="in-go">Entra</button>
  </div>
</div>
<div class="screen end" id="end" hidden>
  <div class="in-card end-card">
    <div class="in-k">Fine del prototipo</div>
    <h2 id="end-title"></h2>
    <p id="end-text"></p>
    <dl class="stats" id="end-stats"></dl>
    <p class="end-next">Nel gioco completo la pista continua allo <em>Studio della copista</em>.</p>
    <div class="t-btns">
      <button class="btn" id="end-again">Rigioca</button>
      <a class="btn ghost" href="../">Torna al sito</a>
    </div>
  </div>
</div>
<div class="screen loading" id="loading">
  <div class="ld-k">Burcu Özberk</div>
  <div class="ld-t">Sotto la vernice</div>
  <div class="ld-bar"><i></i></div>
  <div class="ld-s" id="ld-s">Preparo il convento…</div>
</div>
<div class="rotate" id="rotate">
  <svg viewBox="0 0 64 64"><rect x="20" y="8" width="24" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M50 40a18 18 0 0 1-18 18" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M28 54l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>
  <p>Gira il telefono in orizzontale</p>
</div>
`;

export class UI {
  constructor(root, inp, snd) {
    this.root = root;
    this.inp = inp;
    this.snd = snd;
    root.innerHTML = TEMPLATE;
    const $ = (id) => root.querySelector('#' + id);
    this.$ = $;
    this.modal = null;          // name of the open panel; the game waits while one is open
    this.handlers = {};
    this.dossierItems = [];
    this.barks = new Map();
    this.toastT = null;
    this.areaT = null;
    this.promptLabel = null;
    this.typing = null;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    root.classList.toggle('is-touch', this.isTouch);
    this.portrait = false;

    // Buttons
    const click = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); this.snd.play('ui'); fn(); });
    click('b-pause', () => this.openPause());
    click('b-dossier', () => this.openDossier());
    click('p-resume', () => this.closeModal());
    click('p-controls', () => this.openControls('pause'));
    click('p-checkpoint', () => { this.closeModal(); this.emit('checkpoint'); });
    click('p-title', () => { this.closeModal(); this.emit('title'); });
    click('p-mute', () => { this.snd.setMuted(!this.snd.muted); this.syncAudio(); });
    $('p-vol').addEventListener('input', (e) => { this.snd.setVolume(e.target.value / 100); if (this.snd.muted) this.snd.setMuted(false); this.syncAudio(); });
    click('ctl-x', () => this.closeControls());
    click('dos-x', () => this.closeModal());
    click('ex-ok', () => this.advance());
    $('dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); this.advance(); });
    click('t-play', () => this.emit('play', false));
    click('t-continue', () => this.emit('play', true));
    click('t-controls', () => this.openControls('title'));
    click('t-full', () => this.fullscreen());
    click('in-go', () => this.advance());
    click('end-again', () => this.emit('again'));
    // the observe button on phones is held down
    const ob = $('b-observe');
    const obOn = (e) => { e.preventDefault(); this.inp.virtual.buttons.observe = true; ob.classList.add('on'); };
    const obOff = () => { this.inp.virtual.buttons.observe = false; ob.classList.remove('on'); };
    ob.addEventListener('pointerdown', obOn);
    ob.addEventListener('pointerup', obOff); ob.addEventListener('pointercancel', obOff); ob.addEventListener('pointerleave', obOff);

    const checkRotate = () => {
      this.portrait = this.isTouch && innerHeight > innerWidth;
      root.classList.toggle('portrait', this.portrait);
    };
    addEventListener('resize', checkRotate);
    addEventListener('orientationchange', checkRotate);
    checkRotate();
    this.syncAudio();
  }

  on(name, fn) { this.handlers[name] = fn; }
  emit(name, arg) { if (this.handlers[name]) this.handlers[name](arg); }

  get blocked() { return !!this.modal || this.portrait; }

  setTouch(on) {
    if (on === this.isTouch) return;
    this.isTouch = on;
    this.root.classList.toggle('is-touch', on);
  }

  // ------------------------------------------------------------ screens
  progress(p) {
    const bar = this.root.querySelector('.ld-bar i');
    if (bar) { bar.style.animation = 'none'; bar.style.width = Math.round(10 + p * 90) + '%'; }
  }

  loading(text, done = false) {
    const el = this.$('loading');
    if (text) this.$('ld-s').textContent = text;
    if (done) { el.classList.add('out'); setTimeout(() => { el.hidden = true; }, 600); }
  }

  showTitle(hasSave) {
    this.modal = 'title';
    this.root.classList.add('on-title');
    this.root.classList.remove('playing');
    this.$('title').hidden = false;
    this.$('t-continue').hidden = !hasSave;
    this.$('end').hidden = true;
  }

  hideTitle() {
    this.$('title').hidden = true;
    this.root.classList.remove('on-title');
  }

  showIntro(onDone) {
    this.modal = 'intro';
    this.$('intro').hidden = false;
    this.introDone = onDone;
  }

  startPlay() {
    this.modal = null;
    this.root.classList.add('playing');
    this.$('intro').hidden = true;
    this.$('end').hidden = true;
  }

  showEnd(title, text, stats) {
    this.modal = 'end';
    this.root.classList.remove('playing');
    this.clearBarks();
    this.prompt(null);
    clearTimeout(this.toastT); this.$('toast').classList.remove('on');
    clearTimeout(this.areaT); this.$('area').classList.remove('on');
    this.$('end-title').textContent = title;
    this.$('end-text').textContent = text;
    this.$('end-stats').innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    this.$('end').hidden = false;
  }

  fullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } }).catch(() => {});
    } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------ HUD
  setResist(n, max = 5) {
    const pips = this.$('pips').children;
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('off', i >= n);
    this.$('hud').classList.toggle('low', n <= 1);
  }

  objective(text, flash = true) {
    this.$('obj-t').textContent = text;
    if (flash) { const o = this.$('obj'); o.classList.remove('new'); void o.offsetWidth; o.classList.add('new'); }
  }

  fade(on) { this.$('fade').classList.toggle('on', on); }

  hurtFlash() {
    const h = this.$('hurt');
    h.classList.remove('go'); void h.offsetWidth; h.classList.add('go');
  }

  prompt(label, kind = 'action') {
    if (label === this.promptLabel) return;
    this.promptLabel = label;
    const p = this.$('prompt');
    if (!label) { p.classList.remove('on'); this.$('tb-action').classList.remove('on'); return; }
    this.$('prompt-t').textContent = label;
    this.$('prompt-k').textContent = this.inp.lastDevice === 'pad' ? 'RB' : 'E';
    p.classList.add('on');
    this.$('tb-action-t').textContent = label.split(' ')[0];
    this.$('tb-action').classList.add('on');
  }

  toast(text, ms = 4200) {
    const t = this.$('toast');
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('on'), ms);
  }

  area(name) {
    const a = this.$('area');
    this.$('area-t').textContent = name;
    a.classList.remove('on'); void a.offsetWidth; a.classList.add('on');
    clearTimeout(this.areaT);
    this.areaT = setTimeout(() => a.classList.remove('on'), 3200);
  }

  // Speech bubbles over characters, moved every frame by the game.
  bark(who, text, ms = 2200) {
    let b = this.barks.get(who);
    if (!b) {
      const el = document.createElement('div');
      el.className = 'bark';
      this.$('barks').appendChild(el);
      b = { el, until: 0 };
      this.barks.set(who, b);
    }
    b.el.textContent = text;
    b.el.classList.add('on');
    b.until = performance.now() + ms;
  }

  updateBarks(toScreen) {
    const now = performance.now();
    for (const [who, b] of this.barks) {
      if (now > b.until) { b.el.classList.remove('on'); continue; }
      const p = toScreen(who.rig.headPos.x, who.rig.headPos.y - 26);
      b.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
    }
  }

  hideBark(who) { const b = this.barks.get(who); if (b) { b.until = 0; b.el.classList.remove('on'); } }

  clearBarks() { for (const b of this.barks.values()) { b.el.classList.remove('on'); b.until = 0; } }

  // ------------------------------------------------------------ dialogue
  dialog(lines, onDone) {
    this.modal = 'dialog';
    this.prompt(null);
    this.lines = lines.slice();
    this.lineDone = onDone;
    this.$('dialog').hidden = false;
    this.nextLine();
  }

  nextLine() {
    const l = this.lines.shift();
    if (!l) {
      this.$('dialog').hidden = true;
      this.modal = null;
      const f = this.lineDone; this.lineDone = null;
      if (f) f();
      return;
    }
    this.$('dlg-who').textContent = l.who;
    this.$('dlg-box').classList.toggle('ada', l.who === 'Ada');
    const el = this.$('dlg-text');
    el.textContent = '';
    const full = l.text;
    let i = 0;
    clearInterval(this.typing);
    this.typingText = full;
    this.typing = setInterval(() => {
      i += 2;
      el.textContent = full.slice(0, i);
      if (i % 6 === 0) this.snd.play('blip');
      if (i >= full.length) { clearInterval(this.typing); this.typing = null; }
    }, 28);
  }

  // ------------------------------------------------------------ examine cards
  examine(cards, onDone) {
    this.modal = 'examine';
    this.prompt(null);
    this.cards = cards.slice();
    this.cardsDone = onDone;
    this.$('examine').hidden = false;
    this.nextCard();
  }

  nextCard() {
    const c = this.cards.shift();
    if (!c) {
      this.$('examine').hidden = true;
      this.modal = null;
      const f = this.cardsDone; this.cardsDone = null;
      if (f) f();
      return;
    }
    paintIllustration(this.$('ex-art'), c.art);
    this.$('ex-title').textContent = c.title;
    this.$('ex-text').textContent = c.text;
    this.$('ex-note').textContent = c.note || '';
    this.$('ex-note').hidden = !c.note;
    this.$('ex-ok').textContent = this.cards.length ? 'Avanti' : 'Continua';
    if (c.sound) this.snd.play(c.sound);
    const card = this.$('examine').firstElementChild;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  }

  // ------------------------------------------------------------ dossier
  addDossier(entry) {
    if (this.dossierItems.some((e) => e.id === entry.id)) return false;
    this.dossierItems.push(entry);
    this.renderDossier();
    this.$('dossier-dot').classList.add('on');
    return true;
  }

  setDossier(items) {
    this.dossierItems = items.slice();
    this.renderDossier();
  }

  renderDossier() {
    this.$('dos-list').innerHTML = this.dossierItems.map((e) => `<li><h3>${e.title}</h3><p>${e.text}</p></li>`).join('') || '<li><p>Ancora niente.</p></li>';
  }

  openDossier() {
    if (this.modal && this.modal !== 'pause') return;
    this.modal = 'dossier';
    this.$('pause').hidden = true;
    this.$('dossier').hidden = false;
    this.$('dossier-dot').classList.remove('on');
    this.snd.play('page');
  }

  // ------------------------------------------------------------ pause and controls
  openPause() {
    if (this.modal) return;
    this.modal = 'pause';
    this.$('pause').hidden = false;
    this.syncAudio();
    this.emit('paused', true);
  }

  openControls(from) {
    this.controlsFrom = from;
    this.prevModal = this.modal;
    this.modal = 'controls';
    this.$('controls').hidden = false;
    this.$('pause').hidden = true;
  }

  closeControls() {
    this.$('controls').hidden = true;
    this.modal = this.prevModal;
    if (this.controlsFrom === 'pause') this.$('pause').hidden = false;
  }

  closeModal() {
    const m = this.modal;
    if (m === 'pause' || m === 'dossier') {
      this.$('pause').hidden = true;
      this.$('dossier').hidden = true;
      this.modal = null;
      this.emit('paused', false);
    }
  }

  syncAudio() {
    this.$('p-vol').value = Math.round(this.snd.volume * 100);
    this.$('p-mute').textContent = this.snd.muted ? 'Audio no' : 'Audio sì';
  }

  // Confirm / continue from keyboard or gamepad while a panel is open.
  advance() {
    switch (this.modal) {
      case 'dialog':
        if (this.typing) { clearInterval(this.typing); this.typing = null; this.$('dlg-text').textContent = this.typingText; }
        else { this.snd.play('ui'); this.nextLine(); }
        break;
      case 'examine': this.snd.play('ui'); this.nextCard(); break;
      case 'intro': { this.$('intro').hidden = true; this.modal = null; const f = this.introDone; this.introDone = null; if (f) f(); break; }
      case 'pause': this.closeModal(); break;
      case 'dossier': this.closeModal(); break;
      case 'controls': this.closeControls(); break;
      default: break;
    }
  }

  back() {
    switch (this.modal) {
      case 'pause': case 'dossier': this.closeModal(); break;
      case 'controls': this.closeControls(); break;
      case 'dialog': case 'examine': this.advance(); break;
      default: break;
    }
  }
}
