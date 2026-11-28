import { create } from 'zustand';
import type { RoomFilterRequest } from '@/types/room.types';

const USER_LOCATION_SESSION_KEY = 'innfinder:user-location';

function loadSessionLocation(): MapCoords | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(USER_LOCATION_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MapCoords>;
    if (
      typeof parsed.lat === 'number' &&
      typeof parsed.lng === 'number' &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lng)
    ) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
    return null;
  } catch {
    return null;
  }
}

const initialSessionLocation = loadSessionLocation();

export interface MapCoords {
  lat: number;
  lng: number;
}

export interface MapViewportState {
  lat: number;
  lng: number;
  zoom: number;
}

export type MapSortOption =
  | 'NEWEST'
  | 'OLDEST'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'ELECTRICITY_ASC'
  | 'ELECTRICITY_DESC'
  | 'WATER_ASC'
  | 'WATER_DESC';

interface RoomFilterState {
  keyword: string;
  minPrice?: number;
  maxPrice?: number;
  minElectricityPrice?: number;
  maxElectricityPrice?: number;
  minWaterPrice?: number;
  maxWaterPrice?: number;
  waterByPerson?: boolean;
  minArea?: number;
  maxArea?: number;
  capacity?: number;
  province?: string;
  categoryId?: string;
  selectedAmenities: string[];
  radiusKm?: number;
  userLat?: number;
  userLng?: number;
  mapPickedCoords: MapCoords | null;
  mapDynamicRadiusKm: number;
  mapSortBy: MapSortOption;
  mapSelectedRoomId: string | null;
  mapViewport: MapViewportState | null;
  mapMobileView: 'list' | 'map';
  lastSearchMode: 'list' | 'map';
  listSortBy: MapSortOption;
  listCurrentPage: number;

