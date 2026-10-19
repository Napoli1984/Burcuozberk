// Ada: movement, climbing, combat and the animation that goes with each state.
import { ADA, COMBAT, NOISE, TILE } from './config.js';
import { Body } from './body.js';
import { Rig, makePose } from './rig.js';
import { A } from './anim.js';
import { T } from './level5.js';
import { clamp, approach, damp, sign } from './util.js';

const TWO_PI = Math.PI * 2;

export class Ada {
  constructor(scene, x, y, def) {
    this.scene = scene;
    this.map = scene.map;
    this.body = new Body(x, y, ADA.width, ADA.height);
    this.rig = new Rig(scene, def, { rest: A.idle(0) });
    this.rig.setDepth(30);
    this.facing = 1;
    this.state = 'ground';
    this.t = 0;          // time in the current state
    this.clock = 0;
    this.resist = ADA.maxResist;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumpCut = false;
    this.phase = 0;
    this.crouch = false;
    this.landT = 1;
    this.peakY = y;
    this.invuln = 0;
    this.combo = 0;
    this.comboT = 0;
    this.queued = null;
    this.hitDone = new Set();
    this.ledge = null;
    this.grabCooldown = 0;
    this.ladderPhase = 0;
    this.hide = null;
    this.holding = null;
    this.busy = null;
    this.safeT = 0;
    this.regenT = 0;
    this.stepT = 0;
    this.light = 0.4;
    this.combatT = 0;
    this.hurtDir = 0;
    this.hang = this.rig.measure(A.hang(0));
    this.frozen = false;
    this.light = 0.4;
    this.tint = 0xffffff;
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get alive() { return this.state !== 'down'; }
  get visibleToEnemies() { return !this.hide && this.state !== 'down' && !this.frozen; }
  get crouching() { return this.crouch || this.state === 'hidden'; }
  // How easy Ada is to spot: body posture and movement (used by the guards' eyes).
  get posture() {
    if (this.state === 'hidden') return 0;
    if (this.crouch) return 0.7;
    if (this.state === 'hang' || this.state === 'ladder') return 0.9;
    return 1;
  }
  get motion() {
    const sp = Math.abs(this.body.vx);
    if (this.state === 'punch' || this.state === 'kick' || this.state === 'dodge') return 1.3;
    if (this.state === 'air') return 1.15;
    if (sp < 20) return 0.7;
    if (sp <= ADA.walkSpeed + 12) return 1;
    return 1.25;
  }

  setState(s) { this.state = s; this.t = 0; }

  teleport(x, y) {
    const b = this.body;
    b.x = x; b.y = y; b.vx = 0; b.vy = 0; b.onGround = true; b.h = ADA.height;
    this.crouch = false; this.hide = null; this.busy = null; this.ledge = null;
    this.setState('ground');
    this.rig.setAlpha(1);
  }

  // ------------------------------------------------------------ main update
  update(dt, inp) {
    this.clock += dt;
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    this.grabCooldown = Math.max(0, this.grabCooldown - dt);
    this.combatT = Math.max(0, this.combatT - dt);
    this.body.dropTimer = Math.max(0, this.body.dropTimer - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (inp.pressed('jump')) this.jumpBuf = ADA.jumpBuffer;
    if (this.frozen) { this.applyPhysics(dt, 0); this.animate(dt); return; }

    switch (this.state) {
      case 'ground': this.updateGround(dt, inp); break;
      case 'air': this.updateAir(dt, inp); break;
      case 'hang': this.updateHang(dt, inp); break;
      case 'climb': this.updateClimb(dt); break;
      case 'ladder': this.updateLadder(dt, inp); break;
      case 'punch': case 'kick': this.updateAttack(dt, inp); break;
      case 'dodge': this.updateDodge(dt); break;
      case 'hurt': this.updateHurt(dt); break;
      case 'down': this.updateDown(dt); break;
      case 'hidden': this.updateHidden(dt, inp); break;
      case 'busy': this.updateBusy(dt); break;
    }
    this.updateRegen(dt);
    this.animate(dt);
  }

  // ------------------------------------------------------------ physics helpers
  applyPhysics(dt, targetVx, accel = ADA.groundAccel) {
    const b = this.body;
    b.vx = approach(b.vx, targetVx, accel * dt);
    b.vy = Math.min(b.vy + ADA.gravity * dt, ADA.maxFall);
    b.moveX(this.map, b.vx * dt);
    const wasGround = b.onGround;
    b.moveY(this.map, b.vy * dt);
    return wasGround;
  }

  wantsWalk(inp) {
    return inp.down('walk') || (inp.analogX && Math.abs(inp.axisX) < 0.68);
  }

  ladderHere() {
    const b = this.body;
    const tx = Math.floor(b.x / TILE);
    const ty = Math.floor((b.y - 50) / TILE);
    if (this.map.get(tx, ty) === T.LADDER || this.map.get(tx, Math.floor((b.y - 8) / TILE)) === T.LADDER) return tx;
    return -1;
  }

  ladderBelow() {
    const b = this.body;
    const tx = Math.floor(b.x / TILE), ty = Math.floor((b.y + 4) / TILE);
    return this.map.get(tx, ty) === T.LADDER ? tx : -1;
  }

  setCrouch(on) {
    const b = this.body;
    if (on === this.crouch) return;
    if (!on && !b.roomFor(this.map, b.x, b.y, ADA.height)) return;
    this.crouch = on;
    b.h = on ? ADA.crouchHeight : ADA.height;
  }

  // ------------------------------------------------------------ states
  updateGround(dt, inp) {
    const b = this.body;
    const ax = inp.axisX;
    const dir = Math.abs(ax) > 0.2 ? sign(ax) : 0;
    if (dir) this.facing = dir;
    this.landT += dt;

    // Ladders: up to climb, down from a ladder top.
    if (inp.down('up') && this.ladderHere() >= 0) { this.startLadder(this.ladderHere()); return; }
    if (inp.down('down') && !inp.down('jump') && this.ladderBelow() >= 0 && Math.abs(ax) < 0.4) { b.y += 3; this.startLadder(this.ladderBelow()); return; }

    const wantCrouch = inp.down('down') && !(inp.down('jump'));
    this.setCrouch(wantCrouch);
    // Drop through a one-way platform: down + jump.
    if (inp.down('down') && inp.pressed('jump') && (b.groundType === T.ONEWAY || b.groundType === T.LADDER)) {
      b.dropTimer = 0.28; b.y += 2; b.onGround = false; this.setCrouch(false); this.enterAir(); return;
    }

    let speed = ADA.runSpeed;
    if (this.crouch) speed = ADA.crouchSpeed;
    else if (this.wantsWalk(inp)) speed = ADA.walkSpeed;
    const target = dir * speed * (inp.analogX && !this.crouch ? clamp(Math.abs(ax) / 0.68, 0.45, 1) : 1);
    const accel = Math.abs(target) > Math.abs(b.vx) ? ADA.groundAccel : ADA.groundDecel;

    if (this.jumpBuf > 0 && !this.crouch) { this.jump(); return; }
    if (inp.pressed('punch')) { this.startAttack('punch'); return; }
    if (inp.pressed('kick')) { this.startAttack('kick'); return; }
    if (inp.pressed('dodge')) { this.startDodge(dir || this.facing); return; }

    this.applyPhysics(dt, target, accel);
    if (!b.onGround) { this.coyote = ADA.coyote; this.enterAir(); return; }

    // Footsteps and the noise they make.
    const sp = Math.abs(b.vx);
    if (sp > 30) {
      this.stepT -= dt * (sp / (this.crouch ? 70 : sp > 200 ? 175 : 95));
      if (this.stepT <= 0) {
        this.stepT = 1;
        const loud = sp > 200 && !this.crouch;
        this.scene.footstep(this, loud);
        if (loud) this.scene.noise(b.x, b.y - 20, NOISE.run, 'run', this);
      }
    }
  }

  jump() {
    const b = this.body;
    b.vy = -ADA.jumpVelocity;
    b.onGround = false;
    this.jumpBuf = 0; this.coyote = 0; this.jumpCut = false;
    this.setCrouch(false);
    this.enterAir();
    this.scene.sfx('jump');
  }

  enterAir() {
    this.body.onGround = false;
    this.setState('air');
    this.peakY = this.body.y;
  }

  updateAir(dt, inp) {
    const b = this.body;
    const ax = inp.axisX;
    const dir = Math.abs(ax) > 0.2 ? sign(ax) : 0;
    if (dir) this.facing = dir;
    this.coyote = Math.max(0, this.coyote - dt);
    if (this.coyote > 0 && this.jumpBuf > 0 && b.vy >= 0) { this.jump(); return; }
    if (!inp.down('jump') && b.vy < 0 && !this.jumpCut) { b.vy *= ADA.jumpCut; this.jumpCut = true; }
    if (inp.down('up') && this.ladderHere() >= 0 && b.vy > -300) { this.startLadder(this.ladderHere()); return; }
    if (b.vy > -260 && this.grabCooldown <= 0 && !inp.down('down')) {
      const L = this.findLedge(this.facing);
      if (L) { this.startHang(L); return; }
    }
    const speed = this.wantsWalk(inp) ? ADA.walkSpeed : ADA.runSpeed;
    this.applyPhysics(dt, dir * speed, ADA.airAccel);
    this.peakY = Math.min(this.peakY, b.y);
    if (b.onGround) this.land();
  }

  land() {
    const b = this.body;
    const h = b.y - this.peakY;
    this.landT = 0;
    this.setState('ground');
    if (h > ADA.fallHurt) {
      this.damage(h > ADA.fallHurt * 1.8 ? 2 : 1, 0, true);
      this.scene.noise(b.x, b.y - 10, NOISE.hardLand, 'land', this);
      this.scene.sfx('land', 1);
    } else if (h > 150) {
      this.scene.noise(b.x, b.y - 10, NOISE.land, 'land', this);
      this.scene.sfx('land', 0.7);
    } else {
      this.scene.sfx('land', 0.35);
    }
  }

  findLedge(dir) {
    const b = this.body, map = this.map;
    const reachTop = b.y - ADA.ledgeReach;
    const reachLow = b.y - 86;
    const edgeX = dir > 0 ? b.right + 4 : b.left - 4;
    const tx = Math.floor(edgeX / TILE);
    for (let ty = Math.floor(reachTop / TILE); ty <= Math.floor(reachLow / TILE); ty++) {
      const top = ty * TILE;
      if (top < reachTop || top > reachLow) continue;
      if (!map.isBlock(map.get(tx, ty))) continue;
      if (map.isBlock(map.get(tx, ty - 1)) || map.isSlope(map.get(tx, ty - 1))) continue;
      // room to stand on top
      if (map.isBlock(map.get(tx, ty - 2)) || map.isBlock(map.get(tx, ty - 3))) continue;
      // nothing solid between the body and the wall face above the ledge
      const faceX = dir > 0 ? tx * TILE : (tx + 1) * TILE;
      if (map.rectBlocked(Math.min(b.x, faceX) + 1, top - 30, Math.abs(faceX - b.x) - 2, 28)) continue;
      return { tx, ty, x: faceX, y: top, dir };
    }
    return null;
  }

  startHang(L) {
    const b = this.body;
    this.ledge = L;
    this.facing = L.dir;
    b.vx = 0; b.vy = 0;
    b.x = L.x - L.dir * (b.w / 2 + 1);
    b.y = L.y - this.hang.y;
    this.setCrouch(false);
    this.setState('hang');
    this.scene.sfx('grab');
  }

  updateHang(dt, inp) {
    const L = this.ledge;
    if (inp.pressed('jump') || inp.down('up') || (sign(inp.axisX) === L.dir && Math.abs(inp.axisX) > 0.6 && this.t > 0.25)) {
      this.climbFrom = { x: this.body.x, y: this.body.y };
      this.setState('climb');
      this.scene.sfx('climb');
      return;
    }
    if (inp.down('down') || (sign(inp.axisX) === -L.dir && Math.abs(inp.axisX) > 0.6)) {
      this.grabCooldown = ADA.hangDrop;
      this.ledge = null;
      this.body.vy = 40;
      this.enterAir();
    }
  }

  updateClimb(dt) {
    const L = this.ledge, b = this.body;
    const u = Math.min(1, this.t / ADA.climbUpTime);
    const tx = L.x + L.dir * (b.w / 2 + 6);
    const up = Math.min(1, u / 0.6), across = Math.max(0, (u - 0.45) / 0.55);
    b.y = this.climbFrom.y + (L.y - this.climbFrom.y) * (1 - Math.pow(1 - up, 2));
    b.x = this.climbFrom.x + (tx - this.climbFrom.x) * Math.min(1, across);
    if (u >= 1) {
      b.x = tx; b.y = L.y; b.vx = 0; b.vy = 0; b.onGround = true;
      this.ledge = null;
      this.landT = 0.05;
      this.setState('ground');
    }
  }

  startLadder(tx) {
    const b = this.body;
    b.x = tx * TILE + TILE / 2;
    b.vx = 0; b.vy = 0;
    b.onGround = false;
    this.ladderTx = tx;
    this.setCrouch(false);
    this.setState('ladder');
  }

  updateLadder(dt, inp) {
    const b = this.body, map = this.map, tx = this.ladderTx;
    const ay = inp.axisY;
    const dy = (Math.abs(ay) > 0.3 ? sign(ay) : 0) * ADA.climbSpeed * dt;
    if (inp.pressed('jump')) {
      const d = Math.abs(inp.axisX) > 0.3 ? sign(inp.axisX) : 0;
      if (d) this.facing = d;
      b.vy = d ? -420 : 0; b.vx = d * 180;
      this.grabCooldown = 0.2;
      this.enterAir();
      return;
    }
    if (dy !== 0) {
      this.ladderPhase += Math.abs(dy) / 22 * Math.PI;
      this.rungDist = (this.rungDist || 0) + Math.abs(dy);
      if (this.rungDist > 38) { this.rungDist = 0; this.scene.sfx('rung'); }
    }
    if (dy < 0) {
      // top of the ladder: step off onto it
      let top = Math.floor((b.y - 1) / TILE);
      while (map.get(tx, top - 1) === T.LADDER) top--;
      const topY = top * TILE;
      const ny = b.y + dy;
      if (map.get(tx, Math.floor((ny - b.h) / TILE)) !== T.LADDER && map.isBlock(map.get(tx, Math.floor((ny - b.h) / TILE)))) {
        // ceiling: stop
      } else if (ny <= topY && map.get(tx, top - 1) !== T.LADDER) {
        b.y = topY; b.onGround = true; b.groundType = T.LADDER;
        this.setState('ground');
        return;
      } else {
        b.y = ny;
      }
    } else if (dy > 0) {
      const ny = b.y + dy;
      const g = map.probeGround(b.x, b.y, ny, false, true);
      if (g !== null && map.get(tx, Math.floor((g + 1) / TILE)) !== T.LADDER) {
        b.y = g; b.onGround = true; this.setState('ground'); return;
      }
      b.y = ny;
      const on = (yy) => map.get(tx, Math.floor(yy / TILE)) === T.LADDER;
      if (!on(b.y + 2) && !on(b.y - 10) && !on(b.y - 60)) {
        this.enterAir();
        return;
      }
    }
    if (Math.abs(inp.axisX) > 0.7 && Math.abs(ay) < 0.3 && this.t > 0.2) {
      // step sideways off the ladder
      this.facing = sign(inp.axisX);
      b.vx = this.facing * 120;
      this.enterAir();
    }
  }

  startAttack(kind) {
    this.setCrouch(false);
    if (kind === 'punch') {
      this.combo = this.comboT > 0 ? (this.combo + 1) % 3 : 0;
    }
    this.queued = null;
    this.hitDone.clear();
    this.combatT = 3;
    this.setState(kind);
    this.body.vx = this.facing * (kind === 'kick' ? 90 : 70);
    this.scene.sfx('whoosh', kind === 'kick' ? 1 : 0.7);
  }

  updateAttack(dt, inp) {
    const C = COMBAT[this.state];
    const b = this.body;
    if (inp.pressed('punch')) this.queued = 'punch';
    if (inp.pressed('kick')) this.queued = 'kick';
    if (inp.pressed('dodge')) { this.startDodge(Math.abs(inp.axisX) > 0.2 ? sign(inp.axisX) : this.facing); return; }
    this.applyPhysics(dt, 0, 600);
    if (this.t >= C.active[0] && this.t <= C.active[1]) {
      const r = { x: this.facing > 0 ? b.x : b.x - C.reach, y: b.y - C.top, w: C.reach, h: C.top - C.bottom };
      this.scene.playerAttack(this, r, C, this.state);
    }
    if (this.t >= C.dur) {
      if (this.state === 'punch') this.comboT = COMBAT.punch.chain;
      const q = this.queued;
      this.setState('ground');
      if (q) this.startAttack(q);
    }
  }

  startDodge(dir) {
    this.setCrouch(false);
    this.facing = dir;
    this.setState('dodge');
    this.body.vx = dir * ADA.dodgeSpeed;
    this.scene.sfx('dodge');
  }

  updateDodge(dt) {
    const b = this.body;
    const u = this.t / ADA.dodgeTime;
    if (this.t >= ADA.dodgeInvuln[0] && this.t <= ADA.dodgeInvuln[1]) this.invuln = Math.max(this.invuln, 0.02);
    b.vx = this.facing * ADA.dodgeSpeed * (1 - u * 0.6);
    b.vy = Math.min(b.vy + ADA.gravity * dt, ADA.maxFall);
    b.moveX(this.map, b.vx * dt);
    b.moveY(this.map, b.vy * dt);
    if (u >= 1) { this.setState(b.onGround ? 'ground' : 'air'); if (!b.onGround) this.peakY = b.y; }
  }

  damage(n, dir, fall = false) {
    if (this.state === 'down') return false;
    if (!fall && this.invuln > 0) return false;
    this.resist = Math.max(0, this.resist - n);
    this.regenT = 0; this.safeT = 0;
    this.scene.onAdaHurt(n);
    if (this.hide) this.leaveHide();
    if (this.resist <= 0) {
      this.setState('down');
      this.body.vx = dir * 160;
      this.scene.sfx('down');
      return true;
    }
    if (!fall) {
      this.hurtDir = dir;
      this.body.vx = dir * 210;
      this.setState('hurt');
      this.invuln = 0.5;
    }
    return true;
  }

  updateHurt(dt) {
    this.applyPhysics(dt, 0, 900);
    if (this.t >= ADA.hurtTime) this.setState(this.body.onGround ? 'ground' : 'air');
  }

  updateDown(dt) {
    this.applyPhysics(dt, 0, 700);
    if (this.t > 1.5 && !this.respawning) { this.respawning = true; this.scene.adaDown(); }
  }

  enterHide(spot) {
    this.hide = spot;
    this.body.vx = 0;
    this.setCrouch(false);
    this.setState('hidden');
    this.scene.sfx('rustle');
  }

  leaveHide() {
    this.hide = null;
    if (this.state === 'hidden') this.setState('ground');
  }

  updateHidden(dt, inp) {
    this.applyPhysics(dt, 0, 2000);
    if (this.t > 0.25 && (Math.abs(inp.axisX) > 0.5 || inp.pressed('jump') || inp.pressed('action') || inp.pressed('punch') || inp.pressed('kick'))) {
      if (inp.pressed('action')) inp.consume('action');
      this.leaveHide();
    }
  }

  // Short scripted actions (examine, pick up, throw, push).
  doBusy(kind, dur, poseFn, at, fn) {
    this.setCrouch(false);
    this.busy = { kind, dur, poseFn, at, fn, done: false };
    this.body.vx = 0;
    this.setState('busy');
  }

  updateBusy(dt) {
    const bz = this.busy;
    this.applyPhysics(dt, 0, 2000);
    if (!bz.done && this.t >= bz.at) { bz.done = true; if (bz.fn) bz.fn(); }
    if (this.t >= bz.dur) { this.busy = null; this.setState('ground'); }
  }

  updateRegen(dt) {
    if (this.state === 'down') return;
    const danger = this.scene.dangerNear(this);
    if (!danger || this.hide) this.safeT += dt; else this.safeT = 0;
    if (this.resist < ADA.maxResist && this.safeT > ADA.regenDelay) {
      this.regenT += dt;
      if (this.regenT >= ADA.regenStep) { this.regenT = 0; this.resist++; this.scene.onAdaHeal(); }
    }
  }

  // ------------------------------------------------------------ animation
  animate(dt) {
    const b = this.body;
    let pose, rate = damp(16, dt);
    const sp = Math.abs(b.vx);
    switch (this.state) {
      case 'ground': {
        if (this.crouch) {
          if (sp > 20) { this.phase += sp * dt / 60 * Math.PI; pose = A.crouchWalk(this.phase); }
          else pose = A.crouch(this.clock);
        } else if (sp > 190) { this.phase += sp * dt / 168 * TWO_PI; pose = A.run(this.phase); }
        else if (sp > 18) { this.phase += sp * dt / 86 * TWO_PI; pose = A.walk(this.phase, 'ada', clamp(sp / 128, 0.6, 1.15)); }
        else pose = this.combatT > 0 ? A.guard(this.clock) : A.idle(this.clock);
        if (this.landT < 0.18) { const l = A.land(this.landT / 0.18); pose = l; rate = damp(30, dt); }
        break;
      }
      case 'air': pose = b.vy < 0 ? A.jump(b.vy) : A.fall(b.vy); rate = damp(12, dt); break;
      case 'hang': pose = A.hang(this.t); rate = damp(24, dt); break;
      case 'climb': pose = A.climbUp(Math.min(1, this.t / ADA.climbUpTime)); rate = damp(30, dt); break;
      case 'ladder': pose = A.ladder(this.ladderPhase); rate = damp(20, dt); break;
      case 'punch': pose = A.punch(this.combo, Math.min(1, this.t / COMBAT.punch.dur)); rate = damp(40, dt); break;
      case 'kick': pose = A.kick(Math.min(1, this.t / COMBAT.kick.dur)); rate = damp(40, dt); break;
      case 'dodge': pose = A.roll(this.t / ADA.dodgeTime); rate = 1; break;
      case 'hurt': pose = A.hurt(this.t / ADA.hurtTime); rate = damp(30, dt); break;
      case 'down': pose = this.t < 0.5 ? A.knockdown(this.t / 0.5) : A.lying(this.clock); rate = damp(20, dt); break;
      case 'hidden': pose = A.hidden(this.clock); rate = damp(14, dt); break;
      case 'busy': pose = this.busy && this.busy.poseFn ? this.busy.poseFn(Math.min(1, this.t / this.busy.dur), this.t) : A.idle(this.clock); rate = damp(26, dt); break;
      default: pose = A.idle(this.clock);
    }
    this.rig.facing = this.facing;
    let dx = 0;
    if (this.state === 'hang') dx = this.facing * 9;
    if (this.state === 'climb') dx = this.facing * 9 * (1 - Math.min(1, this.t / ADA.climbUpTime));
    this.rig.update(pose, b.x + dx, b.y, dt, rate, { vx: b.vx, vy: b.vy, t: this.clock });
    this.rig.setAlpha(this.state === 'hidden' ? 0.5 : (this.invuln > 0 && this.state === 'hurt' && Math.floor(this.clock * 20) % 2 ? 0.6 : 1));
  }
}
