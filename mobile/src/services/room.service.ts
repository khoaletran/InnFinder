// mobile/src/services/room.service.ts
import { axiosClient } from "../api/axiosClient";
import { PageResponse } from "../types/api.types";
import {
  AmenityResponse,
  CategoryResponse,
  ReviewResponseDTO,
  RoomDetailResponse,
  RoomFilterRequest,
  RoomSummaryResponse,
} from "../types/room.types";

export const roomService = {
  // 1. Tìm kiếm & Lọc phòng trọ phân trang (GET /api/rooms)
  searchRooms: (filter: RoomFilterRequest) => {
    return axiosClient.get<any, PageResponse<RoomSummaryResponse>>(
      "/api/rooms",
      {
        params: filter,
        paramsSerializer: {
          indexes: null, // Giúp Spring Boot nhận diện dsTienIch dạng ?dsTienIch=TI0001&dsTienIch=TI0002
        },
      },
    );
  },

  // 2. Chi tiết phòng trọ (GET /api/rooms/{id})
  getRoomDetail: (id: string) => {
    return axiosClient.get<any, RoomDetailResponse>(`/api/rooms/${id}`);
  },

  // 3. Lấy danh mục Loại phòng & Tiện ích (GET /api/categories/*)
  getRoomTypes: () => {
    return axiosClient.get<any, CategoryResponse[]>(
      "/api/categories/room-types",
    );
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
};
