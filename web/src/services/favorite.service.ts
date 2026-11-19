import { axiosClient } from '@/api/axiosClient';
import type { RoomSummaryResponse } from '@/types/room.types';

export const favoriteService = {
  getMyFavorites: async (): Promise<RoomSummaryResponse[]> => {
    return axiosClient.get<unknown, RoomSummaryResponse[]>('/api/favorites');
  },

  addFavorite: async (roomId: string): Promise<void> => {
    return axiosClient.post<unknown, void>(`/api/favorites/${roomId}`);
  },

  removeFavorite: async (roomId: string): Promise<void> => {
    return axiosClient.delete<unknown, void>(`/api/favorites/${roomId}`);
  },
};

export default favoriteService;
