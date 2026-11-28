import type { MapSortOption } from '@/store/useRoomFilterStore';
import type { GiaNuoc, RoomSummaryResponse } from '@/types/room.types';
import { formatVND } from '@/utils/formatters';

export interface UtilityFilterValue {
  minElectricityPrice?: number;
  maxElectricityPrice?: number;
  minWaterPrice?: number;
  maxWaterPrice?: number;
  waterByPerson?: boolean;
}

export function hasUtilityFilter(value: UtilityFilterValue): boolean {
  return (
    value.minElectricityPrice !== undefined ||
    value.maxElectricityPrice !== undefined ||
    value.minWaterPrice !== undefined ||
    value.maxWaterPrice !== undefined ||
    value.waterByPerson !== undefined
  );
}

function formatCompactMoney(amount: number): string {
  if (amount >= 1000 && amount % 100 === 0) {
    return `${(amount / 1000).toString().replace('.', ',')}k`;
  }
  return formatVND(amount, true, 'đ');
}

export function formatUtilityFilterLabel(value: UtilityFilterValue): string {
  const parts: string[] = [];
  if (value.minElectricityPrice !== undefined && value.maxElectricityPrice !== undefined) {
    if (value.minElectricityPrice === 0 && value.maxElectricityPrice === 0) {
      parts.push('Điện thỏa thuận');
    } else {
      parts.push(
        value.minElectricityPrice === value.maxElectricityPrice
          ? `Điện ${formatCompactMoney(value.minElectricityPrice)}`
          : `Điện ${formatCompactMoney(value.minElectricityPrice)}–${formatCompactMoney(value.maxElectricityPrice)}`,
      );
    }
  } else if (value.maxElectricityPrice !== undefined) {
    parts.push(
      value.maxElectricityPrice === 0
        ? 'Điện thỏa thuận'
        : `Điện ≤${formatCompactMoney(value.maxElectricityPrice)}`,
    );
  } else if (value.minElectricityPrice !== undefined) {
    parts.push(`Điện ≥${formatCompactMoney(value.minElectricityPrice)}`);
  }

  const waterUnit =
    value.waterByPerson === true ? '/người' : value.waterByPerson === false ? '/m³' : '';
  if (value.minWaterPrice !== undefined && value.maxWaterPrice !== undefined) {
    if (value.minWaterPrice === 0 && value.maxWaterPrice === 0) {
      parts.push('Nước thỏa thuận');
    } else {
      parts.push(
        value.minWaterPrice === value.maxWaterPrice
          ? `Nước ${formatCompactMoney(value.minWaterPrice)}${waterUnit}`
          : `Nước ${formatCompactMoney(value.minWaterPrice)}–${formatCompactMoney(value.maxWaterPrice)}${waterUnit}`,
      );
    }
  } else if (value.maxWaterPrice !== undefined) {
    parts.push(
      value.maxWaterPrice === 0
        ? 'Nước thỏa thuận'
        : `Nước ≤${formatCompactMoney(value.maxWaterPrice)}${waterUnit}`,
    );
  } else if (value.minWaterPrice !== undefined) {
    parts.push(`Nước ≥${formatCompactMoney(value.minWaterPrice)}${waterUnit}`);
  } else if (value.waterByPerson === true) {
    parts.push('Nước/người');
  } else if (value.waterByPerson === false) {
    parts.push('Nước/m³');
  }

  return parts.length > 0 ? parts.join(' · ') : 'Điện / Nước';
}

export function matchesUtilityFilter(
  room: { giaDien?: number; giaNuoc?: GiaNuoc },
  filter: UtilityFilterValue,
): boolean {
  const elec = room.giaDien ?? 0;
  if (filter.minElectricityPrice !== undefined && elec < filter.minElectricityPrice) {
    return false;
  }
  if (filter.maxElectricityPrice !== undefined) {
    if (
      filter.maxElectricityPrice > 0 &&
      (filter.minElectricityPrice === undefined || filter.minElectricityPrice > 0) &&
      elec <= 0
    ) {
      return false;
    }
    if (elec > filter.maxElectricityPrice) return false;
  }

  const waterPrice = room.giaNuoc?.gia ?? 0;
  if (filter.minWaterPrice !== undefined && waterPrice < filter.minWaterPrice) {
    return false;
  }
  if (filter.maxWaterPrice !== undefined) {
    if (
      filter.maxWaterPrice > 0 &&
      (filter.minWaterPrice === undefined || filter.minWaterPrice > 0) &&
      waterPrice <= 0
    ) {
      return false;
    }
    if (waterPrice > filter.maxWaterPrice) return false;
  }

  if (filter.waterByPerson !== undefined) {
    const byPerson = Boolean(room.giaNuoc?.theoNguoi);
    if (byPerson !== filter.waterByPerson) return false;
  }

  return true;
}

