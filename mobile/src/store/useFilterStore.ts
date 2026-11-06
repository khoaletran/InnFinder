// mobile/src/store/useFilterStore.ts
import { create } from 'zustand';
import { RoomFilterRequest } from '../types/room.types';

interface FilterState {
  filter: RoomFilterRequest;
  favoriteIds: string[];
  setFilter: (newFilter: Partial<RoomFilterRequest>) => void;
  resetFilter: () => void;
  setFavoriteIds: (ids: string[]) => void;
  toggleFavoriteLocal: (roomId: string) => boolean; // trả về trạng thái mới (true = đã thích)
  getActiveFilterCount: () => number;
}

const defaultFilter: RoomFilterRequest = {
  keyword: '',
  minGia: undefined,
  maxGia: undefined,
  minDienTich: undefined,
  maxDienTich: undefined,
  soNguoi: undefined,
  maLpt: undefined,
  dsTienIch: [],
  page: 0,
  size: 20,
  sortBy: 'thoiGianDang',
  sortDirection: 'DESC',
};

export const useFilterStore = create<FilterState>((set, get) => ({
  filter: defaultFilter,
  favoriteIds: [],

  setFilter: (newFilter) =>
    set((state) => ({
      filter: { ...state.filter, ...newFilter, page: newFilter.page ?? 0 },
    })),

  resetFilter: () => set({ filter: { ...defaultFilter } }),

  setFavoriteIds: (ids) => set({ favoriteIds: ids }),

  toggleFavoriteLocal: (roomId: string) => {
    const list = get().favoriteIds;
    const isFav = list.includes(roomId);
    if (isFav) {
      set({ favoriteIds: list.filter((id) => id !== roomId) });
      return false;
    } else {
      set({ favoriteIds: [...list, roomId] });
      return true;
    }
  },

  getActiveFilterCount: () => {
    const f = get().filter;
    let count = 0;
    if (f.keyword && f.keyword.trim() !== '') count++;
    if (f.minGia !== undefined || f.maxGia !== undefined) count++;
    if (f.minDienTich !== undefined || f.maxDienTich !== undefined) count++;
    if (f.soNguoi !== undefined) count++;
    if (f.maLpt) count++;
    if (f.dsTienIch && f.dsTienIch.length > 0) count += f.dsTienIch.length;
    return count;
  },
}));