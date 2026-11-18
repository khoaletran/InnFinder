// web/src/store/useFilterStore.ts
import { create } from "zustand";
import type { RoomFilterRequest } from "../types/room.types";

interface FilterState {
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

  setKeyword: (keyword: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setAreaRange: (min?: number, max?: number) => void;
  setCapacity: (capacity?: number) => void;
  setCategoryId: (categoryId?: string) => void;
  setSelectedAmenities: (amenities: string[]) => void;
  setRadiusKm: (radius?: number) => void;
  setUserLocation: (lat: number, lng: number) => void;
  resetFilter: () => void;
  getActiveFilterCount: () => number;
  toFilterRequest: (page?: number, size?: number) => RoomFilterRequest;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  keyword: "",
  minPrice: undefined,
  maxPrice: undefined,
  minArea: undefined,
  maxArea: undefined,
  capacity: undefined,
  categoryId: undefined,
  selectedAmenities: [],
  radiusKm: 3,
  userLat: 10.7845,
  userLng: 106.6844,

  setKeyword: (keyword) => set({ keyword }),
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),
  setAreaRange: (minArea, maxArea) => set({ minArea, maxArea }),
  setCapacity: (capacity) => set({ capacity }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setSelectedAmenities: (selectedAmenities) => set({ selectedAmenities }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setUserLocation: (userLat, userLng) => set({ userLat, userLng }),

  resetFilter: () =>
    set({
      keyword: "",
      minPrice: undefined,
      maxPrice: undefined,
      minArea: undefined,
      maxArea: undefined,
      capacity: undefined,
      categoryId: undefined,
      selectedAmenities: [],
      radiusKm: 3,
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
