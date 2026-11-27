export interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
}

interface PhotonFeature {
  type: 'Feature';
  properties: {
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

const geocodeCache = new Map<string, AddressSuggestion[]>();

function calcDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinA =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(sinA), Math.sqrt(1 - sinA));
}

function buildCacheKey(rawQuery: string, biasCoords?: { lat: number; lng: number } | null): string {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return '';
  if (!biasCoords) return q;
  return `${q}@${biasCoords.lat.toFixed(2)},${biasCoords.lng.toFixed(2)}`;
}

export const getCachedAddressSuggestions = (
  rawQuery: string,
  biasCoords?: { lat: number; lng: number },
): AddressSuggestion[] | undefined => {
  const cacheKey = buildCacheKey(rawQuery, biasCoords);
  return cacheKey ? geocodeCache.get(cacheKey) : undefined;
};

export const searchAddressSuggestions = async (
  rawQuery: string,
  signal?: AbortSignal,
  biasCoords?: { lat: number; lng: number } | null,
): Promise<AddressSuggestion[]> => {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const cacheKey = buildCacheKey(query, biasCoords);
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Trích xuất tiền tố số nhà / hẻm / ngõ người dùng nhập (ví dụ: "Số 383", "383/12", "Hẻm 45")
  const houseMatch = query.match(/^(số\s+[\d\w/-]+|hẻm\s+[\d\w/-]+|ngõ\s+[\d\w/-]+|[\d\w/-]+)\b/i);
  const userPrefix = houseMatch ? houseMatch[0] : '';

  const results: AddressSuggestion[] = [];
  const seen = new Set<string>();

  // 1. Tìm kiếm qua Photon (giới hạn Việt Nam, ưu tiên gần biasCoords nếu có)
  try {
    const biasParam = biasCoords
      ? `&lat=${encodeURIComponent(biasCoords.lat)}&lon=${encodeURIComponent(biasCoords.lng)}&location_bias_scale=0.3`
      : '';
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&bbox=102.14,8.18,109.46,23.39${biasParam}`,
      { signal },
    );
    if (photonRes.ok) {
      const data = (await photonRes.json()) as { features?: PhotonFeature[] };
      const features = data.features || [];

      for (const f of features) {
        const props = f.properties;
        if (props.countrycode && props.countrycode.toUpperCase() !== 'VN') continue;
        const coords = f.geometry.coordinates;
        if (!coords || coords.length < 2) continue;

        let title = props.name || props.street || query;
        if (props.housenumber && !title.includes(props.housenumber)) {
          title = `${props.housenumber} ${title}`;
        } else if (userPrefix && !title.toLowerCase().includes(userPrefix.toLowerCase())) {
          title = `${userPrefix} ${title}`;
        }

        const subParts: string[] = [];
        if (props.locality && props.locality !== title) subParts.push(props.locality);
        if (props.district && props.district !== title) subParts.push(props.district);
        if (props.city) subParts.push(props.city);
        else if (props.state && !subParts.includes(props.state)) subParts.push(props.state);

        const subtitle = subParts.join(', ');
        const fullAddress = subtitle ? `${title}, ${subtitle}` : title;
        const key = `${title.toLowerCase()}|${subtitle.toLowerCase()}`;

        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            id: `photon-${props.osm_id || Math.random()}`,
            title,
            subtitle,
            fullAddress,
            lat: Number(coords[1].toFixed(6)),
            lng: Number(coords[0].toFixed(6)),
          });
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
  }

  // 2. Bổ sung kết quả từ Nominatim (Việt Nam, ưu tiên quanh biasCoords) nếu Photon ít/không có kết quả
  if (results.length < 3 && !signal?.aborted) {
    try {
      const viewboxParam = biasCoords
        ? `&viewbox=${(biasCoords.lng - 0.25).toFixed(4)},${(biasCoords.lat + 0.25).toFixed(4)},${(biasCoords.lng + 0.25).toFixed(4)},${(biasCoords.lat - 0.25).toFixed(4)}&bounded=0`
        : '';
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&countrycodes=vn&limit=5&addressdetails=1${viewboxParam}`,
        { headers: { 'Accept-Language': 'vi' }, signal },
      );
      if (nomRes.ok) {
        const nomData = (await nomRes.json()) as Array<{
          place_id: number;
          lat: string;
          lon: string;
          name?: string;
          display_name: string;
          address?: {
            road?: string;
            suburb?: string;
            district?: string;
            city?: string;
            state?: string;
          };
        }>;

        for (const item of nomData) {
          const road = item.address?.road || item.name || query;
          let title = road;
          if (userPrefix && !title.toLowerCase().includes(userPrefix.toLowerCase())) {
            title = `${userPrefix} ${title}`;
          }

          const subParts: string[] = [];
          if (item.address?.suburb) subParts.push(item.address.suburb);
          if (item.address?.district) subParts.push(item.address.district);
          if (item.address?.city) subParts.push(item.address.city);
          else if (item.address?.state) subParts.push(item.address.state);

          const subtitle =
            subParts.join(', ') || item.display_name.split(',').slice(1, 4).join(',').trim();
          const fullAddress = subtitle ? `${title}, ${subtitle}` : title;
          const key = `${title.toLowerCase()}|${subtitle.toLowerCase()}`;

          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              id: `nom-${item.place_id}`,
              title,
              subtitle,
              fullAddress,
              lat: Number(Number(item.lat).toFixed(6)),
              lng: Number(Number(item.lon).toFixed(6)),
            });
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
    }
  }

  if (biasCoords && results.length > 0) {
    for (const item of results) {
      item.distanceMeters = calcDistanceMeters(biasCoords, { lat: item.lat, lng: item.lng });
    }
    results.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  }

  if (results.length > 0) {
    geocodeCache.set(cacheKey, results);
    if (geocodeCache.size > 100) {
      const firstKey = geocodeCache.keys().next().value;
      if (firstKey) geocodeCache.delete(firstKey);
    }
  }

  return results;
};

