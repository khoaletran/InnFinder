export interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  lat: number;
  lng: number;
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
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

const geocodeCache = new Map<string, AddressSuggestion[]>();

const buildCacheKey = (
  query: string,
  biasCoords?: { lat: number; lng: number } | null,
): string => {
  const base = query.trim().toLowerCase();
  if (!biasCoords) return base;
  return `${base}|${biasCoords.lat.toFixed(2)},${biasCoords.lng.toFixed(2)}`;
};

const isWithinVietnamBounds = (lat: number, lng: number): boolean =>
  lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;

export const getCachedAddressSuggestions = (
  rawQuery: string,
  biasCoords?: { lat: number; lng: number } | null,
): AddressSuggestion[] | undefined => {
  const query = rawQuery.trim();
  if (!query) return undefined;
  return geocodeCache.get(buildCacheKey(query, biasCoords));
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

  // 1. Tìm kiếm qua Photon (hỗ trợ tiếng Việt rất tốt cho số nhà, ngõ, hẻm, tên đường)
  try {
    const biasParam = biasCoords ? `&lat=${biasCoords.lat}&lon=${biasCoords.lng}` : '';
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6${biasParam}`,
      { signal },
    );
    if (photonRes.ok) {
      const data = (await photonRes.json()) as { features?: PhotonFeature[] };
      const features = data.features || [];

      for (const f of features) {
        const props = f.properties;
        const coords = f.geometry.coordinates;
        if (!coords || coords.length < 2) continue;

        const lat = Number(coords[1].toFixed(6));
        const lng = Number(coords[0].toFixed(6));
        if (!isWithinVietnamBounds(lat, lng)) continue;

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
            lat,
            lng,
          });
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
  }

  // 2. Fallback Nominatim nếu Photon không có kết quả
  if (results.length === 0 && !signal?.aborted) {
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&countrycodes=vn&limit=5&addressdetails=1`,
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
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
    }
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
