import type { MapSortOption } from '@/store/useRoomFilterStore';
import type { RoomSummaryResponse } from '@/types/room.types';

export const ROOM_SORT_OPTIONS: ReadonlyArray<{ value: MapSortOption; label: string }> = [
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'OLDEST', label: 'Cũ nhất' },
  { value: 'PRICE_ASC', label: 'Giá tăng' },
  { value: 'PRICE_DESC', label: 'Giá giảm' },
];

export function resolveRoomSortParams(sortBy: MapSortOption): {
  sortBy: 'thoiGianDang' | 'giaThue';
  sortDirection: 'ASC' | 'DESC';
} {
  switch (sortBy) {
    case 'OLDEST':
      return { sortBy: 'thoiGianDang', sortDirection: 'ASC' };
    case 'PRICE_ASC':
      return { sortBy: 'giaThue', sortDirection: 'ASC' };
    case 'PRICE_DESC':
      return { sortBy: 'giaThue', sortDirection: 'DESC' };
    case 'NEWEST':
    default:
      return { sortBy: 'thoiGianDang', sortDirection: 'DESC' };
  }
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
