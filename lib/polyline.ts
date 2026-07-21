export type LatLng = [number, number]; // [lat, lng]

/**
 * Decode a Google/Strava encoded polyline (precision 5) into [lat, lng] pairs.
 */
export function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const factor = Math.pow(10, precision);
  const coordinates: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

/** Perpendicular distance from point p to the line through a-b, in degrees. */
function perpendicularDistance(p: LatLng, a: LatLng, b: LatLng): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const cx = ax + clamped * dx;
  const cy = ay + clamped * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Ramer–Douglas–Peucker line simplification. */
export function rdp(points: LatLng[], epsilon: number): LatLng[] {
  if (points.length < 3) return points.slice();

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

/**
 * Reduce a track to at most `maxPoints` points while preserving its shape as
 * well as possible. The first and last points are always kept.
 */
export function simplifyToMax(points: LatLng[], maxPoints: number): LatLng[] {
  if (points.length <= maxPoints) return points.slice();
  if (maxPoints < 2) return [points[0], points[points.length - 1]];

  // Binary-search the RDP epsilon that yields <= maxPoints points.
  let lo = 0;
  let hi = 1; // degrees; ~111 km, larger than any realistic route span
  let best = [points[0], points[points.length - 1]];
  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    const simplified = rdp(points, mid);
    if (simplified.length > maxPoints) {
      lo = mid;
    } else {
      best = simplified;
      hi = mid;
    }
  }
  return best;
}