export const ROOM_SORT_OPTIONS: ReadonlyArray<{ value: MapSortOption; label: string }> = [
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'OLDEST', label: 'Cũ nhất' },
  { value: 'PRICE_ASC', label: 'Giá phòng tăng' },
  { value: 'PRICE_DESC', label: 'Giá phòng giảm' },
  { value: 'ELECTRICITY_ASC', label: 'Giá điện tăng' },
  { value: 'ELECTRICITY_DESC', label: 'Giá điện giảm' },
  { value: 'WATER_ASC', label: 'Giá nước tăng' },
  { value: 'WATER_DESC', label: 'Giá nước giảm' },
];

export function resolveRoomSortParams(sortBy: MapSortOption): {
  sortBy: 'thoiGianDang' | 'giaThue' | 'giaDien' | 'giaNuoc.gia';
  sortDirection: 'ASC' | 'DESC';
} {
  switch (sortBy) {
    case 'OLDEST':
      return { sortBy: 'thoiGianDang', sortDirection: 'ASC' };
    case 'PRICE_ASC':
      return { sortBy: 'giaThue', sortDirection: 'ASC' };
    case 'PRICE_DESC':
      return { sortBy: 'giaThue', sortDirection: 'DESC' };
    case 'ELECTRICITY_ASC':
      return { sortBy: 'giaDien', sortDirection: 'ASC' };
    case 'ELECTRICITY_DESC':
      return { sortBy: 'giaDien', sortDirection: 'DESC' };
    case 'WATER_ASC':
      return { sortBy: 'giaNuoc.gia', sortDirection: 'ASC' };
    case 'WATER_DESC':
      return { sortBy: 'giaNuoc.gia', sortDirection: 'DESC' };
    case 'NEWEST':
    default:
      return { sortBy: 'thoiGianDang', sortDirection: 'DESC' };
  }
}

function normalizeUtilitySortAsc(value: number | undefined | null): number {
  return typeof value === 'number' && value > 0 ? value : Number.POSITIVE_INFINITY;
}

function normalizeUtilitySortDesc(value: number | undefined | null): number {
  return typeof value === 'number' && value > 0 ? value : -1;
}

export function sortRoomsByOption<T>(
  items: T[],
  getRoom: (item: T) => RoomSummaryResponse,
  sortBy: MapSortOption,
): T[] {
  return [...items].sort((a, b) => {
    const roomA = getRoom(a);
    const roomB = getRoom(b);
    if (sortBy === 'PRICE_ASC') {
      return (roomA.giaThue ?? 0) - (roomB.giaThue ?? 0);
    }
    if (sortBy === 'PRICE_DESC') {
      return (roomB.giaThue ?? 0) - (roomA.giaThue ?? 0);
    }
    if (sortBy === 'ELECTRICITY_ASC') {
      return normalizeUtilitySortAsc(roomA.giaDien) - normalizeUtilitySortAsc(roomB.giaDien);
    }
    if (sortBy === 'ELECTRICITY_DESC') {
      return normalizeUtilitySortDesc(roomB.giaDien) - normalizeUtilitySortDesc(roomA.giaDien);
    }
    if (sortBy === 'WATER_ASC') {
      return (
        normalizeUtilitySortAsc(roomA.giaNuoc?.gia) -
        normalizeUtilitySortAsc(roomB.giaNuoc?.gia)
      );
    }
    if (sortBy === 'WATER_DESC') {
      return (
        normalizeUtilitySortDesc(roomB.giaNuoc?.gia) -
        normalizeUtilitySortDesc(roomA.giaNuoc?.gia)
      );
    }
    const timeA = roomA.thoiGianDang ? new Date(roomA.thoiGianDang).getTime() : 0;
    const timeB = roomB.thoiGianDang ? new Date(roomB.thoiGianDang).getTime() : 0;
    return sortBy === 'OLDEST' ? timeA - timeB : timeB - timeA;
  });
}

export interface NumericBracketOption {
  label: string;
  min?: number;
  max?: number;
  count: number;
}

export function formatMillions(amount: number): string {
  const millions = amount / 1_000_000;
  return `${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.', ',')}tr`;
}

