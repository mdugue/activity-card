// Shared chart helpers. Pure functions — no theme styling baked in.

export type Coord = [number, number];

export function routePath(
  coords: Coord[] | undefined,
  w: number,
  h: number,
  pad = 0
): string {
  if (!coords || coords.length === 0) {
    return "";
  }
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  // preserve aspect — fit
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const scale = Math.min(innerW / dx, innerH / dy);
  const offsetX = pad + (innerW - dx * scale) / 2;
  const offsetY = pad + (innerH - dy * scale) / 2;
  return coords
    .map((c, i) => {
      const x = offsetX + (c[0] - minX) * scale;
      const y = offsetY + (c[1] - minY) * scale;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function elevationPath(
  profile: number[] | undefined,
  w: number,
  h: number,
  pad = 0,
  close = false
): string {
  if (!profile || profile.length === 0) {
    return "";
  }
  const minV = Math.min(...profile);
  const maxV = Math.max(...profile);
  const dv = maxV - minV || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const stepX = innerW / (profile.length - 1);
  const pts: Coord[] = profile.map((v, i) => [
    pad + i * stepX,
    pad + innerH - ((v - minV) / dv) * innerH,
  ]);
  let d = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`
    )
    .join(" ");
  if (close) {
    d += ` L${(pad + innerW).toFixed(2)} ${(pad + innerH).toFixed(2)}`;
    d += ` L${pad.toFixed(2)} ${(pad + innerH).toFixed(2)} Z`;
  }
  return d;
}

export function pacePath(
  profile: number[] | undefined,
  w: number,
  h: number,
  pad = 0,
  close = false
): string {
  // pace is "lower = faster" — invert so faster shows up higher
  if (!profile || profile.length === 0) {
    return "";
  }
  const minV = Math.min(...profile);
  const maxV = Math.max(...profile);
  const dv = maxV - minV || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const stepX = innerW / (profile.length - 1);
  const pts: Coord[] = profile.map((v, i) => [
    pad + i * stepX,
    pad + ((v - minV) / dv) * innerH,
  ]);
  let d = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`
    )
    .join(" ");
  if (close) {
    d += ` L${(pad + innerW).toFixed(2)} ${(pad + innerH).toFixed(2)}`;
    d += ` L${pad.toFixed(2)} ${(pad + innerH).toFixed(2)} Z`;
  }
  return d;
}

export interface Lane {
  h: number;
  w: number;
  x: number;
  y: number;
}

// generate an abstract "pool" or "track" pattern when no real route exists
export function abstractLanes(
  w: number,
  h: number,
  lanes = 6,
  pad = 40
): Lane[] {
  const stripeH = (h - pad * 2) / lanes;
  return Array.from({ length: lanes }, (_, i) => ({
    x: pad,
    y: pad + i * stripeH,
    w: w - pad * 2,
    h: stripeH,
  }));
}

export function fmtSec(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}
