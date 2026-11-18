// web/src/store/useFavoriteStore.ts
import { create } from "zustand";
import type { RoomSummaryResponse } from "../types/room.types";
import { roomService } from "../services/room.service";

const FAVORITE_IDS_KEY = "innfinder_favorite_ids";
const LOCAL_FAVORITES_KEY = "innfinder_local_favorites";

interface FavoriteState {
  favoriteIds: string[];
  localFavoriteRooms: RoomSummaryResponse[];
  loading: boolean;
  loadFavorites: (isAuthenticated?: boolean) => Promise<void>;
  toggleFavorite: (
    roomOrId: RoomSummaryResponse | string,
    isAuthenticated?: boolean,
  ) => Promise<boolean>;
  removeFavorite: (roomId: string, isAuthenticated?: boolean) => Promise<void>;
  isFavorite: (roomId: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favoriteIds: (() => {
    try {
      const stored = localStorage.getItem(FAVORITE_IDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),
  localFavoriteRooms: (() => {
    try {
      const stored = localStorage.getItem(LOCAL_FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),
  loading: false,

  loadFavorites: async (isAuthenticated = false) => {
    try {
      set({ loading: true });
      const storedIdsJson = localStorage.getItem(FAVORITE_IDS_KEY);
      const storedRoomsJson = localStorage.getItem(LOCAL_FAVORITES_KEY);
      const localIds: string[] = storedIdsJson ? JSON.parse(storedIdsJson) : [];
      const localRooms: RoomSummaryResponse[] = storedRoomsJson
        ? JSON.parse(storedRoomsJson)
        : [];

      let mergedIds = [...localIds];
      let mergedRooms = [...localRooms];

      if (isAuthenticated) {
        try {
          const backendRooms = await roomService.getMyFavorites();
          if (backendRooms && Array.isArray(backendRooms)) {
            const backendIds = backendRooms.map((r) => r.maPhongTro);
            mergedIds = Array.from(new Set([...mergedIds, ...backendIds]));
            const map = new Map<string, RoomSummaryResponse>();
            [...mergedRooms, ...backendRooms].forEach((r) =>
              map.set(r.maPhongTro, r),
            );
            mergedRooms = Array.from(map.values());
          }
        } catch (e) {
          console.warn("Lỗi tải yêu thích từ backend:", e);
        }
      }

      localStorage.setItem(FAVORITE_IDS_KEY, JSON.stringify(mergedIds));
      localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(mergedRooms));

      set({
        favoriteIds: mergedIds,
        localFavoriteRooms: mergedRooms,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  toggleFavorite: async (
    roomOrId: RoomSummaryResponse | string,
    isAuthenticated = false,
  ) => {
    const roomId = typeof roomOrId === "string" ? roomOrId : roomOrId.maPhongTro;
    const { favoriteIds, localFavoriteRooms } = get();
    const exists = favoriteIds.includes(roomId);

    let nextIds: string[];
    let nextRooms: RoomSummaryResponse[];

    if (exists) {
      nextIds = favoriteIds.filter((id) => id !== roomId);
      nextRooms = localFavoriteRooms.filter((r) => r.maPhongTro !== roomId);
      if (isAuthenticated) {
        roomService.removeFavorite(roomId).catch(console.warn);
      }
    } else {
      nextIds = [...favoriteIds, roomId];
      if (typeof roomOrId !== "string") {
        nextRooms = [
          ...localFavoriteRooms.filter((r) => r.maPhongTro !== roomId),
          roomOrId,
        ];
      } else {
        nextRooms = localFavoriteRooms;
      }
      if (isAuthenticated) {
        roomService.addFavorite(roomId).catch(console.warn);
      }
    }

    try {
      localStorage.setItem(FAVORITE_IDS_KEY, JSON.stringify(nextIds));
      localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(nextRooms));
    } catch (e) {
      console.warn("Lỗi lưu yêu thích vào localStorage:", e);
    }

    set({ favoriteIds: nextIds, localFavoriteRooms: nextRooms });
    return !exists;
  },

  removeFavorite: async (roomId: string, isAuthenticated = false) => {
    const { favoriteIds, localFavoriteRooms } = get();
    const nextIds = favoriteIds.filter((id) => id !== roomId);
    const nextRooms = localFavoriteRooms.filter((r) => r.maPhongTro !== roomId);

    try {
      localStorage.setItem(FAVORITE_IDS_KEY, JSON.stringify(nextIds));
      localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(nextRooms));
    } catch (e) {
      console.warn("Lỗi lưu yêu thích vào localStorage:", e);
    }

    set({ favoriteIds: nextIds, localFavoriteRooms: nextRooms });
    if (isAuthenticated) {
      roomService.removeFavorite(roomId).catch(console.warn);
    }
  },

  isFavorite: (roomId: string) => {
    return get().favoriteIds.includes(roomId);
  },
}));
