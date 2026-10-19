// A character made of painted pieces (cut-out animation). Each frame a pose of joint angles
// is turned into positions and rotations for the pieces (forward kinematics).
import { DEG, clamp } from './util.js';

const KEYS = ['lean', 'chest', 'head', 'pelvis', 'thF', 'shF', 'ftF', 'thB', 'shB', 'ftB', 'uaF', 'faF', 'uaB', 'faB', 'rot', 'hx', 'hy'];

export function makePose(p = {}) {
  const o = {};
  for (const k of KEYS) o[k] = p[k] ?? 0;
  o.fit = p.fit ?? 'feet';
  return o;
}

export function blendPose(out, target, t) {
  for (const k of KEYS) out[k] += (target[k] - out[k]) * t;
  out.fit = target.fit;
  return out;
}

export function mixPose(a, b, t) {
  const o = {};
  for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  o.fit = t < 0.5 ? a.fit : b.fit;
  return o;
}

const rot = (x, y, r) => [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];

export class Rig {
  constructor(scene, def, opts = {}) {
    this.def = def;
    this.b = def.bones;
    this.root = scene.add.container(0, 0);
    this.img = {};
    for (const name of def.order) {
      const p = def.parts[name];
      const im = scene.add.image(0, 0, p.key).setOrigin(p.ox, p.oy).setScale(p.scale);
      this.img[name] = im;
      this.root.add(im);
    }
    this.facing = 1;
    this.cur = makePose(opts.rest || {});
    this.hairAng = [-10, -14, -18];
    this.hairVel = [0, 0, 0];
    this.bagAng = -4; this.bagVel = 0;
    this.lanternAng = 0; this.lanternVel = 0;
    this.tint = -1;
    this.footPts = opts.footPts || [[-3.4, 10.6], [15.5, 9.6]];
    this.lanternPos = { x: 0, y: 0 };
    this.handPos = { x: 0, y: 0 };
    this.headPos = { x: 0, y: 0 };
    this.lastX = 0;
  }

  setDepth(d) { this.root.setDepth(d); return this; }
  setVisible(v) { this.root.setVisible(v); return this; }
  setAlpha(a) { this.root.setAlpha(a); return this; }

  setTint(c) {
    if (c === this.tint) return;
    this.tint = c;
    for (const k in this.img) this.img[k].setTint(c);
  }

  // Blend toward a target pose (rate 0..1 per frame, already framerate-corrected) and draw at x,y (feet).
  update(target, x, y, dt, rate, motion = {}) {
    if (rate >= 1) Object.assign(this.cur, target); else blendPose(this.cur, target, rate);
    this.draw(x, y, dt, motion);
  }

