// Level 5 (prototype): the street of San Domenico, the cloister, Lale's lab, the church with its
// crypt and the old aqueduct. One continuous world, painted section by section (see bgdata.js).
// Collision is a fine grid (TILE = 10 world px) filled from the shapes below; ladders and the
// scaffolding planks are separate objects. All numbers are world pixels; the main floor is y = 600.
import { TILE } from './config.js';

export const T = { EMPTY: 0, SOLID: 1, ONEWAY: 2, LADDER: 3, SLOPE_UP: 4, SLOPE_DOWN: 5, BREAK: 6 };

// Where each painted section starts (must match bgdata.js).
export const X = { street: 0, w1: 3245, cloister: 3325, w2: 7003, lab: 7063, w3: 8331, church: 8401, w4: 10052, aqueduct: 10142, end: 11626 };

export function buildLevel5() {
  const width = 11630, height = 1100;
  const W = Math.ceil(width / TILE), H = Math.ceil(height / TILE);
  const tiles = new Uint8Array(W * H);
  const tx = (x) => Math.round(x / TILE);
  // Fill a world rectangle [x0, x1) x [y0, y1).
  const rect = (x0, y0, x1, y1, v) => {
    const a = Math.max(0, tx(x0)), b = Math.min(W, tx(x1)), c = Math.max(0, tx(y0)), d = Math.min(H, tx(y1));
    for (let y = c; y < d; y++) for (let x = a; x < b; x++) tiles[y * W + x] = v;
  };
  const S = T.SOLID, E = T.EMPTY;
  const cl = X.cloister, lab = X.lab, ch = X.church, aq = X.aqueduct;

  // ---- ground and walls
  rect(0, 600, X.w4, height, S);                 // street, cloister, lab and the church floor
  rect(0, -100, 40, 600, S);                     // the end of the street on the left
  rect(X.w1, 118, X.w1 + 80, 432, S);            // convent wall above its doorway
  rect(X.w2, 40, X.w2 + 60, 432, S);             // lab wall
  rect(X.w3, 24, X.w3 + 70, 432, S);             // wall between lab and church

  // ---- cloister: the loggia's upper floor, with a gap where the ladder comes up
  rect(cl + 2660, 340, X.w2, 380, S);
  rect(cl + 3316, 340, cl + 3396, 380, E);

  // ---- lab: the storage loft over the workshop, with the hatch
  rect(lab + 507, 310, lab + 1195, 370, S);
  rect(lab + 690, 310, lab + 762, 370, E);

  // ---- church: crypt under the nave, stairwell, landing and the stairs down
  rect(ch + 15, 640, X.w4, 900, E);              // the crypt (under the nave floor slab 600-640)
  rect(ch + 55, 600, ch + 175, 770, E);          // stairwell through the floor
  rect(ch + 15, 770, ch + 215, 900, S);          // the landing and the masonry under it
  for (let x = ch + 215; x < ch + 380; x += TILE) {   // the flight of steps, 770 -> 900
    const y = 770 + ((x + TILE / 2 - (ch + 215)) / 165) * 130;
    rect(x, Math.round(y / TILE) * TILE, x + TILE, 900, S);
  }

  // ---- apse wall between church and garden; at crypt level part of it is only a thin skin
  rect(X.w4, 24, aq, height, S);
  rect(X.w4, 750, aq, 900, T.BREAK);

  // ---- behind the apse: garden, earth, the aqueduct tunnel and the well shaft
  rect(aq, 480, width, height, S);
  rect(aq, 730, X.end, 900, E);                  // the tunnel (walkway at 900)
  rect(aq + 760, 900, X.end, 910, E);            // the water channel is a step lower
  rect(aq + 921, 480, aq + 1046, 730, E);        // the well shaft
  rect(aq + 921, 480, aq + 1046, 490, S);        // ...covered by the well head, except over the ladder
  rect(aq + 995, 480, aq + 1035, 490, E);
  rect(X.end, -100, width, height, S);           // end of the world on the right

  const ladders = [
    { id: 'loggia', x: cl + 3356, top: 340, bottom: 600, w: 40 },
    { id: 'loft', x: lab + 726, top: 310, bottom: 600, w: 40 },
    { id: 'stairs', x: ch + 115, top: 600, bottom: 770, w: 120, stairs: true },
    { id: 'scaf-a', x: ch + 1305, top: 458, bottom: 600, w: 36 },
    { id: 'scaf-b', x: ch + 1333, top: 208, bottom: 458, w: 36 },
    { id: 'well', x: aq + 1015, top: 480, bottom: 910, w: 40 },
  ];
  // One-way planks (sloped segments): the scaffolding around the altarpiece, and the boards that
  // cover the openings where a ladder comes up through a floor (so Ada can walk over them).
  const planks = [
    { x0: cl + 3310, y0: 340, x1: cl + 3400, y1: 340 },
    { x0: lab + 684, y0: 310, x1: lab + 768, y1: 310 },
    { x0: ch + 1290, y0: 211, x1: ch + 1590, y1: 189 },
    { x0: ch + 1290, y0: 336, x1: ch + 1597, y1: 320 },
    { x0: ch + 1275, y0: 459, x1: ch + 1594, y1: 452 },
  ];

  // name: key of the place name in the language tables (shown once, when Ada first gets there)
  const regions = [
    { id: 'street', x0: 0, x1: X.w1, y0: -200, y1: 1100, ambient: 0.46, color: [150, 168, 220], sky: true, material: 'cobble', name: 'area.street' },
    { id: 'cloister', x0: X.w1, x1: cl + 1500, y0: -200, y1: 1100, ambient: 0.36, color: [170, 160, 200], material: 'stone', name: 'area.cloister' },
    { id: 'garden', x0: cl + 1500, x1: cl + 2600, y0: -200, y1: 1100, ambient: 0.48, color: [140, 165, 225], sky: true, material: 'grass' },
    { id: 'loggia', x0: cl + 2600, x1: X.w2, y0: -200, y1: 1100, ambient: 0.36, color: [170, 160, 200], material: 'stone' },
    { id: 'lab', x0: X.w2, x1: X.w3, y0: -200, y1: 1100, ambient: 0.3, color: [170, 150, 190], material: 'wood', name: 'area.lab' },
    { id: 'nave', x0: X.w3, x1: X.w4, y0: -200, y1: 640, ambient: 0.32, color: [140, 155, 210], material: 'stone', name: 'area.nave' },
    { id: 'crypt', x0: ch, x1: X.w4, y0: 640, y1: 1100, ambient: 0.22, color: [160, 145, 140], material: 'stone', name: 'area.crypt' },
    { id: 'aqueduct', x0: X.w4, x1: width, y0: 700, y1: 1100, ambient: 0.24, color: [150, 130, 120], material: 'stone', name: 'area.aqueduct' },
    { id: 'channel', x0: aq + 760, x1: width, y0: 700, y1: 1100, ambient: 0.24, color: [120, 140, 175], material: 'water' },
    { id: 'garden2', x0: aq, x1: width, y0: -200, y1: 700, ambient: 0.48, color: [140, 165, 225], sky: true, material: 'grass', name: 'area.garden2' },
  ];

  const W_ = (r, g, b) => [r, g, b];
  const warm = W_(255, 196, 120), cool = W_(150, 175, 255);
  const lights = [
    { id: 'street-lamp', x: 1772, y: 262, r: 400, color: warm, i: 0.8 },
    { id: 'arch-lamp', x: 1000, y: 352, r: 200, color: warm, i: 0.4 },
    { id: 'house-lamp', x: 92, y: 330, r: 220, color: warm, i: 0.4 },
    { id: 'shop-window', x: 2215, y: 400, r: 300, color: warm, i: 0.62, glow: false },
    ...[228, 518, 778, 1188, 1438].map((x, i) => ({ id: 'lantern-c' + i, x: cl + x, y: [340, 325, 310, 282, 322][i], r: 270, color: warm, i: 0.64 })),
    { id: 'lantern-arcade', x: cl + 1628, y: 352, r: 200, color: warm, i: 0.45 },
    { id: 'moon', x: cl + 2420, y: 100, r: 700, color: cool, i: 0.28, glow: false },
    { id: 'lantern-l1', x: cl + 2760, y: 425, r: 270, color: warm, i: 0.66 },
    { id: 'lantern-l2', x: cl + 3150, y: 425, r: 270, color: warm, i: 0.66 },
    { id: 'desk-lamp', x: lab + 432, y: 487, r: 240, color: W_(255, 200, 130), i: 0.7 },
    { id: 'uv', x: lab + 665, y: 482, r: 260, color: W_(170, 120, 255), i: 0.62 },
    { id: 'lab-window', x: lab + 436, y: 356, r: 260, color: cool, i: 0.3, glow: false },
    { id: 'loft', x: lab + 900, y: 240, r: 260, color: warm, i: 0.22, glow: false },
    ...[20, 335, 545, 665, 860].map((x, i) => ({ id: 'candles' + i, x: ch + x, y: 482, r: 220, color: W_(255, 180, 100), i: 0.5 })),
    { id: 'window-1', x: ch + 460, y: 330, r: 340, color: cool, i: 0.3, glow: false },
    { id: 'window-2', x: ch + 770, y: 330, r: 340, color: cool, i: 0.3, glow: false },
    { id: 'crypt-bulb', x: ch + 1040, y: 706, r: 300, color: W_(255, 205, 140), i: 0.58 },
    { id: 'alcove', x: aq + 78, y: 840, r: 200, color: warm, i: 0.42, glow: false },
    { id: 'well', x: aq + 985, y: 700, r: 320, color: cool, i: 0.42, glow: false },
    { id: 'gate-lantern', x: aq + 1350, y: 384, r: 320, color: warm, i: 0.68 },
    { id: 'moon-2', x: aq + 940, y: 160, r: 700, color: cool, i: 0.26, glow: false },
  ];

  // Hiding places: Ada slips behind them; the painted piece in front of her is in bgdata.js (fronts).
  // act: key of the action label in the language tables
  const hides = [
    { id: 'siepe-1', x: cl + 1900, y: 600, w: 225, act: 'hideHedge' },
    { id: 'siepe-2', x: cl + 2330, y: 600, w: 235, act: 'hideHedge' },
    { id: 'tela', x: lab + 776, y: 600, w: 62, act: 'hideCanvas' },
    { id: 'tele', x: lab + 1012, y: 600, w: 78, act: 'hideCanvas' },
    { id: 'tenda', x: ch + 1010, y: 600, w: 170, act: 'hideCurtain' },
    { id: 'casse', x: ch + 905, y: 900, w: 222, act: 'hideCrates' },
  ];

  const checkpoints = [
    { id: 'strada', x: 940, y: 600, x0: 0, x1: 3200 },
    { id: 'chiostro', x: cl + 90, y: 600, x0: X.w1, x1: cl + 1400 },
    { id: 'laboratorio', x: lab + 70, y: 600, x0: X.w2, x1: X.w3, y1: 610 },
    { id: 'navata', x: ch + 30, y: 600, x0: X.w3, x1: X.w4, y1: 610 },
    { id: 'cripta', x: ch + 430, y: 900, x0: ch + 380, x1: X.w4, y0: 800 },
    { id: 'acquedotto', x: aq + 80, y: 900, x0: X.w4, x1: X.end, y0: 800 },
    { id: 'giardino', x: aq + 1100, y: 480, x0: aq, x1: X.end, y1: 490 },
  ];

  // Doors in the painted walls that lead somewhere else (fade, then Ada comes out at the other end).
  const portals = [
    { id: 'loggia-door', x: cl + 3560, y: 340, w: 70, to: 'loft-door', act: 'loft' },
    { id: 'loft-door', x: lab + 570, y: 310, w: 56, to: 'loggia-door', act: 'loggia' },
  ];

  const exits = [
    { id: 'portone', x0: X.w1 - 40, x1: X.w1 + 10, y: 600 },        // back through the convent door
    { id: 'giardino', x: aq + 1302, y: 480, w: 120, act: 'gate' },
  ];

  // The people who guard (or rob) the convent at night. rig: picture set in img/chars;
  // kind: their lines; light: what they carry (lantern, torch, headlamp or nothing).
  const enemies = [
    { id: 'guard', rig: 'guard', kind: 'guard', light: 'lantern', hp: 7, x: cl + 2100, y: 600,
      route: [{ x: cl + 1250, wait: 2.6 }, { x: cl + 2150, wait: 1.6 }, { x: cl + 3230, wait: 2.6 }], routeI: 2 },
    { id: 'guard3', rig: 'guard3', kind: 'guardF', light: 'torch', hp: 6, x: cl + 3150, y: 340,
      route: [{ x: cl + 2760, wait: 2.4 }, { x: cl + 3190, wait: 1.2 }, { x: cl + 3620, wait: 2.6 }], routeI: 0 },
    { id: 'thief', rig: 'thief', kind: 'thief', light: 'headlamp', hp: 5, x: lab + 980, y: 600,
      route: [{ x: lab + 215, wait: 2.2 }, { x: lab + 470, wait: 3.4 }, { x: lab + 1120, wait: 2.4 }], routeI: 1 },
    { id: 'guard2', rig: 'guard2', kind: 'guard', light: 'torch', hp: 6, x: ch + 700, y: 600,
      route: [{ x: ch + 300, wait: 2.4 }, { x: ch + 760, wait: 1.4 }, { x: ch + 1230, wait: 2.8 }], routeI: 2 },
    { id: 'porter1', rig: 'porter1', kind: 'porter', light: null, hp: 6, x: ch + 640, y: 900,
      route: [{ x: ch + 440, wait: 2.8 }, { x: ch + 880, wait: 2.4 }], routeI: 1 },
    { id: 'porter2', rig: 'porter2', kind: 'porter', light: null, hp: 5, x: ch + 1320, y: 900,
      route: [{ x: ch + 1190, wait: 3.2 }, { x: ch + 1500, wait: 2.6 }], routeI: 1 },
  ];

  const level = {
    W, H, tiles, ladders, planks, regions, lights, hides, checkpoints, portals, exits, enemies,
    width, height, ground: 600,
    start: { x: 960, y: 600 },
    npcs: [
      { id: 'granny', x: 1388, y: 600, facing: 1, h: 114, bark: 'npc.granny' },
      { id: 'flatcap', x: 1915, y: 600, facing: -1, h: 131, bark: 'npc.flatcap' },
      { id: 'fausto', x: 2470, y: 600, facing: -1, h: 128, talk: true },
      { id: 'marta', x: 2870, y: 600, facing: 1, h: 125, talk: true },
    ],
    recoverer: { x: cl + 1700, y: 600 },
    jar: { x: lab + 632, y: 518 },
    desk: { x: lab + 462, y: 600 },
    sketch: { x: ch + 1540, y: 193 },
    cart: { x: cl + 1620, y: 600 },
    // puzzles: the test panel on the workbench, the wastebasket under the desk, the trunk in the
    // loft, the covered altarpiece on the scaffolding, and two more pieces of Lale's torn letter
    panel: { x: lab + 268, y: 516, at: 600 },
    basket: { x: lab + 488, y: 601, at: 600 },
    trunk: { x: lab + 1080, y: 312, at: 310 },
    pala: { x: ch + 1450, y: 328, w: 220 },
    scraps: [{ n: 3, x: ch + 1003, y: 844, at: 900 }, { n: 4, x: aq + 300, y: 836, at: 900 }],
    cans: [{ x: cl + 960, y: 600 }, { x: lab + 300, y: 600 }, { x: ch + 1180, y: 900 }],
    hints: [
      { id: 'move', x0: 0, x1: 1400, text: 'move' },
      { id: 'talk', x0: 2250, x1: 2560 },
      { id: 'sneak', x0: X.w1, x1: cl + 600 },
      { id: 'observe', x0: cl + 700, x1: cl + 1150 },
      { id: 'hide', x0: cl + 1800, x1: cl + 1950 },
      { id: 'ledge', x0: cl + 2560, x1: cl + 2700, y1: 610 },
      { id: 'ladder', x0: cl + 3260, x1: cl + 3440, y1: 610 },
      { id: 'lab', x0: X.w2, x1: lab + 260, y1: 610 },
      { id: 'stairs', x0: ch, x1: ch + 220, y1: 610 },
      { id: 'crypt', x0: ch + 820, x1: ch + 1100, y0: 800 },
    ],
  };
  return level;
}
