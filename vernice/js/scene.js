// The level-5 prototype: San Domenico at night, painted section by section and walked as one place.
import { TILE, NOISE, COMBAT, ADA, VIEW } from './config.js';
import { buildLevel5, T, X } from './level5.js';
import { TileMap } from './tilemap.js';
import { BG } from './bgdata.js';
import { paintProps } from './art/props.js';
import { setIllustrationImages, loadIllustrationImages } from './art/illus.js';
import { Ada } from './ada.js';
import { Enemy } from './enemy.js';
import { registerRig } from './rig.js';
import { A } from './anim.js';
import { t, tv, onLang } from './i18n.js';
import { clamp, lerp, damp, sign, rectsOverlap, rgbToHex, safeStorage } from './util.js';

const SAVE_KEY = 'bo-sv-proto2';
const SAVE_V = 3;
const RIGS = ['ada', 'guard', 'guard2', 'recov', 'guard3', 'thief', 'porter1', 'porter2'];
const NPCS = ['fausto', 'marta', 'granny', 'flatcap'];
const PROPS = ['cart', 'tin', 'jar', 'sketch', 'sketch-s', 'trunk', 'basket', 'panel', 'scrap'];
const JAR_ANSWER = 4;          // the fifth jar on the shelf (see the riddle)

// Lights the guards carry: radius and strength of the light they cast, and their glow sprite.
const LIGHTS = {
  lantern: { r: 300, i: 0.75, color: [255, 200, 130], tint: 0xffc884, scale: 1.5, alpha: 0.24, cone: 0xffd9a0 },
  torch: { r: 560, i: 0.75, color: [235, 240, 255], tint: 0xeef2ff, scale: 0.5, alpha: 0.5, cone: 0xe8eeff },
  headlamp: { r: 470, i: 0.62, color: [255, 246, 225], tint: 0xfff4dc, scale: 0.36, alpha: 0.55, cone: 0xfff0d8 },
};

