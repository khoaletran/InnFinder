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

const buildNominatimSuggestions = async (
  query: string,
  userPrefix: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> => {
  const results: AddressSuggestion[] = [];
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
  return results;
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
    const nomResults = await buildNominatimSuggestions(query, userPrefix, signal);
    results.push(...nomResults);
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

interface KnownLandmarkEntry {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  exactAliases: string[];
  ambiguousAliases?: string[];
}

const KNOWN_VN_LANDMARKS: KnownLandmarkEntry[] = [
  {
    id: 'landmark-iuh',
    title: 'Đại học Công nghiệp TP.HCM (IUH)',
    subtitle: '12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, TP. Hồ Chí Minh',
    lat: 10.8221,
    lng: 106.6874,
    exactAliases: [
      'iuh',
      'dai hoc cong nghiep tp hcm',
      'dai hoc cong nghiep tphcm',
      'dai hoc cong nghiep ho chi minh',
      'dai hoc cong nghiep sai gon',
    ],
    ambiguousAliases: ['dai hoc cong nghiep'],
  },
  {
    id: 'landmark-haui',
    title: 'Đại học Công nghiệp Hà Nội (HaUI)',
    subtitle: '298 Cầu Diễn, Bắc Từ Liêm, Hà Nội',
    lat: 21.0537,
    lng: 105.7351,
    exactAliases: ['haui', 'dai hoc cong nghiep ha noi'],
    ambiguousAliases: ['dai hoc cong nghiep'],
  },
  {
    id: 'landmark-hcmut',
    title: 'Đại học Bách Khoa TP.HCM (HCMUT)',
    subtitle: '268 Lý Thường Kiệt, Quận 10, TP. Hồ Chí Minh',
    lat: 10.7721,
    lng: 106.6579,
    exactAliases: ['hcmut', 'dai hoc bach khoa tp hcm', 'dai hoc bach khoa tphcm', 'bach khoa tphcm'],
    ambiguousAliases: ['dai hoc bach khoa', 'bach khoa'],
  },
  {
    id: 'landmark-hust',
    title: 'Đại học Bách Khoa Hà Nội (HUST)',
    subtitle: '1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
    lat: 21.0073,
    lng: 105.8431,
    exactAliases: ['hust', 'dai hoc bach khoa ha noi', 'bach khoa ha noi'],
    ambiguousAliases: ['dai hoc bach khoa', 'bach khoa'],
  },
  {
    id: 'landmark-uit',
    title: 'Đại học Công nghệ Thông tin TP.HCM (UIT)',
    subtitle: 'Khu phố 6, Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    lat: 10.8700,
    lng: 106.8031,
    exactAliases: ['uit', 'dai hoc cong nghe thong tin', 'dai hoc cong nghe thong tin tp hcm'],
  },
  {
    id: 'landmark-hcmus',
    title: 'Đại học Khoa học Tự nhiên TP.HCM (HCMUS)',
    subtitle: '227 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh',
    lat: 10.7629,
    lng: 106.6822,
    exactAliases: ['hcmus', 'dai hoc khoa hoc tu nhien tp hcm', 'dai hoc khoa hoc tu nhien'],
  },
  {
    id: 'landmark-ueh',
    title: 'Đại học Kinh tế TP.HCM (UEH)',
    subtitle: '59C Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh',
    lat: 10.7824,
    lng: 106.6956,
    exactAliases: ['ueh', 'dai hoc kinh te tp hcm', 'dai hoc kinh te tphcm'],
  },
  {
    id: 'landmark-hutech',
    title: 'Đại học Công nghệ TP.HCM (HUTECH)',
    subtitle: '475A Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.8019,
    lng: 106.7147,
    exactAliases: ['hutech', 'dai hoc cong nghe tp hcm', 'dai hoc cong nghe tphcm'],
  },
  {
    id: 'landmark-tdtu',
    title: 'Đại học Tôn Đức Thắng (TDTU)',
    subtitle: '19 Nguyễn Hữu Thọ, Quận 7, TP. Hồ Chí Minh',
    lat: 10.7324,
    lng: 106.6997,
    exactAliases: ['tdtu', 'dai hoc ton duc thang'],
  },
  {
    id: 'landmark-rmit',
    title: 'Đại học RMIT Việt Nam',
    subtitle: '702 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
    lat: 10.7294,
    lng: 106.6957,
    exactAliases: ['rmit', 'dai hoc rmit'],
  },
  {
    id: 'landmark-vlu',
    title: 'Đại học Văn Lang (VLU)',
    subtitle: '69/68 Đặng Thùy Trâm, Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.8275,
    lng: 106.7000,
    exactAliases: ['vlu', 'dai hoc van lang'],
  },
  {
    id: 'landmark-sgu',
    title: 'Đại học Sài Gòn (SGU)',
    subtitle: '273 An Dương Vương, Quận 5, TP. Hồ Chí Minh',
    lat: 10.7599,
    lng: 106.6820,
    exactAliases: ['sgu', 'dai hoc sai gon'],
  },
  {
    id: 'landmark-huflit',
    title: 'Đại học Ngoại ngữ Tin học TP.HCM (HUFLIT)',
    subtitle: '828 Sư Vạn Hạnh, Quận 10, TP. Hồ Chí Minh',
    lat: 10.7763,
    lng: 106.6673,
    exactAliases: ['huflit', 'dai hoc ngoai ngu tin hoc'],
  },
  {
    id: 'landmark-uth',
    title: 'Đại học Giao thông Vận tải TP.HCM (UTH)',
    subtitle: '2 Võ Oanh, Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.8042,
    lng: 106.7169,
    exactAliases: ['uth', 'dai hoc giao thong van tai tp hcm', 'dai hoc giao thong van tai tphcm'],
    ambiguousAliases: ['dai hoc giao thong van tai'],
  },
  {
    id: 'landmark-utc',
    title: 'Đại học Giao thông Vận tải Hà Nội (UTC)',
    subtitle: '3 Cầu Giấy, Đống Đa, Hà Nội',
    lat: 21.0281,
    lng: 105.8034,
    exactAliases: ['utc', 'dai hoc giao thong van tai ha noi'],
    ambiguousAliases: ['dai hoc giao thong van tai'],
  },
  {
    id: 'landmark-neu',
    title: 'Đại học Kinh tế Quốc dân (NEU)',
    subtitle: '207 Giải Phóng, Hai Bà Trưng, Hà Nội',
    lat: 21.0001,
    lng: 105.8425,
    exactAliases: ['neu', 'dai hoc kinh te quoc dan'],
  },
  {
    id: 'landmark-ftu',
    title: 'Đại học Ngoại thương (FTU)',
    subtitle: '91 Chùa Láng, Đống Đa, Hà Nội',
    lat: 21.0232,
    lng: 105.8054,
    exactAliases: ['ftu', 'dai hoc ngoai thuong'],
  },
  {
    id: 'landmark-ptit',
    title: 'Học viện Công nghệ Bưu chính Viễn thông (PTIT)',
    subtitle: 'Km10 Nguyễn Trãi, Hà Đông, Hà Nội',
    lat: 20.9809,
    lng: 105.7874,
    exactAliases: ['ptit', 'hoc vien cong nghe buu chinh vien thong'],
  },
  {
    id: 'landmark-fpt-hcm',
    title: 'Đại học FPT TP.HCM',
    subtitle: 'Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh',
    lat: 10.8411,
    lng: 106.8099,
    exactAliases: ['dai hoc fpt tp hcm', 'dai hoc fpt tphcm'],
    ambiguousAliases: ['dai hoc fpt', 'fpt'],
  },
  {
    id: 'landmark-fpt-hn',
    title: 'Đại học FPT Hà Nội',
    subtitle: 'Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội',
    lat: 21.0133,
    lng: 105.5253,
    exactAliases: ['dai hoc fpt ha noi'],
    ambiguousAliases: ['dai hoc fpt', 'fpt'],
  },
];

const GEO_FILLER_TOKENS = new Set([
  'truong',
  'dai',
  'hoc',
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

const approxGeoDistanceSq = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng;
};

const toLandmarkSuggestion = (entry: KnownLandmarkEntry): AddressSuggestion => ({
  id: entry.id,
  title: entry.title,
  subtitle: entry.subtitle,
  fullAddress: `${entry.title}, ${entry.subtitle}`,
  lat: entry.lat,
  lng: entry.lng,
});

const findKnownLandmark = (
  rawQuery: string,
  biasCoords?: { lat: number; lng: number } | null,
): AddressSuggestion | null => {
  const normalized = normalizeGeoText(rawQuery).replace(/^truong\s+/, '');
  if (!normalized) return null;

  const exactMatches = KNOWN_VN_LANDMARKS.filter((entry) =>
    entry.exactAliases.some((alias) => normalized === alias || normalized.includes(alias)),
  );
  if (exactMatches.length === 1) {
    return toLandmarkSuggestion(exactMatches[0]);
  }
  if (exactMatches.length > 1) {
    const sorted = [...exactMatches].sort((a, b) =>
      biasCoords
        ? approxGeoDistanceSq(biasCoords.lat, biasCoords.lng, a.lat, a.lng) -
          approxGeoDistanceSq(biasCoords.lat, biasCoords.lng, b.lat, b.lng)
        : 0,
    );
    return toLandmarkSuggestion(sorted[0]);
  }

  const ambiguousMatches = KNOWN_VN_LANDMARKS.filter((entry) =>
    entry.ambiguousAliases?.some((alias) => normalized === alias || normalized.includes(alias)),
  );
  if (ambiguousMatches.length > 0) {
    const ref = biasCoords ?? { lat: 10.7769, lng: 106.7009 };
    const sorted = [...ambiguousMatches].sort(
      (a, b) =>
        approxGeoDistanceSq(ref.lat, ref.lng, a.lat, a.lng) -
        approxGeoDistanceSq(ref.lat, ref.lng, b.lat, b.lng),
    );
    return toLandmarkSuggestion(sorted[0]);
  }

  return null;
};

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
      matched++;
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

  const landmark = findKnownLandmark(query, biasCoords);
  if (landmark) {
    return landmark;
  }

  const candidates = [...(await searchAddressSuggestions(query, signal, biasCoords))];
  let bestScore = candidates.reduce(
    (max, item) => Math.max(max, computeTokenOverlapRatio(query, item)),
    0,
  );

  if (bestScore < 0.75 && !signal?.aborted) {
    const nomCandidates = await buildNominatimSuggestions(query, '', signal);
    for (const item of nomCandidates) {
      if (!candidates.some((existing) => existing.id === item.id)) {
        candidates.push(item);
      }
    }
  }

  let bestCandidate: AddressSuggestion | null = null;
  bestScore = 0;
  for (const item of candidates) {
    const score = computeTokenOverlapRatio(query, item);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = item;
    }
  }

  return bestScore >= 0.6 ? bestCandidate : null;
};
