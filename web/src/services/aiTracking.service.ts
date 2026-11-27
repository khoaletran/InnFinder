import { axiosClient } from '@/api/axiosClient';
import type { AiTrackingSummary, AiUsageLogPage } from '@/types/ai-tracking.types';
import type { RoomSummaryResponse } from '@/types/room.types';

export const aiTrackingService = {
  getSummary: (days = 7): Promise<AiTrackingSummary> =>
    axiosClient.get<unknown, AiTrackingSummary>('/api/admin/ai-tracking/summary', {
      params: { days },
    }),

  getLogs: (params: {
    feature?: string;
    status?: string;
    model?: string;
    days?: number;
    page?: number;
    size?: number;
  }): Promise<AiUsageLogPage> =>
    axiosClient.get<unknown, AiUsageLogPage>('/api/admin/ai-tracking/logs', { params }),
};

export const recommendationService = {
  getPersonalized: async (recentIds: string[], limit = 8): Promise<RoomSummaryResponse[]> => {
    const data = await axiosClient.get<unknown, RoomSummaryResponse[]>(
      '/api/rooms/recommendations',
      {
        params: {
          recentIds: recentIds.length > 0 ? recentIds.join(',') : undefined,
          limit,
        },
      },
    );
    return Array.isArray(data) ? data : [];
  },

  getSimilar: async (roomId: string, limit = 6): Promise<RoomSummaryResponse[]> => {
    const data = await axiosClient.get<unknown, RoomSummaryResponse[]>(
      `/api/rooms/${encodeURIComponent(roomId)}/recommendations`,
      { params: { limit } },
    );
    return Array.isArray(data) ? data : [];
  },

  trackImpression: (roomIds: string[], source: string): Promise<string> =>
    axiosClient.post<unknown, string>('/api/rooms/recommendations/impressions', { roomIds, source }),
  trackClick: (roomId: string, impressionId: string) =>
    axiosClient.post('/api/rooms/recommendations/click', { roomId, impressionId }),
};