// Vertical camera limits for each part of the level (world y), so the view stays on the paintings.
const CAM_Y = [
  { x1: X.w1 + 40, top: 4, bottom: 700 },
  { x1: X.w2 + 30, top: -20, bottom: 712 },
  { x1: X.w3 + 35, top: 60, bottom: 712 },
  { x1: X.w4 + 45, top: -40, bottom: 992 },
  { x1: 1e9, top: 112, bottom: 1004 },
];

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  // ------------------------------------------------------------ loading
  preload() {
    const ui = this.game.registry.get('ui');
    const L = this.load;
    const need = (key) => !this.textures.exists(key);
    for (const s of BG.sections) for (const c of s.chunks) if (need(c.key)) L.image(c.key, c.file);
    for (const w of BG.walls) if (need(w.key)) L.image(w.key, w.file);
    for (const c of BG.covers) if (need(c.key)) L.image(c.key, c.file);
    for (const f of BG.fronts) if (need(f.key)) L.image(f.key, f.file);
    for (const r of RIGS) {
      if (need('rig-' + r)) L.image('rig-' + r, 'img/chars/' + r + '.webp');
      if (!this.cache.json.exists('rigdata-' + r)) L.json('rigdata-' + r, 'img/chars/' + r + '.json');
    }
    for (const n of NPCS) if (need('npc-' + n)) L.image('npc-' + n, 'img/chars/npc-' + n + '.webp');
    for (const p of PROPS) if (need('p-' + p)) L.image('p-' + p, 'img/props/' + p + '.webp');
    L.on('progress', (p) => ui.progress(p));
  }

  create(data = {}) {
    const reg = this.game.registry;
    this.ui = reg.get('ui');
    this.inp = reg.get('inp');
    this.snd = reg.get('snd');
    this.store = safeStorage();
    this.mode = data.mode || 'title';
    this.level = buildLevel5();
    this.map = new TileMap(this.level);
    if (!reg.get('painted')) {
      paintProps(this);
      for (const r of RIGS) registerRig(this, this.cache.json.get('rigdata-' + r));
      setIllustrationImages({ jar: this.textures.get('p-jar').getSourceImage(), sketch: this.textures.get('p-sketch').getSourceImage() });
      // pictures used only by the cards and the puzzle panels, fetched now that the level is loaded
      loadIllustrationImages({ panel: 'img/puzzles/panel.webp', panelUV: 'img/puzzles/panel-uv.webp', pala1998: 'img/puzzles/pala-1998.webp', palaOggi: 'img/puzzles/pala-oggi.webp' });
      reg.set('painted', true);
    }
    this.rigs = {};
    for (const r of RIGS) this.rigs[r] = this.cache.json.get('rigdata-' + r);
    this.buildWorld();
    this.buildActors();
    this.buildEffects();
    this.tintProps();
    this.setupState(data);
    this.setupCamera();
    this.scale.on('resize', this.onResize, this);
    const offLang = onLang(() => this.relabel());
    this.ui.on('dossierAct', (act) => { if (act === 'scraps' && this.mode === 'play') this.openScraps(); });
    this.events.once('shutdown', () => { this.scale.off('resize', this.onResize, this); offLang(); });
    this.onResize();
    this.debugHook();
    window.__ready = true;
  }

  buildWorld() {
    const L = this.level, S = BG.S;
    for (const s of BG.sections) {
      for (const c of s.chunks) this.add.image(c.x, s.y0, c.key).setOrigin(0).setScale(1 / S).setDepth(0);
    }
    for (const w of BG.walls) this.add.image(w.x, w.y, w.key).setOrigin(0).setScale(1 / S).setDepth(1);
    const cv = BG.covers[0];
    this.cover = this.add.image(cv.x, cv.y, cv.key).setOrigin(0).setScale(1 / S).setDepth(2);
    this.secret = { x: cv.x, y: cv.y, w: cv.w, h: cv.h, hp: 3, broken: false, shake: 0 };
    // painted pieces Ada can hide behind, drawn in front of her
    this.fronts = {};
    // (shown only while Ada hides there: otherwise people walk in front of them)
    for (const f of BG.fronts) this.fronts[f.id] = this.add.image(f.x, f.y, f.key).setOrigin(0).setScale(1 / S).setDepth(22).setVisible(false);
    for (const h of L.hides) h.img = this.fronts[h.id];
    // props
    const prop = (key, x, y, scale, depth = 15) => this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(depth);
    this.cart = { x: L.cart.x, y: L.cart.y, vx: 0, img: prop('p-cart', L.cart.x, L.cart.y + 3, 0.4) };
    // dammar resin glows pale green under the UV lamp
    this.jarGlow = this.add.image(L.jar.x, L.jar.y - 9, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(16).setTint(0xc8ffb0).setScale(0.3).setAlpha(0.5);
    this.sketchImg = prop('p-sketch-s', L.sketch.x, L.sketch.y + 1, 0.25).setRotation(-0.12);
    this.cans = L.cans.map((c, i) => ({ id: 'can' + i, x: c.x, y: c.y, vx: 0, vy: 0, state: 'rest', img: prop('p-tin', c.x, c.y + 1, 0.36) }));
    this.panelImg = prop('p-panel', L.panel.x, L.panel.y, 1 / 3).setRotation(0.03);
    this.basketImg = prop('p-basket', L.basket.x, L.basket.y, 1 / 3);
    this.trunkImg = prop('p-trunk', L.trunk.x, L.trunk.y, 1 / 3);
    this.scrapItems = L.scraps.map((s) => ({ ...s, img: prop('p-scrap', s.x, s.y, 0.27).setRotation(s.n === 3 ? 0.18 : -0.1) }));
    // light glows that flicker over the painted ones
    this.glows = L.lights.filter((l) => l.glow !== false).map((l) => {
      const g = this.add.image(l.x, l.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(45);
      g.setScale((l.r * 0.9) / 128);
      g.setTint(rgbToHex(l.color[0], l.color[1], l.color[2]));
      const base = l.i * 0.2;
      g.setAlpha(base);
      return { l, g, base, flick: /candle|lantern|lamp|bulb/.test(l.id), seed: Math.random() * 10 };
    });
  }

  buildActors() {
    const L = this.level;
    this.ada = new Ada(this, L.start.x, L.start.y, this.rigs.ada);
    // people in the street: painted figures that breathe and turn toward Ada
    this.npcs = L.npcs.map((n) => {
      const img = this.add.image(n.x, n.y + 1, 'npc-' + n.id).setOrigin(0.5, 1).setScale(1 / 3).setDepth(20);
      const o = { ...n, img, facing: n.facing, base: n.facing, clock: Math.random() * 6, talking: false, barkI: 0, barkT: 0, light: 0.5, rig: { headPos: { x: n.x, y: n.y - 120 } } };
      img.setFlipX(o.facing < 0);
      return o;
    });
    this.fausto = this.npcs.find((n) => n.id === 'fausto');
    this.marta = this.npcs.find((n) => n.id === 'marta');
    this.enemies = L.enemies.map((d) => new Enemy(this, this.rigs[d.rig], { ...d, depth: 25, facing: 1 }));
    const r = L.recoverer;
    this.recoverer = new Enemy(this, this.rigs.recov, {
      id: 'recov', kind: 'recoverer', x: r.x, y: r.y, hp: 5, depth: 24, facing: 1, enabled: false, state: 'patrol',
      route: [{ x: r.x - 160, wait: 2.2 }, { x: r.x + 260, wait: 2.2 }], routeI: 1,
    });
    this.enemies.push(this.recoverer);
    for (const e of this.enemies) {
      e.icon = this.add.image(0, 0, 'icon-q').setScale(0.5).setDepth(48).setVisible(false);
      const li = LIGHTS[e.lightKind];
      if (!li) continue;
      e.lamp = { x: e.x, y: e.y - 80, r: li.r, i: li.i, color: li.color };
      e.glow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(45).setTint(li.tint).setScale(li.scale).setAlpha(li.alpha).setVisible(false);
    }
    this.heldCan = null;
  }

  buildEffects() {
    this.coneG = this.add.graphics().setDepth(46).setBlendMode(Phaser.BlendModes.ADD);
    this.ringG = this.add.graphics().setDepth(47);
    this.rings = [];
    this.parts = [];
    this.partPool = [];
  }

  // Props are painted in plain light: give them the light of the place they stand in.
  tintProps() {
    const tint = (img, x, y) => img.setTint(this.lightAt(x, y, null, true).tint);
    tint(this.cart.img, this.cart.x, this.cart.y - 40);
    for (const c of this.cans) tint(c.img, c.x, c.y - 10);
    tint(this.sketchImg, this.level.sketch.x, this.level.sketch.y - 10);
    tint(this.panelImg, this.level.panel.x, this.level.panel.y - 15);
    tint(this.basketImg, this.level.basket.x, this.level.basket.y - 15);
    tint(this.trunkImg, this.level.trunk.x, this.level.trunk.y - 30);
    for (const s of this.scrapItems) tint(s.img, s.x, s.y - 6);
  }

  // ------------------------------------------------------------ game state, saving
  setupState(data) {
    const L = this.level;
    this.flags = {
      fausto: false, marta: false, desk: false, clue: false, sketch: false, secret: false, crypt: false,
      riddle: false, panel: false, trunk: false, pala: false, letter: false,
    };
    // what the puzzles remember between visits
    this.pz = { jarsTried: new Set(), lockDigits: [0, 0, 0, 0], diffFound: new Set(), scraps: new Set(), placed: new Set() };
    this.stats = { time: 0, spotted: 0, kos: 0 };
    this.dossier = [];
    this.objKey = null;
    this.hintsShown = new Set();
    this.areasSeen = new Set();
    this.checkpoint = L.checkpoints[0];
    this.region = null;
    this.hitStop = 0;
    this.respawnT = 0;
    this.exitMsgT = 0;
    this.camLook = 0;
    this.camLookY = 0;
    this.camZoomK = 1;
    this.titleT = 0;
    this.portalT = 0;
    this.ui.setDossier([]);
    this.ui.clearBarks();
    this.ui.prompt(null);
    this.ui.fade(false);
    this.addDossier('lale', false);

    if (this.mode === 'title') {
      this.ada.frozen = true;
      this.ada.rig.setVisible(false);
      this.ui.showTitle(!!this.loadSave());
      this.ui.loading(null, true);
      return;
    }
    this.ui.hideTitle();
    const save = data.save;
    if (save) this.applySave(save);
    else this.objective('obj.fausto', false);
    this.ui.setResist(this.ada.resist);
    if (save || data.skipIntro) {
      this.ui.startPlay();
      if (save) this.ui.toast(t('toast.resume'), 2600);
      this.introDone = true;
    } else {
      this.ada.frozen = true;
      this.ui.showIntro(() => { this.ui.startPlay(); this.ada.frozen = false; this.introDone = true; this.showHint('move'); });
    }
  }

  saveGame() {
    if (this.mode !== 'play' || !this.store) return;
    const p = this.pz;
    const s = {
      v: SAVE_V, cp: this.checkpoint.id, flags: this.flags, stats: this.stats, obj: this.objKey,
      dossier: this.dossier.map((d) => ({ id: d.id, vars: d.vars || null, act: d.act || null })),
      hints: [...this.hintsShown], areas: [...this.areasSeen],
      pz: { jarsTried: [...p.jarsTried], lockDigits: p.lockDigits, diffFound: [...p.diffFound], scraps: [...p.scraps], placed: [...p.placed] },
      enemies: this.enemies.map((e) => ({ id: e.id, ko: e.ko, x: e.body.x, y: e.body.y, enabled: e.enabled })),
      cans: this.cans.map((c) => ({ x: c.x, y: c.y })), cart: this.cart.x,
    };
    try { this.store.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  loadSave() {
    if (!this.store) return null;
    try { const s = JSON.parse(this.store.getItem(SAVE_KEY) || 'null'); return s && s.v === SAVE_V ? s : null; } catch (e) { return null; }
  }

  clearSave() { try { this.store && this.store.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  applySave(s) {
    Object.assign(this.flags, s.flags || {});
    Object.assign(this.stats, s.stats || {});
    for (const d of s.dossier || []) this.addDossier(d.id, false, d.vars, d.act);
    (s.hints || []).forEach((h) => this.hintsShown.add(h));
    (s.areas || []).forEach((a) => this.areasSeen.add(a));
    const p = s.pz || {};
    this.pz.jarsTried = new Set(p.jarsTried || []);
    if (Array.isArray(p.lockDigits) && p.lockDigits.length === 4) this.pz.lockDigits = p.lockDigits.slice();
    this.pz.diffFound = new Set(p.diffFound || []);
    this.pz.scraps = new Set(p.scraps || []);
    this.pz.placed = new Set(p.placed || []);
    for (const it of this.scrapItems) if (this.pz.scraps.has(it.n)) it.img.setVisible(false);
    this.objective(s.obj || 'obj.lab', false);
    const cp = this.level.checkpoints.find((c) => c.id === s.cp) || this.level.checkpoints[0];
    this.checkpoint = cp;
    this.ada.teleport(cp.x, cp.y);
    if (this.flags.secret) this.breakWall(true);
    if (this.flags.clue) { this.jarGlow.setVisible(false); this.spawnRecoverer(); }
    if (this.flags.sketch) this.sketchImg.setVisible(false);
    (s.cans || []).forEach((c, i) => { if (this.cans[i]) { this.cans[i].x = c.x; this.cans[i].y = c.y; this.cans[i].img.setPosition(c.x, c.y); } });
    if (typeof s.cart === 'number') { this.cart.x = s.cart; this.cart.img.x = s.cart; }
    for (const es of s.enemies || []) {
      const e = this.enemies.find((x) => x.id === es.id);
      if (!e) continue;
      if (es.enabled && !e.enabled) e.enable(es.x, es.y);
      if (es.ko) { e.body.x = es.x; e.body.y = es.y; e.hp = 0; e.setState('ko'); e.t = 5; }
    }
    this.tintProps();
  }

  // The language changed (from the pause menu): texts kept by the scene follow it.
  relabel() {
    if (this.objKey) this.ui.objective(t(this.objKey), false);
  }

  // ------------------------------------------------------------ camera
  setupCamera() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#07060c');
    if (this.mode === 'title') {
      this.camX = 1500; this.camY = 360;
    } else {
      this.camX = this.ada.x + this.ada.facing * 80;
      this.camY = this.ada.y - 200;
    }
  }

  onResize() {
    const cam = this.cameras.main;
    const gs = this.scale.gameSize;
    cam.setSize(gs.width, gs.height);
    const rect = this.game.canvas.getBoundingClientRect();
    this.canvasRect = rect;
    this.viewH = rect.height < 500 ? VIEW.heightSmall : VIEW.height;
    this.baseZoom = gs.height / this.viewH;
    cam.setZoom(this.baseZoom * this.camZoomK);
  }

  toScreen(x, y) {
    const cam = this.cameras.main;
    const sx = (x - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2;
    const sy = (y - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2;
    const r = this.canvasRect || this.game.canvas.getBoundingClientRect();
    return { x: r.left + sx * r.width / cam.width, y: r.top + sy * r.height / cam.height };
  }

  // Vertical limits of the camera at world x: each section has its own, blended near the walls.
  camLimits(x) {
    let i = CAM_Y.findIndex((c) => x < c.x1);
    if (i < 0) i = CAM_Y.length - 1;
    const c = CAM_Y[i];
    const blend = 260;
    if (i < CAM_Y.length - 1 && x > c.x1 - blend) {
      const n = CAM_Y[i + 1], f = (x - (c.x1 - blend)) / (2 * blend);
      return { top: lerp(c.top, n.top, f), bottom: lerp(c.bottom, n.bottom, f) };
    }
    if (i > 0 && x < CAM_Y[i - 1].x1 + blend) {
      const p = CAM_Y[i - 1], f = 0.5 + (x - CAM_Y[i - 1].x1) / (2 * blend);
      return { top: lerp(p.top, c.top, f), bottom: lerp(p.bottom, c.bottom, f) };
    }
    return c;
  }

  updateCamera(dt, observing) {
    const cam = this.cameras.main;
    const ada = this.ada;
    let tx, ty, tk = 1;
    if (this.mode === 'title') {
      this.titleT += dt;
      tx = 1500 + Math.sin(this.titleT * 0.045) * 900;
      ty = 360;
    } else {
      if (observing) {
        const ax = this.inp.axisX, ay = this.inp.axisY;
        const dir = Math.abs(ax) > 0.3 ? sign(ax) : ada.facing;
        this.camLook = lerp(this.camLook, dir * 380, damp(3, dt));
        this.camLookY = lerp(this.camLookY, (Math.abs(ay) > 0.3 ? sign(ay) : 0) * 200, damp(3, dt));
        tk = 0.9;
      } else {
        const lead = ada.facing * 90 + clamp(ada.body.vx * 0.22, -70, 70);
        this.camLook = lerp(this.camLook, lead, damp(2.2, dt));
        this.camLookY = lerp(this.camLookY, 0, damp(3, dt));
      }
      tx = ada.x + this.camLook;
      ty = ada.drawY - 0.1 * this.viewH - 125 + this.camLookY;
    }
    this.camZoomK = lerp(this.camZoomK, tk, damp(4, dt));
    cam.setZoom(this.baseZoom * this.camZoomK);
    const halfW = cam.width / cam.zoom / 2, halfH = cam.height / cam.zoom / 2;
    this.camX = lerp(this.camX, tx, damp(this.mode === 'title' ? 1 : 7, dt));
    this.camY = lerp(this.camY, ty, damp(this.mode === 'title' ? 1 : 5, dt));
    const lim = this.camLimits(this.camX);
    let cx = clamp(this.camX, halfW, this.level.width - 4 - halfW);
    let cy = lim.bottom - lim.top < halfH * 2 ? (lim.top + lim.bottom) / 2 : clamp(this.camY, lim.top + halfH, lim.bottom - halfH);
    cam.centerOn(cx, cy);
    this.snd.listener.x = cx;
    this.snd.listener.y = cy;
  }

  // ------------------------------------------------------------ main loop
  update(time, deltaMs) {
    const rawDt = Math.min(deltaMs / 1000, 1 / 20);
    const inp = this.inp;
    inp.update();
    this.syncDevice();
    const ui = this.ui;

    if (this.mode === 'title') {
      for (const e of this.enemies) e.update(rawDt, this.ada);
      this.updateNpcs(rawDt);
      this.updateCamera(rawDt, false);
      this.updateVisuals(rawDt);
      return;
    }

    if (ui.blocked) {
      ui.handleInput(inp, rawDt);
      this.updateNpcs(rawDt);
      if (!this.ada.frozen) this.ada.animate(rawDt);
      this.updateVisuals(rawDt, true);
      ui.updateBarks((x, y) => this.toScreen(x, y));
      return;
    }
    if (this.mode === 'end') { this.updateVisuals(rawDt); return; }
    if (inp.pressed('pause')) { ui.openPause(); return; }
    if (inp.pressed('dossier')) { ui.openDossier(); return; }

    let dt = rawDt;
    if (this.hitStop > 0) { this.hitStop -= dt; dt = 0; }
    if (this.respawnT > 0) { this.updateRespawn(rawDt); dt = 0; }
    if (this.portalT > 0) { this.updatePortal(rawDt); dt = 0; }

    const observing = this.introDone && inp.down('observe') && (this.ada.state === 'ground' || this.ada.state === 'hidden') && !this.ada.frozen;
    if (dt > 0) {
      this.stats.time += dt;
      this.simulate(dt, observing);
    }
    this.updateCamera(rawDt, observing);
    this.updateVisuals(rawDt);
    ui.updateBarks((x, y) => this.toScreen(x, y));
  }

  simulate(dt, observing) {
    const ada = this.ada;
    this.computeLight();
    // While observing Ada stands still; the stick moves the view instead.
    if (observing) {
      const saved = [this.inp.axisX, this.inp.axisY, this.inp.cur.up, this.inp.cur.down, this.inp.cur.left, this.inp.cur.right];
      this.inp.axisX = 0; this.inp.axisY = 0; this.inp.cur.up = this.inp.cur.down = this.inp.cur.left = this.inp.cur.right = false;
      ada.update(dt, this.inp);
      [this.inp.axisX, this.inp.axisY, this.inp.cur.up, this.inp.cur.down, this.inp.cur.left, this.inp.cur.right] = saved;
    } else {
      ada.update(dt, this.inp);
    }
    for (const e of this.enemies) {
      e.update(dt, ada);
      for (const o of this.enemies) if (o !== e && o.enabled && o.ko && e.enabled && !e.ko) e.noticeBody(o);
    }
    this.updateNpcs(dt);
    this.updateCans(dt);
    this.updateCart(dt);
    this.updateInteract();
    this.updateWorldTriggers(dt);
    // music follows the most worried guard
    let ten = 0;
    for (const e of this.enemies) {
      if (!e.enabled || e.ko) continue;
      if (e.aware) ten = 2; else if ((e.state === 'suspicious' || e.state === 'search') && ten < 1) ten = 1;
    }
    this.snd.setTension(ten);
  }

  // ------------------------------------------------------------ light
  // How lit a point is (0.35..1) and the colour characters take there. skip: an enemy whose own
  // light does not count; statics: only the lights of the place (no lights carried by people).
  lightAt(x, y, skip = null, statics = false) {
    const reg = this.map.regionAt(x, y);
    const amb = reg.ambient;
    const k0 = 0.3 + amb * 1.3;
    let r = (reg.color[0] / 255) * k0, g = (reg.color[1] / 255) * k0, b = (reg.color[2] / 255) * k0;
    let lvl = amb;
    const add = (L, occlude) => {
      const dx = x - L.x, dy = y - L.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > L.r * L.r) return;
      const d = Math.sqrt(d2);
      let c = L.i * Math.pow(1 - d / L.r, 1.6);
      if (occlude && this.map.raycast(L.x, L.y, x, y, 16) < 0.97) c *= 0.12;
      lvl += c;
      r += (L.color[0] / 255) * c * 1.25; g += (L.color[1] / 255) * c * 1.25; b += (L.color[2] / 255) * c * 1.25;
    };
    for (const L of this.level.lights) add(L, true);
    if (!statics) {
      for (const e of this.enemies) {
        if (e === skip || !e.lamp || !e.enabled || e.ko) continue;
        if (e.lantern) { add(e.lamp, true); continue; }
        const col = e.lamp.color;
        this.beamLight(e, x, y, (c) => { lvl += c; r += (col[0] / 255) * c; g += (col[1] / 255) * c; b += (col[2] / 255) * c; });
      }
    }
    // characters never sink completely into the dark: the paintings around them are not that dark either
    const lift = (v) => clamp(0.3 + v * 0.78, 0.3, 1);
    return { lvl: clamp(lvl, 0.35, 1), tint: rgbToHex(lift(r) * 255, lift(g) * 255, lift(b) * 255) };
  }

  // A torch or a headlamp lights a narrow beam in front of whoever carries it.
  beamLight(e, x, y, fn) {
    const o = e.lamp;
    const dx = (x - o.x) * e.facing, dy = y - o.y;
    if (dx < 0) return;
    const d = Math.hypot(dx, dy);
    if (d > o.r) return;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(ang - e.tilt) > e.half * 1.1) return;
    if (this.map.raycast(o.x, o.y, x, y, 16) < 0.97) return;
    fn(o.i * (1 - d / o.r));
  }

  computeLight() {
    const ada = this.ada;
    const l = this.lightAt(ada.x, ada.y - 64);
    ada.light = l.lvl;
    ada.tint = l.tint;
  }

  // ------------------------------------------------------------ visuals every frame
  updateVisuals(dt, paused = false) {
    const t0 = this.time.now / 1000;
    const ada = this.ada;
    // the lights people carry follow their hands and heads
    for (const e of this.enemies) {
      if (!e.lamp) continue;
      if (!e.enabled) { e.glow.setVisible(false); continue; }
      const p = e.lightPoint();
      if (p) { e.lamp.x = p.x; e.lamp.y = p.y; }
      e.glow.setPosition(e.lamp.x, e.lamp.y);
      if (e.lantern) e.glow.setVisible(true).setAlpha(e.ko ? 0.12 : 0.22 + 0.04 * Math.sin(t0 * 11));
      else e.glow.setVisible(!e.ko);
    }
    const la = this.lightAt(ada.x, ada.y - 64);
    if (ada.state === 'hidden') ada.rig.setFill(0xc9d2f2); else ada.rig.setTint(la.tint);
    if (this.heldCan) this.heldCan.img.setTint(la.tint);
    for (const e of this.enemies) {
      if (!e.enabled) continue;
      const l = this.lightAt(e.x, e.y - 64, e);
      e.light = l.lvl;
      e.rig.setTint(l.tint);
      const ic = e.icon;
      if (e.iconKind && !e.ko) {
        ic.setVisible(true);
        ic.setTexture('icon-' + e.iconKind);
        const bob = Math.sin(t0 * 6) * 2;
        ic.setPosition(e.rig.headPos.x, e.rig.headPos.y - 30 + bob);
        const s = e.iconKind === 'q' ? 0.36 + 0.18 * e.iconAmt : 0.56;
        ic.setScale(s);
        ic.setAlpha(e.iconKind === 'q' ? 0.55 + 0.45 * e.iconAmt : 1);
      } else ic.setVisible(false);
    }
    for (const n of this.npcs) n.img.setTint(this.lightAt(n.x, n.y - 64).tint);
    for (const h of this.level.hides) h.img.setVisible(ada.hide === h);
    for (const g of this.glows) {
      if (!g.flick) continue;
      const f = 0.86 + 0.08 * Math.sin(t0 * 7.3 + g.seed) + 0.06 * Math.sin(t0 * 17.1 + g.seed * 3);
      g.g.setAlpha(g.base * f);
    }
    this.drawCones();
    if (this.jarGlow.visible) this.jarGlow.setAlpha(0.32 + 0.12 * Math.sin(t0 * 2.2));
    // the hollow wall shakes when hit
    if (this.secret.shake > 0) {
      this.secret.shake -= dt;
      this.cover.x = this.secret.x + Math.sin(this.secret.shake * 90) * 2 * (this.secret.shake / 0.25);
    }
    this.updateParticles(paused ? 0 : dt);
    this.drawRings(paused ? 0 : dt);
  }

  drawCones() {
    const g = this.coneG;
    g.clear();
    for (const e of this.enemies) {
      if (!e.enabled || e.ko || !e.lamp) continue;
      const o = e.eye;
      const range = e.coneRange;
      const col = e.aware ? 0xff5040 : (e.state === 'suspicious' || e.state === 'search' || e.S > 0.15) ? 0xffbf55 : LIGHTS[e.lightKind].cone;
      const N = 20;
      const rays = [];
      for (let i = 0; i <= N; i++) {
        const a = e.tilt - e.half + (2 * e.half * i) / N;
        const dx = Math.cos(a) * e.facing, dy = Math.sin(a);
        const f = this.map.raycast(o.x, o.y, o.x + dx * range, o.y + dy * range, 10);
        rays.push([dx, dy, f * range]);
      }
      const layers = e.lantern ? [[1, 0.045], [0.7, 0.045], [0.42, 0.055]] : [[1, 0.05], [0.75, 0.06], [0.45, 0.08]];
      for (const [k, alpha] of layers) {
        g.fillStyle(col, alpha);
        g.beginPath();
        g.moveTo(o.x, o.y);
        for (const [dx, dy, len] of rays) {
          const l = Math.min(len, range * k);
          g.lineTo(o.x + dx * l, o.y + dy * l);
        }
        g.closePath();
        g.fillPath();
      }
    }
  }

  // ------------------------------------------------------------ noises and their rings
  noise(x, y, radius, kind, src) {
    for (const e of this.enemies) if (e !== src) e.hear(x, y, radius, kind);
    if (src === this.ada && radius >= 200 && this.enemies.some((e) => e.enabled && !e.ko && Math.abs(e.x - x) < radius + 500)) {
      this.rings.push({ x, y, r: 10, max: Math.min(radius, 520), a: 0.3 });
    }
  }

  drawRings(dt) {
    const g = this.ringG;
    g.clear();
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += (r.max - r.r) * Math.min(1, dt * 5) + dt * 40;
      r.a -= dt * 0.5;
      if (r.a <= 0) { this.rings.splice(i, 1); continue; }
      g.lineStyle(2, 0xf6ece4, r.a);
      g.strokeCircle(r.x, r.y, r.r);
    }
  }

  // ------------------------------------------------------------ particles
  spawnPart(key, x, y, vx, vy, life, o = {}) {
    let p = this.partPool.pop();
    if (!p) p = { img: this.add.image(0, 0, key).setDepth(47) };
    p.img.setTexture(key).setVisible(true).setPosition(x, y).setAlpha(o.alpha ?? 1).setScale(o.scale ?? 0.5).setRotation(Math.random() * 6);
    p.img.setBlendMode(o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    if (o.tint) p.img.setTint(o.tint); else p.img.clearTint();
    Object.assign(p, { x, y, vx, vy, life, max: life, g: o.g ?? 900, a0: o.alpha ?? 1, spin: (Math.random() - 0.5) * 8, grow: o.grow || 0, ground: o.ground ?? null });
    this.parts.push(p);
  }

  updateParticles(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { p.img.setVisible(false); this.parts.splice(i, 1); this.partPool.push(p); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.ground !== null && p.y > p.ground) { p.y = p.ground; p.vy *= -0.3; p.vx *= 0.6; }
      p.img.setPosition(p.x, p.y);
      p.img.rotation += p.spin * dt;
      p.img.setAlpha(p.a0 * Math.min(1, p.life / (p.max * 0.5)));
      if (p.grow) p.img.setScale(p.img.scale + p.grow * dt);
    }
  }

  dust(x, y, n = 6, spread = 30) {
    for (let i = 0; i < n; i++) this.spawnPart('dust', x + (Math.random() - 0.5) * spread, y - Math.random() * 10, (Math.random() - 0.5) * 80, -20 - Math.random() * 40, 0.6 + Math.random() * 0.5, { g: -10, scale: 1 + Math.random(), alpha: 0.6, grow: 1.2 });
  }

  sparks(x, y, dir) {
    for (let i = 0; i < 7; i++) this.spawnPart('spark', x, y, dir * (120 + Math.random() * 260), -80 - Math.random() * 200, 0.22 + Math.random() * 0.15, { add: true, tint: 0xffe2b0, scale: 0.9, g: 1200 });
  }

  // ------------------------------------------------------------ sounds
  sfx(name, k = 1, who = null) {
    this.snd.play(name, k, who && who !== this.ada ? { x: who.x ?? who.body.x, y: (who.y ?? who.body.y) - 60 } : null);
  }

  materialAt(x, y) { return this.map.regionAt(x, y - 10).material; }

  footstep(ada, loud) { this.snd.footstep(this.materialAt(ada.x, ada.y), loud, null); }

  enemyStep(e) { this.snd.footstep(this.materialAt(e.x, e.y), e.body.vx * e.body.vx > 30000, { x: e.x, y: e.y - 40 }, true); }

  bark(e, text) {
    this.ui.bark(e, text);
    this.sfx('bark', 1, e);
  }

  // ------------------------------------------------------------ combat hooks
  playerAttack(ada, r, C, kind) {
    let hit = false;
    for (const e of this.enemies) {
      if (!e.enabled || e.ko || ada.hitDone.has(e)) continue;
      if (!rectsOverlap(r, e.body.rect())) continue;
      ada.hitDone.add(e);
      if (e.takeHit(C.dmg, ada.facing, C.knock, kind, ada)) {
        hit = true;
        this.hitStop = COMBAT.hitStop * (kind === 'kick' ? 1.7 : 1);
        this.sfx('hit', kind === 'kick' ? 1.2 : 0.95, e);
        this.sparks(e.x - ada.facing * 6, e.y - (kind === 'kick' ? 70 : 95), ada.facing);
        if (kind === 'kick') this.cameras.main.shake(90, 0.004);
        this.noise(e.x, e.y - 60, NOISE.fight, 'fight', ada);
      }
    }
    // a wall like the others, at the end of the crypt; any other wall just knocks
    if (!ada.hitDone.has('wall')) {
      const w = this.secret;
      if (!w.broken && rectsOverlap(r, { x: w.x - 4, y: w.y, w: w.w, h: w.h })) {
        ada.hitDone.add('wall');
        this.hitWall(kind === 'kick' ? 2 : 1, ada);
      } else if (!hit && this.map.rectBlocked(r.x + (ada.facing > 0 ? r.w - 10 : 0), r.y + 10, 10, r.h - 20)) {
        ada.hitDone.add('wall');
        this.snd.play('block');
      }
    }
  }

  hitWall(dmg, ada) {
    const w = this.secret;
    w.hp -= dmg;
    w.shake = 0.25;
    this.hitStop = COMBAT.hitStop;
    this.snd.play('thud', 1);
    this.cameras.main.shake(80, 0.003);
    const hx = w.x + 2, hy = ada.y - 70;
    this.dust(hx, hy, 8, 20);
    for (let i = 0; i < 4; i++) this.spawnPart('stone', hx, hy, -60 - Math.random() * 120, -100 - Math.random() * 120, 1.2, { scale: 0.6 + Math.random() * 0.5, ground: ada.y - 4 });
    this.noise(w.x, w.y + 100, NOISE.wall, 'wall', ada);
    if (w.hp <= 0) this.breakWall(false);
  }

  breakWall(silent) {
    const w = this.secret;
    if (w.broken) return;
    w.broken = true;
    this.map.breakRect(w.x, w.y, w.x + w.w, w.y + w.h);
    this.flags.secret = true;
    if (silent) { this.cover.setVisible(false); return; }
    this.tweens.add({ targets: this.cover, alpha: 0, duration: 700, delay: 120, onComplete: () => this.cover.setVisible(false) });
    this.snd.play('collapse', 1);
    this.cameras.main.shake(380, 0.006);
    for (let i = 0; i < 26; i++) this.spawnPart('stone', w.x + Math.random() * w.w, w.y + Math.random() * w.h, (Math.random() - 0.3) * 260, -Math.random() * 240, 1.6 + Math.random(), { scale: 0.7 + Math.random() * 0.9, ground: w.y + w.h - 2 + Math.random() * 4 });
    for (let i = 0; i < 6; i++) this.dust(w.x + Math.random() * w.w, w.y + 30 + Math.random() * 110, 3, 30);
    this.noise(w.x, w.y + 100, NOISE.crack, 'crack', this.ada);
    this.ui.toast(t('toast.wall'), 3600);
    this.addDossier('passaggio');
    this.saveGame();
  }

  onAdaHit(e) {
    this.sfx('hit', 0.9, e);
    this.cameras.main.shake(110, 0.005);
    this.hitStop = COMBAT.hitStop;
    this.noise(e.x, e.y - 60, NOISE.fight, 'fight', e);
  }

  onAdaHurt() {
    this.ui.setResist(this.ada.resist);
    this.ui.hurtFlash();
    this.snd.play('hurt');
    if (this.heldCan) this.dropCan();
  }

  onAdaHeal() {
    this.ui.setResist(this.ada.resist);
    this.snd.play('heal');
  }

  onEnemyKO(e) {
    this.stats.kos++;
    this.ui.hideBark(e);
    this.sfx('ko', 1, e);
    this.noise(e.x, e.y - 40, NOISE.body, 'body', e);
    this.cameras.main.shake(140, 0.005);
    this.dust(e.x, e.y, 8, 70);
    this.saveGame();
  }

  onSuspicious(e) { if (!this.enemies.some((o) => o !== e && o.aware)) this.snd.play('suspicious'); }

  onAlert(e) {
    if (!this.enemies.some((o) => o !== e && o.aware && !o.ko)) this.stats.spotted++;
    this.snd.play('alert');
    if (e === this.recoverer && !this.recovSpoke) {
      this.recovSpoke = true;
      this.ui.bark(e, t('toast.recov'), 2600);
    }
    this.showHint('fight');
  }

  onLost() {}
  onCalm() { this.snd.play('calm'); }

  dangerNear(ada) {
    return this.enemies.some((e) => e.enabled && !e.ko && e.aware && Math.abs(e.x - ada.x) < 800);
  }

  pullOut(e) {
    const ada = this.ada;
    if (!ada.hide) return;
    ada.leaveHide();
    ada.body.vx = e.facing * 180;
    this.snd.play('rustle');
  }

  adaDown() {
    this.respawnT = 2.2;
    this.respawnDone = false;
    for (const e of this.enemies) if (e.enabled && !e.ko && e.aware) { e.bark('win', true); break; }
    this.ui.fade(true);
  }

  updateRespawn(dt) {
    this.respawnT -= dt;
    if (!this.respawnDone && this.respawnT < 1.2) {
      this.respawnDone = true;
      this.respawnAt(this.checkpoint);
      this.ui.toast(t('toast.respawn'), 3200);
    }
    if (this.respawnT <= 0.6 && !this.fadedIn) { this.fadedIn = true; this.ui.fade(false); }
    if (this.respawnT <= 0) { this.respawnT = 0; this.fadedIn = false; }
  }

  respawnAt(cp) {
    const ada = this.ada;
    if (this.heldCan) this.dropCan();
    ada.respawning = false;
    ada.resist = ADA.maxResist;
    ada.invuln = 1;
    ada.teleport(cp.x, cp.y);
    ada.facing = 1;
    this.ui.setResist(ada.resist);
    for (const e of this.enemies) if (e.enabled) e.reset();
    this.camX = ada.x; this.camY = ada.y - 200;
    this.ui.clearBarks();
  }

  restartCheckpoint() {
    if (this.mode !== 'play') return;
    this.respawnT = 1.6;
    this.respawnDone = false;
    this.ui.fade(true);
  }

  // ------------------------------------------------------------ people in the street
  updateNpcs(dt) {
    const ada = this.ada;
    for (const n of this.npcs) {
      n.clock += dt;
      const near = Math.abs(ada.x - n.x) < 260 && Math.abs(ada.y - n.y) < 60 && !ada.frozen && this.mode === 'play';
      const want = n.talking || near ? (sign(ada.x - n.x) || n.facing) : n.base;
      if (want !== n.facing) { n.turnT = (n.turnT || 0) + dt; if (n.turnT > 0.35) { n.facing = want; n.turnT = 0; n.img.setFlipX(n.facing < 0); } }
      else n.turnT = 0;
      const br = Math.sin(n.clock * (n.talking ? 3.4 : 2.0));
      n.img.scaleY = (1 / 3) * (1 + 0.006 * br);
      n.img.scaleX = (1 / 3) * (1 - 0.002 * br);
      n.img.y = n.y + 1 + (n.talking ? Math.abs(Math.sin(n.clock * 5)) * -0.6 : 0);
      n.rig.headPos.x = n.x; n.rig.headPos.y = n.y - n.h + 8;
      // passers-by say something when Ada goes by
      if (n.bark && near && Math.abs(ada.x - n.x) < 170) {
        n.barkT -= dt;
        const lines = tv(n.bark) || [];
        if (n.barkT <= 0 && n.barkI < lines.length) {
          this.ui.bark(n, lines[n.barkI], 3800);
          n.barkI++;
          n.barkT = 6;
        }
      }
    }
  }

  // ------------------------------------------------------------ interactions
  updateInteract() {
    const ada = this.ada;
    let best = null, bd = Infinity;
    const ok = ada.state === 'ground' && ada.body.onGround && !ada.frozen;
    const okHide = ok || ada.state === 'hidden';
    const L = this.level, F = this.flags;
    const consider = (it, d) => { if (d < bd) { bd = d; best = it; } };
    const same = (y) => Math.abs(ada.y - y) < 40;
    const dx = (x) => Math.abs(ada.x - x);
    if (ok && !this.heldCan) {
      for (const n of this.npcs) {
        if (n.talk && same(n.y) && dx(n.x) < 110) consider({ kind: 'talk', npc: n, act: n.id === 'fausto' ? 'talkFausto' : 'talkMarta' }, dx(n.x));
      }
      if (same(L.desk.y) && dx(L.desk.x) < 66) consider({ kind: 'desk', act: 'desk' }, dx(L.desk.x));
      if (!F.clue && same(600) && dx(L.jar.x) < 44) consider({ kind: 'shelf', act: 'shelf' }, dx(L.jar.x) - 5);
      if (same(L.panel.at) && dx(L.panel.x) < 44) consider({ kind: 'panel', act: 'panel' }, dx(L.panel.x));
      if (!this.pz.scraps.has(1) && same(L.basket.at) && dx(L.basket.x) < 36) consider({ kind: 'basket', act: 'basket' }, dx(L.basket.x) + 2);
      if (!F.trunk && same(L.trunk.at) && dx(L.trunk.x) < 70) consider({ kind: 'trunk', act: 'trunk' }, dx(L.trunk.x));
      if (!F.pala && Math.abs(ada.y - L.pala.y) < 30 && dx(L.pala.x) < L.pala.w / 2) consider({ kind: 'pala', act: F.trunk ? 'palaCompare' : 'palaLook' }, dx(L.pala.x) + 6);
      for (const s of this.scrapItems) {
        if (!this.pz.scraps.has(s.n) && same(s.at) && dx(s.x) < 40) consider({ kind: 'scrap', scrap: s, act: 'scrap' }, dx(s.x) - 4);
      }
      if (!F.sketch && Math.abs(ada.y - L.sketch.y) < 30 && dx(L.sketch.x) < 50) consider({ kind: 'sketch', act: 'sketch' }, dx(L.sketch.x));
      for (const c of this.cans) {
        if (c.state !== 'rest') continue;
        if (same(c.y) && dx(c.x) < 40) consider({ kind: 'pickup', can: c, act: 'can' }, dx(c.x) + 8);
      }
      for (const p of L.portals) {
        if (same(p.y) && dx(p.x) < p.w / 2) consider({ kind: 'portal', portal: p, act: p.act }, dx(p.x) + 4);
      }
      for (const ex of L.exits) {
        if (ex.act && same(ex.y) && dx(ex.x) < ex.w / 2) consider({ kind: 'exit', exit: ex, act: ex.act }, dx(ex.x));
      }
      const c = this.cart;
      if (same(c.y) && Math.abs(c.vx) < 20 && dx(c.x) < 70 && dx(c.x) > 28) consider({ kind: 'cart', act: 'cart' }, dx(c.x) + 12);
    }
    if (ok && this.heldCan) consider({ kind: 'throw', act: 'throw' }, 999);
    if (okHide && ada.state !== 'hidden') {
      for (const h of L.hides) {
        if (Math.abs(ada.y - h.y) > 40) continue;
        if (ada.x > h.x - 6 && ada.x < h.x + h.w + 6) consider({ kind: 'hide', spot: h, act: h.act }, Math.abs(ada.x - (h.x + h.w / 2)) + 20);
      }
    }
    if (ada.state === 'hidden') best = null;
    if (best && best.kind === 'cart') this.showHint('cart');
    this.ui.prompt(best ? t('act.' + best.act + '.l') : null, best ? t('act.' + best.act + '.v') : null);
    if (best && this.inp.pressed('action')) {
      this.inp.consume('action');
      this.interact(best);
    }
  }

  interact(it) {
    const ada = this.ada, L = this.level;
    const face = (x) => { ada.facing = sign(x - ada.x) || ada.facing; };
    switch (it.kind) {
      case 'talk': if (it.npc.id === 'fausto') this.talkFausto(); else this.talkMarta(); break;
      case 'desk':
        face(L.desk.x);
        ada.doBusy('examine', 0.6, (u) => A.reach(u), 0.34, () => this.examineDesk());
        break;
      case 'shelf':
        face(L.jar.x);
        ada.doBusy('examine', 0.62, (u) => A.reach(u), 0.34, () => this.openShelf());
        break;
      case 'panel':
        face(L.panel.x);
        ada.doBusy('examine', 0.6, (u) => A.reach(u), 0.34, () => this.examinePanel());
        break;
      case 'basket':
        face(L.basket.x);
        ada.doBusy('pickup', 0.5, (u) => A.pickup(u), 0.26, () => { this.snd.play('rustle'); this.gainScrap(1); });
        break;
      case 'trunk':
        face(L.trunk.x);
        ada.doBusy('pickup', 0.5, (u) => A.pickup(u), 0.3, () => this.openTrunk());
        break;
      case 'pala':
        face(L.pala.x);
        ada.doBusy('examine', 0.6, (u) => A.reach(u), 0.34, () => this.lookPala());
        break;
      case 'scrap':
        face(it.scrap.x);
        ada.doBusy('examine', 0.5, (u) => A.reach(u), 0.28, () => this.gainScrap(it.scrap.n));
        break;
      case 'sketch':
        face(L.sketch.x);
        ada.doBusy('examine', 0.6, (u) => A.pickup(u), 0.3, () => this.examineSketch());
        break;
      case 'pickup':
        face(it.can.x);
        ada.doBusy('pickup', 0.42, (u) => A.pickup(u), 0.2, () => {
          it.can.state = 'held';
          this.heldCan = it.can;
          it.can.img.setDepth(31);
          this.snd.play('pickup');
          this.showHint('throw');
        });
        break;
      case 'throw': {
        const up = this.inp.down('up');
        ada.doBusy('throw', 0.44, (u) => A.throwing(u), 0.22, () => this.throwCan(up));
        break;
      }
      case 'hide': {
        const h = it.spot;
        ada.body.x = clamp(ada.x, h.x + 14, h.x + h.w - 14);
        ada.enterHide(h);
        for (const e of this.enemies) {
          if (e.enabled && !e.ko && e.aware && e.seenT < 0.35 && Math.abs(e.x - ada.x) < 520) e.knowsHide = h;
        }
        break;
      }
      case 'portal': this.startPortal(it.portal); break;
      case 'exit':
        if (!this.flags.clue) { this.ui.toast(t('toast.notYet'), 3000); break; }
        this.finish(it.exit.id);
        break;
      case 'cart': {
        const dir = sign(this.cart.x - ada.x) || ada.facing;
        ada.facing = dir;
        ada.doBusy('push', 0.36, (u, tt) => A.push(tt), 0.14, () => {
          this.cart.vx = dir * 520;
          this.snd.play('thud', 0.6, { x: this.cart.x, y: this.cart.y - 30 });
          this.noise(this.cart.x, this.cart.y - 20, NOISE.cart, 'cart', ada);
        });
        break;
      }
      default: break;
    }
  }

  // Doors that lead to another place: fade out, move Ada, fade in.
  startPortal(p) {
    const to = this.level.portals.find((q) => q.id === p.to);
    if (!to) return;
    this.portalTo = to;
    this.portalT = 0.9;
    this.portalDone = false;
    this.snd.play('door', 0.8);
    this.ui.fade(true);
  }

  updatePortal(dt) {
    this.portalT -= dt;
    if (!this.portalDone && this.portalT < 0.45) {
      this.portalDone = true;
      const to = this.portalTo;
      this.ada.teleport(to.x, to.y);
      this.camX = to.x; this.camY = to.y - 200;
      this.ui.fade(false);
    }
    if (this.portalT <= 0) this.portalT = 0;
  }

  updateCart(dt) {
    const c = this.cart;
    if (Math.abs(c.vx) < 1) { c.vx = 0; return; }
    const dir = sign(c.vx);
    const nx = c.x + c.vx * dt;
    if (this.map.rectBlocked(nx + dir * 34 - 2, c.y - 40, 4, 30)) {
      c.vx = -c.vx * 0.25;
      this.snd.play('clang', 0.7, { x: c.x, y: c.y - 30 });
      this.cameras.main.shake(60, 0.002);
    } else c.x = nx;
    c.vx = Math.sign(c.vx) * Math.max(0, Math.abs(c.vx) - 360 * dt);
    c.img.x = c.x;
    c.img.y = c.y + 2 - Math.abs(Math.sin(c.x * 0.15)) * 1.2;
    c.img.setTint(this.lightAt(c.x, c.y - 40, null, true).tint);
    if (Math.abs(c.vx) > 160) {
      for (const e of this.enemies) {
        if (!e.enabled || e.ko || Math.abs(e.x - c.x) > 46 || Math.abs(e.y - c.y) > 40) continue;
        if (sign(e.x - c.x) !== dir) continue;
        e.takeHit(3, dir, 320, 'kick', this.ada);
        this.sfx('hit', 1.2, e);
        this.cameras.main.shake(120, 0.005);
        this.dust(e.x, e.y, 8, 50);
        c.vx *= 0.3;
      }
    }
  }

  throwCan(up) {
    const c = this.heldCan;
    if (!c) return;
    this.heldCan = null;
    const ada = this.ada;
    c.state = 'fly';
    c.x = ada.rig.handPos.x; c.y = ada.rig.handPos.y + 8;
    c.vx = ada.facing * (up ? 330 : 540);
    c.vy = up ? -720 : -360;
    c.bounces = 0;
    c.img.setDepth(15);
    this.snd.play('whoosh', 0.6);
  }

  dropCan() {
    const c = this.heldCan;
    if (!c) return;
    this.heldCan = null;
    c.state = 'fly'; c.vx = this.ada.facing * 60; c.vy = -120; c.bounces = 1;
    c.x = this.ada.rig.handPos.x; c.y = this.ada.rig.handPos.y;
    c.img.setDepth(15);
  }

  updateCans(dt) {
    const map = this.map;
    for (const c of this.cans) {
      if (c.state === 'held') {
        c.x = this.ada.rig.handPos.x; c.y = this.ada.rig.handPos.y + 10;
        c.img.setPosition(c.x, c.y);
        continue;
      }
      if (c.state !== 'fly') continue;
      c.vy = Math.min(c.vy + 1800 * dt, 1100);
      const nx = c.x + c.vx * dt;
      if (map.solidPoint(nx + sign(c.vx) * 5, c.y - 8)) c.vx *= -0.45; else c.x = nx;
      const ny = c.y + c.vy * dt;
      if (c.vy > 0) {
        const g = map.probeGround(c.x, c.y - 1, ny + 1, true);
        if (g !== null) {
          c.y = g;
          const loud = c.vy > 260;
          if (loud) {
            const water = this.materialAt(c.x, c.y) === 'water';
            this.snd.play(water ? 'splash' : 'clang', c.bounces ? 0.5 : 1, { x: c.x, y: c.y });
            if (!c.bounces) this.noise(c.x, c.y - 10, NOISE.throwLand, 'can', this.ada);
            c.vy = -c.vy * 0.32; c.vx *= 0.55; c.bounces++;
            if (c.bounces > 2) { c.vy = 0; c.state = 'rest'; }
          } else { c.vy = 0; c.vx = 0; c.state = 'rest'; }
        } else c.y = ny;
      } else {
        if (map.solidPoint(c.x, ny - 14)) c.vy = 0; else c.y = ny;
      }
      c.img.setPosition(c.x, c.y);
      c.img.rotation += c.vx * dt * 0.03;
      c.img.setTint(this.lightAt(c.x, c.y - 10, null, true).tint);
      if (c.state === 'rest') c.img.rotation = 0;
    }
  }

  // ------------------------------------------------------------ story beats
  faceEachOther(n) {
    const ada = this.ada;
    const side = sign(ada.x - n.x) || -1;
    if (Math.abs(ada.x - n.x) < 78) ada.body.x = n.x + side * 82;
    ada.body.vx = 0;
    ada.facing = -side;
    n.facing = side; n.img.setFlipX(n.facing < 0);
    n.talking = true;
  }

  talkFausto() {
    const f = this.fausto;
    this.faceEachOther(f);
    const first = !this.flags.fausto;
    this.ui.dialog(tv(first ? 'dlg.fausto1' : 'dlg.fausto2'), () => {
      f.talking = false;
      if (first) {
        this.flags.fausto = true;
        this.addDossier('fausto');
        if (!this.flags.desk && !this.flags.clue) this.objective('obj.lab');
        this.saveGame();
      }
    });
  }

  talkMarta() {
    const m = this.marta;
    this.faceEachOther(m);
    const first = !this.flags.marta;
    this.ui.dialog(tv(first ? 'dlg.marta1' : 'dlg.marta2'), () => {
      m.talking = false;
      if (first) {
        this.flags.marta = true;
        this.addDossier('marta');
        this.saveGame();
      }
    });
  }

  riddleCard() {
    return { art: 'note', sound: 'note', title: t('card.riddle.t'), text: t('card.riddle.x'), note: tv('riddle.lines').join('\n'), verse: true };
  }

  // Lale's desk: emptied, but with a note taped under the drawer (the riddle of the jars).
  examineDesk() {
    const first = !this.flags.desk;
    const cards = first
      ? [{ art: 'desk', title: t('card.desk.t'), text: t('card.desk.x'), note: t('card.desk.n') }, this.riddleCard()]
      : [{ art: 'desk', title: t('card.desk.t'), text: t('card.desk.x') }, this.riddleCard()];
    this.ui.examine(cards, () => {
      if (!first) return;
      this.flags.desk = true;
      this.flags.riddle = true;
      this.addDossier('desk', false);
      this.addDossier('riddle');
      if (!this.flags.clue) this.objective('obj.jars');
      this.saveGame();
    });
  }

  // The shelf of resins under the UV lamp: one jar hides the memory card.
  openShelf() {
    const L = this.level;
    this.ui.pz.openJars({
      riddle: this.flags.riddle,
      tried: this.pz.jarsTried,
      onPick: (i) => {
        if (i === JAR_ANSWER) return 'right';
        // a squeaky lid: whoever is near hears it
        this.pz.jarsTried.add(i);
        this.noise(L.jar.x, L.jar.y, NOISE.jar, 'jar', this.ada);
        this.saveGame();
        return 'wrong';
      },
      onDone: () => this.examineJar(),
    });
  }

  examineJar() {
    this.ui.examine([
      { art: 'jar', sound: 'clue', title: t('card.jar.t'), text: t('card.jar.x'), note: t('card.jar.n') },
      { art: 'card', title: t('card.card.t'), text: t('card.card.x'), note: t('card.card.n') },
    ], () => {
      this.flags.clue = true;
      this.jarGlow.setVisible(false);
      this.addDossier('scheda');
      this.objective('obj.exit');
      this.spawnRecoverer();
      this.snd.play('door', 0.8, { x: this.level.recoverer.x, y: 540 });
      this.ui.toast(t('toast.doorSlam'), 3400);
      this.saveGame();
    });
  }

  examineSketch() {
    this.ui.examine([{ art: 'sketch', sound: 'note', title: t('card.sketch.t'), text: t('card.sketch.x'), note: t('card.sketch.n') }], () => {
      this.flags.sketch = true;
      this.sketchImg.setVisible(false);
      this.addDossier('schizzo');
      this.saveGame();
    });
  }

  // The test panel on Lale's workbench: under UV light, four retouched digits (the trunk's code).
  examinePanel() {
    this.ui.examine([
      { art: 'panel', title: t('card.panel.t'), text: t('card.panel.x'), note: t('card.panel.n') },
      { art: 'panelUV', sound: 'note', title: t('card.panelUV.t'), text: t('card.panelUV.x'), note: t('card.panelUV.n') },
    ], () => {
      if (this.flags.panel) return;
      this.flags.panel = true;
      this.addDossier('tavoletta');
      this.saveGame();
    });
  }

  // The trunk in the loft, closed with a combination padlock.
  openTrunk() {
    this.ui.pz.openLock({
      digits: this.pz.lockDigits,
      onDone: () => {
        this.flags.trunk = true;
        this.ui.examine([{ art: 'photo', sound: 'clue', title: t('card.photo.t'), text: t('card.photo.x'), note: t('card.photo.n') }], () => {
          this.addDossier('baule');
          this.gainScrap(2);
          this.saveGame();
        });
      },
      onClose: () => this.saveGame(),
    });
  }

  // The altarpiece under its sheet on the scaffolding: compared with the 1998 photo, it is a copy.
  lookPala() {
    if (!this.flags.trunk) {
      this.ui.examine([{ art: 'pala', title: t('card.pala.t'), text: t('card.pala.x'), note: t('card.pala.n') }]);
      return;
    }
    this.ui.pz.openDiff({
      found: this.pz.diffFound,
      onFound: () => this.saveGame(),
      onDone: () => {
        this.flags.pala = true;
        this.addDossier('pala');
        this.saveGame();
      },
      onClose: () => this.saveGame(),
    });
  }

  // A piece of Lale's torn letter (1 basket, 2 trunk, 3 crypt, 4 aqueduct).
  gainScrap(n) {
    if (this.pz.scraps.has(n)) return;
    this.pz.scraps.add(n);
    const c = this.pz.scraps.size;
    const it = this.scrapItems.find((s) => s.n === n);
    if (it) it.img.setVisible(false);
    this.snd.play('page');
    this.ui.toast(t('toast.scrap', { n: c }), 3400);
    const act = c >= 4 && !this.flags.letter ? 'scraps' : null;
    if (!this.dossier.some((d) => d.id === 'foglio')) this.addDossier('foglio', false, { n: c }, act);
    else this.updateDossier('foglio', { n: c }, act);
    this.saveGame();
    if (c >= 4 && !this.flags.letter) setTimeout(() => { if (!this.ui.modal && this.mode === 'play' && this.sys.isActive()) this.openScraps(); }, 500);
  }

  openScraps() {
    if (this.pz.scraps.size < 4) return;
    this.ui.pz.openScraps({
      placed: this.pz.placed,
      onPlace: () => { if (this.pz.placed.size >= 4) this.letterDone(); else this.saveGame(); },
      onClose: () => this.saveGame(),
    });
  }

  letterDone() {
    if (this.flags.letter) return;
    this.flags.letter = true;
    this.updateDossier('foglio', { n: 4 }, null);
    this.addDossier('lettera');
    this.saveGame();
  }

  // The man sent to take the card back waits in the cloister.
  spawnRecoverer() {
    const r = this.recoverer, L = this.level;
    if (r.enabled) return;
    r.enable(L.recoverer.x, L.recoverer.y);
    r.facing = 1;
    r.setState('patrol');
  }

  // ------------------------------------------------------------ areas, hints, checkpoints, exits
  updateWorldTriggers(dt) {
    const ada = this.ada, L = this.level;
    const reg = this.map.regionAt(ada.x, ada.y - 30);
    if (reg !== this.region) {
      this.region = reg;
      this.snd.setRegion(reg.material, !!reg.sky, reg.id);
      if (reg.name && !this.areasSeen.has(reg.id)) { this.areasSeen.add(reg.id); this.ui.area(t(reg.name)); }
      if (reg.id === 'cloister' && !this.flags.fausto && !this.flags.desk && !this.flags.clue && this.objKey !== 'obj.lab') this.objective('obj.lab');
    }
    // hints, once each
    for (const h of L.hints) {
      if (this.hintsShown.has(h.id)) continue;
      if (ada.x < h.x0 || ada.x > h.x1) continue;
      if (h.y0 !== undefined && ada.y < h.y0) continue;
      if (h.y1 !== undefined && ada.y > h.y1) continue;
      if (h.id === 'talk' && this.flags.fausto) continue;
      if (h.id === 'lab' && (this.flags.desk || this.flags.clue)) { this.hintsShown.add(h.id); continue; }
      if (h.id === 'move' && !this.introDone) continue;
      this.showHint(h.id);
      if (h.id === 'crypt' && !this.flags.crypt) {
        this.flags.crypt = true;
        this.addDossier('casse', false);
      }
      break;
    }
    // checkpoints
    if (ada.body.onGround && ada.state !== 'down') {
      for (const c of L.checkpoints) {
        if (c === this.checkpoint) continue;
        if (ada.x < c.x0 || ada.x > c.x1) continue;
        if (c.y0 !== undefined && ada.y < c.y0) continue;
        if (c.y1 !== undefined && ada.y > c.y1) continue;
        this.checkpoint = c;
        this.saveGame();
        break;
      }
    }
    // leaving the convent through its door, with the card
    this.exitMsgT = Math.max(0, this.exitMsgT - dt);
    const door = L.exits.find((e) => e.id === 'portone');
    if (this.flags.clue && ada.state !== 'down' && ada.x < door.x1 && ada.x > door.x0 && ada.facing < 0 && Math.abs(ada.y - 600) < 10) this.finish('portone');
  }

  showHint(id) {
    if (this.hintsShown.has(id)) return;
    this.hintsShown.add(id);
    const h = tv('hint.' + id);
    if (!h) return;
    this.ui.toast(h.all || h[this.ui.device()] || h.kb, 5600);
  }

  objective(key, flash = true) {
    this.objKey = key;
    this.ui.objective(t(key), flash);
  }

  addDossier(id, notify = true, vars = null, act = null) {
    if (this.dossier.some((d) => d.id === id)) return;
    const e = { id, vars, act };
    this.dossier.push(e);
    this.ui.addDossier(e);
    if (notify) { this.snd.play('page'); this.ui.toast(t('toast.dossier', { t: t('dos.' + id + '.t', vars) }), 2600); }
  }

  updateDossier(id, vars, act) {
    const e = this.dossier.find((d) => d.id === id);
    if (!e) return;
    e.vars = vars; e.act = act;
    this.ui.updateDossier(id, vars, act);
  }

  finish(exitId) {
    if (this.mode === 'end') return;
    this.mode = 'end';
    const ada = this.ada;
    ada.frozen = true;
    this.ui.prompt(null);
    this.snd.play(exitId === 'giardino' ? 'gate' : 'door');
    this.clearSave();
    const s = this.stats, F = this.flags;
    const mm = Math.floor(s.time / 60), ss = Math.floor(s.time % 60);
    const secret = exitId === 'giardino';
    const solved = [F.clue, F.trunk, F.pala, F.letter].filter(Boolean).length;
    const found = (v) => (v ? t('end.found') : t('end.notFound'));
    const stats = [
      [t('end.time'), `${mm}:${String(ss).padStart(2, '0')}`],
      [t('end.spotted'), String(s.spotted)],
      [t('end.kos'), String(s.kos)],
      [t('end.puzzles'), `${solved}/4`],
      [t('end.secret'), found(F.secret)],
      [t('end.sketch'), found(F.sketch)],
    ];
    this.ui.fade(true);
    setTimeout(() => {
      this.ui.showEnd(t(secret ? 'end.titleSecret' : 'end.titleDoor'), t(secret ? 'end.textSecret' : 'end.textDoor'), stats);
      this.ui.fade(false);
    }, 900);
  }

  // ------------------------------------------------------------ misc
  syncDevice() {
    const d = this.inp.lastDevice;
    if (d === 'touch') this.ui.setTouch(true);
    else if ((d === 'keyboard' || d === 'pad') && this.inp.anyKey) this.ui.setTouch(false);
  }

  debugHook() {
    const scene = this;
    window.__sv = {
      scene,
      get ada() { return scene.ada; },
      get enemies() { return scene.enemies; },
      teleport(x, y) { scene.ada.teleport(x, y); scene.camX = x; scene.camY = y - 200; },
      // Test helper: advance the game by `sec` seconds at 60 steps per second, holding `keys` (key codes).
      run(sec, keys = []) {
        const inp = scene.inp;
        for (const k of keys) inp.keys.add(k);
        const n = Math.max(1, Math.round(sec * 60));
        for (let i = 0; i < n; i++) scene.update(0, 1000 / 60);
        for (const k of keys) inp.keys.delete(k);
        scene.update(0, 1000 / 60);
        return this.state();
      },
      tap(code) { return this.run(1 / 60, [code]); },
      state() {
        const a = scene.ada;
        return {
          mode: scene.mode, modal: scene.ui.modal, ada: { x: Math.round(a.x), y: Math.round(a.y), state: a.state, resist: a.resist, light: +a.light.toFixed(2), hide: a.hide ? a.hide.id : null },
          enemies: scene.enemies.map((e) => ({ id: e.id, state: e.state, S: +e.S.toFixed(2), x: Math.round(e.x), y: Math.round(e.y), hp: e.hp, enabled: e.enabled })),
          flags: { ...scene.flags }, checkpoint: scene.checkpoint.id, objective: scene.objKey,
          pz: { tried: [...scene.pz.jarsTried], lock: scene.pz.lockDigits.join(''), diff: [...scene.pz.diffFound], scraps: [...scene.pz.scraps], placed: [...scene.pz.placed] },
          prompt: scene.ui.promptLabel,
        };
      },
    };
  }
}
