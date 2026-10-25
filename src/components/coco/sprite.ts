/**
 * Coco, drawn as pixels.
 *
 * Coco is the CocoStudy mark come to life: a cobalt "C", open on the right,
 * hugging an open book. The sprite is a 26×32 grid built here rather than
 * shipped as an image, so every colour is a CSS variable (and follows the
 * theme) and a change of mood redraws only the face. Each layer comes out as
 * horizontal runs of one colour, which keeps a whole frame to a few dozen
 * <rect>s.
 */

export const COCO_W = 26;
export const COCO_H = 32;

export type CocoMood = 'idle' | 'blink' | 'happy' | 'thinking' | 'worried' | 'sleepy';

/** Paint names. Each maps to a `--coco-*` variable in index.css. */
export type Paint =
  | 'line'
  | 'body'
  | 'shade'
  | 'shine'
  | 'white'
  | 'eye'
  | 'blush'
  | 'page'
  | 'page-2'
  | 'bulb';

export interface Run {
  x: number;
  y: number;
  w: number;
  paint: Paint;
}

type Grid = (Paint | null)[][];
type Point = [number, number];

const blank = (): Grid =>
  Array.from({ length: COCO_H }, () => Array<Paint | null>(COCO_W).fill(null));

const put = (g: Grid, x: number, y: number, paint: Paint) => {
  if (x >= 0 && x < COCO_W && y >= 0 && y < COCO_H) g[y][x] = paint;
};

/** Mirrors a left-hand column onto the right; the face is symmetric about x = 12.5. */
const mirror = (x: number) => COCO_W - 1 - x;

/** Points drawn on the left half and mirrored onto the right. */
function both(g: Grid, points: Point[], paint: Paint) {
  for (const [x, y] of points) {
    put(g, x, y, paint);
    put(g, mirror(x), y, paint);
  }
}

/** Any empty cell touching a filled one becomes outline, so the silhouette reads on both papers. */
function outline(g: Grid): Grid {
  const out = g.map(row => row.slice());
  for (let y = 0; y < COCO_H; y++) {
    for (let x = 0; x < COCO_W; x++) {
      if (g[y][x]) continue;
      const touches = (
        [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ] as Point[]
      ).some(([nx, ny]) => {
        const p = g[ny]?.[nx];
        return p && p !== 'line';
      });
      if (touches) out[y][x] = 'line';
    }
  }
  return out;
}

/** Lays every painted cell of `top` over `base`. */
function stamp(base: Grid, top: Grid) {
  for (let y = 0; y < COCO_H; y++) {
    for (let x = 0; x < COCO_W; x++) {
      const p = top[y][x];
      if (p) base[y][x] = p;
    }
  }
}

export function runs(g: Grid): Run[] {
  const out: Run[] = [];
  for (let y = 0; y < COCO_H; y++) {
    let x = 0;
    while (x < COCO_W) {
      const paint = g[y][x];
      if (!paint) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < COCO_W && g[y][x + w] === paint) w++;
      out.push({ x, y, w, paint });
      x += w;
    }
  }
  return out;
}

/**
 * The mouth of the C: per row, the first column carved away on the right.
 * It opens between the cheek and the book, so the letter reads at a glance.
 */
const OPENING: Record<number, number> = {
  18: 22,
  19: 20,
  20: 19,
  21: 19,
  22: 20,
  23: 22,
};

/** A round cobalt C with a dithered shadow side, two stubby feet and a book held in front. */
function drawBody(): Grid {
  const g = blank();
  const [x0, x1, y0, y1, r] = [2, 23, 9, 28, 6];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = Math.max(0, x0 + r - x, x - (x1 - r));
      const dy = Math.max(0, y0 + r - y, y - (y1 - r));
      if (dx * dx + dy * dy > r * r + 1) continue;
      if (OPENING[y] !== undefined && x >= OPENING[y]) continue;
      // Light comes from the top left. The far side and the base fall into a
      // checkerboard, shading without a second solid tone.
      const inShadow = x >= 20 || y >= 26;
      put(g, x, y, inShadow && (x + y) % 2 === 0 ? 'shade' : 'body');
    }
  }
  // A rim of light along the top-left curve.
  for (const [x, y] of [
    [6, 10],
    [7, 10],
    [4, 11],
    [5, 11],
    [3, 12],
    [3, 13],
  ] as Point[]) {
    put(g, x, y, 'shine');
  }
  // Two stubby feet.
  both(
    g,
    [
      [6, 29],
      [7, 29],
      [8, 29],
    ],
    'shade',
  );
  const lit = outline(g);
  stamp(lit, drawBook());
  return lit;
}

/**
 * An open book held against the belly, under the mouth of the C. Drawn and
 * outlined on its own so it keeps an edge against the body.
 */
