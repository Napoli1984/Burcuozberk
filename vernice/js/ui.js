// Everything drawn over the game with HTML: screens, HUD, dialogue, examine cards, dossier, menus,
// and (in puzzles.js) the puzzle panels. Texts come from the language tables (i18n.js).
import { paintIllustration } from './art/illus.js';
import { t, tv, getLang, setLang, onLang, LANGS } from './i18n.js';
import { Puzzles } from './puzzles.js';

const ICON = {
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 6.5h6l2 2h10v10.5H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 13h10M7 16h6" stroke="currentColor" stroke-width="1.5"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  jump: '<svg viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const LANG_NAMES = { it: 'Italiano', tr: 'Türkçe' };
const LANG_BTNS = LANGS.map((l) => `<button class="lang" data-lang="${l}" lang="${l}">${LANG_NAMES[l]}</button>`).join('');

const TEMPLATE = `
<div class="vignette" id="vignette"></div>
<div class="hurt" id="hurt"></div>
<div class="fade" id="fade"></div>
<div class="hud" id="hud">
  <div class="who">
    <div class="face"><img src="img/ada-ritratto.webp" alt=""></div>
    <div class="who-txt">
      <div class="name">Burcu Özberk</div>
      <div class="pips" id="pips"><i></i><i></i><i></i><i></i><i></i></div>
    </div>
  </div>
  <div class="obj" id="obj"><span class="obj-k" data-t="ui.objective"></span><span id="obj-t"></span></div>
</div>
<div class="topbtns" id="topbtns">
  <button class="ib touch-only" id="b-observe" data-ta="aria-label:ui.observe">${ICON.eye}</button>
  <button class="ib" id="b-dossier" data-ta="aria-label:ui.dossier">${ICON.folder}<span class="dot" id="dossier-dot"></span></button>
  <button class="ib" id="b-pause" data-ta="aria-label:ui.pause">${ICON.pause}</button>
</div>
<div class="barks" id="barks"></div>
<div class="prompt" id="prompt"><span class="key" id="prompt-k">E</span><span id="prompt-t"></span></div>
<div class="toast" id="toast"></div>
<div class="area" id="area"><small id="area-k" data-t="area.small"></small><span id="area-t"></span></div>
<div class="touch" id="touch">
  <div class="stick-zone" id="stick-zone"><div class="stick" id="stick"><div class="knob" id="knob"></div></div></div>
  <button class="tb tb-action" data-btn="action" id="tb-action"><span id="tb-action-t" data-t="ui.action"></span></button>
  <button class="tb tb-dodge" data-btn="dodge"><span data-t="ui.dodge"></span></button>
  <button class="tb tb-kick" data-btn="kick"><span data-t="ui.kick"></span></button>
  <button class="tb tb-punch" data-btn="punch"><span data-t="ui.punch"></span></button>
  <button class="tb tb-jump" data-btn="jump">${ICON.jump}<span data-t="ui.jump"></span></button>
</div>
<div class="dialog" id="dialog" hidden>
  <div class="dlg-box" id="dlg-box">
    <div class="dlg-who" id="dlg-who"></div>
    <div class="dlg-text" id="dlg-text"></div>
    <div class="dlg-next" data-t="ui.next"></div>
  </div>
</div>
<div class="sheet" id="examine" hidden>
  <div class="card ex-card">
    <canvas id="ex-art" width="1040" height="600"></canvas>
    <div class="ex-body">
      <h2 id="ex-title"></h2>
      <p id="ex-text"></p>
      <p class="ex-note" id="ex-note"></p>
      <button class="btn" id="ex-ok"></button>
    </div>
  </div>
</div>
<div class="sheet" id="dossier" hidden>
  <div class="card dos-card">
    <header><h2 data-t="ui.dossier"></h2><button class="x" id="dos-x" data-ta="aria-label:ui.close">×</button></header>
    <ol id="dos-list"></ol>
  </div>
</div>
<div class="sheet" id="pause" hidden>
  <div class="card menu">
    <h2 data-t="ui.paused"></h2>
    <button class="btn" id="p-resume" data-t="ui.resume"></button>
    <button class="btn ghost" id="p-controls" data-t="ui.controls"></button>
    <button class="btn ghost" id="p-checkpoint" data-t="ui.checkpoint"></button>
    <div class="vol"><span data-t="ui.volume"></span><input type="range" id="p-vol" min="0" max="100" step="5"><button class="mini" id="p-mute"></button></div>
    <div class="vol lang-row"><span data-t="ui.language"></span><div class="langs">${LANG_BTNS}</div></div>
    <button class="btn ghost" id="p-title" data-t="ui.toTitle"></button>
    <a class="btn ghost" href="../" data-t="ui.toSite"></a>
  </div>
</div>
<div class="sheet" id="controls" hidden>
  <div class="card ctl-card">
    <header><h2 data-t="ui.controls"></h2><button class="x" id="ctl-x" data-ta="aria-label:ui.close">×</button></header>
    <table class="ctl">
      <thead><tr><th></th><th data-t="ctl.keyboard"></th><th data-t="ctl.pad"></th><th data-t="ctl.phone"></th></tr></thead>
      <tbody id="ctl-rows"></tbody>
    </table>
    <p class="ctl-note" data-t="ctl.note"></p>
  </div>
</div>
<div class="screen title" id="title" hidden>
  <div class="t-photo"><img src="img/ada-titolo.webp" data-ta="alt:title.alt"></div>
  <div class="langs t-langs">${LANG_BTNS}</div>
  <div class="t-col">
    <div class="t-kicker">Burcu Özberk</div>
    <h1 data-th="title.h1"></h1>
    <p class="t-sub" data-t="title.sub"></p>
    <p class="t-proto" data-t="title.proto"></p>
    <div class="t-btns">
      <button class="btn" id="t-play" data-t="title.play"></button>
      <button class="btn ghost" id="t-continue" hidden data-t="title.cont"></button>
      <button class="btn ghost" id="t-controls" data-t="title.controls"></button>
      <button class="btn ghost touch-only" id="t-full" data-t="title.full"></button>
      <a class="btn ghost" href="../" data-t="title.site"></a>
    </div>
    <p class="t-cast" data-t="title.cast"></p>
  </div>
</div>
<div class="screen intro" id="intro" hidden>
  <div class="in-card">
    <div class="in-k" data-t="intro.k"></div>
    <h2 data-t="intro.h"></h2>
    <p data-t="intro.p1"></p>
    <p data-t="intro.p2"></p>
    <button class="btn" id="in-go" data-t="intro.go"></button>
  </div>
</div>
<div class="screen end" id="end" hidden>
  <div class="in-card end-card">
    <div class="in-k" data-t="end.k"></div>
    <h2 id="end-title"></h2>
    <p id="end-text"></p>
    <dl class="stats" id="end-stats"></dl>
    <p class="end-next" data-th="end.next"></p>
    <div class="t-btns">
      <button class="btn" id="end-again" data-t="end.again"></button>
      <a class="btn ghost" href="../" data-t="end.site"></a>
    </div>
  </div>
</div>
<div class="screen loading" id="loading">
  <div class="ld-k">Burcu Özberk</div>
  <div class="ld-t" data-t="load.title"></div>
  <div class="ld-bar"><i></i></div>
  <div class="ld-s" id="ld-s" data-t="load.prep"></div>
</div>
<div class="rotate" id="rotate">
  <svg viewBox="0 0 64 64"><rect x="20" y="8" width="24" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M50 40a18 18 0 0 1-18 18" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M28 54l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>
  <p data-t="ui.rotate"></p>
</div>
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
    this.pz = new Puzzles(this);

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
    for (const b of root.querySelectorAll('[data-lang]')) {
      b.addEventListener('click', (e) => { e.preventDefault(); this.snd.play('ui'); setLang(b.dataset.lang); });
    }
    $('dos-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      e.preventDefault();
      this.snd.play('ui');
      this.$('dossier').hidden = true;
      this.modal = null;
      this.emit('dossierAct', b.dataset.act);
    });
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
    onLang(() => this.applyLang());
    this.applyLang();
  }

  on(name, fn) { this.handlers[name] = fn; }
  emit(name, arg) { if (this.handlers[name]) this.handlers[name](arg); }

  get blocked() { return !!this.modal || this.portrait; }

  setTouch(on) {
    if (on === this.isTouch) return;
    this.isTouch = on;
    this.root.classList.toggle('is-touch', on);
  }

  // Which kind of controls the player is using: 'touch', 'pad' or 'kb'.
  device() {
    const d = this.inp.lastDevice;
    return d === 'touch' || (this.isTouch && d !== 'pad' && d !== 'keyboard') ? 'touch' : d === 'pad' ? 'pad' : 'kb';
  }

  // Puts the texts of the current language everywhere in the static interface.
  applyLang() {
    const root = this.root;
    for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
    for (const el of root.querySelectorAll('[data-th]')) el.innerHTML = t(el.dataset.th);
    for (const el of root.querySelectorAll('[data-ta]')) {
      for (const pair of el.dataset.ta.split(';')) { const [a, k] = pair.split(':'); el.setAttribute(a, t(k)); }
    }
    this.$('ctl-rows').innerHTML = tv('ctl.rows').map((r) => '<tr>' + r.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>').join('');
    for (const b of root.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === getLang());
    document.documentElement.lang = getLang();
    document.title = t('meta.title');
    this.promptLabel = null;
    this.syncAudio();
    this.renderDossier();
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
    this.$('end-stats').innerHTML = stats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
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

  // What Ada can do here: the full label next to the key, and a short verb on the phone's button.
  prompt(label, verb = null) {
    if (label === this.promptLabel) return;
    this.promptLabel = label;
    const p = this.$('prompt');
    if (!label) { p.classList.remove('on'); this.$('tb-action').classList.remove('on'); return; }
    this.$('prompt-t').textContent = label;
    this.$('prompt-k').textContent = this.inp.lastDevice === 'pad' ? 'RB' : 'E';
    p.classList.add('on');
    this.$('tb-action-t').textContent = verb || label.split(' ')[0];
    this.$('tb-action').classList.add('on');
  }

  toast(text, ms = 4200) {
    const tt = this.$('toast');
    tt.textContent = text;
    tt.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => tt.classList.remove('on'), ms);
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
  // lines: [who, text] pairs; who is a key of dlg.name (ada, fausto, marta).
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
    const [who, full] = l;
    this.$('dlg-who').textContent = t('dlg.name.' + who);
    this.$('dlg-box').classList.toggle('ada', who === 'ada');
    const el = this.$('dlg-text');
    el.textContent = '';
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
    this.$('ex-note').classList.toggle('verse', !!c.verse);
    this.$('ex-ok').textContent = this.cards.length ? t('ui.forward') : t('ui.cont');
    if (c.sound) this.snd.play(c.sound);
    const card = this.$('examine').firstElementChild;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  }

  // ------------------------------------------------------------ dossier
  // Entries: { id, vars, act }; title and text come from dos.<id> in the current language.
  addDossier(entry) {
    if (this.dossierItems.some((e) => e.id === entry.id)) return false;
    this.dossierItems.push({ ...entry });
    this.renderDossier();
    this.$('dossier-dot').classList.add('on');
    return true;
  }

  updateDossier(id, vars, act) {
    const e = this.dossierItems.find((x) => x.id === id);
    if (!e) return;
    e.vars = vars; e.act = act;
    this.renderDossier();
  }

  setDossier(items) {
    this.dossierItems = items.map((e) => ({ ...e }));
    this.renderDossier();
  }

  renderDossier() {
    if (!this.$('dos-list')) return;
    this.$('dos-list').innerHTML = this.dossierItems.map((e) => {
      const btn = e.act ? `<button class="mini dos-act" data-act="${esc(e.act)}">${esc(t('ui.reassemble'))}</button>` : '';
      return `<li><h3>${esc(t('dos.' + e.id + '.t', e.vars))}</h3><p>${esc(t('dos.' + e.id + '.x', e.vars))}</p>${btn}</li>`;
    }).join('') || `<li><p>${esc(t('ui.dossierEmpty'))}</p></li>`;
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
    this.$('p-mute').textContent = this.snd.muted ? t('ui.audioOff') : t('ui.audioOn');
  }

  // Keyboard and gamepad while a panel is open (the game itself is paused).
  handleInput(inp, dt) {
    const m = this.modal;
    if (this.pz.owns(m)) { this.pz.input(inp, dt); return; }
    if (m === 'dialog' || m === 'examine' || m === 'intro' || m === 'dossier' || m === 'pause' || m === 'controls') {
      if (inp.pressed('action') || inp.pressed('jump') || inp.pressed('punch')) this.advance();
      else if (inp.pressed('pause') || inp.pressed('dodge')) this.back();
      else if (inp.pressed('dossier') && m === 'dossier') this.back();
    }
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