/**
 * Lấy ngược địa chỉ (Reverse Geocoding) từ tọa độ (lat, lng).
 * Ưu tiên Nominatim (tiếng Việt), fallback sang Photon nếu không có kết quả.
 */
export const reverseGeocode = async (
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> => {
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'vi' }, signal },
    );
    if (nomRes.ok) {
      const data = (await nomRes.json()) as {
        display_name?: string;
        address?: {
          house_number?: string;
          road?: string;
          suburb?: string;
          quarter?: string;
          city_district?: string;
          district?: string;
          city?: string;
          town?: string;
          state?: string;
        };
      };
      const addr = data.address;
      if (addr) {
        const street = [addr.house_number, addr.road].filter(Boolean).join(' ').trim();
        const ward = addr.quarter || addr.suburb;
        const district = addr.city_district || addr.district;
        const city = addr.city || addr.town || addr.state;
        const parts = [street, ward, district, city].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 4).join(',').trim();
      }
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
  }

  if (signal?.aborted) return null;

  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      { signal },
    );
    if (photonRes.ok) {
      const data = (await photonRes.json()) as {
        features?: Array<{
          properties: {
            housenumber?: string;
            street?: string;
            name?: string;
            district?: string;
            city?: string;
            state?: string;
          };
        }>;
      };
      const props = data.features?.[0]?.properties;
      if (props) {
        const street = [props.housenumber, props.street || props.name].filter(Boolean).join(' ').trim();
        const parts = [street, props.district, props.city || props.state].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
  }

  return null;
};

const GEO_FILLER_TOKENS = new Set([
  'truong',
  'dai',
  'hoc',
  'vien',
  'tp',
  'hcm',
  'tphcm',
  'thanh',
  'pho',
  'co',
  'so',
  'khu',
  'vuc',
  'duong',
  'phuong',
  'quan',
  'huyen',
  'viet',
  'nam',
]);

const normalizeGeoText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const computeTokenOverlapRatio = (query: string, candidate: AddressSuggestion): number => {
  const rawTokens = normalizeGeoText(query).split(' ').filter(Boolean);
  const significantTokens = rawTokens.filter(
    (token) => token.length >= 2 && !GEO_FILLER_TOKENS.has(token),
  );
  const tokensToMatch = significantTokens.length > 0 ? significantTokens : rawTokens;
  if (tokensToMatch.length === 0) return 0;

  const candidateNormalized = normalizeGeoText(`${candidate.title} ${candidate.fullAddress}`);
  const candidateTokens = new Set(candidateNormalized.split(' ').filter(Boolean));
  let matched = 0;
  for (const token of tokensToMatch) {
    if (candidateTokens.has(token) || candidateNormalized.includes(token)) {
      matched += 1;
    }
  }
  return matched / tokensToMatch.length;
};

export const resolveBestPlaceMatch = async (
  rawQuery: string,
  signal?: AbortSignal,
  biasCoords?: { lat: number; lng: number } | null,
): Promise<AddressSuggestion | null> => {
  const query = rawQuery.trim();
  if (query.length < 2) return null;

  const candidates = await searchAddressSuggestions(query, signal, biasCoords);
  let bestCandidate: AddressSuggestion | null = null;
  let bestScore = 0;
  for (const item of candidates) {
    const score = computeTokenOverlapRatio(query, item);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = item;
    }
  }

  return bestScore >= 0.6 ? bestCandidate : candidates[0] ?? null;
};
