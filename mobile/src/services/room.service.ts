// mobile/src/services/room.service.ts
import { axiosClient } from "../api/axiosClient";
import {
  RoomSummaryResponse,
  RoomDetailResponse,
  RoomFilterRequest,
  CategoryResponse,
  AmenityResponse,
  ReviewResponseDTO,
} from "../types/room.types";
import { PageResponse } from "../types/api.types";

export const roomService = {
  // 1. Tìm kiếm và lọc phòng trọ phân trang
  searchRooms: (filter?: Partial<RoomFilterRequest>) => {
    return axiosClient.get<any, PageResponse<RoomSummaryResponse>>(
      "/api/rooms",
      {
        params: filter,
      },
    );
  },

  // 2. Lấy chi tiết một phòng trọ theo ID
  getRoomDetail: (id: string) => {
    return axiosClient.get<any, RoomDetailResponse>(`/api/rooms/${id}`);
  },

  // 3. Danh mục loại phòng & tiện ích
  getRoomTypes: () => {
    return axiosClient.get<any, CategoryResponse[]>("/api/categories/room-types");
  },

  getAmenities: () => {
    return axiosClient.get<any, AmenityResponse[]>("/api/categories/amenities");
  },

  // 4. Phòng yêu thích (FavoriteController)
  getMyFavorites: () => {
    return axiosClient.get<any, RoomSummaryResponse[]>("/api/favorites");
  },

  addFavorite: (roomId: string) => {
    return axiosClient.post<any, string>(`/api/favorites/${roomId}`);
  },

  removeFavorite: (roomId: string) => {
    return axiosClient.delete<any, string>(`/api/favorites/${roomId}`);
  },

  // 5. Đánh giá phòng (ReviewController)
  getRoomReviews: (roomId: string) => {
    return axiosClient.get<any, ReviewResponseDTO[]>(
      `/api/rooms/${roomId}/reviews`,
    );
  },

  // 6. Tìm kiếm AI bằng ngôn ngữ tự nhiên (Vector Embedding Semantic Search)
  aiSearchRooms: (prompt: string) => {
    return axiosClient.get<any, RoomSummaryResponse[]>("/api/rooms/ai-search", {
      params: { prompt },
    });
  },
};
