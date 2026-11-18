import { axiosClient } from '@/api/axiosClient';
import type { PageResponse } from '@/types/api.types';
import type {
  AmenityResponse,
  CategoryResponse,
  ReviewResponseDTO,
  RoomDetailResponse,
  RoomFilterRequest,
  RoomSummaryResponse,
} from '@/types/room.types';

export const roomService = {
  searchRooms: async (
    filter: RoomFilterRequest = {},
  ): Promise<PageResponse<RoomSummaryResponse>> => {
    return axiosClient.get<unknown, PageResponse<RoomSummaryResponse>>('/api/rooms', {
      params: {
        page: filter.page ?? 0,
        size: filter.size ?? 20,
        keyword: filter.keyword || undefined,
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
      params: { prompt, limit },
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