  draw(x, y, dt, motion) {
    const p = this.cur, b = this.b;
    const legLen = b.thigh + b.shin + b.ankle;
    const hip = [p.hx, -legLen + p.hy];
    const T = (p.lean + p.chest) * DEG;
    const H = T + p.head * DEG;
    const up = [Math.sin(T), -Math.cos(T)];
    const fwd = [Math.cos(T), Math.sin(T)];
    const neck = [hip[0] + up[0] * b.torso, hip[1] + up[1] * b.torso];
    const shoulder = (off) => [hip[0] + up[0] * (b.torso - 4.5) + fwd[0] * off, hip[1] + up[1] * (b.torso - 4.5) + fwd[1] * off];
    const sF = shoulder(1.2), sB = shoulder(-1.6);
    const limb = (start, ang, len) => [start[0] + Math.sin(ang) * len, start[1] + Math.cos(ang) * len];
    const UAF = p.uaF * DEG, FAF = UAF + p.faF * DEG, UAB = p.uaB * DEG, FAB = UAB + p.faB * DEG;
    const eF = limb(sF, UAF, b.uarm), wF = limb(eF, FAF, b.farm);
    const eB = limb(sB, UAB, b.uarm), wB = limb(eB, FAB, b.farm);
    const hF = [hip[0] + 1.6, hip[1]], hB = [hip[0] - 1.6, hip[1]];
    const THF = p.thF * DEG, SHF = THF + p.shF * DEG, FTF = SHF + p.ftF * DEG;
    const THB = p.thB * DEG, SHB = THB + p.shB * DEG, FTB = SHB + p.ftB * DEG;
    const kF = limb(hF, THF, b.thigh), aF = limb(kF, SHF, b.shin);
    const kB = limb(hB, THB, b.thigh), aB = limb(kB, SHB, b.shin);

    // Whole-body rotation (rolls, falls) around the middle of the body.
    const R = p.rot * DEG;
    const pivot = [0, -legLen * 0.75];
    const pts = { hip, neck, sF, sB, eF, wF, eB, wB, hF, hB, kF, aF, kB, aB };
    if (R !== 0) {
      for (const k in pts) {
        const q = pts[k];
        const r2 = rot(q[0] - pivot[0], q[1] - pivot[1], R);
        q[0] = r2[0] + pivot[0]; q[1] = r2[1] + pivot[1];
      }
    }
    // Keep the body on the ground: either the feet or the lowest point of the whole body.
    let dy = 0;
    if (p.fit === 'feet') {
      let low = -1e9;
      for (const [ank, ang] of [[pts.aF, FTF + R], [pts.aB, FTB + R]]) {
        for (const fp of this.footPts) {
          const r2 = rot(fp[0], fp[1], -ang);
          low = Math.max(low, ank[1] + r2[1]);
        }
      }
      dy = -low;
    } else if (p.fit === 'all') {
      let low = -1e9;
      for (const k in pts) low = Math.max(low, pts[k][1]);
      dy = -low - 4;
    }
    if (dy !== 0) for (const k in pts) pts[k][1] += dy;

    const im = this.img;
    const place = (name, pt, r) => { const o = im[name]; if (o) { o.x = pt[0]; o.y = pt[1]; o.rotation = r; } };
    place('pelvis', pts.hip, (p.pelvis * DEG) + R);
    place('torso', pts.hip, T + R);
    place('head', pts.neck, H + R);
    place('thighF', pts.hF, -THF + R); place('shinF', pts.kF, -SHF + R); place('footF', pts.aF, -FTF + R);
    place('thighB', pts.hB, -THB + R); place('shinB', pts.kB, -SHB + R); place('footB', pts.aB, -FTB + R);
    place('uarmF', pts.sF, -UAF + R); place('farmF', pts.eF, -FAF + R);
    place('uarmB', pts.sB, -UAB + R); place('farmB', pts.eB, -FAB + R);

    // Secondary motion: hair, bag and lantern swing like damped springs.
    const vx = motion.vx || 0, vy = motion.vy || 0;
    const speedBack = clamp(vx * this.facing, -400, 500);
    if (b.hairAttach && im.hair1) {
      const ha = rot(b.hairAttach[0], b.hairAttach[1], H + R);
      let start = [pts.neck[0] + ha[0], pts.neck[1] + ha[1]];
      let base = -9 - clamp(speedBack * 0.09, -10, 52) + clamp(vy * 0.03, -25, 30) - (p.lean * 0.55) - (p.rot);
      const k = 140, c = 13;
      for (let i = 0; i < 3; i++) {
        const target = base - i * 7 + Math.sin((motion.t || 0) * 1.7 + i) * 2.2;
        const acc = k * (target - this.hairAng[i]) - c * this.hairVel[i];
        this.hairVel[i] += acc * dt;
        this.hairAng[i] += this.hairVel[i] * dt;
        const a = this.hairAng[i] * DEG;
        const name = 'hair' + (i + 1);
        place(name, start, -a);
        start = limb(start, a, b.hair[i] - 1.5);
        base = this.hairAng[i];
      }
    }
    if (im.bag) {
      const target = -5 - clamp(speedBack * 0.035, -8, 22) - p.lean * 0.6 - p.rot;
      this.bagVel += (90 * (target - this.bagAng) - 9 * this.bagVel) * dt;
      this.bagAng += this.bagVel * dt;
      place('bag', pts.sF, -this.bagAng * DEG);
    }
    if (im.lantern) {
      const target = -clamp(speedBack * 0.05, -20, 30) - p.rot;
      this.lanternVel += (80 * (target - this.lanternAng) - 6 * this.lanternVel) * dt;
      this.lanternAng += this.lanternVel * dt;
      place('lantern', pts.wF, -this.lanternAng * DEG);
      const lp = limb(pts.wF, this.lanternAng * DEG, 12);
      this.lanternLocal = lp;
    }
    if (im.baton) place('baton', pts.wB, -FAB + R);

    this.root.x = x;
    this.root.y = y;
    this.root.scaleX = this.facing;
    // World positions of a few points other systems need.
    this.handPos.x = x + pts.wF[0] * this.facing; this.handPos.y = y + pts.wF[1];
    this.headPos.x = x + pts.neck[0] * this.facing; this.headPos.y = y + pts.neck[1] - 12;
    if (this.lanternLocal) { this.lanternPos.x = x + this.lanternLocal[0] * this.facing; this.lanternPos.y = y + this.lanternLocal[1]; }
    this.pts = pts;
  }

  // Where the front hand ends up for a given pose, relative to the feet (used to hang from ledges).
  measure(pose) {
    const saved = { ...this.cur };
    Object.assign(this.cur, pose);
    this.draw(0, 0, 0, {});
    const w = this.pts.wF.slice();
    Object.assign(this.cur, saved);
    return { x: w[0], y: w[1] };
  }

  destroy() { this.root.destroy(); }
}
