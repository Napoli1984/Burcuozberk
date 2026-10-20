// Every sound in the game is synthesized here with WebAudio: no audio files to download.
import { clamp, safeStorage } from './util.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz

export class Sound {
  constructor() {
    this.ctx = null;
    this.store = safeStorage();
    let v = 0.8, m = false;
    try { const s = JSON.parse(this.store && this.store.getItem('bo-sv-audio') || 'null'); if (s) { v = s.v ?? v; m = !!s.m; } } catch (e) { /* ignore */ }
    this.volume = v;
    this.muted = m;
    this.listener = { x: 0, y: 0 };
    this.tension = 0;
    this.outdoors = true;
    this.material = 'cobble';
    this.region = '';
    this.musicOn = true;
  }

  // Must be called from a click or tap: browsers only allow sound after a user gesture.
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.55; this.musicBus.connect(this.master);
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = 0.8; this.ambBus.connect(this.master);
    // A shared echo for music and drips.
    this.echo = ctx.createDelay(1.5); this.echo.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2400;
    this.echo.connect(ef); ef.connect(fb); fb.connect(this.echo);
    this.echoOut = ctx.createGain(); this.echoOut.gain.value = 0.5;
    ef.connect(this.echoOut); this.echoOut.connect(this.master);
    // Two seconds of white noise, reused by every noisy sound.
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbience();
    this.nextBar = ctx.currentTime + 0.5;
    this.bar = 0;
    this.nextNote = ctx.currentTime + 2;
    this.nextDrip = ctx.currentTime + 1;
    this.nextCricket = ctx.currentTime + 1;
    this.nextPulse = ctx.currentTime;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  save() {
    try { this.store && this.store.setItem('bo-sv-audio', JSON.stringify({ v: this.volume, m: this.muted })); } catch (e) { /* ignore */ }
  }

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    this.save();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
    this.save();
  }

  pause(p) {
    if (!this.ctx) return;
    if (p) this.ctx.suspend(); else this.ctx.resume();
  }

  // ------------------------------------------------------------ building blocks
  env(g, t, a, peak, dec, hold = 0) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (hold) g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + dec);
  }

  out(pos) {
    // Returns the node a sound should connect to, panned and attenuated by its world position.
    if (!pos) return this.sfxBus;
    const ctx = this.ctx;
    const dx = pos.x - this.listener.x, dy = pos.y - this.listener.y;
    const dist = Math.hypot(dx, dy * 1.4);
    const g = ctx.createGain();
    g.gain.value = clamp(1 - (dist - 380) / 1100, 0.0, 1);
    if (g.gain.value <= 0.01) return null;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(dx / 760, -0.85, 0.85);
      g.connect(p); p.connect(this.sfxBus);
    } else g.connect(this.sfxBus);
    return g;
  }

  burst(o) {
    const ctx = this.ctx, t = (o.t ?? ctx.currentTime) + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.a || 0.005) + (o.d || 0.1));
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    this.env(g, t, o.a || 0.004, o.gain || 0.3, o.d || 0.1, o.hold || 0);
    src.connect(f); f.connect(g);
    const dest = o.dest || this.out(o.pos);
    if (!dest) return;
    g.connect(dest);
    const off = Math.random() * 1.5;
    src.start(t, off);
    src.stop(t + (o.a || 0.005) + (o.hold || 0) + (o.d || 0.1) + 0.05);
  }

  tone(o) {
    const ctx = this.ctx, t = (o.t ?? ctx.currentTime) + (o.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.a || 0.005) + (o.d || 0.1));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    this.env(g, t, o.a || 0.005, o.gain || 0.3, o.d || 0.1, o.hold || 0);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.lpq || 0.7; osc.connect(f); node = f; }
    node.connect(g);
    const dest = o.dest || this.out(o.pos);
    if (!dest) return;
    g.connect(dest);
    if (o.echo) g.connect(this.echo);
    osc.start(t);
    osc.stop(t + (o.a || 0.005) + (o.hold || 0) + (o.d || 0.1) + 0.05);
  }

  // ------------------------------------------------------------ sound effects
  play(name, k = 1, pos = null) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const r = (a, b) => a + Math.random() * (b - a);
    switch (name) {
      case 'jump': this.burst({ f0: 500, f1: 1400, q: 0.8, gain: 0.12, d: 0.12, pos }); break;
      case 'land':
        this.tone({ f0: 130, f1: 50, gain: 0.35 * k, d: 0.12, pos });
        this.burst({ f0: 420, q: 0.8, gain: 0.22 * k, d: 0.07, pos });
        break;
      case 'whoosh': this.burst({ f0: 380, f1: 1500, q: 1.4, gain: 0.16 * k, a: 0.02, d: 0.13, pos }); break;
      case 'hit':
        this.tone({ f0: r(150, 175), f1: 55, gain: 0.55 * k, d: 0.13, pos });
        this.burst({ filter: 'lowpass', f0: 1400, gain: 0.42 * k, d: 0.06, pos });
        this.burst({ f0: 3200, q: 2, gain: 0.12 * k, d: 0.025, pos });
        break;
      case 'block': this.burst({ f0: 900, q: 3, gain: 0.25, d: 0.05, pos }); this.tone({ f0: 300, f1: 200, gain: 0.15, d: 0.05, pos }); break;
      case 'hurt':
        this.tone({ f0: 200, f1: 95, type: 'triangle', gain: 0.35, d: 0.2, pos });
        this.burst({ filter: 'lowpass', f0: 900, gain: 0.35, d: 0.08, pos });
        break;
      case 'down': this.tone({ f0: 110, f1: 40, gain: 0.5, d: 0.4, pos }); this.burst({ filter: 'lowpass', f0: 600, gain: 0.4, d: 0.25, pos }); break;
      case 'ko':
        this.tone({ f0: 120, f1: 38, gain: 0.55, d: 0.35, pos });
        this.burst({ filter: 'lowpass', f0: 700, gain: 0.45, d: 0.2, delay: 0.18, pos });
        break;
      case 'grab': this.burst({ filter: 'highpass', f0: 2600, gain: 0.12, d: 0.06, pos }); this.tone({ f0: 180, f1: 120, gain: 0.12, d: 0.05, pos }); break;
      case 'climb': this.burst({ filter: 'highpass', f0: 2200, gain: 0.1, d: 0.08, pos }); this.burst({ filter: 'highpass', f0: 2600, gain: 0.08, d: 0.08, delay: 0.22, pos }); break;
      case 'rung': this.burst({ f0: 1300, q: 3, gain: 0.07, d: 0.04, pos }); break;
      case 'dodge': this.burst({ f0: 300, f1: 900, q: 0.7, gain: 0.14, a: 0.03, d: 0.22, pos }); break;
      case 'rustle':
        for (let i = 0; i < 4; i++) this.burst({ f0: r(2400, 4200), q: 0.6, gain: 0.09, d: 0.12, delay: i * 0.07, pos });
        break;
      case 'pickup': this.tone({ f0: 1250, type: 'triangle', gain: 0.1, d: 0.04, pos }); this.tone({ f0: 1700, type: 'triangle', gain: 0.08, d: 0.05, delay: 0.06, pos }); break;
      case 'clang': {
        const g = 0.2 * k;
        for (const [f, dd] of [[r(520, 560), 0.35], [r(1180, 1240), 0.28], [r(2060, 2140), 0.2], [r(3300, 3400), 0.12]]) this.tone({ f0: f, type: 'triangle', gain: g, d: dd, pos });
        this.burst({ f0: 4000, q: 1, gain: 0.15 * k, d: 0.03, pos });
        break;
      }
      case 'thud':
        this.tone({ f0: 95, f1: 62, gain: 0.5, d: 0.28, pos });
        this.burst({ f0: 190, q: 6, gain: 0.5, d: 0.3, pos });
        this.burst({ filter: 'lowpass', f0: 500, gain: 0.25, d: 0.12, pos });
        break;
      case 'collapse':
        this.burst({ filter: 'lowpass', f0: 900, f1: 160, gain: 0.6, a: 0.02, d: 1.4, pos });
        for (let i = 0; i < 7; i++) this.tone({ f0: r(70, 140), f1: 40, gain: 0.3, d: 0.2, delay: 0.05 + i * r(0.07, 0.16), pos });
        for (let i = 0; i < 6; i++) this.burst({ f0: r(1500, 3500), q: 2, gain: 0.08, d: 0.05, delay: 0.3 + i * r(0.08, 0.2), pos });
        break;
      case 'door':
        this.tone({ f0: 70, f1: 115, type: 'sawtooth', lp: 500, gain: 0.12, a: 0.05, d: 0.45, pos });
        this.tone({ f0: 90, f1: 50, gain: 0.35, d: 0.2, delay: 0.45, pos });
        break;
      case 'gate':
        this.tone({ f0: 300, f1: 420, type: 'sawtooth', lp: 1400, lpq: 6, gain: 0.08, a: 0.1, d: 0.6, pos });
        this.tone({ f0: 160, f1: 90, gain: 0.25, d: 0.25, delay: 0.7, pos });
        break;
      case 'suspicious': this.tone({ f0: 640, f1: 760, type: 'triangle', gain: 0.12, a: 0.01, d: 0.25 }); break;
      case 'alert':
        this.tone({ f0: NOTE(62), type: 'sawtooth', lp: 1800, gain: 0.16, d: 0.18 });
        this.tone({ f0: NOTE(63), type: 'sawtooth', lp: 1800, gain: 0.18, d: 0.5, delay: 0.12 });
        this.tone({ f0: 90, f1: 45, gain: 0.5, d: 0.4 });
        this.burst({ filter: 'lowpass', f0: 1200, gain: 0.3, d: 0.3 });
        break;
      case 'calm': this.tone({ f0: NOTE(69), type: 'triangle', gain: 0.07, d: 0.4 }); this.tone({ f0: NOTE(65), type: 'triangle', gain: 0.07, d: 0.6, delay: 0.18 }); break;
      case 'clue':
        [72, 76, 79, 84, 88].forEach((n, i) => {
          this.tone({ f0: NOTE(n), gain: 0.14, a: 0.005, d: 1.4, delay: i * 0.09, echo: true });
          this.tone({ f0: NOTE(n) * 2.01, gain: 0.03, d: 0.6, delay: i * 0.09 });
        });
        break;
      case 'note':
        [79, 84].forEach((n, i) => this.tone({ f0: NOTE(n), gain: 0.1, d: 0.9, delay: i * 0.1, echo: true }));
        break;
      case 'heal': this.tone({ f0: NOTE(76), gain: 0.06, d: 0.5, echo: true }); this.tone({ f0: NOTE(83), gain: 0.05, d: 0.6, delay: 0.08 }); break;
      case 'blip': this.tone({ f0: r(880, 980), type: 'triangle', gain: 0.035, d: 0.03 }); break;
      case 'ui': this.tone({ f0: 1400, type: 'triangle', gain: 0.06, d: 0.04 }); break;
      case 'page': this.burst({ filter: 'highpass', f0: 3000, gain: 0.12, a: 0.03, d: 0.16 }); break;
      case 'splash': this.burst({ f0: 900, f1: 400, q: 0.7, gain: 0.25 * k, d: 0.25, pos }); this.tone({ f0: 500, f1: 1100, gain: 0.05 * k, d: 0.08, pos }); break;
      case 'bark': this.burst({ f0: r(240, 320), q: 4, gain: 0.05, d: 0.08, pos }); break;
      // puzzles
      case 'tick': this.burst({ f0: r(2400, 2800), q: 5, gain: 0.09, d: 0.02 }); this.tone({ f0: 1900, type: 'triangle', gain: 0.035, d: 0.02 }); break;
      case 'unlock':
        this.burst({ f0: 1800, q: 4, gain: 0.18, d: 0.04 });
        this.tone({ f0: 620, f1: 470, type: 'triangle', gain: 0.12, d: 0.12, delay: 0.05 });
        this.burst({ filter: 'lowpass', f0: 900, gain: 0.22, d: 0.08, delay: 0.1 });
        break;
      case 'nope': this.tone({ f0: 210, f1: 150, type: 'triangle', gain: 0.12, d: 0.16 }); this.burst({ f0: 700, q: 3, gain: 0.08, d: 0.05 }); break;
      case 'squeak':
        this.tone({ f0: 760, f1: 1240, type: 'sawtooth', lp: 2600, lpq: 5, gain: 0.045, a: 0.03, d: 0.22 });
        this.tone({ f0: 1100, f1: 820, type: 'sawtooth', lp: 2400, lpq: 5, gain: 0.035, a: 0.02, d: 0.16, delay: 0.2 });
        break;
      case 'found': [76, 83].forEach((n, i) => this.tone({ f0: NOTE(n), type: 'triangle', gain: 0.08, d: 0.5, delay: i * 0.07, echo: true })); break;
      case 'glass': this.tone({ f0: r(2400, 2600), type: 'triangle', gain: 0.06, d: 0.3 }); this.tone({ f0: r(3600, 3800), gain: 0.03, d: 0.2, delay: 0.01 }); break;
      default: break;
    }
  }

  footstep(material, loud, pos, heavy = false) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const r = (a, b) => a + Math.random() * (b - a);
    const k = (loud ? 1 : 0.5) * (heavy ? 1.1 : 1);
    switch (material) {
      case 'grass':
        this.burst({ filter: 'highpass', f0: r(2600, 3600), q: 0.6, gain: 0.07 * k, d: 0.09, pos });
        break;
      case 'wood':
        this.tone({ f0: r(130, 160), f1: 80, gain: 0.18 * k, d: 0.07, pos });
        this.burst({ f0: r(700, 900), q: 2, gain: 0.08 * k, d: 0.04, pos });
        break;
      case 'water':
        this.burst({ f0: r(700, 1000), f1: 500, q: 0.9, gain: 0.14 * k, d: 0.13, pos });
        this.tone({ f0: r(500, 700), f1: 1200, gain: 0.03 * k, d: 0.05, pos });
        break;
      case 'cobble':
        this.burst({ f0: r(1500, 2100), q: 1.4, gain: 0.1 * k, d: 0.05, pos });
        this.tone({ f0: r(85, 100), f1: 60, gain: 0.14 * k, d: 0.05, pos });
        break;
      default: // stone, marble
        this.burst({ f0: r(1100, 1500), q: 1.8, gain: 0.09 * k, d: 0.05, pos });
        this.tone({ f0: r(90, 110), f1: 60, gain: 0.12 * k, d: 0.05, pos });
        if (heavy) this.burst({ f0: 2600, q: 4, gain: 0.03, d: 0.03, delay: 0.02, pos });
    }
  }

  // ------------------------------------------------------------ ambience and music
  startAmbience() {
    const ctx = this.ctx;
    const loop = (filterType, freq, q, gain) => {
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(this.ambBus); src.start();
      return { src, f, g };
    };
    this.wind = loop('lowpass', 380, 0.6, 0.0);
    this.room = loop('lowpass', 160, 0.5, 0.0);
    this.water = loop('bandpass', 620, 0.8, 0.0);
    // slow movement in the wind
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 160;
    lfo.connect(lg); lg.connect(this.wind.f.frequency); lfo.start();
    // the pad: three soft voices that glide between chords
    this.pad = [];
    const padBus = ctx.createGain(); padBus.gain.value = 0.0; padBus.connect(this.musicBus);
    const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 900; pf.Q.value = 0.5; pf.connect(padBus);
    this.padBus = padBus;
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine';
      o.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain(); g.gain.value = 0.05;
      o.connect(g); g.connect(pf); o.start();
      this.pad.push(o);
    }
    padBus.gain.setTargetAtTime(0.5, ctx.currentTime + 0.5, 2.5);
    // tension drone
    this.drone = ctx.createOscillator(); this.drone.type = 'sawtooth'; this.drone.frequency.value = NOTE(38);
    const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 220;
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0;
    this.drone.connect(df); df.connect(this.droneGain); this.droneGain.connect(this.musicBus); this.drone.start();
    this.setRegion(this.material, this.outdoors, this.region);
  }

  setRegion(material, outdoors, id) {
    this.material = material; this.outdoors = outdoors; this.region = id;
    if (!this.ctx || !this.wind) return;
    const t = this.ctx.currentTime;
    const under = id === 'crypt' || id === 'aqueduct';
    this.wind.g.gain.setTargetAtTime(outdoors ? 0.075 : under ? 0.0 : 0.018, t, 0.8);
    this.room.g.gain.setTargetAtTime(outdoors ? 0.0 : 0.06, t, 0.8);
    this.water.g.gain.setTargetAtTime(id === 'aqueduct' ? 0.05 : id === 'crypt' ? 0.012 : 0, t, 0.8);
  }

  setTension(level) {
    if (level === this.tension) return;
    this.tension = level;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(level === 2 ? 0.07 : level === 1 ? 0.035 : 0, t, level ? 0.3 : 1.5);
    this.padBus.gain.setTargetAtTime(level === 2 ? 0.25 : 0.5, t, 1);
  }

  schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime, ahead = now + 0.25;
    // Chords: D minor, slow and quiet.
    const chords = [[50, 57, 62, 65, 69], [46, 53, 62, 65, 69], [43, 50, 58, 62, 65], [45, 52, 57, 61, 64]];
    while (this.nextBar < ahead) {
      const ch = chords[this.bar % chords.length];
      this.pad.forEach((o, i) => o.frequency.setTargetAtTime(NOTE(ch[i + 1] - 12), this.nextBar, 1.2));
      this.bar++;
      this.nextBar += 8;
    }
    // Sparse piano-like notes over the chords.
    if (this.musicOn && this.tension < 2) {
      while (this.nextNote < ahead) {
        const ch = chords[(this.bar - 1 + chords.length) % chords.length];
        const scale = [62, 64, 65, 67, 69, 72, 74, 76, 77];
        const n = Math.random() < 0.55 ? ch[2 + Math.floor(Math.random() * 3)] + 12 : scale[Math.floor(Math.random() * scale.length)];
        const t = this.nextNote;
        this.tone({ f0: NOTE(n), gain: 0.045, a: 0.004, d: 2.2, t, dest: this.musicBus, echo: true });
        this.tone({ f0: NOTE(n) * 2, gain: 0.012, a: 0.004, d: 0.8, t, dest: this.musicBus });
        this.nextNote += [0.9, 1.35, 1.8, 2.7, 3.6][Math.floor(Math.random() * 5)];
      }
    } else if (this.nextNote < ahead) this.nextNote = ahead + 1;
    // Pulse when guards are suspicious or alert.
    if (this.tension > 0) {
      while (this.nextPulse < ahead) {
        const t = this.nextPulse;
        if (this.tension === 2) {
          this.tone({ f0: NOTE(38), f1: NOTE(26), gain: 0.22, d: 0.18, t, dest: this.musicBus });
          this.tone({ f0: NOTE(62), type: 'sawtooth', lp: 1100, gain: 0.035, d: 0.12, t: t + 0.21, dest: this.musicBus });
          this.nextPulse += 0.42;
        } else {
          this.tone({ f0: 62, f1: 40, gain: 0.25, d: 0.16, t, dest: this.musicBus });
          this.tone({ f0: 58, f1: 38, gain: 0.18, d: 0.18, t: t + 0.22, dest: this.musicBus });
          this.nextPulse += 1.15;
        }
      }
    } else this.nextPulse = ahead;
    // Water drips underground, crickets in the gardens.
    if ((this.region === 'crypt' || this.region === 'aqueduct') && this.nextDrip < ahead) {
      const f = 900 + Math.random() * 900;
      this.tone({ f0: f, f1: f * 0.6, gain: 0.05, d: 0.09, t: this.nextDrip, dest: this.ambBus, echo: true });
      this.nextDrip += 0.7 + Math.random() * 2.4;
    } else if (this.nextDrip < now) this.nextDrip = now + 1;
    if (this.outdoors && this.material === 'grass' && this.nextCricket < ahead) {
      const t = this.nextCricket;
      for (let i = 0; i < 3; i++) this.tone({ f0: 4300 + Math.random() * 200, gain: 0.012, a: 0.004, d: 0.03, t: t + i * 0.055, dest: this.ambBus });
      this.nextCricket += 0.6 + Math.random() * 1.6;
    } else if (this.nextCricket < now) this.nextCricket = now + 0.5;
  }
}
