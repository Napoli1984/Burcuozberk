// Collision queries: a fine grid of solid tiles (and the breakable wall), plus ladders and
// one-way planks kept as objects so they can be any width or slope.
import { TILE } from './config.js';
import { T } from './level5.js';

export class TileMap {
  constructor(level) {
    this.level = level;
    this.W = level.W;
    this.H = level.H;
    this.tiles = level.tiles;
    this.ladders = level.ladders || [];
    this.planks = level.planks || [];
    this.lastType = T.EMPTY;   // what probeGround found last (SOLID, ONEWAY or LADDER)
  }

  get(tx, ty) {
    if (tx < 0 || tx >= this.W) return T.SOLID;
    if (ty < 0) return T.EMPTY;
    if (ty >= this.H) return T.SOLID;
    return this.tiles[ty * this.W + tx];
  }

  at(px, py) { return this.get(Math.floor(px / TILE), Math.floor(py / TILE)); }

  isBlock(t) { return t === T.SOLID || t === T.BREAK; }
  isSlope(t) { return t === T.SLOPE_UP || t === T.SLOPE_DOWN; }

  // The ladder whose climbing column contains x and whose height range contains y (or null).
  // grab widens the column (used when Ada starts climbing: she then snaps onto the ladder).
  ladderAt(px, py, slack = 0, grab = 0) {
    let best = null, bd = Infinity;
    for (const L of this.ladders) {
      const d = Math.abs(px - L.x);
      if (d <= L.w / 2 + grab && py >= L.top - 2 - slack && py <= L.bottom + slack && d < bd) { best = L; bd = d; }
    }
    return best;
  }

  plankY(P, px) {
    if (px < P.x0 || px > P.x1) return null;
    return P.y0 + ((px - P.x0) / (P.x1 - P.x0)) * (P.y1 - P.y0);
  }

  // Top of a block counts as standable floor only when nothing solid sits on it.
  isTopSurface(tx, ty) {
    return this.isBlock(this.get(tx, ty)) && !this.isBlock(this.get(tx, ty - 1));
  }

  // Ground under a vertical probe at world x between yFrom and yTo. Returns the surface y or null;
  // this.lastType tells what it was. oneWay: whether planks and ladder tops count.
  probeGround(px, yFrom, yTo, oneWay) {
    let best = null, type = T.EMPTY;
    const tx = Math.floor(px / TILE);
    let ty = Math.floor(yFrom / TILE) - 1;
    const tyEnd = Math.floor(yTo / TILE) + 1;
    for (; ty <= tyEnd; ty++) {
      const top = ty * TILE;
      if (top < yFrom - 0.01 || top > yTo) continue;
      if (this.isTopSurface(tx, ty)) { best = top; type = T.SOLID; break; }
    }
    if (oneWay) {
      for (const P of this.planks) {
        const y = this.plankY(P, px);
        if (y !== null && y >= yFrom - 0.01 && y <= yTo && (best === null || y < best)) { best = y; type = T.ONEWAY; }
      }
      for (const L of this.ladders) {
        if (Math.abs(px - L.x) > L.w / 2) continue;
        if (L.top >= yFrom - 0.01 && L.top <= yTo && (best === null || L.top < best)) { best = L.top; type = T.LADDER; }
      }
    }
    this.lastType = type;
    return best;
  }

  // True if any blocking tile overlaps the rectangle.
  rectBlocked(x, y, w, h) {
    const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + w - 0.01) / TILE);
    const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + h - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.isBlock(this.get(tx, ty))) return true;
    return false;
  }

  solidPoint(px, py) { return this.isBlock(this.at(px, py)); }

  // Line of sight: marches the segment and returns the fraction travelled before hitting solid matter (1 = clear).
  raycast(x0, y0, x1, y1, step = 10) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (this.solidPoint(x0 + dx * t, y0 + dy * t)) return (i - 1) / n;
    }
    return 1;
  }

  // Turns breakable tiles inside a world rectangle into empty space.
  breakRect(x0, y0, x1, y1) {
    const a = Math.floor(x0 / TILE), b = Math.ceil(x1 / TILE), c = Math.floor(y0 / TILE), d = Math.ceil(y1 / TILE);
    for (let ty = c; ty < d; ty++) for (let tx = a; tx < b; tx++) if (this.get(tx, ty) === T.BREAK) this.tiles[ty * this.W + tx] = T.EMPTY;
  }

  regionAt(px, py) {
    let found = this.level.regions[0];
    for (const r of this.level.regions) if (px >= r.x0 && px < r.x1 && py >= r.y0 && py < r.y1) found = r;
    return found;
  }
}
