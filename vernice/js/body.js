// A box that moves through the collision map. Its x,y is the middle of the feet.
import { TILE } from './config.js';
import { T } from './level5.js';

const STEP_UP = 24;    // how much a walking body may rise in one frame (steps, planks)
const SNAP_DOWN = 26;  // how far a walking body sticks to the ground going down

export class Body {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.groundType = T.EMPTY;
    this.hitWall = 0;
    this.hitHead = false;
    this.dropTimer = 0;      // > 0 while falling through planks on purpose
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h; }
  rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  sideBlocked(map, edgeX, top, bottom) {
    const tx = Math.floor(edgeX / TILE);
    const ty0 = Math.floor(top / TILE), ty1 = Math.floor(bottom / TILE);
    for (let ty = ty0; ty <= ty1; ty++) if (map.isBlock(map.get(tx, ty))) return true;
    return false;
  }

  moveX(map, dx) {
    this.hitWall = 0;
    if (dx === 0) return;
    const dir = dx > 0 ? 1 : -1;
    const top = this.y - this.h + 2;
    const bottom = this.y - (this.onGround ? STEP_UP - 2 : 3);
    let remaining = Math.abs(dx);
    while (remaining > 0) {
      const step = Math.min(remaining, 6);
      remaining -= step;
      const nx = this.x + dir * step;
      const edge = dir > 0 ? nx + this.w / 2 - 0.01 : nx - this.w / 2;
      if (this.sideBlocked(map, edge, top, bottom)) {
        const tx = Math.floor(edge / TILE);
        this.x = dir > 0 ? tx * TILE - this.w / 2 : (tx + 1) * TILE + this.w / 2;
        this.vx = 0;
        this.hitWall = dir;
        return;
      }
      this.x = nx;
    }
  }

  // Vertical movement with landing on floors, planks, ladder tops and steps.
  moveY(map, dy) {
    this.hitHead = false;
    const wasGround = this.onGround;
    const oneWay = this.dropTimer <= 0;
    if (dy >= 0) {
      const oldY = this.y;
      const yFrom = wasGround ? oldY - STEP_UP : oldY - 1;
      const yTo = wasGround ? oldY + dy + SNAP_DOWN : oldY + dy;
      let best = map.probeGround(this.x, yFrom, yTo, oneWay);
      let type = map.lastType;
      for (const sx of [this.x - this.w / 2 + 4, this.x + this.w / 2 - 4]) {
        const g = map.probeGround(sx, Math.max(yFrom, oldY - 1), yTo, oneWay);
        if (g !== null && (best === null || g < best - 0.5)) { best = g; type = map.lastType; }
      }
      if (best !== null) {
        this.y = best;
        this.vy = 0;
        this.onGround = true;
        this.groundType = type;
        return true;
      }
      this.y = oldY + dy;
      this.onGround = false;
      return false;
    }
    // Moving up: stop under ceilings.
    const ny = this.y + dy;
    const headY = ny - this.h;
    const ty = Math.floor(headY / TILE);
    const tx0 = Math.floor((this.x - this.w / 2 + 2) / TILE), tx1 = Math.floor((this.x + this.w / 2 - 2) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (map.isBlock(map.get(tx, ty))) {
        this.y = (ty + 1) * TILE + this.h;
        this.vy = 0;
        this.hitHead = true;
        this.onGround = false;
        return false;
      }
    }
    this.y = ny;
    this.onGround = false;
    return false;
  }

  // Room to stand up (used when leaving a crouch or arriving on a ledge).
  roomFor(map, x, y, h) {
    return !map.rectBlocked(x - this.w / 2 + 1, y - h + 1, this.w - 2, h - 2);
  }
}
