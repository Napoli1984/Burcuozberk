// Collision queries on the tile grid: solid tiles, one-way platforms, ladders, 45-degree slopes and breakable walls.
import { TILE } from './config.js';
import { T } from './level5.js';

export class TileMap {
  constructor(level) {
    this.level = level;
    this.W = level.W;
    this.H = level.H;
    this.tiles = level.tiles;
  }

  get(tx, ty) {
    if (tx < 0 || tx >= this.W) return T.SOLID;
    if (ty < 0) return T.EMPTY;
    if (ty >= this.H) return T.SOLID;
    return this.tiles[ty * this.W + tx];
  }

  at(px, py) { return this.get(Math.floor(px / TILE), Math.floor(py / TILE)); }

  // Full blocking tiles (walls, floors, the breakable wall until it breaks).
  isBlock(t) { return t === T.SOLID || t === T.BREAK; }
  isSlope(t) { return t === T.SLOPE_UP || t === T.SLOPE_DOWN; }
  isLadder(tx, ty) { return this.get(tx, ty) === T.LADDER; }
  ladderAt(px, py) { return this.at(px, py) === T.LADDER; }

  // Height of a slope surface at world x inside slope tile (tx, ty).
  slopeY(tx, ty, px) {
    const lx = Math.min(Math.max(px - tx * TILE, 0), TILE);
    const t = this.get(tx, ty);
    if (t === T.SLOPE_UP) return ty * TILE + (TILE - lx);
    return ty * TILE + lx; // SLOPE_DOWN
  }

  // A blocking tile only acts as a horizontal wall if it is not the hidden base under a slope.
  blocksSide(tx, ty) {
    const t = this.get(tx, ty);
    if (!this.isBlock(t)) return false;
    return true;
  }

  // Top of a block counts as standable floor only when nothing solid or sloped sits on it.
  isTopSurface(tx, ty) {
    const t = this.get(tx, ty);
    const above = this.get(tx, ty - 1);
    if (this.isBlock(t)) return !this.isBlock(above) && !this.isSlope(above);
    if (t === T.ONEWAY) return true;
    if (t === T.LADDER) return above !== T.LADDER && !this.isBlock(above);
    return false;
  }

  // Ground under a vertical probe at world x between yFrom and yTo (inclusive). Returns the surface y or null.
  // oneWay: whether one-way platforms and ladder tops count. slopes: whether slope tiles count.
  probeGround(px, yFrom, yTo, oneWay, slopes) {
    const tx = Math.floor(px / TILE);
    let ty = Math.floor(yFrom / TILE) - 1;
    const tyEnd = Math.floor(yTo / TILE) + 1;
    for (; ty <= tyEnd; ty++) {
      const t = this.get(tx, ty);
      if (slopes && this.isSlope(t)) {
        const s = this.slopeY(tx, ty, px);
        if (s >= yFrom - 0.01 && s <= yTo) return s;
        continue;
      }
      const top = ty * TILE;
      if (top < yFrom - 0.01 || top > yTo) continue;
      if (this.isBlock(t) && this.isTopSurface(tx, ty)) return top;
      if (oneWay && (t === T.ONEWAY || (t === T.LADDER && this.isTopSurface(tx, ty)))) return top;
    }
    return null;
  }

  // True if any blocking tile overlaps the rectangle.
  rectBlocked(x, y, w, h) {
    const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + w - 0.01) / TILE);
    const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + h - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.isBlock(this.get(tx, ty))) return true;
    return false;
  }

  // Is the point inside solid matter (blocks, or under a slope surface)?
  solidPoint(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    const t = this.get(tx, ty);
    if (this.isBlock(t)) return true;
    if (this.isSlope(t)) return py >= this.slopeY(tx, ty, px);
    return false;
  }

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

  breakRect(tx0, ty0, tx1, ty1) {
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.get(tx, ty) === T.BREAK) this.tiles[ty * this.W + tx] = T.EMPTY;
  }

  regionAt(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    let found = this.level.regions[0];
    for (const r of this.level.regions) if (tx >= r.x0 && tx <= r.x1 && ty >= (r.y0 ?? 0) && ty <= (r.y1 ?? 99)) found = r;
    return found;
  }
}