  setKeyword: (keyword: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setElectricityRange: (min?: number, max?: number) => void;
  setWaterFilter: (min?: number, max?: number, byPerson?: boolean) => void;
  setAreaRange: (min?: number, max?: number) => void;
  setCapacity: (capacity?: number) => void;
  setProvince: (province?: string) => void;
  setCategoryId: (categoryId?: string) => void;
  setSelectedAmenities: (amenities: string[]) => void;
  setRadiusKm: (radius?: number) => void;
  setUserLocation: (lat: number, lng: number) => void;
  setMapPickedCoords: (coords: MapCoords | null) => void;
  setMapDynamicRadiusKm: (radiusKm: number) => void;
  setMapSortBy: (sortBy: MapSortOption) => void;
  setMapSelectedRoomId: (roomId: string | null) => void;
  setMapViewport: (viewport: MapViewportState | null) => void;
  setMapMobileView: (view: 'list' | 'map') => void;
  setLastSearchMode: (mode: 'list' | 'map') => void;
  setListSortBy: (sortBy: MapSortOption) => void;
  setListCurrentPage: (page: number) => void;
  resetFilter: () => void;
  getActiveFilterCount: () => number;
  toFilterRequest: (page?: number, size?: number) => RoomFilterRequest;
}

export const useRoomFilterStore = create<RoomFilterState>((set, get) => ({
  keyword: '',
  minPrice: undefined,
  maxPrice: undefined,
  minElectricityPrice: undefined,
  maxElectricityPrice: undefined,
  minWaterPrice: undefined,
  maxWaterPrice: undefined,
  waterByPerson: undefined,
  minArea: undefined,
  maxArea: undefined,
  capacity: undefined,
  province: undefined,
  categoryId: undefined,
  selectedAmenities: [],
  radiusKm: undefined,
  userLat: initialSessionLocation?.lat,
  userLng: initialSessionLocation?.lng,
  mapPickedCoords: null,
  mapDynamicRadiusKm: 5,
  mapSortBy: 'NEWEST',
  mapSelectedRoomId: null,
  mapViewport: null,
  mapMobileView: 'map',
  lastSearchMode: 'list',
  listSortBy: 'NEWEST',
  listCurrentPage: 0,

  setKeyword: (keyword) => set({ keyword }),
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),
  setElectricityRange: (minElectricityPrice, maxElectricityPrice) =>
    set({ minElectricityPrice, maxElectricityPrice }),
  setWaterFilter: (minWaterPrice, maxWaterPrice, waterByPerson) =>
    set({ minWaterPrice, maxWaterPrice, waterByPerson }),
  setAreaRange: (minArea, maxArea) => set({ minArea, maxArea }),
  setCapacity: (capacity) => set({ capacity }),
  setProvince: (province) => set({ province }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setSelectedAmenities: (selectedAmenities) => set({ selectedAmenities }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setUserLocation: (userLat, userLng) => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(
          USER_LOCATION_SESSION_KEY,
          JSON.stringify({ lat: userLat, lng: userLng }),
        );
      } catch {
        // Bỏ qua nếu sessionStorage bị hạn chế
      }
    }
    set({ userLat, userLng });
  },
  setMapPickedCoords: (mapPickedCoords) => set({ mapPickedCoords }),
  setMapDynamicRadiusKm: (mapDynamicRadiusKm) => set({ mapDynamicRadiusKm }),
  setMapSortBy: (mapSortBy) => set({ mapSortBy }),
  setMapSelectedRoomId: (mapSelectedRoomId) => set({ mapSelectedRoomId }),
  setMapViewport: (mapViewport) => set({ mapViewport }),
  setMapMobileView: (mapMobileView) => set({ mapMobileView }),
  setLastSearchMode: (lastSearchMode) => set({ lastSearchMode }),
  setListSortBy: (listSortBy) => set({ listSortBy }),
  setListCurrentPage: (listCurrentPage) => set({ listCurrentPage }),

  resetFilter: () =>
    set({
      keyword: '',
      minPrice: undefined,
      maxPrice: undefined,
      minElectricityPrice: undefined,
      maxElectricityPrice: undefined,
      minWaterPrice: undefined,
      maxWaterPrice: undefined,
      waterByPerson: undefined,
      minArea: undefined,
      maxArea: undefined,
      capacity: undefined,
      province: undefined,
      categoryId: undefined,
      selectedAmenities: [],
      radiusKm: undefined,
      mapPickedCoords: null,
      mapSelectedRoomId: null,
      listCurrentPage: 0,
    }),

  getActiveFilterCount: () => {
    const s = get();
    let count = 0;
    if (s.keyword.trim().length > 0) count++;
    if (s.minPrice !== undefined || s.maxPrice !== undefined) count++;
    if (s.minElectricityPrice !== undefined || s.maxElectricityPrice !== undefined) count++;
    if (
      s.minWaterPrice !== undefined ||
      s.maxWaterPrice !== undefined ||
      s.waterByPerson !== undefined
    ) {
      count++;
    }
    if (s.minArea !== undefined || s.maxArea !== undefined) count++;
    if (s.capacity !== undefined) count++;
    if (s.province !== undefined) count++;
    if (s.categoryId !== undefined) count++;
    if (s.selectedAmenities.length > 0) count += s.selectedAmenities.length;
    return count;
  },

  toFilterRequest: (page = 0, size = 15): RoomFilterRequest => {
    const s = get();
    return {
      keyword: s.keyword.trim() || undefined,
      area: s.province || undefined,
      minGia: s.minPrice,
      maxGia: s.maxPrice,
      minGiaDien: s.minElectricityPrice,
      maxGiaDien: s.maxElectricityPrice,
      minGiaNuoc: s.minWaterPrice,
      maxGiaNuoc: s.maxWaterPrice,
      nuocTheoNguoi: s.waterByPerson,
      minDienTich: s.minArea,
      maxDienTich: s.maxArea,
      soNguoi: s.capacity,
      maLpt: s.categoryId,
      dsTienIch: s.selectedAmenities,
      page,
      size,
    };
  },
}));