function drawBook(): Grid {
  const g = blank();
  // The top edge dips at the spine, the way open pages fall.
  both(
    g,
    [
      [8, 23],
      [9, 23],
      [10, 23],
      [11, 23],
    ],
    'page',
  );
  for (let y = 24; y <= 26; y++) {
    for (let x = 7; x <= 18; x++) put(g, x, y, x === 12 || x === 13 ? 'page-2' : 'page');
  }
  for (let x = 7; x <= 18; x++) put(g, x, 27, 'shade');
  const book = outline(g);
  // Two lines of text on each page.
  both(
    book,
    [
      [8, 24],
      [9, 24],
      [10, 24],
      [8, 26],
      [9, 26],
    ],
    'page-2',
  );
  // Paws round the outer edges.
  both(
    book,
    [
      [5, 25],
      [6, 25],
      [5, 26],
      [6, 26],
    ],
    'body',
  );
  return book;
}

/** The sprout sways on its own, so it is its own layer. Its tip is a highlighter. */
function drawAntenna(): Grid {
  const g = blank();
  for (const [x, y] of [
    [12, 7],
    [13, 7],
    [12, 6],
    [13, 6],
    [13, 5],
    [14, 5],
  ] as Point[]) {
    put(g, x, y, 'body');
  }
  for (const [x, y] of [
    [15, 3],
    [16, 3],
    [15, 4],
    [16, 4],
  ] as Point[]) {
    put(g, x, y, 'bulb');
  }
  const lit = outline(g);
  put(lit, 15, 3, 'shine');
  put(lit, 12, 6, 'shine');
  return lit;
}

/** An oval white with a 2×3 pupil inside it; the left eye, mirrored for the right. */
const SCLERA: Point[] = [
  [7, 13],
  [8, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [9, 14],
  [6, 15],
  [7, 15],
  [8, 15],
  [9, 15],
  [6, 16],
  [7, 16],
  [8, 16],
  [9, 16],
  [7, 17],
  [8, 17],
];

const PUPIL: Point[] = [
  [7, 14],
  [8, 14],
  [7, 15],
  [8, 15],
  [7, 16],
  [8, 16],
];

const SMILE: Point[] = [
  [11, 18],
  [12, 19],
  [13, 19],
  [14, 18],
];

/** Mouths are centred on the axis already, so they are drawn as they are. */
const MOUTH: Record<CocoMood, Point[]> = {
  idle: SMILE,
  blink: SMILE,
  happy: [
    [11, 18],
    [12, 18],
    [13, 18],
    [14, 18],
    [12, 19],
    [13, 19],
  ],
  thinking: [
    [12, 19],
    [13, 19],
  ],
  worried: [
    [11, 20],
    [12, 19],
    [13, 19],
    [14, 20],
  ],
  sleepy: [
    [12, 19],
    [13, 19],
    [12, 20],
    [13, 20],
  ],
};

function drawFace(mood: CocoMood): Grid {
  const g = blank();
  both(
    g,
    [
      [4, 18],
      [5, 18],
    ],
    'blush',
  );

  switch (mood) {
    case 'idle':
    case 'worried':
      both(g, SCLERA, 'white');
      both(g, PUPIL, 'eye');
      // Both catchlights sit left in each eye, so the light agrees with the body.
      put(g, 7, 14, 'white');
      put(g, 17, 14, 'white');
      break;
    case 'thinking':
      // Pupils lifted to the top of the eye, glancing up at the sprout.
      both(g, SCLERA, 'white');
      both(
        g,
        PUPIL.map(([x, y]) => [x, y - 1] as Point),
        'eye',
      );
      put(g, 8, 13, 'white');
      put(g, 18, 13, 'white');
      break;
    case 'blink':
      both(
        g,
        [
          [6, 16],
          [7, 16],
          [8, 16],
          [9, 16],
        ],
        'eye',
      );
      break;
    case 'happy':
      both(
        g,
        [
          [6, 16],
          [7, 15],
          [8, 15],
          [9, 16],
        ],
        'eye',
      );
      break;
    case 'sleepy':
      both(
        g,
        [
          [6, 15],
          [7, 16],
          [8, 16],
          [9, 15],
        ],
        'eye',
      );
      break;
  }

  for (const [x, y] of MOUTH[mood]) put(g, x, y, 'eye');

  if (mood === 'worried') {
    both(
      g,
      [
        [6, 12],
        [7, 11],
        [8, 11],
      ],
      'eye',
    );
  }
  return g;
}

export const BODY_RUNS: Run[] = runs(drawBody());
export const ANTENNA_RUNS: Run[] = runs(drawAntenna());

const faces = new Map<CocoMood, Run[]>();

export function faceRuns(mood: CocoMood): Run[] {
  let r = faces.get(mood);
  if (!r) {
    r = runs(drawFace(mood));
    faces.set(mood, r);
  }
  return r;
}
