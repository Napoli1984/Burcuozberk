// The level-5 prototype: the convent of San Domenico at night.
import { TILE, NOISE, COMBAT, ADA } from './config.js';
import { buildLevel5, T } from './level5.js';
import { TileMap } from './tilemap.js';
import { paintCharacters } from './art/chars.js';
import { paintWorld, CHUNK } from './art/world.js';
import { paintProps } from './art/props.js';
import { Ada } from './ada.js';
import { Enemy } from './enemy.js';
import { Rig } from './rig.js';
import { A } from './anim.js';
import { clamp, lerp, damp, sign, rectsOverlap, rgbToHex, safeStorage } from './util.js';

const SAVE_KEY = 'bo-sv-proto';
const MEN_FEET = [[-5.8, 8.2], [13.5, 8.2]];

const HINTS = {
  move: { kb: 'Muoviti con A e D (o con le frecce). Spazio per saltare.', touch: 'Muoviti con la levetta a sinistra. Salta con il tasto grande a destra.', pad: 'Muoviti con la levetta. A per saltare.' },
  talk: { kb: 'Avvicinati al restauratore e premi E per parlare.', touch: 'Avvicinati al restauratore e tocca Parla.', pad: 'Avvicinati al restauratore e premi RB per parlare.' },
  sneak: { kb: 'Tieni Maiusc per camminare piano, S per accovacciarti: se corri, la guardia ti sente.', touch: 'Inclina poco la levetta per camminare piano, in basso per accovacciarti: se corri, la guardia ti sente.', pad: 'Inclina poco la levetta per camminare piano, in basso per accovacciarti: se corri, la guardia ti sente.' },
  observe: { kb: 'Tieni premuto Q per osservare: vedi più lontano e studi il giro della guardia.', touch: 'Tieni premuto l’occhio in alto per osservare il giro della guardia.', pad: 'Tieni premuto LB per osservare il giro della guardia.' },
  hide: { all: 'Nella siepe la guardia non ti vede. Basta che non ti veda entrare.' },
  ladder: { kb: 'W o ↑ per salire la scala: dalla loggia si entra nel laboratorio dall’alto.', touch: 'Levetta in su per salire la scala: dalla loggia si entra nel laboratorio dall’alto.', pad: 'Levetta in su per salire la scala: dalla loggia si entra nel laboratorio dall’alto.' },
  lab: { all: 'Cerca dove lavorava Lale.' },
  ledge: { kb: 'Salta verso un bordo per aggrapparti, poi W per salire.', touch: 'Salta verso un bordo per aggrapparti, poi levetta in su per salire.', pad: 'Salta verso un bordo per aggrapparti, poi levetta in su per salire.' },
  crypt: { all: 'La cripta. Le casse portano tutte la sigla «PA».' },
  fight: { kb: 'J pugno, K calcio, L per rotolare via. Puoi anche scappare: lui non sa arrampicarsi.', touch: 'Pugno, Calcio e Schiva sono a destra. Puoi anche scappare: lui non sa arrampicarsi.', pad: 'X pugno, Y calcio, B per rotolare via. Puoi anche scappare: lui non sa arrampicarsi.' },
  throw: { kb: 'E per lanciare la lattina: il rumore attira chi è vicino. Tieni W per lanciarla più in alto.', touch: 'Tocca Lancia: il rumore attira chi è vicino. Levetta in su per lanciarla più in alto.', pad: 'RB per lanciare la lattina: il rumore attira chi è vicino.' },
};

