import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { favoriteService } from '@/services/favorite.service';
import type { RoomSummaryResponse } from '@/types/room.types';

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

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      localFavoriteRooms: [],
      loading: false,

      loadFavorites: async (isAuthenticated = false) => {
        try {
          set({ loading: true });
          let mergedIds = [...get().favoriteIds];
          let mergedRooms = [...get().localFavoriteRooms];

          if (isAuthenticated) {
            try {
              const backendRooms = await favoriteService.getMyFavorites();
              if (Array.isArray(backendRooms)) {
                const backendIds = backendRooms.map((r) => r.maPhongTro);
                mergedIds = Array.from(new Set([...mergedIds, ...backendIds]));
                const map = new Map<string, RoomSummaryResponse>();
                [...mergedRooms, ...backendRooms].forEach((r) => map.set(r.maPhongTro, r));
                mergedRooms = Array.from(map.values());
              }
            } catch (e) {
              console.warn('Lỗi đồng bộ danh sách yêu thích:', e);
            }
          }

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
        const roomId = typeof roomOrId === 'string' ? roomOrId : roomOrId.maPhongTro;
        const { favoriteIds, localFavoriteRooms } = get();
        const exists = favoriteIds.includes(roomId);

        let nextIds: string[];
        let nextRooms: RoomSummaryResponse[];

        if (exists) {
          nextIds = favoriteIds.filter((id) => id !== roomId);
          nextRooms = localFavoriteRooms.filter((r) => r.maPhongTro !== roomId);
          if (isAuthenticated) {
            favoriteService.removeFavorite(roomId).catch(console.warn);
          }
        } else {
          nextIds = [...favoriteIds, roomId];
          nextRooms =
            typeof roomOrId !== 'string'
              ? [...localFavoriteRooms.filter((r) => r.maPhongTro !== roomId), roomOrId]
              : localFavoriteRooms;
          if (isAuthenticated) {
            favoriteService.addFavorite(roomId).catch(console.warn);
          }
        }

        set({ favoriteIds: nextIds, localFavoriteRooms: nextRooms });
        return !exists;
      },

      removeFavorite: async (roomId: string, isAuthenticated = false) => {
        const { favoriteIds, localFavoriteRooms } = get();
        set({
          favoriteIds: favoriteIds.filter((id) => id !== roomId),
          localFavoriteRooms: localFavoriteRooms.filter((r) => r.maPhongTro !== roomId),
        });
        if (isAuthenticated) {
          favoriteService.removeFavorite(roomId).catch(console.warn);
        }
      },

      isFavorite: (roomId: string) => get().favoriteIds.includes(roomId),
    }),
    {
      name: 'innfinder_favorite_storage',
      partialize: (state) => ({
        favoriteIds: state.favoriteIds,
        localFavoriteRooms: state.localFavoriteRooms,
      }),
    },
  ),
);
