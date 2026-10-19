// Level 5 (prototype): the restoration lab in the former convent of San Domenico.
// The map is built with small helper calls instead of a hand-typed grid, so it is easy to adjust.
import { TILE } from './config.js';

export const T = { EMPTY: 0, SOLID: 1, ONEWAY: 2, LADDER: 3, SLOPE_UP: 4, SLOPE_DOWN: 5, BREAK: 6 };
// SLOPE_UP rises to the right ( / ), SLOPE_DOWN falls to the right ( \ ).

export function buildLevel5() {
  const W = 120, H = 36;
  const tiles = new Uint8Array(W * H);
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = v; };
  const fill = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v); };

  // Ground everywhere below row 22, air above.
  fill(0, 22, W - 1, H - 1, T.SOLID);
  // Left boundary: the house across the street.
  fill(0, 0, 1, 21, T.SOLID);
  // Right boundary behind the garden gate.
  fill(W - 1, 0, W - 1, 21, T.SOLID);

  // Convent outer wall with the open gate (rows 18-21).
  fill(14, 6, 14, 17, T.SOLID);
  // Left wing of the cloister: closed upper floor above a covered walkway.
  fill(15, 7, 24, 17, T.SOLID);
  // Right wing: loggia floor (15-16), roof slab (9-10).
  fill(38, 15, 51, 16, T.SOLID);
  fill(38, 9, 51, 10, T.SOLID);
  // Gardener's ladder against the loggia.
  fill(37, 15, 37, 21, T.LADDER);

  // Lab building: left wall with two doorways, floor between the two storeys with a hatch, roof slab.
  fill(52, 6, 52, 21, T.SOLID);
  fill(52, 18, 52, 21, T.EMPTY);      // ground doorway from the cloister
  fill(52, 11, 52, 14, T.EMPTY);      // upper doorway from the loggia
  fill(53, 15, 65, 16, T.SOLID);      // ceiling of the lab / floor of the storage room
  fill(58, 15, 58, 16, T.EMPTY);      // hatch
  fill(58, 15, 58, 21, T.LADDER);
  fill(53, 6, 65, 10, T.SOLID);       // roof mass above the storage room
  // Wall between lab and nave, with the doorway.
  fill(66, 4, 66, 21, T.SOLID);
  fill(66, 18, 66, 21, T.EMPTY);

  // Nave: vault on top, apse wall on the right.
  fill(66, 0, 104, 3, T.SOLID);
  fill(104, 4, 104, 21, T.SOLID);
  // Raised presbytery.
  fill(82, 17, 103, 21, T.SOLID);
  // Ramp down to the crypt (\), carved out of the ground.
  for (let i = 0; i <= 8; i++) {
    const x = 78 + i;
    fill(x, 22, x, 22 + i - 1, T.EMPTY);
    set(x, 22 + i, T.SLOPE_DOWN);
  }
  // Ladder up to the presbytery, standing over the top of the ramp.
  fill(81, 17, 81, 24, T.LADDER);
  // Crypt.
  fill(87, 25, 101, 30, T.EMPTY);
  // The end wall of the crypt: looks like every other wall, but it breaks.
  fill(102, 25, 103, 30, T.BREAK);
  // Behind it: the old well shaft and the aqueduct.
  fill(104, 25, 105, 34, T.EMPTY);
  fill(105, 31, 105, 34, T.LADDER);
  fill(104, 31, 114, 34, T.EMPTY);
  fill(114, 22, 114, 30, T.EMPTY);
  fill(114, 22, 114, 34, T.LADDER);

  // Scaffolding around the altarpiece (one-way planks and ladders).
  fill(92, 13, 101, 13, T.ONEWAY);
  fill(92, 9, 101, 9, T.ONEWAY);
  fill(93, 5, 101, 5, T.ONEWAY);
  fill(92, 14, 92, 16, T.LADDER);
  fill(100, 10, 100, 12, T.LADDER);
  fill(93, 6, 93, 8, T.LADDER);
  // Make the ladder tops line up with the planks they reach.
  set(92, 13, T.LADDER); set(100, 9, T.LADDER); set(93, 5, T.LADDER);

  const px = (t) => t * TILE;
  const ground = px(22);

  const regions = [
    { id: 'street', x0: 0, x1: 14, y0: 0, y1: 21, ambient: 0.44, color: [150, 168, 220], sky: true, material: 'cobble', name: 'Via di San Domenico' },
    { id: 'cloister', x0: 15, x1: 51, y0: 0, y1: 21, ambient: 0.3, color: [150, 160, 210], material: 'stone', name: 'Il chiostro' },
    { id: 'garden', x0: 25, x1: 37, y0: 0, y1: 21, ambient: 0.46, color: [140, 165, 225], sky: true, material: 'grass' },
    { id: 'lab', x0: 52, x1: 65, y0: 0, y1: 21, ambient: 0.28, color: [170, 150, 190], material: 'wood', name: 'Il laboratorio' },
    { id: 'nave', x0: 66, x1: 104, y0: 0, y1: 21, ambient: 0.32, color: [140, 155, 210], material: 'stone', name: 'La navata' },
    { id: 'crypt', x0: 78, x1: 103, y0: 22, y1: 31, ambient: 0.2, color: [150, 140, 150], material: 'stone', name: 'La cripta' },
    { id: 'aqueduct', x0: 104, x1: 115, y0: 22, y1: 35, ambient: 0.13, color: [110, 130, 150], material: 'water', name: "L'acquedotto" },
    { id: 'garden2', x0: 105, x1: 119, y0: 0, y1: 21, ambient: 0.46, color: [140, 165, 225], sky: true, material: 'grass', name: "Il giardino dietro l'abside" },
  ];

  const lights = [
    { id: 'street-lamp', x: px(7.5), y: px(15.6), r: 380, color: [255, 196, 120], i: 0.78 },
    { id: 'arcade-left', x: px(19.5), y: px(18.6), r: 300, color: [255, 190, 110], i: 0.72 },
    { id: 'arcade-right', x: px(45), y: px(17.6), r: 310, color: [255, 190, 110], i: 0.72 },
    { id: 'loggia', x: px(46), y: px(11.8), r: 230, color: [255, 190, 110], i: 0.5 },
    { id: 'desk', x: px(60.2), y: px(19.4), r: 230, color: [255, 200, 130], i: 0.68 },
    { id: 'uv', x: px(62.2), y: px(18.2), r: 260, color: [170, 120, 255], i: 0.62 },
    { id: 'storage', x: px(61), y: px(11.6), r: 200, color: [255, 190, 120], i: 0.4 },
    { id: 'candles', x: px(84.5), y: px(16.2), r: 270, color: [255, 180, 100], i: 0.6 },
    { id: 'nave-moon', x: px(72), y: px(12), r: 330, color: [150, 175, 255], i: 0.32 },
    { id: 'crypt-bulb', x: px(95), y: px(25.6), r: 290, color: [255, 205, 140], i: 0.56 },
    { id: 'gate-lantern', x: px(116.6), y: px(17.4), r: 300, color: [255, 196, 120], i: 0.66 },
  ];

  const hides = [
    { id: 'siepe-1', x: px(27.3), y: ground - 66, w: 102, h: 66, label: 'Nasconditi nella siepe' },
    { id: 'siepe-2', x: px(33.9), y: ground - 66, w: 102, h: 66, label: 'Nasconditi nella siepe' },
    { id: 'tela', x: px(54.1), y: ground - 130, w: 70, h: 130, label: 'Nasconditi dietro la tela' },
    { id: 'tenda', x: px(68.4), y: ground - 160, w: 64, h: 160, label: 'Nasconditi dietro la tenda' },
    { id: 'casse', x: px(89.6), y: px(31) - 96, w: 92, h: 96, label: 'Nasconditi dietro le casse' },
    { id: 'siepe-3', x: px(107.6), y: ground - 66, w: 110, h: 66, label: 'Nasconditi nella siepe' },
  ];

  const checkpoints = [
    { id: 'strada', x: px(4), y: ground, x0: 0, x1: 13 },
    { id: 'chiostro', x: px(16.2), y: ground, x0: 15, x1: 36 },
    { id: 'laboratorio', x: px(53.4), y: ground, x0: 52, x1: 65 },
    { id: 'navata', x: px(67.6), y: ground, x0: 66, x1: 80, y1: 21 },
    { id: 'cripta', x: px(88.4), y: px(31), x0: 86, x1: 101, y0: 24 },
    { id: 'acquedotto', x: px(107), y: px(35), x0: 104, x1: 113, y0: 30 },
    { id: 'giardino', x: px(111), y: ground, x0: 106, x1: 119, y1: 21 },
  ];

  const level = {
    W, H, tiles, regions, lights, hides, checkpoints,
    width: W * TILE, height: H * TILE, ground,
    start: { x: px(4.2), y: ground },
    npc: { id: 'fausto', x: px(10.3), y: ground },
    guard: { x: px(31), y: ground, patrol: [px(16.6), px(50.6)] },
    recoverer: { x: px(72.4), y: ground },
    jar: { x: px(63.55), y: px(19.62) },
    desk: { x: px(59.9), y: ground },
    sketch: { x: px(97.5), y: px(5) },
    cans: [{ x: px(56.4), y: ground }, { x: px(21.2), y: ground }, { x: px(93.2), y: px(31) }],
    cart: { x: px(74.6), y: ground },
    exits: [
      { id: 'portone', x0: 0, x1: px(3.1), needsClue: true },
      { id: 'giardino', x0: px(116.6), x1: px(120), needsClue: true },
    ],
    hints: [
      { id: 'move', x0: 0, x1: px(6), text: 'Muoviti e salta. Su telefono usa la levetta a sinistra.' },
      { id: 'talk', x0: px(7.5), x1: px(13), text: 'Avvicinati al restauratore e premi Azione per parlare.' },
      { id: 'sneak', x0: px(15), x1: px(22), text: 'Cammina piano o accovacciati: correndo la guardia ti sente.' },
      { id: 'observe', x0: px(22), x1: px(28), text: 'Tieni premuto Osserva per studiare il giro della guardia.' },
      { id: 'hide', x0: px(26), x1: px(30), text: 'Nella siepe la guardia non ti vede.' },
      { id: 'ladder', x0: px(36), x1: px(38), text: 'Su con la scala: dalla loggia si entra nel laboratorio dall’alto.' },
      { id: 'lab', x0: px(53), x1: px(57), text: 'Cerca dove Lale lavorava.' },
      { id: 'ledge', x0: px(76), x1: px(80.5), y1: 21, text: 'Salta verso un bordo per aggrapparti, poi Su per salire.' },
      { id: 'crypt', x0: px(88), x1: px(92), y0: 24, text: 'La cripta. Le casse portano tutte la sigla «PA».' },
    ],
  };
  return level;
}
