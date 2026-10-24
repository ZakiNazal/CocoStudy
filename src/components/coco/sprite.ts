/**
 * Coco, drawn as pixels.
 *
 * The sprite is a 26×32 grid built here rather than shipped as an image, so
 * every colour is a CSS variable (and follows the theme) and a change of mood
 * redraws only the face. Each layer comes out as horizontal runs of one colour,
 * which keeps a whole frame to a few dozen <rect>s.
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
  | 'eye'
  | 'blush'
  | 'scarf'
  | 'scarf-2'
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

/** Mirrors a left-hand column onto the right; the body is symmetric about x = 12.5. */
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

/** A soft square head with a dithered shadow side, and a bandana knotted under it. */
function drawBody(): Grid {
  const g = blank();
  const [x0, x1, y0, y1, r] = [2, 23, 9, 25, 4];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = Math.max(0, x0 + r - x, x - (x1 - r));
      const dy = Math.max(0, y0 + r - y, y - (y1 - r));
      if (dx * dx + dy * dy > r * r + 1) continue;
      // Light comes from the top left. The far side and the base fall into a
      // checkerboard, shading without a second solid tone.
      const inShadow = x >= 20 || y >= 22;
      put(g, x, y, inShadow && (x + y) % 2 === 0 ? 'shade' : 'body');
    }
  }
  for (const [x, y] of [
    [5, 11],
    [6, 11],
    [4, 12],
    [4, 13],
  ] as Point[]) {
    put(g, x, y, 'shine');
  }

  // A neckerchief tied under the chin, the point hanging below the head.
  // Each row is [y, first column]; it runs to the mirrored column.
  const scarf: Point[] = [
    [24, 5],
    [25, 6],
    [26, 7],
    [27, 8],
    [28, 10],
    [29, 11],
  ];
  for (const [y, from] of scarf) {
    for (let x = from; x <= mirror(from); x++) {
      const dither = y > 24 && (x + y) % 2 === 0;
      put(g, x, y, dither ? 'scarf-2' : 'scarf');
    }
  }
  return outline(g);
}

/** The antenna sways on its own, so it is its own layer. Its bulb is a highlighter. */
function drawAntenna(): Grid {
  const g = blank();
  for (const [x, y] of [
    [16, 1],
    [17, 1],
    [16, 2],
    [17, 2],
  ] as Point[]) {
    put(g, x, y, 'bulb');
  }
  put(g, 16, 1, 'shine');
  const lit = outline(g);
  for (const [x, y] of [
    [12, 8],
    [12, 7],
    [13, 6],
    [13, 5],
    [14, 4],
    [15, 3],
  ] as Point[]) {
    put(lit, x, y, 'line');
  }
  return lit;
}

const EYE_OPEN: Point[] = [
  [7, 14],
  [8, 14],
  [6, 15],
  [7, 15],
  [8, 15],
  [9, 15],
  [6, 16],
  [7, 16],
  [8, 16],
  [9, 16],
  [6, 17],
  [7, 17],
  [8, 17],
  [9, 17],
  [7, 18],
  [8, 18],
];

const SMILE: Point[] = [
  [11, 19],
  [12, 20],
  [13, 20],
  [14, 19],
];

/** Mouths are centred on the axis already, so they are drawn as they are. */
const MOUTH: Record<CocoMood, Point[]> = {
  idle: SMILE,
  blink: SMILE,
  happy: [
    [11, 19],
    [12, 19],
    [13, 19],
    [14, 19],
    [12, 20],
    [13, 20],
  ],
  thinking: [
    [12, 20],
    [13, 20],
  ],
  worried: [
    [11, 21],
    [12, 20],
    [13, 20],
    [14, 21],
  ],
  sleepy: [
    [12, 20],
    [13, 20],
    [12, 21],
    [13, 21],
  ],
};

function drawFace(mood: CocoMood): Grid {
  const g = blank();
  both(
    g,
    [
      [4, 19],
      [5, 19],
    ],
    'blush',
  );

  switch (mood) {
    case 'idle':
    case 'worried':
      both(g, EYE_OPEN, 'eye');
      // Both catchlights sit left in each eye, so the light agrees with the body.
      put(g, 7, 15, 'shine');
      put(g, 17, 15, 'shine');
      break;
    case 'thinking':
      // Lifted a row, glancing up at the bulb.
      both(
        g,
        EYE_OPEN.map(([x, y]) => [x, y - 1] as Point),
        'eye',
      );
      put(g, 8, 14, 'shine');
      put(g, 18, 14, 'shine');
      break;
    case 'blink':
      both(
        g,
        [
          [6, 17],
          [7, 17],
          [8, 17],
          [9, 17],
        ],
        'eye',
      );
      break;
    case 'happy':
      both(
        g,
        [
          [6, 17],
          [7, 16],
          [8, 16],
          [9, 17],
        ],
        'eye',
      );
      break;
    case 'sleepy':
      both(
        g,
        [
          [6, 16],
          [7, 17],
          [8, 17],
          [9, 16],
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
        [6, 13],
        [7, 12],
        [8, 12],
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