const FRONT = { 'siepe-1': 'front-hedge', 'siepe-2': 'front-hedge', 'siepe-3': 'front-hedgeWide', tela: 'front-canvas', tenda: 'front-curtain', casse: 'front-crates' };

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  create(data = {}) {
    const reg = this.game.registry;
    this.ui = reg.get('ui');
    this.inp = reg.get('inp');
    this.snd = reg.get('snd');
    this.store = safeStorage();
    this.mode = data.mode || 'title';
    this.level = buildLevel5();
    this.map = new TileMap(this.level);
    this.paint();
    this.buildWorld();
    this.buildActors();
    this.buildEffects();
    this.setupState(data);
    this.setupCamera();
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.onResize, this); });
    this.onResize();
    this.debugHook();
    window.__ready = true;
  }

  // ------------------------------------------------------------ painting (only the first time)
  paint() {
    const reg = this.game.registry;
    if (reg.get('painted')) { this.chars = reg.get('chars'); this.art = reg.get('art'); return; }
    paintProps(this);
    this.chars = paintCharacters(this);
    const art = paintWorld(this, this.level, this.map);
    art.chunks.forEach((c, i) => this.textures.addCanvas('chunk' + i, c));
    if (art.wall.canvas) this.textures.addCanvas('wall', art.wall.canvas);
    this.textures.addCanvas('cover', art.cover.canvas);
    this.textures.addCanvas('sky', art.sky);
    this.textures.addCanvas('far', art.far);
    for (const k in art.front) this.textures.addCanvas('front-' + k, art.front[k]);
    art.fg.forEach((f, i) => this.textures.addCanvas('fg' + i, f.canvas));
    this.art = { chunks: art.chunks.length, cover: { x: art.cover.x, y: art.cover.y }, wall: { x: art.wall.x, y: art.wall.y, w: art.wall.canvas ? art.wall.canvas.width : 0, h: art.wall.canvas ? art.wall.canvas.height : 0 }, fg: art.fg.map((f) => ({ x: f.x, y: f.y, sf: f.sf, w: f.canvas.width, h: f.canvas.height })) };
    reg.set('chars', this.chars);
    reg.set('art', this.art);
    reg.set('painted', true);
  }

  buildWorld() {
    const L = this.level;
    this.add.image(0, -40, 'sky').setOrigin(0).setScrollFactor(0.06, 0.12).setDepth(0);
    this.add.image(-60, 240, 'far').setOrigin(0).setScrollFactor(0.25, 0.42).setDepth(1);
    for (let i = 0; i < this.art.chunks; i++) this.add.image(i * CHUNK, 0, 'chunk' + i).setOrigin(0).setDepth(10);
    const w = this.art.wall;
    this.wallImg = this.add.image(w.x, w.y, 'wall').setOrigin(0).setDepth(11);
    this.cover = this.add.image(this.art.cover.x, this.art.cover.y, 'cover').setOrigin(0).setDepth(12);
    this.wall = { x: w.x, y: w.y, w: w.w || 80, h: w.h || 240, hp: 3, broken: false, shake: 0 };
    // props
    this.cart = this.add.image(L.cart.x, L.ground + 2, 'cart').setOrigin(0.5, 1).setScale(0.5).setDepth(15);
    this.jarImg = this.add.image(L.jar.x, L.jar.y, 'jar').setOrigin(0.5, 1).setScale(0.5).setDepth(15);
    // dammar resin glows pale green under the UV lamp
    this.jarGlow = this.add.image(L.jar.x, L.jar.y - 11, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(16).setTint(0xc8ffb0).setScale(0.42).setAlpha(0.5);
    this.sketchImg = this.add.image(L.sketch.x, L.sketch.y, 'sketch').setOrigin(0.5, 1).setScale(0.5).setDepth(15);
    this.cans = L.cans.map((c, i) => ({ id: 'can' + i, x: c.x, y: c.y, vx: 0, vy: 0, state: 'rest', img: this.add.image(c.x, c.y, 'can').setOrigin(0.5, 1).setScale(0.5).setDepth(15) }));
    // things Ada can hide behind, drawn in front of her
    for (const h of L.hides) {
      h.img = this.add.image(h.x + h.w / 2, h.y + h.h + 4, FRONT[h.id]).setOrigin(0.5, 1).setDepth(35);
    }
    // dark shapes close to the camera
    this.art.fg.forEach((f, i) => {
      // Foreground silhouettes are not used: in a cut-away view they read as dark blobs over the floor.
      void f; void i;
    });
    // light glows that flicker over the painted ones
    this.glows = L.lights.map((l) => {
      const g = this.add.image(l.x, l.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(45);
      g.setScale((l.r * 1.6) / 128);
      g.setTint(rgbToHex(l.color[0], l.color[1], l.color[2]));
      const base = l.i * 0.26;
      g.setAlpha(base);
      return { l, g, base, flick: /candle|lantern|lamp|bulb|street|gate/.test(l.id), seed: Math.random() * 10 };
    });
  }

  buildActors() {
    const L = this.level, C = this.chars;
    this.ada = new Ada(this, L.start.x, L.start.y, C.ada);
    this.fausto = { rig: new Rig(this, C.fausto, { rest: A.idle(0, 'man'), footPts: MEN_FEET }), x: L.npc.x, y: L.npc.y, facing: -1, clock: 0, talking: false, light: 0.5 };
    this.fausto.rig.setDepth(22);
    const g = L.guard;
    this.guard = new Enemy(this, C.guard, {
      id: 'guard', kind: 'guard', x: g.x, y: g.y, hp: 7, lantern: true, depth: 25, facing: 1,
      route: [{ x: g.patrol[0], wait: 2.6 }, { x: g.x, wait: 1.4 }, { x: g.patrol[1], wait: 2.6 }], routeI: 2,
    });
    const r = L.recoverer;
    this.recoverer = new Enemy(this, C.recoverer, {
      id: 'recov', kind: 'recoverer', x: r.x, y: r.y, hp: 5, depth: 24, facing: -1, enabled: false, state: 'idle',
      route: [{ x: r.x - 100, wait: 2 }, { x: r.x + 190, wait: 2 }],
    });
    this.enemies = [this.guard, this.recoverer];
    this.lantern = { x: 0, y: 0, r: 300, i: 0.75, color: [255, 200, 130] };
    this.lanternGlow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(45).setTint(0xffc884).setScale(1.7).setAlpha(0.26);
    for (const e of this.enemies) {
      e.icon = this.add.image(0, 0, 'icon-q').setScale(0.5).setDepth(48).setVisible(false);
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

  // ------------------------------------------------------------ game state, saving
  setupState(data) {
    const L = this.level;
    this.flags = { fausto: false, desk: false, clue: false, sketch: false, secret: false, crypt: false };
    this.stats = { time: 0, spotted: 0, kos: 0 };
    this.dossier = [];
    this.objectiveText = '';
    this.hintsShown = new Set();
    this.areasSeen = new Set();
    this.checkpoint = L.checkpoints[0];
    this.region = null;
    this.hitStop = 0;
    this.respawnT = 0;
    this.endT = 0;
    this.exitMsgT = 0;
    this.camLook = 0;
    this.camZoomCur = 1;
    this.tension = 0;
    this.knockT = 0;
    this.titleT = 0;
    this.ui.setDossier([]);
    this.ui.clearBarks();
    this.ui.prompt(null);
    this.ui.fade(false);
    this.addDossier('lale', 'Lale Aydın', 'Restauratrice, amica di Ada. Non risponde da tre giorni. Lavorava qui, nel laboratorio di restauro del convento di San Domenico.', false);

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
    else this.objective('Parla con Fausto, il restauratore.', false);
    this.ui.setResist(this.ada.resist);
    if (save || data.skipIntro) {
      this.ui.startPlay();
      if (save) this.ui.toast('Riprendi dal checkpoint.', 2600);
      this.introDone = true;
    } else {
      this.ada.frozen = true;
      this.ui.showIntro(() => { this.ui.startPlay(); this.ada.frozen = false; this.introDone = true; this.showHint('move'); });
    }
  }

  saveGame() {
    if (this.mode !== 'play' || !this.store) return;
    const s = {
      v: 1, cp: this.checkpoint.id, flags: this.flags, stats: this.stats, dossier: this.dossier, objective: this.objectiveText,
      hints: [...this.hintsShown], areas: [...this.areasSeen],
      enemies: this.enemies.map((e) => ({ id: e.id, ko: e.ko, x: e.body.x, y: e.body.y, enabled: e.enabled })),
      cans: this.cans.map((c) => ({ x: c.x, y: c.y })),
    };
    try { this.store.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  loadSave() {
    if (!this.store) return null;
    try { const s = JSON.parse(this.store.getItem(SAVE_KEY) || 'null'); return s && s.v === 1 ? s : null; } catch (e) { return null; }
  }

  clearSave() { try { this.store && this.store.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  applySave(s) {
    Object.assign(this.flags, s.flags || {});
    Object.assign(this.stats, s.stats || {});
    for (const d of s.dossier || []) this.addDossier(d.id, d.title, d.text, false);
    (s.hints || []).forEach((h) => this.hintsShown.add(h));
    (s.areas || []).forEach((a) => this.areasSeen.add(a));
    this.objective(s.objective || 'Raggiungi il laboratorio di Lale, in fondo al chiostro.', false);
    const cp = this.level.checkpoints.find((c) => c.id === s.cp) || this.level.checkpoints[0];
    this.checkpoint = cp;
    this.ada.teleport(cp.x, cp.y);
    if (this.flags.secret) this.breakWall(true);
    if (this.flags.clue) { this.jarGlow.setVisible(false); this.spawnRecoverer(true); }
    if (this.flags.sketch) this.sketchImg.setVisible(false);
    (s.cans || []).forEach((c, i) => { if (this.cans[i]) { this.cans[i].x = c.x; this.cans[i].y = c.y; this.cans[i].img.setPosition(c.x, c.y); } });
    for (const es of s.enemies || []) {
      const e = this.enemies.find((x) => x.id === es.id);
      if (!e) continue;
      if (es.enabled && !e.enabled) e.enable(es.x, es.y);
      if (es.ko) { e.body.x = es.x; e.body.y = es.y; e.hp = 0; e.setState('ko'); e.t = 5; }
    }
  }

  // ------------------------------------------------------------ camera
  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.level.width, this.level.height);
    cam.setBackgroundColor('#07060c');
    if (this.mode === 'title') {
      this.camX = 1250; this.camY = 690;
    } else {
      this.camX = this.ada.x + this.ada.facing * 80;
      this.camY = this.ada.y - 205;
    }
    cam.centerOn(this.camX, this.camY);
  }

  onResize() {
    const cam = this.cameras.main;
    const gs = this.scale.gameSize;
    cam.setSize(gs.width, gs.height);
    const rect = this.game.canvas.getBoundingClientRect();
    this.canvasRect = rect;
    // small phone screens: a little closer
    this.baseZoom = rect.height < 470 ? 1.12 : 1;
  }

  toScreen(x, y) {
    const cam = this.cameras.main;
    const sx = (x - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2;
    const sy = (y - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2;
    const r = this.canvasRect || this.game.canvas.getBoundingClientRect();
    return { x: r.left + sx * r.width / cam.width, y: r.top + sy * r.height / cam.height };
  }

  updateCamera(dt, observing) {
    const cam = this.cameras.main;
    const ada = this.ada;
    let tx, ty, tz = this.baseZoom;
    if (this.mode === 'title') {
      this.titleT += dt;
      tx = 1300 + Math.sin(this.titleT * 0.05) * 560;
      ty = 690;
    } else {
      if (observing) {
        const ax = this.inp.axisX, ay = this.inp.axisY;
        const dir = Math.abs(ax) > 0.3 ? sign(ax) : ada.facing;
        this.camLook = lerp(this.camLook, dir * 360, damp(3, dt));
        this.camLookY = lerp(this.camLookY || 0, (Math.abs(ay) > 0.3 ? sign(ay) : 0) * 200, damp(3, dt));
        tz = this.baseZoom * 0.84;
      } else {
        const lead = ada.facing * 80 + clamp(ada.body.vx * 0.22, -70, 70);
        this.camLook = lerp(this.camLook, lead, damp(2.2, dt));
        this.camLookY = lerp(this.camLookY || 0, 0, damp(3, dt));
      }
      tx = ada.x + this.camLook;
      ty = ada.y - 205 + this.camLookY;
    }
    this.camZoomCur = lerp(this.camZoomCur, tz, damp(4, dt));
    cam.setZoom(this.camZoomCur);
    this.camX = lerp(this.camX, tx, damp(this.mode === 'title' ? 1 : 7, dt));
    this.camY = lerp(this.camY, ty, damp(this.mode === 'title' ? 1 : 5, dt));
    cam.centerOn(this.camX, this.camY);
    this.snd.listener.x = cam.scrollX + cam.width / 2;
    this.snd.listener.y = cam.scrollY + cam.height / 2;
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
      this.ada.update(rawDt, inp);
      this.updateCamera(rawDt, false);
      this.updateVisuals(rawDt);
      return;
    }

    if (ui.blocked) {
      if (ui.modal === 'dialog' || ui.modal === 'examine' || ui.modal === 'intro' || ui.modal === 'dossier' || ui.modal === 'pause' || ui.modal === 'controls') {
        if (inp.pressed('action') || inp.pressed('jump') || inp.pressed('punch')) ui.advance();
        else if (inp.pressed('pause') || inp.pressed('dodge')) ui.back();
        else if (inp.pressed('dossier') && ui.modal === 'dossier') ui.back();
      }
      this.updateFausto(rawDt);
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
    this.updateFausto(dt);
    this.updateCans(dt);
    this.updateInteract();
    this.updateWorldTriggers(dt);
    // music follows the most worried man
    let ten = 0;
    for (const e of this.enemies) {
      if (!e.enabled || e.ko) continue;
      if (e.aware) ten = 2; else if ((e.state === 'suspicious' || e.state === 'search') && ten < 1) ten = 1;
    }
    this.snd.setTension(ten);
  }

  // ------------------------------------------------------------ light
  lightAt(x, y, withLantern = true) {
    const reg = this.map.regionAt(x, y);
    const amb = reg.ambient;
    const k0 = 0.3 + amb * 1.3;
    let r = (reg.color[0] / 255) * k0, g = (reg.color[1] / 255) * k0, b = (reg.color[2] / 255) * k0;
    let lvl = amb;
    const add = (L, isStatic) => {
      const dx = x - L.x, dy = y - L.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > L.r * L.r) return;
      const d = Math.sqrt(d2);
      let c = L.i * Math.pow(1 - d / L.r, 1.6);
      if (isStatic && this.map.raycast(L.x, L.y, x, y, 16) < 0.97) c *= 0.12;
      lvl += c;
      r += (L.color[0] / 255) * c * 1.25; g += (L.color[1] / 255) * c * 1.25; b += (L.color[2] / 255) * c * 1.25;
    };
    for (const L of this.level.lights) add(L, true);
    if (withLantern && this.guard.enabled && !this.guard.ko) add(this.lantern, true);
    return { lvl: clamp(lvl, 0.35, 1), tint: rgbToHex(clamp(r, 0.12, 1) * 255, clamp(g, 0.12, 1) * 255, clamp(b, 0.12, 1) * 255) };
  }

  computeLight() {
    const ada = this.ada;
    const l = this.lightAt(ada.x, ada.y - 64);
    ada.light = l.lvl;
    ada.tint = l.tint;
  }

  // ------------------------------------------------------------ visuals every frame
  updateVisuals(dt, paused = false) {
    const t = this.time.now / 1000;
    // tint everyone by the light around them
    const ada = this.ada;
    const la = this.lightAt(ada.x, ada.y - 64);
    ada.rig.setTint(la.tint);
    if (this.heldCan) this.heldCan.img.setTint(la.tint);
    for (const e of this.enemies) {
      if (!e.enabled) continue;
      const l = this.lightAt(e.x, e.y - 64, e !== this.guard);
      e.light = l.lvl;
      e.rig.setTint(e === this.guard ? brighten(l.tint, 0.18) : l.tint);
      // icons above heads
      const ic = e.icon;
      if (e.iconKind && !e.ko) {
        ic.setVisible(true);
        ic.setTexture('icon-' + e.iconKind);
        const bob = Math.sin(t * 6) * 2;
        ic.setPosition(e.rig.headPos.x, e.rig.headPos.y - 30 + bob);
        const s = e.iconKind === 'q' ? 0.36 + 0.18 * e.iconAmt : 0.56;
        ic.setScale(s);
        ic.setAlpha(e.iconKind === 'q' ? 0.55 + 0.45 * e.iconAmt : 1);
      } else ic.setVisible(false);
    }
    const fl = this.lightAt(this.fausto.x, this.fausto.y - 64, false);
    this.fausto.rig.setTint(fl.tint);
    // flickering glows
    for (const g of this.glows) {
      if (!g.flick) continue;
      const f = 0.86 + 0.08 * Math.sin(t * 7.3 + g.seed) + 0.06 * Math.sin(t * 17.1 + g.seed * 3);
      g.g.setAlpha(g.base * f);
    }
    // the guard's lantern
    const gd = this.guard;
    if (gd.enabled && !gd.ko) {
      const lp = gd.rig.lanternPos;
      this.lantern.x = lp.x; this.lantern.y = lp.y + 6;
      this.lanternGlow.setVisible(true).setPosition(lp.x, lp.y + 6);
      this.lanternGlow.setAlpha(0.24 + 0.04 * Math.sin(t * 11));
    } else if (gd.ko) {
      const lp = gd.rig.lanternPos;
      this.lanternGlow.setPosition(lp.x, lp.y + 6).setAlpha(0.14);
      this.lantern.x = lp.x; this.lantern.y = lp.y;
    }
    this.drawCones();
    if (this.jarGlow.visible) this.jarGlow.setAlpha(0.38 + 0.12 * Math.sin(t * 2.2));
    // wall shake
    if (this.wall.shake > 0) {
      this.wall.shake -= dt;
      this.wallImg.x = this.wall.x + Math.sin(this.wall.shake * 90) * 3 * (this.wall.shake / 0.25);
    }
    this.updateParticles(paused ? 0 : dt);
    this.drawRings(paused ? 0 : dt);
  }

  drawCones() {
    const g = this.coneG;
    g.clear();
    for (const e of this.enemies) {
      if (!e.enabled || e.ko || !e.lantern) continue;
      const o = e.eye;
      const range = e.coneRange;
      const col = e.aware ? 0xff5040 : (e.state === 'suspicious' || e.state === 'search' || e.S > 0.15) ? 0xffbf55 : 0xffd9a0;
      const N = 20;
      const rays = [];
      for (let i = 0; i <= N; i++) {
        const a = e.tilt - e.half + (2 * e.half * i) / N;
        const dx = Math.cos(a) * e.facing, dy = Math.sin(a);
        const f = this.map.raycast(o.x, o.y, o.x + dx * range, o.y + dy * range, 10);
        rays.push([dx, dy, f * range]);
      }
      const layers = [[1, 0.05], [0.7, 0.05], [0.42, 0.06]];
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
    // a faint ring shows Ada how far her noise carries, when someone could hear it
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

  footstep(ada, loud) {
    this.snd.footstep(this.materialAt(ada.x, ada.y), loud, null);
  }

  enemyStep(e) {
    this.snd.footstep(this.materialAt(e.x, e.y), e.body.vx * e.body.vx > 30000, { x: e.x, y: e.y - 40 }, true);
  }

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
        if (!this.hintsShown.has('fight') && e.kind === 'recoverer') this.showHint('fight');
      }
    }
    // the hollow wall in the crypt, and a dull knock on any other wall
    if (!ada.hitDone.has('wall')) {
      const w = this.wall;
      if (!w.broken && rectsOverlap(r, { x: w.x, y: w.y, w: w.w, h: w.h })) {
        ada.hitDone.add('wall');
        this.hitWall(kind === 'kick' ? 2 : 1, ada);
      } else if (!hit && this.map.rectBlocked(r.x + (ada.facing > 0 ? r.w - 10 : 0), r.y + 10, 10, r.h - 20)) {
        ada.hitDone.add('wall');
        this.snd.play('block');
      }
    }
  }

  hitWall(dmg, ada) {
    const w = this.wall;
    w.hp -= dmg;
    w.shake = 0.25;
    this.hitStop = COMBAT.hitStop;
    this.snd.play('thud', 1);
    this.cameras.main.shake(80, 0.003);
    const hx = w.x + 4, hy = ada.y - 70;
    this.dust(hx, hy, 8, 20);
    for (let i = 0; i < 4; i++) this.spawnPart('stone', hx, hy, -60 - Math.random() * 120, -100 - Math.random() * 120, 1.2, { scale: 0.6 + Math.random() * 0.5, ground: ada.y - 4 });
    this.noise(w.x, w.y + 120, NOISE.wall, 'wall', ada);
    if (w.hp <= 0) this.breakWall(false);
  }

  breakWall(silent) {
    const w = this.wall;
    if (w.broken) return;
    w.broken = true;
    this.map.breakRect(102, 25, 103, 30);
    this.flags.secret = true;
    if (silent) { this.wallImg.setVisible(false); this.cover.setVisible(false); return; }
    this.wallImg.setVisible(false);
    this.tweens.add({ targets: this.cover, alpha: 0, duration: 900, delay: 250, onComplete: () => this.cover.setVisible(false) });
    this.snd.play('collapse', 1);
    this.cameras.main.shake(380, 0.006);
    for (let i = 0; i < 26; i++) this.spawnPart('stone', w.x + Math.random() * w.w, w.y + Math.random() * w.h, (Math.random() - 0.3) * 260, -Math.random() * 240, 1.6 + Math.random(), { scale: 0.7 + Math.random() * 0.9, ground: 1240 - 2 + Math.random() * 4 });
    for (let i = 0; i < 6; i++) this.dust(w.x + Math.random() * w.w, w.y + 60 + Math.random() * 170, 3, 30);
    this.noise(w.x, w.y + 120, NOISE.crack, 'crack', this.ada);
    this.ui.toast('Dietro il muro c’è un passaggio.', 3600);
    this.addDossier('passaggio', 'Un passaggio sotto la chiesa', 'In fondo alla cripta un muro sottile chiudeva un vecchio passaggio verso l’acquedotto.');
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
      this.ui.toast('Ada riprende fiato. Si ricomincia dall’ultimo checkpoint.', 3200);
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
    const L = this.level;
    this.guard.reset(L.guard.x, L.guard.y);
    this.guard.routeI = 2;
    if (this.recoverer.enabled) this.recoverer.reset(L.recoverer.x, L.recoverer.y);
    this.camX = ada.x; this.camY = ada.y - 205;
    this.ui.clearBarks();
  }

  restartCheckpoint() {
    if (this.mode !== 'play') return;
    this.respawnT = 1.6;
    this.respawnDone = false;
    this.ui.fade(true);
  }

  // ------------------------------------------------------------ Fausto
  updateFausto(dt) {
    const f = this.fausto;
    f.clock += dt;
    const ada = this.ada;
    if (Math.abs(ada.x - f.x) < 320 && !ada.frozen) f.facing = sign(ada.x - f.x) || f.facing;
    let pose = A.idle(f.clock, 'man');
    if (f.talking) {
      pose = A.idle(f.clock, 'man');
      pose.uaF = 30 + Math.sin(f.clock * 3.1) * 18; pose.faF = 70 + Math.sin(f.clock * 2.3) * 20; pose.head = -4 + Math.sin(f.clock * 1.7) * 4;
    } else {
      pose.uaB = -8; pose.faB = 92; pose.uaF = 8; pose.faF = 90; // hands joined behind, like an old man waiting
    }
    f.rig.facing = f.facing;
    f.rig.update(pose, f.x, f.y, dt, damp(8, dt), { vx: 0, vy: 0, t: f.clock });
  }

  // ------------------------------------------------------------ interactions
  updateInteract() {
    const ada = this.ada;
    let best = null, bd = Infinity;
    const ok = ada.state === 'ground' && ada.body.onGround && !ada.frozen;
    const okHide = ok || ada.state === 'hidden';
    const L = this.level;
    const consider = (it, d) => { if (d < bd) { bd = d; best = it; } };
    if (ok && !this.heldCan) {
      const same = (y) => Math.abs(ada.y - y) < 46;
      const f = this.fausto;
      if (same(f.y) && Math.abs(ada.x - f.x) < 110) consider({ kind: 'talk', label: 'Parla con Fausto' }, Math.abs(ada.x - f.x));
      if (same(L.ground) && Math.abs(ada.x - L.desk.x) < 62) consider({ kind: 'desk', label: 'Esamina la scrivania' }, Math.abs(ada.x - L.desk.x));
      if (!this.flags.clue && same(L.ground) && Math.abs(ada.x - L.jar.x) < 42) consider({ kind: 'jar', label: 'Esamina il barattolo' }, Math.abs(ada.x - L.jar.x) - 5);
      if (!this.flags.sketch && same(L.sketch.y) && Math.abs(ada.x - L.sketch.x) < 50) consider({ kind: 'sketch', label: 'Guarda il foglio' }, Math.abs(ada.x - L.sketch.x));
      for (const c of this.cans) {
        if (c.state !== 'rest') continue;
        if (same(c.y) && Math.abs(ada.x - c.x) < 40) consider({ kind: 'pickup', can: c, label: 'Raccogli la lattina' }, Math.abs(ada.x - c.x) + 8);
      }
    }
    if (ok && this.heldCan) consider({ kind: 'throw', label: 'Lancia la lattina' }, 999);
    if (okHide && ada.state !== 'hidden') {
      for (const h of L.hides) {
        if (Math.abs(ada.y - (h.y + h.h)) > 46) continue;
        if (ada.x > h.x - 6 && ada.x < h.x + h.w + 6) consider({ kind: 'hide', spot: h, label: h.label }, Math.abs(ada.x - (h.x + h.w / 2)) + 20);
      }
    }
    if (ada.state === 'hidden') best = null;
    this.ui.prompt(best ? best.label : null);
    if (best && this.inp.pressed('action')) {
      this.inp.consume('action');
      this.interact(best);
    }
  }

  interact(it) {
    const ada = this.ada, L = this.level;
    switch (it.kind) {
      case 'talk': this.talkFausto(); break;
      case 'desk':
        ada.facing = sign(L.desk.x - ada.x) || ada.facing;
        ada.doBusy('examine', 0.6, (u) => A.reach(u), 0.34, () => this.examineDesk());
        break;
      case 'jar':
        ada.facing = sign(L.jar.x - ada.x) || ada.facing;
        ada.doBusy('examine', 0.62, (u) => A.reach(u), 0.34, () => this.examineJar());
        break;
      case 'sketch':
        ada.facing = sign(L.sketch.x - ada.x) || ada.facing;
        ada.doBusy('examine', 0.6, (u) => A.pickup(u), 0.3, () => this.examineSketch());
        break;
      case 'pickup':
        ada.facing = sign(it.can.x - ada.x) || ada.facing;
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
        ada.body.x = clamp(ada.x, h.x + 12, h.x + h.w - 12);
        ada.enterHide(h);
        for (const e of this.enemies) {
          if (e.enabled && !e.ko && e.aware && e.seenT < 0.35 && Math.abs(e.x - ada.x) < 520) e.knowsHide = h;
        }
        break;
      }
      default: break;
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
        const g = map.probeGround(c.x, c.y - 1, ny + 1, true, true);
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
      if (c.state === 'rest') c.img.rotation = 0;
    }
  }

  // ------------------------------------------------------------ story beats
  talkFausto() {
    const ada = this.ada, f = this.fausto;
    // stand at a natural distance for a conversation
    const side = sign(ada.x - f.x) || -1;
    if (Math.abs(ada.x - f.x) < 78) ada.body.x = f.x + side * 82;
    ada.body.vx = 0;
    ada.facing = -side;
    f.facing = -ada.facing;
    f.talking = true;
    const first = !this.flags.fausto;
    const lines = first ? [
      { who: 'Fausto', text: 'Lei è l’amica di Lale? … Era strana, ultimamente. Confrontava vecchie foto per ore.' },
      { who: 'Fausto', text: 'Tre giorni fa una guardia l’ha vista entrare di notte. Dopo le otto l’ala restauri è chiusa: la tessera non basta. Io non le ho detto niente.' },
      { who: 'Ada', text: 'Grazie, Fausto.' },
    ] : [
      { who: 'Fausto', text: 'Il laboratorio è in fondo al chiostro. La guardia fa il giro con la lanterna: se cammina piano, non la sente.' },
    ];
    this.ui.dialog(lines, () => {
      f.talking = false;
      if (first) {
        this.flags.fausto = true;
        this.addDossier('fausto', 'Fausto, restauratore', 'Lale confrontava vecchie foto per ore. Tre giorni fa una guardia l’ha vista entrare di notte nell’ala restauri, chiusa dopo le otto.');
        if (!this.flags.desk && !this.flags.clue) this.objective('Raggiungi il laboratorio di Lale, in fondo al chiostro.');
        this.saveGame();
      }
    });
  }

  examineDesk() {
    const first = !this.flags.desk;
    this.ui.examine([{ art: 'desk', title: 'La scrivania di Lale', text: 'Svuotata. Qualcuno è passato prima di me.', note: first ? 'Nella polvere restano i segni dei suoi quaderni. Solo la lampada UV, sul banco accanto, è ancora accesa.' : '' }], () => {
      if (!first) return;
      this.flags.desk = true;
      this.addDossier('desk', 'La scrivania svuotata', 'Qualcuno ha portato via i quaderni di Lale prima di Ada. La lampada UV del laboratorio era rimasta accesa.');
      if (!this.flags.clue) this.objective('Cerca ancora nel laboratorio: la lampada UV è rimasta accesa.');
      this.saveGame();
    });
  }

  examineJar() {
    this.ui.examine([
      { art: 'jar', sound: 'clue', title: 'Un barattolo di resina dammar', text: 'Sotto la luce UV la resina brilla, e sul coperchio c’è un’impronta fresca. Tra i cristalli, una bustina: dentro c’è una scheda di memoria.', note: 'Lale sapeva che qualcuno sarebbe venuto a svuotarle la scrivania.' },
      { art: 'card', title: 'La scheda di Lale', text: 'Riflettografie di sette opere tornate dal restauro: sotto la pittura il disegno originale non c’è più. Tutte spedite a un «laboratorio esterno PA».', note: 'In fondo, una nota di Lale: «Chi dipinge così bene? Studio Lisi?»' },
    ], () => {
      this.flags.clue = true;
      this.jarGlow.setVisible(false);
      this.addDossier('scheda', 'Scheda di memoria di Lale', 'Riflettografie di sette opere tornate dal restauro senza il disegno sottostante. Tutte spedite a un «laboratorio esterno PA». Nota: «Chi dipinge così bene? Studio Lisi?»');
      this.objective('Esci dal convento con la scheda.');
      this.spawnRecoverer(false);
      this.saveGame();
    });
  }

  examineSketch() {
    this.ui.examine([{ art: 'sketch', sound: 'note', title: 'Un foglio sull’impalcatura', text: 'Uno schizzo a matita: un faro su un promontorio. Accanto, due lettere: «PA».', note: 'La firma è una L. La calligrafia è quella di Lale.' }], () => {
      this.flags.sketch = true;
      this.sketchImg.setVisible(false);
      this.addDossier('schizzo', 'Lo schizzo del faro', 'Un disegno di Lale nascosto sull’impalcatura della navata: un faro su un promontorio, con la sigla «PA».');
      this.saveGame();
    });
  }

  spawnRecoverer(fromSave) {
    const r = this.recoverer, L = this.level;
    if (r.enabled) return;
    r.enable(L.recoverer.x, L.recoverer.y);
    r.facing = -1;
    if (fromSave) { r.setState('patrol'); return; }
    r.last = { x: this.ada.x, y: this.ada.y };
    r.S = 1.2; r.seenT = 0;
    r.setState('alert');
    r.barkT = 3;
    this.ui.bark(r, 'Ehi! Dammi quella scheda.', 2600);
    this.snd.play('door', 1, { x: r.x, y: r.y - 60 });
    this.stats.spotted++;
  }

  // ------------------------------------------------------------ areas, hints, checkpoints, exits
  updateWorldTriggers(dt) {
    const ada = this.ada, L = this.level;
    const reg = this.map.regionAt(ada.x, ada.y - 30);
    if (reg !== this.region) {
      this.region = reg;
      this.snd.setRegion(reg.material, !!reg.sky, reg.id);
      if (reg.name && !this.areasSeen.has(reg.id)) { this.areasSeen.add(reg.id); this.ui.area(reg.name); }
      if (reg.id === 'cloister' && !this.flags.fausto && !this.flags.desk && !this.flags.clue) this.objective('Raggiungi il laboratorio di Lale, in fondo al chiostro.');

    }
    // hints, once each
    const tx = ada.x, ty = Math.floor(ada.y / TILE);
    for (const h of L.hints) {
      if (this.hintsShown.has(h.id)) continue;
      if (tx < h.x0 || tx > h.x1) continue;
      if (h.y0 !== undefined && ty < h.y0) continue;
      if (h.y1 !== undefined && ty > h.y1 + 1) continue;
      if (h.id === 'talk' && this.flags.fausto) continue;
      if (h.id === 'lab' && (this.flags.desk || this.flags.clue)) { this.hintsShown.add(h.id); continue; }
      if (h.id === 'move' && !this.introDone) continue;
      this.showHint(h.id);
      if (h.id === 'crypt' && !this.flags.crypt) {
        this.flags.crypt = true;
        this.addDossier('casse', 'Le casse della cripta', 'Nella cripta sotto la chiesa ci sono casse da imballaggio per quadri, tutte con la sigla «PA».', false);
      }
      break;
    }
    // checkpoints
    if (ada.body.onGround && ada.state !== 'down') {
      const ctx = Math.floor(ada.x / TILE);
      for (const c of L.checkpoints) {
        if (c === this.checkpoint) continue;
        if (ctx < c.x0 || ctx > c.x1) continue;
        if (c.y0 !== undefined && ty < c.y0) continue;
        if (c.y1 !== undefined && ty > c.y1 + 1) continue;
        this.checkpoint = c;
        this.saveGame();
        break;
      }
    }
    // exits
    this.exitMsgT = Math.max(0, this.exitMsgT - dt);
    if (ada.state !== 'down' && ada.y <= L.ground + 4) {
      for (const ex of L.exits) {
        if (ada.x < ex.x0 || ada.x > ex.x1) continue;
        if (!this.flags.clue) {
          if (this.exitMsgT <= 0) { this.ui.toast('Non me ne vado senza sapere cosa cercava Lale.', 3000); this.exitMsgT = 5; }
          continue;
        }
        this.finish(ex.id);
        break;
      }
    }
  }

  showHint(id) {
    if (this.hintsShown.has(id)) return;
    this.hintsShown.add(id);
    const h = HINTS[id];
    if (!h) return;
    const dev = this.inp.lastDevice === 'touch' || this.ui.isTouch ? 'touch' : this.inp.lastDevice === 'pad' ? 'pad' : 'kb';
    this.ui.toast(h.all || h[dev] || h.kb, 5600);
  }

  objective(text, flash = true) {
    this.objectiveText = text;
    this.ui.objective(text, flash);
  }

  addDossier(id, title, text, notify = true) {
    if (this.dossier.some((d) => d.id === id)) return;
    this.dossier.push({ id, title, text });
    this.ui.addDossier({ id, title, text });
    if (notify) { this.snd.play('page'); this.ui.toast('Dossier aggiornato: ' + title, 2600); }
  }

  finish(exitId) {
    this.mode = 'end';
    const ada = this.ada;
    ada.frozen = true;
    this.ui.prompt(null);
    this.snd.play(exitId === 'giardino' ? 'gate' : 'door');
    this.clearSave();
    const s = this.stats;
    const mm = Math.floor(s.time / 60), ss = Math.floor(s.time % 60);
    const secret = exitId === 'giardino';
    const title = secret ? 'Uscita dal giardino dietro l’abside' : 'Uscita dal portone';
    const text = secret
      ? 'Ada ha trovato il passaggio sotto la chiesa ed è uscita da dove nessuno la aspettava, con la scheda di Lale in borsa.'
      : 'Ada è uscita dal portone di San Domenico con la scheda di Lale in borsa.';
    const stats = [
      ['Tempo', `${mm}:${String(ss).padStart(2, '0')}`],
      ['Volte che ti hanno vista', String(s.spotted)],
      ['Avversari messi a terra', String(s.kos)],
      ['Passaggio segreto', this.flags.secret ? 'trovato' : 'non trovato'],
      ['Schizzo sull’impalcatura', this.flags.sketch ? 'trovato' : 'non trovato'],
    ];
    this.ui.fade(true);
    this.time.delayedCall(900, () => { this.ui.showEnd(title, text, stats); this.ui.fade(false); });
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
      teleport(x, y) { scene.ada.teleport(x, y); scene.camX = x; scene.camY = y - 205; },
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
          flags: { ...scene.flags }, checkpoint: scene.checkpoint.id, objective: scene.objectiveText,
        };
      },
    };
  }
}

function brighten(c, k) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return rgbToHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k);
}
