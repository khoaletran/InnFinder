// mobile/src/store/useFilterStore.ts
import { create } from "zustand";
import { RoomFilterRequest, RoomSummaryResponse } from "../types/room.types";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Thêm roomService vào import
import { roomService } from "../services/room.service";
const GUEST_FAVORITES_KEY = "@innfinder_guest_favorites";
interface FilterState {
  filter: RoomFilterRequest;
  favoriteIds: string[];
  localFavoriteRooms: RoomSummaryResponse[]; // Danh sách phòng lưu tạm cho khách
  setFilter: (newFilter: Partial<RoomFilterRequest>) => void;
  resetFilter: () => void;
  setFavoriteIds: (ids: string[]) => void;
  loadFavoritesFromStorage: () => Promise<void>;
  toggleFavorite: (
    room: RoomSummaryResponse,
    isAuthenticated: boolean,
  ) => Promise<boolean>;
  toggleFavoriteLocal: (roomId: string) => boolean;
  getActiveFilterCount: () => number;
}

const defaultFilter: RoomFilterRequest = {
  keyword: "",
  minGia: undefined,
  maxGia: undefined,
  minDienTich: undefined,
  maxDienTich: undefined,
  soNguoi: undefined,
  maLpt: undefined,
  dsTienIch: [],
  page: 0,
  size: 20,
  sortBy: "thoiGianDang",
  sortDirection: "DESC",
};

export const useFilterStore = create<FilterState>((set, get) => ({
  filter: defaultFilter,
  favoriteIds: [],
  localFavoriteRooms: [],
  setFilter: (newFilter) =>
    set((state) => ({
      filter: { ...state.filter, ...newFilter, page: newFilter.page ?? 0 },
    })),
  resetFilter: () => set({ filter: { ...defaultFilter } }),
  setFavoriteIds: (ids) => set({ favoriteIds: ids }),
  // 1. Tải danh sách yêu thích từ AsyncStorage khi mở app
  loadFavoritesFromStorage: async () => {
    try {
      const json = await AsyncStorage.getItem(GUEST_FAVORITES_KEY);
      if (json) {
        const rooms: RoomSummaryResponse[] = JSON.parse(json);
        set({
          localFavoriteRooms: rooms,
          favoriteIds: rooms.map((r) => r.maPhongTro),
        });
      }
    } catch (e) {
      console.warn("Lỗi đọc AsyncStorage:", e);
    }
  },
  // 2. Thêm hoặc Bỏ yêu thích
  toggleFavorite: async (room, isAuthenticated) => {
    const { favoriteIds, localFavoriteRooms } = get();
    const isFav = favoriteIds.includes(room.maPhongTro);
    let nextIds: string[];
    let nextRooms: RoomSummaryResponse[];
    if (isFav) {
      nextIds = favoriteIds.filter((id) => id !== room.maPhongTro);
      nextRooms = localFavoriteRooms.filter(
        (r) => r.maPhongTro !== room.maPhongTro,
      );
    } else {
      nextIds = [...favoriteIds, room.maPhongTro];
      nextRooms = [room, ...localFavoriteRooms];
    }
    // Cập nhật State tức thì (Optimistic UI)
    set({ favoriteIds: nextIds, localFavoriteRooms: nextRooms });
    // Lưu vĩnh viễn vào AsyncStorage
    try {
      await AsyncStorage.setItem(
        GUEST_FAVORITES_KEY,
        JSON.stringify(nextRooms),
      );
    } catch (e) {
      console.warn("Lỗi ghi AsyncStorage:", e);
    }
    return !isFav;
  },

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

  //sua them loc
  getActiveFilterCount: () => {
    const f = get().filter;
    let count = 0;
    if (f.keyword && f.keyword.trim() !== "") count++;
    if (f.minGia !== undefined || f.maxGia !== undefined) count++;
    if (f.minDienTich !== undefined || f.maxDienTich !== undefined) count++;
    if (f.soNguoi !== undefined) count++;
    if (f.maLpt && f.maLpt.trim() !== "") count++;
    // Tiện ích chỉ tính là 1 tiêu chí bộ lọc
    if (f.dsTienIch && f.dsTienIch.length > 0) count++;
    return count;
  },
}));
