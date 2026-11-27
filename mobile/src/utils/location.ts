import * as Location from 'expo-location';

export const MAX_CONFIRM_DEPOSIT_DISTANCE_METERS = 50;

export interface LocationCheckResult {
  viDo: number;
  kinhDo: number;
  distanceMeters: number | null;
}

/**
 * Tính khoảng cách đường chim bay (mét) giữa 2 tọa độ theo công thức Haversine.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

/**
 * Xin quyền vị trí, lấy tọa độ GPS chính xác cao và tính khoảng cách tới tọa độ phòng trọ.
 */
export async function getCurrentLocationWithDistance(
  targetLat?: number | null,
  targetLng?: number | null,
): Promise<LocationCheckResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(
      'Ứng dụng cần quyền truy cập vị trí (GPS) để xác thực bạn đang đứng tại phòng trọ.',
    );
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const viDo = pos.coords.latitude;
  const kinhDo = pos.coords.longitude;

  const hasTarget =
    typeof targetLat === 'number' &&
    typeof targetLng === 'number' &&
    Number.isFinite(targetLat) &&
    Number.isFinite(targetLng) &&
    !(targetLat === 0 && targetLng === 0);

  const distanceMeters = hasTarget
    ? calculateDistanceMeters(viDo, kinhDo, targetLat, targetLng)
    : null;

  return { viDo, kinhDo, distanceMeters };
}
