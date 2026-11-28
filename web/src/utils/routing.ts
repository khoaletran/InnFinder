export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  /** Polyline coordinates in Leaflet [lat, lng] order */
  routeCoords: [number, number][];
  isEstimate: boolean;
}

const routeCache = new Map<string, RouteResult>();

/** Haversine straight-line distance in meters */
function haversineDistanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
}

/**
 * Fetch real road distance, travel duration, and route geometry from OSRM.
 * Falls back to Haversine estimate (with ~1.3x urban road factor and ~28 km/h average speed)
 * if the routing server is unreachable.
 */
export async function fetchRoadRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<RouteResult> {
  const key = `${from.lat.toFixed(5)},${from.lng.toFixed(5)}->${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const data = (await res.json()) as {
        code?: string;
        routes?: Array<{
          distance: number;
          duration: number;
          geometry?: { coordinates?: [number, number][] };
        }>;
      };
      const first = data.routes?.[0];
      if (data.code === 'Ok' && first) {
        const coords: [number, number][] = (first.geometry?.coordinates ?? []).map(
          ([lng, lat]) => [lat, lng],
        );
        const result: RouteResult = {
          distanceMeters: first.distance,
          durationSeconds: first.duration,
          routeCoords: coords.length >= 2 ? coords : [[from.lat, from.lng], [to.lat, to.lng]],
          isEstimate: false,
        };
        routeCache.set(key, result);
        return result;
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
  }

  const straightMeters = haversineDistanceMeters(from, to);
  const estimatedRoadMeters = straightMeters * 1.3;
  // ~28 km/h urban speed ≈ 7.78 m/s
  const estimatedSeconds = estimatedRoadMeters / 7.78;
  const fallback: RouteResult = {
    distanceMeters: estimatedRoadMeters,
    durationSeconds: estimatedSeconds,
    routeCoords: [[from.lat, from.lng], [to.lat, to.lng]],
    isEstimate: true,
  };
  return fallback;
}
