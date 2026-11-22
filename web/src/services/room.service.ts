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

export interface SearchBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface SearchLocation {
  name: string;
  lat: number;
  lng: number;
  bounds: SearchBounds;
}

const searchParams = (filter: RoomFilterRequest) => ({
  ...filter,
  page: filter.page ?? 0,
  size: filter.size ?? 20,
  dsTienIch: filter.dsTienIch?.join(',') || undefined,
});

export const roomService = {
  searchRooms: async (
    filter: RoomFilterRequest = {},
  ): Promise<PageResponse<RoomSummaryResponse>> => {
    return axiosClient.get<unknown, PageResponse<RoomSummaryResponse>>('/api/rooms', {
      params: searchParams(filter),
    });
  },

  searchDetails: (prompt: string, filter: RoomFilterRequest, signal: AbortSignal) =>
    axiosClient.get<unknown, {
      results: PageResponse<RoomSummaryResponse>;
      inferred: RoomFilterRequest;
      fallback: boolean;
    }>('/api/rooms/ai-search/details', { params: { ...searchParams(filter), prompt }, signal }),

  suggestLocations: (query: string, signal: AbortSignal) =>
    axiosClient.get<unknown, SearchLocation[]>('/api/locations/suggestions', { params: { query }, signal }),

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
