import { LatLng, decodePolyline, simplifyToMax } from "./polyline";

export type TravelMode = "driving" | "walking" | "bicycling" | "two-wheeler";

/**
 * Google Maps' Directions URL / consumer app accepts a limited number of
 * intermediate waypoints. The Maps URLs API documents up to 9; we default to a
 * slightly conservative value so the total stop count stays within what the
 * consumer app reliably accepts.
 */
export const DEFAULT_MAX_WAYPOINTS = Number(process.env.MAX_WAYPOINTS ?? 8);

function fmt([lat, lng]: LatLng): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Map a Strava route `type` (1 = ride, 2 = run) to a Google Maps travel mode. */
export function travelModeForStravaType(type: number | undefined): TravelMode {
  return type === 2 ? "walking" : "bicycling";
}

export interface BuildOptions {
  maxWaypoints?: number;
  travelMode?: TravelMode;
  navigate?: boolean;
}

/**
 * Build a Google Maps Directions deep link from an encoded polyline.
 *
 * Because Google Maps navigates between waypoints (rather than following an
 * arbitrary track), the polyline is simplified to at most
 * `maxWaypoints` + 2 points (origin, intermediates, destination).
 */
export function buildMapsUrlFromPolyline(
  encoded: string,
  options: BuildOptions = {}
): string {
  const points = decodePolyline(encoded);
  return buildMapsUrlFromPoints(points, options);
}

export function buildMapsUrlFromPoints(
  points: LatLng[],
  options: BuildOptions = {}
): string {
  if (!points.length) {
    throw new Error("Route has no points");
  }

  const maxWaypoints = options.maxWaypoints ?? DEFAULT_MAX_WAYPOINTS;
  const travelMode = options.travelMode ?? "bicycling";
  const navigate = options.navigate ?? true;

  const simplified = simplifyToMax(points, maxWaypoints + 2);
  const origin = simplified[0];
  const destination = simplified[simplified.length - 1];
  const waypoints = simplified.slice(1, -1);

  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("origin", fmt(origin));
  params.set("destination", fmt(destination));
  params.set("travelmode", travelMode);
  if (waypoints.length) {
    params.set("waypoints", waypoints.map(fmt).join("|"));
  }
  if (navigate) {
    params.set("dir_action", "navigate");
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