export function buildNumericBrackets(
  rawValues: number[],
  step: number,
  allLabel: string,
  formatSingle: (n: number) => string,
  formatUnder: (n: number) => string,
  formatRange: (a: number, b: number) => string,
  formatOver: (n: number) => string,
): NumericBracketOption[] {
  const sorted = [...rawValues].filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  const allOption: NumericBracketOption = { label: allLabel, count: sorted.length };
  if (sorted.length === 0) return [allOption];

  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  if (minVal === maxVal) {
    return [allOption, { label: formatSingle(minVal), min: minVal, max: maxVal, count: sorted.length }];
  }

  const rawSplits = [0.25, 0.5, 0.75]
    .map(
      (q) =>
        Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] / step) *
        step,
    )
    .filter((b) => b > minVal && b < maxVal);
  const splits = Array.from(new Set(rawSplits)).sort((a, b) => a - b);

  if (splits.length === 0) {
    const mid = Math.round((minVal + maxVal) / 2 / step) * step;
    if (mid > minVal && mid < maxVal) {
      splits.push(mid);
    } else {
      return [
        allOption,
        { label: formatRange(minVal, maxVal), min: minVal, max: maxVal, count: sorted.length },
      ];
    }
  }

  const segments: Array<{ min?: number; max?: number; label: string }> = [
    { min: undefined, max: splits[0], label: formatUnder(splits[0]) },
  ];
  for (let i = 0; i < splits.length - 1; i++) {
    segments.push({
      min: splits[i],
      max: splits[i + 1],
      label: formatRange(splits[i], splits[i + 1]),
    });
  }
  const lastSplit = splits[splits.length - 1];
  segments.push({ min: lastSplit, max: undefined, label: formatOver(lastSplit) });

  const dynamicOptions = segments
    .map((seg) => ({
      ...seg,
      count: sorted.filter(
        (v) => (seg.min === undefined || v >= seg.min) && (seg.max === undefined || v <= seg.max),
      ).length,
    }))
    .filter((opt) => opt.count > 0);

  return [allOption, ...dynamicOptions];
}

export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface CapacityOption {
  value?: number;
  label: string;
  count: number;
}

export function buildCapacityOptions(rooms: RoomSummaryResponse[]): CapacityOption[] {
  const validCapacities = rooms
    .map((r) => r.soNguoi)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0);
  const distinct = Array.from(new Set(validCapacities)).sort((a, b) => a - b);
  return [
    { label: 'Tất cả số người', count: rooms.length },
    ...distinct.map((n) => ({
      value: n,
      label: `Từ ${n} người`,
      count: validCapacities.filter((cap) => cap >= n).length,
    })),
  ];
}

export const VIETNAM_PROVINCES: readonly string[] = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Huế',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
];

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractProvinceSegment(address: string): string {
  const parts = address
    .split(',')
    .map((p) => normalizeSearchText(p))
    .filter(Boolean);
  if (parts.length === 0) return '';
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && (last === 'viet nam' || last === 'vietnam' || last === 'vn')) {
    return parts[parts.length - 2];
  }
  return last;
}

function stripProvincePrefix(normalized: string): string {
  return normalized
    .replace(/^(?:thanh pho|tp|tinh)\s+/i, '')
    .trim();
}

export function matchesProvinceAddress(address: string | undefined, province: string): boolean {
  if (!address || !province) return false;
  const segment = extractProvinceSegment(address);
  if (!segment) return false;
  const cleanSegment = stripProvincePrefix(segment);
  const cleanProvince = stripProvincePrefix(normalizeSearchText(province));

  if (cleanProvince === 'ho chi minh' || cleanProvince === 'tphcm' || cleanProvince === 'hcm') {
    return (
      cleanSegment === 'ho chi minh' ||
      cleanSegment === 'tphcm' ||
      cleanSegment === 'hcm' ||
      cleanSegment === 'sai gon' ||
      segment === 'tp hcm' ||
      segment.endsWith(' ho chi minh') ||
      segment.endsWith(' tphcm') ||
      segment.endsWith(' sai gon')
    );
  }

  if (cleanProvince === 'hue') {
    return (
      cleanSegment === 'hue' ||
      cleanSegment === 'thua thien hue' ||
      segment === 'tp hue' ||
      segment === 'thanh pho hue'
    );
  }

  return (
    cleanSegment === cleanProvince ||
    segment === cleanProvince ||
    cleanSegment.endsWith(` ${cleanProvince}`)
  );
}
