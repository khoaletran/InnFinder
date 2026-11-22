import { axiosClient } from '@/api/axiosClient';
import { AI_REQUEST_TIMEOUT_MS } from '@/constants/ai';
import type { PageResponse } from '@/types/api.types';
import type { AiSearchResponse } from '@/types/chat.types';
import type {
  AmenityResponse,
  CategoryResponse,
  PopularAreaResponse,
  ReviewResponseDTO,
  RoomDetailResponse,
  RoomFilterRequest,
  RoomSummaryResponse,
} from '@/types/room.types';

export const roomService = {
  getPopularAreas: (): Promise<PopularAreaResponse[]> =>
    axiosClient.get<unknown, PopularAreaResponse[]>('/api/rooms/popular-areas'),

  searchRooms: async (
    filter: RoomFilterRequest = {},
  ): Promise<PageResponse<RoomSummaryResponse>> => {
    return axiosClient.get<unknown, PageResponse<RoomSummaryResponse>>('/api/rooms', {
      params: {
        page: filter.page ?? 0,
        size: filter.size ?? 20,
        keyword: filter.keyword || undefined,
        area: filter.area || undefined,
        minGia: filter.minGia,
        maxGia: filter.maxGia,
        minDienTich: filter.minDienTich,
        maxDienTich: filter.maxDienTich,
        soNguoi: filter.soNguoi,
        maLpt: filter.maLpt,
        dsTienIch:
          filter.dsTienIch && filter.dsTienIch.length > 0
            ? filter.dsTienIch.join(',')
            : undefined,
        sortBy: filter.sortBy,
        sortDirection: filter.sortDirection,
      },
    });
  },

  aiSearchRooms: async (prompt: string, limit = 10): Promise<RoomSummaryResponse[]> => {
    return axiosClient.get<unknown, RoomSummaryResponse[]>('/api/rooms/ai-search', {
      timeout: AI_REQUEST_TIMEOUT_MS,
      params: { prompt, limit },
    });
  },

  aiSearchWithDetails: async (prompt: string, filter: RoomFilterRequest = {}, limit = 30): Promise<AiSearchResponse> => {
    return axiosClient.get<unknown, AiSearchResponse>('/api/rooms/ai-search/details', {
      timeout: AI_REQUEST_TIMEOUT_MS,
      params: {
        prompt, limit,
        minGia: filter.minGia, maxGia: filter.maxGia,
        minDienTich: filter.minDienTich, maxDienTich: filter.maxDienTich,
        soNguoi: filter.soNguoi, maLpt: filter.maLpt,
        dsTienIch: filter.dsTienIch?.length ? filter.dsTienIch.join(',') : undefined,
        sortBy: filter.sortBy, sortDirection: filter.sortDirection,
      },
    });
  },

  getRoomDetail: async (roomId: string): Promise<RoomDetailResponse> => {
    return axiosClient.get<unknown, RoomDetailResponse>(`/api/rooms/${roomId}`);
  },

  // Khớp CategoryController: GET /api/categories/room-types
  getRoomTypes: async (): Promise<CategoryResponse[]> => {
    return axiosClient.get<unknown, CategoryResponse[]>('/api/categories/room-types');
  },

  // Khớp CategoryController: GET /api/categories/amenities
  getAmenities: async (): Promise<AmenityResponse[]> => {
    return axiosClient.get<unknown, AmenityResponse[]>('/api/categories/amenities');
  },

  getRoomReviews: async (roomId: string): Promise<ReviewResponseDTO[]> => {
    return axiosClient.get<unknown, ReviewResponseDTO[]>(`/api/rooms/${roomId}/reviews`);
  },
};

export default roomService;
