/**
 * Geometry simplification + numeric resampling.
 *
 * `simplifyToCount` keeps a polyline visually faithful while capping point
 * count — themes draw via SVG path strings, so unbounded input from a 4-hour
 * 1Hz ride file would otherwise produce multi-megabyte DOM.
 *
 * `resampleTo` and `smooth` shape elevation / pace series for charts so each
 * theme can pick its own visual resolution without re-deriving from raw
 * track points.
 */

export type Coord = [number, number];

const SQ_TOL_FLOOR = 1e-12;

export function simplifyRDP(points: Coord[], tolerance: number): Coord[] {
  if (points.length < 3) {
    return points.slice();
  }
  const sqTol = Math.max(tolerance * tolerance, SQ_TOL_FLOOR);
  return rdpRange(points, 0, points.length - 1, sqTol);
}

function rdpRange(
  points: Coord[],
  i: number,
  j: number,
  sqTol: number
): Coord[] {
  if (j - i < 2) {
    return j === i ? [points[i]] : [points[i], points[j]];
  }
  let maxSq = -1;
  let index = i;
  for (let k = i + 1; k < j; k++) {
    const sq = sqSegDist(points[k], points[i], points[j]);
    if (sq > maxSq) {
      maxSq = sq;
      index = k;
    }
  }
  if (maxSq <= sqTol) {
    return [points[i], points[j]];
  }
  const left = rdpRange(points, i, index, sqTol);
  const right = rdpRange(points, index, j, sqTol);
  return left.concat(right.slice(1));
}

function sqSegDist(p: Coord, a: Coord, b: Coord): number {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/**
 * Iteratively shrink a polyline until its point count is at or below the
 * target. Tolerance starts proportional to the bounding-box diagonal and
 * doubles each round — empirically fast on tracks up to ~100k points.
 */
export function simplifyToCount(points: Coord[], target: number): Coord[] {
  if (points.length <= target) {
    return points.slice();
  }
  const { dx, dy } = bbox(points);
  const diag = Math.hypot(dx, dy) || 1;
  let tol = diag * 1e-4;
  let out = simplifyRDP(points, tol);
  let guard = 0;
  while (out.length > target && guard++ < 40) {
    tol *= 2;
    out = simplifyRDP(points, tol);
  }
  return out;
}

function bbox(points: Coord[]) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of points) {
    if (x < minX) {
      minX = x;
    }
    if (x > maxX) {
      maxX = x;
    }
    if (y < minY) {
      minY = y;
    }
    if (y > maxY) {
      maxY = y;
    }
  }
  return { dx: maxX - minX, dy: maxY - minY };
}

/** Linear resampling of a numeric series to exactly `count` points. */
export function resampleTo(values: number[], count: number): number[] {
  if (values.length === 0 || count <= 0) {
    return [];
  }
  if (values.length === count) {
    return values.slice();
  }
  if (count === 1) {
    return [values[0]];
  }
  const out: number[] = new Array(count);
  const last = values.length - 1;
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * last;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, last);
    const f = t - lo;
    out[i] = values[lo] * (1 - f) + values[hi] * f;
  }
  return out;
}

/** Centered rolling-mean smoothing. Window should be odd; clamps at edges. */
export function smooth(values: number[], window = 5): number[] {
  if (window < 2 || values.length < 2) {
    return values.slice();
  }
  const half = Math.floor(window / 2);
  const out: number[] = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let n = 0;
    const lo = Math.max(0, i - half);
    const hi = Math.min(values.length - 1, i + half);
    for (let k = lo; k <= hi; k++) {
      sum += values[k];
      n++;
    }
    out[i] = n > 0 ? sum / n : values[i];
  }
  return out;
}
