// Pose library: every function returns joint angles in degrees for one moment of an animation.
// Limbs: 0 = hanging straight down, positive = rotated toward the front. Knees bend with negative values,
// elbows with positive values. lean/chest/head tilt the upper body forward when positive.
import { makePose, mixPose } from './rig.js';
import { clamp, smooth } from './util.js';

const S = Math.sin, C = Math.cos;
const pos = (v) => (v > 0 ? v : 0);

export const A = {
  idle(t, style = 'ada') {
    const br = S(t * 2.1);
    if (style === 'man') {
      return makePose({ lean: 1 + br * 0.6, head: -2, thF: 4, shF: -3, thB: -3, shB: -2, uaF: 6 + br, faF: 12, uaB: -4 - br, faB: 10 });
    }
    return makePose({ lean: 0.5 + br * 0.7, chest: br * 0.4, head: -1.5, thF: 7, shF: -6, ftF: 0, thB: -4, shB: -2, uaF: 4 + br * 1.2, faF: 14, uaB: -5 - br, faB: 12 });
  },
  walk(ph, style = 'ada', k = 1) {
    const a = (style === 'man' ? 20 : 22) * k;
    const knee = (x) => -(5 + 46 * Math.pow(pos(C(x)), 1.5));
    const arm = (style === 'man' ? 14 : 17) * k;
    return makePose({
      lean: 3 * k, head: -2,
      thF: a * S(ph), shF: knee(ph), ftF: 6 * pos(C(ph)),
      thB: a * S(ph + Math.PI), shB: knee(ph + Math.PI), ftB: 6 * pos(C(ph + Math.PI)),
      uaF: 3 - arm * S(ph), faF: 14 + 10 * pos(-S(ph)),
      uaB: 2 + arm * S(ph), faB: 14 + 10 * pos(S(ph)),
    });
  },
  run(ph, style = 'ada') {
    const a = style === 'man' ? 38 : 41;
    const knee = (x) => -(14 + 92 * Math.pow(pos(C(x - 0.35)), 1.3));
    return makePose({
      lean: 11, head: -8,
      thF: a * S(ph) + 6, shF: knee(ph), ftF: 10 * pos(C(ph)),
      thB: a * S(ph + Math.PI) + 6, shB: knee(ph + Math.PI), ftB: 10 * pos(C(ph + Math.PI)),
      uaF: 10 - 42 * S(ph), faF: 78 + 10 * S(ph),
      uaB: 10 + 42 * S(ph), faB: 78 - 10 * S(ph),
    });
  },
  crouch(t) {
    const br = S(t * 2) * 0.6;
    return makePose({ lean: 30 + br, head: -22, thF: 74, shF: -128, ftF: 18, thB: 40, shB: -116, ftB: 30, uaF: 34, faF: 38, uaB: 20, faB: 46 });
  },
  crouchWalk(ph) {
    const sw = S(ph);
    return makePose({ lean: 30, head: -22, thF: 66 + 14 * sw, shF: -120 + 10 * sw, ftF: 18, thB: 44 - 14 * sw, shB: -114 - 10 * sw, ftB: 28, uaF: 30 - 10 * sw, faF: 40, uaB: 22 + 10 * sw, faB: 46 });
  },
  jump(vy) {
    const r = clamp(-vy / 700, 0, 1);
    return makePose({ lean: 6, head: -6, thF: 48 + 18 * r, shF: -70 - 30 * r, ftF: 20, thB: -8, shB: -30, ftB: 26, uaF: 40 + 50 * r, faF: 30, uaB: -30 + 20 * r, faB: 34, fit: 'none' });
  },
  fall(vy) {
    const r = clamp(vy / 900, 0, 1);
    return makePose({ lean: 2, head: -4, thF: 24 - 10 * r, shF: -40 + 20 * r, ftF: 14, thB: -14 + 6 * r, shB: -50, ftB: 22, uaF: 58 + 50 * r, faF: 30, uaB: 40 + 40 * r, faB: 30, fit: 'none' });
  },
  land(u) {
    const k = 1 - smooth(clamp(u, 0, 1));
    return mixPose(A.idle(0), A.crouch(0), k * 0.75);
  },
  hang(t) {
    const sw = S(t * 2.4) * 4;
    return makePose({ lean: -2, head: -14, thF: 6 + sw, shF: -10, ftF: 30, thB: -8 + sw, shB: -14, ftB: 30, uaF: 172, faF: 4, uaB: 176, faB: 6, fit: 'none' });
  },
  climbUp(u) {
    const h = A.hang(0);
    const pull = makePose({ lean: 18, head: -20, thF: 60, shF: -100, ftF: 30, thB: 30, shB: -80, ftB: 30, uaF: 120, faF: 70, uaB: 128, faB: 64, fit: 'none' });
    const top = makePose({ lean: 34, head: -20, thF: 90, shF: -130, ftF: 18, thB: 20, shB: -100, ftB: 30, uaF: 40, faF: 50, uaB: 30, faB: 50, fit: 'none' });
    if (u < 0.5) return mixPose(h, pull, smooth(u / 0.5));
    return mixPose(pull, top, smooth((u - 0.5) / 0.5));
  },
  ladder(ph) {
    const s = S(ph);
    return makePose({ lean: 4, head: -12, thF: 42 + 26 * s, shF: -70 - 26 * s, ftF: 20, thB: 42 - 26 * s, shB: -70 + 26 * s, ftB: 20, uaF: 150 + 18 * s, faF: 30, uaB: 150 - 18 * s, faB: 30, fit: 'none' });
  },
  guard(t) {
    const br = S(t * 3) * 1.2;
    return makePose({ lean: 6 + br, head: -6, thF: 20, shF: -26, ftF: 8, thB: -14, shB: -18, ftB: 10, uaF: 36, faF: 112, uaB: 46, faB: 120 });
  },
  punch(i, u) {
    const g = A.guard(0);
    const peak = u < 0.35 ? smooth(u / 0.35) : 1 - smooth((u - 0.35) / 0.65);
    if (i === 0) return mixPose(g, makePose({ lean: 11, head: -4, thF: 26, shF: -24, ftF: 8, thB: -18, shB: -14, ftB: 10, uaF: 86, faF: 2, uaB: 44, faB: 122 }), peak);
    if (i === 1) return mixPose(g, makePose({ lean: 15, head: -4, thF: 28, shF: -26, ftF: 8, thB: -22, shB: -10, ftB: 14, uaF: 30, faF: 112, uaB: 88, faB: 0 }), peak);
    return mixPose(g, makePose({ lean: 9, head: -2, thF: 24, shF: -28, ftF: 8, thB: -16, shB: -12, ftB: 10, uaF: 112, faF: 28, uaB: 40, faB: 120 }), peak);
  },
  kick(u) {
    const g = A.guard(0);
    const chamber = makePose({ lean: -6, head: -4, thF: 74, shF: -110, ftF: 10, thB: -6, shB: -8, ftB: 6, uaF: 40, faF: 100, uaB: -24, faB: 60 });
    const ext = makePose({ lean: -18, head: 2, thF: 92, shF: -4, ftF: -10, thB: -10, shB: -6, ftB: 4, uaF: 46, faF: 96, uaB: -40, faB: 50 });
    if (u < 0.28) return mixPose(g, chamber, smooth(u / 0.28));
    if (u < 0.55) return mixPose(chamber, ext, smooth((u - 0.28) / 0.27));
    return mixPose(ext, g, smooth((u - 0.55) / 0.45));
  },
  roll(u) {
    const tuck = makePose({ lean: 58, head: -20, thF: 112, shF: -150, ftF: 20, thB: 96, shB: -150, ftB: 20, uaF: 76, faF: 86, uaB: 60, faB: 90, fit: 'all' });
    const p = { ...tuck };
    p.rot = 360 * smooth(clamp(u, 0, 1));
    return p;
  },
  hurt(u, style = 'ada') {
    const k = 1 - smooth(clamp(u, 0, 1));
    const base = style === 'man' ? A.idle(0, 'man') : A.idle(0);
    return mixPose(base, makePose({ lean: -16, head: -14, thF: 18, shF: -20, thB: -18, shB: -10, uaF: 46, faF: 30, uaB: -34, faB: 26 }), k);
  },
  knockdown(u) {
    const k = smooth(clamp(u, 0, 1));
    const p = makePose({ lean: -10, head: -10, thF: 22, shF: -16, thB: 8, shB: -10, uaF: 70, faF: 20, uaB: 120, faB: 20, fit: 'all' });
    p.rot = -88 * k;
    return p;
  },
  lying(t) {
    const p = makePose({ lean: -4, head: -8, thF: 12, shF: -14, thB: 4, shB: -8, uaF: 96, faF: 10, uaB: 140, faB: 18, fit: 'all' });
    p.rot = -90;
    p.chest = S(t * 1.5) * 0.8;
    return p;
  },
  reach(u) {
    const k = u < 0.5 ? smooth(u / 0.5) : 1 - smooth((u - 0.5) / 0.5);
    return mixPose(A.idle(0), makePose({ lean: 14, head: 6, thF: 16, shF: -18, thB: -8, shB: -8, uaF: 62, faF: 18, uaB: 0, faB: 16 }), k);
  },
  pickup(u) {
    const k = u < 0.5 ? smooth(u / 0.5) : 1 - smooth((u - 0.5) / 0.5);
    return mixPose(A.idle(0), A.crouch(0), k);
  },
  throwing(u) {
    const wind = makePose({ lean: -8, head: -6, thF: 20, shF: -16, thB: -16, shB: -8, uaF: -70, faF: 50, uaB: 30, faB: 40 });
    const rel = makePose({ lean: 14, head: -2, thF: 24, shF: -20, thB: -20, shB: -10, uaF: 130, faF: 10, uaB: -10, faB: 30 });
    if (u < 0.45) return mixPose(A.idle(0), wind, smooth(u / 0.45));
    if (u < 0.65) return mixPose(wind, rel, smooth((u - 0.45) / 0.2));
    return mixPose(rel, A.idle(0), smooth((u - 0.65) / 0.35));
  },
  push(t) {
    const s = S(t * 8) * 3;
    return makePose({ lean: 26, head: -14, thF: 34 + s, shF: -30, ftF: 10, thB: -24 - s, shB: -12, ftB: 18, uaF: 76, faF: 8, uaB: 70, faB: 12 });
  },
  hidden(t) {
    return A.crouch(t);
  },
  // Men only
  patrol(ph) { const p = A.walk(ph, 'man', 0.8); p.uaF = 22; p.faF = 46; return p; },
  lookAround(t) { const p = A.idle(t, 'man'); p.uaF = 30; p.faF = 60; p.head = S(t * 1.4) * 8; return p; },
  chase(ph) { const p = A.run(ph, 'man'); p.uaF = 30; p.faF = 70; return p; },
  windup(u) {
    const p = makePose({ lean: -6, head: -6, thF: 18, shF: -16, thB: -18, shB: -10, uaF: 30, faF: 60, uaB: -150 * smooth(clamp(u, 0, 1)), faB: 40 });
    return p;
  },
  strike(u) {
    const p = makePose({ lean: 16, head: -2, thF: 28, shF: -22, thB: -22, shB: -10, uaF: 24, faF: 60, uaB: -150 + 240 * smooth(clamp(u, 0, 1)), faB: 10 });
    return p;
  },
  stunned(t) {
    const p = A.hurt(0.4, 'man');
    p.head += S(t * 9) * 6;
    p.lean += S(t * 5) * 3;
    return p;
  },
};
