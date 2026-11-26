import { create } from 'zustand';
import type { RoomFilterRequest } from '@/types/room.types';

export interface MapCoords {
  lat: number;
  lng: number;
}

export interface MapViewportState {
  lat: number;
  lng: number;
  zoom: number;
}

export type MapSortOption = 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC';

interface RoomFilterState {
  keyword: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  capacity?: number;
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
  setAreaRange: (min?: number, max?: number) => void;
  setCapacity: (capacity?: number) => void;
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
  minArea: undefined,
  maxArea: undefined,
  capacity: undefined,
  categoryId: undefined,
  selectedAmenities: [],
  radiusKm: undefined,
  userLat: undefined,
  userLng: undefined,
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
  setAreaRange: (minArea, maxArea) => set({ minArea, maxArea }),
  setCapacity: (capacity) => set({ capacity }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setSelectedAmenities: (selectedAmenities) => set({ selectedAmenities }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setUserLocation: (userLat, userLng) => set({ userLat, userLng }),
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
      minArea: undefined,
      maxArea: undefined,
      capacity: undefined,
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
    if (s.minArea !== undefined || s.maxArea !== undefined) count++;
    if (s.capacity !== undefined) count++;
    if (s.categoryId !== undefined) count++;
    if (s.selectedAmenities.length > 0) count += s.selectedAmenities.length;
    return count;
  },

  toFilterRequest: (page = 0, size = 15): RoomFilterRequest => {
    const s = get();
    return {
      keyword: s.keyword.trim() || undefined,
      minGia: s.minPrice,
      maxGia: s.maxPrice,
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
