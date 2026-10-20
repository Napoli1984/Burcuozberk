// The people who keep watch at night: guards with a lantern or a torch, a thief with a headlamp,
// two porters in the crypt, and the man sent to take the memory card back.
// States: patrol, suspicious (goes to check a point), alert (chases and fights), search, return,
// windup/strike/recover (an attack), hurt, ko (stays down). Nobody here can climb ladders or ledges.
import { STEALTH, TILE } from './config.js';
import { Body } from './body.js';
import { Rig } from './rig.js';
import { A } from './anim.js';
import { pick } from './i18n.js';
import { clamp, approach, damp, sign, lerp, rectsOverlap } from './util.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const SPEED = { patrol: 84, check: 118, hunt: 175, chase: 240, back: 100 };
const STRIKE = { active: [0.03, 0.12], dur: 0.2, reach: 88, top: 116, bottom: 46, recover: 0.62 };
// view cone half-angle and downward tilt (degrees) for each kind of light
const CONE = { lantern: [STEALTH.coneAngle / 2, 5], torch: [17, 4], headlamp: [21, 9], none: [50, 10] };

export class Enemy {
  constructor(scene, def, o) {
    this.scene = scene;
    this.map = scene.map;
    this.id = o.id;
    this.kind = o.kind;                    // which lines it says (barks.<kind> in the language tables)
    this.body = new Body(o.x, o.y, 38, 128);
    this.rig = new Rig(scene, def, { rest: A.idle(0, 'man') });
    this.rig.setDepth(o.depth ?? 24);
    this.facing = o.facing ?? 1;
    this.maxHp = this.hp = o.hp;
    this.route = o.route || null;          // [{x, wait}]
    this.routeI = o.routeI ?? 1;
    this.routeDir = 1;
    this.spawn = { x: o.x, y: o.y, routeI: this.routeI };
    this.lightKind = o.light || null;      // 'lantern', 'torch', 'headlamp' or null
    this.lantern = this.lightKind === 'lantern';
    this.torch = this.lightKind === 'torch';          // a narrow, long beam held in front
    this.headlamp = this.lightKind === 'headlamp';    // a beam from the forehead, a little shorter
    const [half, tilt] = CONE[this.lightKind || 'none'];
    this.half = half * DEG;
    this.tilt = tilt * DEG;
    this.alertness = 1;
    this.state = o.state || 'patrol';
    this.t = 0;
    this.clock = Math.random() * 10;
    this.S = 0;
    this.seen = false;
    this.seenT = 99;
    this.last = null;
    this.goal = null;
    this.wait = o.route ? o.route[0].wait : 0;
    this.phase = 0;
    this.poise = 3;
    this.poiseT = 0;
    this.cool = 0;
    this.hitDone = false;
    this.blockedT = 0;
    this.barkT = 0;
    this.stepT = 0;
    this.light = 0.5;
    this.windT = 0.5;
    this.knowsHide = null;
    this.sawBody = false;
    this.lookT = 0;
    this.iconKind = null;
    this.iconAmt = 0;
    this.enabled = o.enabled !== false;
    this.rig.setVisible(this.enabled);
    this.eye = { x: o.x, y: o.y - 60 };
    this.coneRange = STEALTH.rangeDark;
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get ko() { return this.state === 'ko'; }
  get aware() { return ['alert', 'windup', 'strike', 'recover', 'hurt'].includes(this.state); }
  get fighting() { return this.enabled && !this.ko && this.aware; }

  setState(s) { this.state = s; this.t = 0; }

  bark(kind, force = false) {
    if (!force && this.barkT > 0) return;
    const line = pick(`barks.${this.kind}.${kind}`);
    if (!line) return;
    this.barkT = 2.6;
    this.scene.bark(this, line);
  }

  enable(x, y) {
    this.enabled = true;
    this.body.x = x; this.body.y = y;
    this.rig.setVisible(true);
  }

  // Back to the start of the patrol (used when Ada is beaten and starts again from a checkpoint).
  reset(x = this.spawn.x, y = this.spawn.y) {
    if (this.ko || !this.enabled) return;
    this.routeI = this.spawn.routeI;
    this.body.x = x; this.body.y = y; this.body.vx = 0; this.body.vy = 0;
    this.S = 0; this.last = null; this.goal = null; this.knowsHide = null; this.seenT = 99;
    this.hp = Math.max(this.hp, Math.ceil(this.maxHp * 0.6));
    this.poise = 3;
    this.setState(this.route ? 'patrol' : 'idle');
  }

  // ------------------------------------------------------------ senses
  // Where the light (and the view cone) starts: the lantern, the torch's lens or the headlamp.
  lightPoint() {
    const r = this.rig;
    if (this.lantern && r.lanternPos.x) return { x: r.lanternPos.x, y: r.lanternPos.y - 6 };
    if (this.torch && r.handPos.x) return { x: r.handPos.x + this.facing * (r.b.torchTip ?? 30), y: r.handPos.y + 2 };
    if (this.headlamp && r.lampPos.x) return { x: r.lampPos.x + this.facing * 3, y: r.lampPos.y };
    return null;
  }

  eyePoint() {
    return this.lightPoint() || { x: this.rig.headPos.x || this.body.x, y: (this.rig.headPos.y || this.body.y - 116) + 6 };
  }

  sightRange(light) {
    const k = clamp((light - 0.35) / 0.65, 0, 1);
    const beam = this.torch ? 1.3 : this.headlamp ? 1.15 : 1;
    return lerp(STEALTH.rangeDark, STEALTH.rangeLit, k) * this.alertness * (this.aware ? 1.25 : 1) * beam;
  }

  // Can this man see the point (in front, inside the view angle, nothing in between)?
  canSee(px, py, range) {
    const e = this.eye;
    const dx = px - e.x, dy = py - e.y;
    const d = Math.hypot(dx, dy);
    if (d > range) return -1;
    const ang = Math.atan2(dy, dx * this.facing);
    if (Math.abs(ang - this.tilt) > this.half) return -1;
    if (this.map.raycast(e.x, e.y, px, py, 12) < 1) return -1;
    return d;
  }

  perceive(dt, ada) {
    this.eye = this.eyePoint();
    this.seen = false;
    const b = this.body;
    if (ada.visibleToEnemies) {
      const range = this.sightRange(ada.light);
      this.coneRange = range;
      const ab = ada.body;
      const pts = [[ab.x, ab.top + 14], [ab.x, ab.y - ab.h * 0.55], [ab.x, ab.y - 12]];
      let count = 0, dist = Infinity;
      for (const [px, py] of pts) {
        const d = this.canSee(px, py, range);
        if (d >= 0) { count++; dist = Math.min(dist, d); }
      }
      // Very close in front: noticed even outside the beam.
      const dx = ab.x - b.x;
      if (!count && Math.abs(dx) < 80 && sign(dx) === this.facing && Math.abs(ab.y - b.y) < 70) { count = 2; dist = Math.abs(dx); }
      // Bumping into him from behind.
      if (!count && Math.abs(dx) < 34 && Math.abs(ab.y - b.y) < 40) { count = 3; dist = 20; }
      if (count) {
        this.seen = true;
        const vis = ada.light * ada.posture * ada.motion * (0.55 + 0.15 * count);
        const rate = (1.6 * vis) / (0.4 + dist / range);
        this.S = Math.min(this.S + rate * dt, 1.6);
        this.seenT = 0;
        this.last = { x: ab.x, y: ab.y };
      }
    } else {
      this.coneRange = this.sightRange(0.35);
    }
    if (!this.seen) {
      this.seenT += dt;
      if (!this.aware) this.S = Math.max(0, this.S - STEALTH.decay * dt);
    }
  }

  // A sound somewhere: go and look, unless already fighting.
  hear(x, y, radius, kind) {
    if (!this.enabled || this.ko) return;
    const b = this.body;
    const d = Math.hypot(x - b.x, (y - (b.y - 60)) * 1.2);
    let r = radius;
    if (kind !== 'fight' && this.map.raycast(b.x, b.y - 90, x, y, 20) < 1) r *= 0.62;
    if (d > r) return;
    if (this.aware) { if (kind === 'fight' && this.state === 'alert' && this.seenT > 1) this.last = { x, y }; return; }
    this.S = Math.max(this.S, STEALTH.suspicious + 0.05);
    this.goal = { x, y };
    this.goalFast = kind === 'fight' || kind === 'crack' || kind === 'wall';
    if (this.state !== 'suspicious') this.bark('hear');
    this.scene.onSuspicious(this);
    this.setState('suspicious');
  }

  // ------------------------------------------------------------ movement
  physics(dt) {
    const b = this.body;
    b.vy = Math.min(b.vy + 2300 * dt, 1100);
    b.moveX(this.map, b.vx * dt);
    b.moveY(this.map, b.vy * dt);
  }

  groundAhead(dir) {
    const b = this.body;
    const x = b.x + dir * (b.w / 2 + 12);
    return this.map.probeGround(x, b.y - 30, b.y + 66, true, true) !== null && !this.map.rectBlocked(x - 2, b.y - b.h + 4, 4, b.h - 30);
  }

  // Walks toward x; returns 'arrived', 'blocked' or 'moving'.
  walkTo(x, speed, dt, stopAt = 6) {
    const b = this.body;
    const dx = x - b.x;
    if (Math.abs(dx) <= stopAt) {
      b.vx = approach(b.vx, 0, 1800 * dt); this.physics(dt);
      return 'arrived';
    }
    const dir = sign(dx);
    this.facing = dir;
    if (!this.groundAhead(dir)) {
      b.vx = approach(b.vx, 0, 2400 * dt); this.physics(dt);
      return 'blocked';
    }
    b.vx = approach(b.vx, dir * speed, 1500 * dt);
    this.physics(dt);
    if (b.hitWall) return 'blocked';
    return 'moving';
  }

  stand(dt) {
    const b = this.body;
    b.vx = approach(b.vx, 0, 1800 * dt);
    this.physics(dt);
  }

  // ------------------------------------------------------------ main update
  update(dt, ada) {
    if (!this.enabled) return;
    this.t += dt;
    this.clock += dt;
    this.barkT = Math.max(0, this.barkT - dt);
    this.cool = Math.max(0, this.cool - dt);
    this.poiseT -= dt;
    if (this.poiseT <= 0) this.poise = 3;
    if (this.ko) { this.updateKO(dt); this.animate(dt); return; }
    this.perceive(dt, ada);
    this.react(ada);

    switch (this.state) {
      case 'idle': this.stand(dt); break;
      case 'patrol': this.updatePatrol(dt); break;
      case 'suspicious': this.updateSuspicious(dt, ada); break;
      case 'alert': this.updateAlert(dt, ada); break;
      case 'search': this.updateSearch(dt); break;
      case 'return': this.updateReturn(dt); break;
      case 'windup': this.stand(dt); if (this.t >= this.windT) { this.hitDone = false; this.setState('strike'); this.scene.sfx('whoosh', 1.1, this); } break;
      case 'strike': this.updateStrike(dt, ada); break;
      case 'recover': this.stand(dt); if (this.t >= STRIKE.recover) { this.cool = 0.35; this.setState('alert'); } break;
      case 'hurt': this.stand(dt); if (this.t >= 0.34) this.setState('alert'); break;
    }
    // Footsteps (heavy boots) so Ada can hear him coming.
    const sp = Math.abs(this.body.vx);
    if (sp > 30 && this.body.onGround) {
      this.stepT -= dt * sp / (sp > 180 ? 175 : 96);
      if (this.stepT <= 0) { this.stepT = 1; this.scene.enemyStep(this); }
    }
    this.updateIcon();
    this.animate(dt);
  }

  // Suspicion thresholds: decide when seeing Ada turns into checking or chasing.
  react(ada) {
    if (this.aware) return;
    if (this.S >= STEALTH.alert && this.seen) {
      this.becomeAlert();
      return;
    }
    if (this.S >= STEALTH.suspicious && this.seen && this.state !== 'suspicious') {
      this.goal = { ...this.last };
      this.goalFast = false;
      this.bark('see');
      this.scene.onSuspicious(this);
      this.setState('suspicious');
    } else if (this.seen && this.state === 'suspicious') {
      this.goal = { ...this.last };
    }
  }

  becomeAlert() {
    this.S = 1.2;
    this.bark('alert', true);
    this.scene.onAlert(this);
    this.setState('alert');
  }

  updatePatrol(dt) {
    if (!this.route) { this.stand(dt); return; }
    if (this.wait > 0) {
      this.wait -= dt;
      this.stand(dt);
      this.lookT += dt;
      if (this.wait <= 0) this.lookT = 0;
      return;
    }
    const p = this.route[this.routeI];
    const r = this.walkTo(p.x, SPEED.patrol, dt);
    if (r === 'arrived' || r === 'blocked') {
      this.wait = p.wait;
      if (this.routeI === this.route.length - 1) this.routeDir = -1;
      else if (this.routeI === 0) this.routeDir = 1;
      this.routeI += this.routeDir;
    }
  }

  updateSuspicious(dt, ada) {
    // Stop and stare for a moment, then walk to the point.
    if (this.t < 0.7) {
      if (this.goal) this.facing = sign(this.goal.x - this.body.x) || this.facing;
      this.stand(dt);
      return;
    }
    if (this.S < 0.08 && this.t > 2.5) { this.toSearch(); return; }
    const g = this.goal || this.last;
    if (!g) { this.toSearch(); return; }
    const r = this.walkTo(g.x, this.goalFast ? SPEED.hunt : SPEED.check, dt, 24);
    if (r === 'arrived') this.toSearch();
    else if (r === 'blocked') { this.blockedT += dt; if (this.blockedT > 1.2) { this.blockedT = 0; this.toSearch(); } }
    else this.blockedT = 0;
  }

  toSearch() {
    this.setState('search');
    this.searchFlip = 1.1;
  }

  updateSearch(dt) {
    this.stand(dt);
    this.searchFlip -= dt;
    if (this.searchFlip <= 0) { this.facing *= -1; this.searchFlip = 1.2; }
    if (this.t > 1.2 && this.t - dt <= 1.2 && this.S > 0.3) this.bark('lost');
    if (this.t > 4.2) {
      this.S = Math.min(this.S, 0.2);
      this.bark('calm');
      this.scene.onCalm(this);
      this.setState('return');
    }
  }

  updateReturn(dt) {
    if (!this.route) { this.setState('idle'); return; }
    let best = 0, bd = Infinity;
    this.route.forEach((p, i) => { const d = Math.abs(p.x - this.body.x); if (d < bd) { bd = d; best = i; } });
    const r = this.walkTo(this.route[best].x, SPEED.back, dt);
    if (r !== 'moving') {
      this.routeI = best; this.wait = 0.8;
      this.routeDir = best === this.route.length - 1 ? -1 : 1;
      this.setState('patrol');
    }
  }

  updateAlert(dt, ada) {
    const b = this.body;
    // Lost sight for too long: go and check the last place she was seen.
    if (this.seenT > 2.6 && !(this.knowsHide && ada.hide === this.knowsHide)) {
      this.goal = this.last ? { ...this.last } : { x: b.x, y: b.y };
      this.goalFast = true;
      this.S = 0.7;
      this.bark('lost');
      this.scene.onLost(this);
      this.setState('suspicious');
      this.t = 0.7;
      return;
    }
    if (!ada.alive) { this.stand(dt); return; }
    // She hid in front of him: he walks to the hiding place and pulls her out.
    if (this.knowsHide && ada.hide === this.knowsHide) {
      const h = this.knowsHide;
      const cx = h.x + h.w / 2;
      const r = this.walkTo(cx, SPEED.chase, dt, 40);
      if (r === 'arrived') { this.bark('found', true); this.scene.pullOut(this); this.knowsHide = null; this.windT = 0.45; this.facing = sign(cx - b.x) || this.facing; this.setState('windup'); }
      else if (r === 'blocked') { this.knowsHide = null; }
      return;
    }
    this.knowsHide = null;
    const target = this.seenT < 0.5 ? ada.body : (this.last || ada.body);
    const dx = target.x - b.x, dy = target.y - b.y;
    if (Math.abs(dx) < 78 && Math.abs(dy) < 56 && this.cool <= 0 && this.seenT < 0.5) {
      this.facing = sign(dx) || this.facing;
      this.windT = this.poise < 3 ? 0.36 : 0.5;
      this.setState('windup');
      return;
    }
    if (Math.abs(dx) < 58 && Math.abs(dy) < 56) { this.facing = sign(dx) || this.facing; this.stand(dt); return; }
    const r = this.walkTo(target.x, SPEED.chase, dt, 50);
    if (r === 'blocked' || (Math.abs(dy) > 90 && Math.abs(dx) < 120)) {
      // She is somewhere he cannot follow (up a ladder, on a ledge): wait below and watch.
      this.blockedT += dt;
      if (this.blockedT > 3.5) { this.blockedT = 0; this.S = 0.6; this.bark('lost'); this.toSearch(); }
    } else this.blockedT = 0;
  }

  updateStrike(dt, ada) {
    this.stand(dt);
    if (!this.hitDone && this.t >= STRIKE.active[0] && this.t <= STRIKE.active[1]) {
      const b = this.body;
      const r = { x: this.facing > 0 ? b.x + 6 : b.x - STRIKE.reach - 6, y: b.y - STRIKE.top, w: STRIKE.reach, h: STRIKE.top - STRIKE.bottom };
      if (rectsOverlap(r, ada.body.rect()) && ada.alive) {
        this.hitDone = true;
        if (ada.damage(1, this.facing)) this.scene.onAdaHit(this);
      }
    }
    if (this.t >= STRIKE.dur) this.setState('recover');
  }

  // Ada hit him. Returns true when the blow connected.
  takeHit(dmg, dir, knock, kind, ada) {
    if (!this.enabled || this.ko) return false;
    const surprised = !this.aware;
    if (surprised) dmg += 1;
    this.hp -= dmg;
    this.S = 1.3;
    this.seenT = 0;
    this.last = { x: ada.x, y: ada.y };
    const b = this.body;
    if (this.hp <= 0) {
      b.vx = dir * knock * 1.3;
      this.setState('ko');
      this.scene.onEnemyKO(this);
      return true;
    }
    this.poise -= kind === 'kick' ? 2 : 1;
    this.poiseT = 1.5;
    this.facing = -dir;
    if (this.poise > 0 || surprised) {
      b.vx = dir * knock;
      this.setState('hurt');
      if (surprised) this.scene.onAlert(this, true);
    } else {
      // He shrugs off the combo and strikes back quickly.
      b.vx = dir * knock * 0.35;
      this.poise = 3; this.poiseT = 0;
      this.bark('counter', true);
      this.windT = 0.3;
      this.setState('windup');
    }
    return true;
  }

  updateKO(dt) {
    const b = this.body;
    b.vx = approach(b.vx, 0, 700 * dt);
    this.physics(dt);
    this.iconKind = null;
  }

  // A colleague lying on the floor raises the alarm.
  noticeBody(other) {
    if (this.sawBody || this.aware || !other.ko) return;
    const range = this.sightRange(other.light);
    if (this.canSee(other.body.x, other.body.y - 20, range) < 0) return;
    this.sawBody = true;
    this.alertness = 1.25;
    this.bark('body', true);
    this.S = Math.max(this.S, 0.8);
    this.goal = { x: other.body.x, y: other.body.y };
    this.goalFast = true;
    this.scene.onSuspicious(this);
    this.setState('suspicious');
  }

  updateIcon() {
    if (this.aware && this.state !== 'hurt') { this.iconKind = this.t < 1.4 && this.state === 'alert' ? 'ex' : null; this.iconAmt = 1; return; }
    if (this.state === 'suspicious' || this.state === 'search' || this.S > 0.08) { this.iconKind = 'q'; this.iconAmt = clamp(this.S / STEALTH.alert, 0.15, 1); return; }
    this.iconKind = null;
  }

  // ------------------------------------------------------------ animation
  animate(dt) {
    const b = this.body;
    let pose, rate = damp(14, dt);
    const sp = Math.abs(b.vx);
    switch (this.state) {
      case 'ko': pose = this.t < 0.5 ? A.knockdown(this.t / 0.5) : A.lying(this.clock); rate = damp(18, dt); break;
      case 'hurt': pose = A.hurt(this.t / 0.34, 'man'); rate = damp(30, dt); break;
      case 'windup': pose = A.windup(Math.min(1, this.t / this.windT)); rate = damp(22, dt); break;
      case 'strike': pose = A.strike(Math.min(1, this.t / 0.1)); rate = damp(44, dt); break;
      case 'recover': pose = A.idle(this.clock, 'man'); rate = damp(5, dt); break;
      default:
        if (sp > 160) { this.phase += sp * dt / 175 * TAU; pose = A.chase(this.phase); }
        else if (sp > 12) {
          this.phase += sp * dt / 96 * TAU;
          pose = this.lantern ? A.patrol(this.phase) : A.walk(this.phase, 'man', 0.9);
        } else if (this.state === 'search' || (this.state === 'patrol' && this.wait > 0) || this.state === 'suspicious') pose = A.lookAround(this.clock);
        else if (this.state === 'alert') pose = A.guard(this.clock);
        else pose = A.idle(this.clock, 'man');
    }
    // The torch stays level in front of him, whatever the rest of the body does.
    if (this.torch && !['ko', 'hurt', 'windup', 'strike'].includes(this.state)) {
      pose.uaF = clamp(pose.uaF, -8, 12);
      pose.faF = 18 - pose.uaF;
    }
    this.rig.facing = this.facing;
    this.rig.update(pose, b.x, b.y, dt, rate, { vx: b.vx, vy: b.vy, t: this.clock });
  }
}
