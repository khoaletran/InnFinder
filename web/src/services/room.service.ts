// web/src/services/room.service.ts
import { axiosClient } from "../api/axiosClient";
import type { PageResponse } from "../types/api.types";
import type {
  AmenityResponse,
  CategoryResponse,
  ReviewResponseDTO,
  RoomDetailResponse,
  RoomFilterRequest,
  RoomSummaryResponse,
} from "../types/room.types";

export const roomService = {
  /**
   * Tìm kiếm phòng trọ kèm lọc đa tiêu chí
   */
  searchRooms: async (
    filter: RoomFilterRequest = {},
  ): Promise<PageResponse<RoomSummaryResponse>> => {
    return await axiosClient.get("/api/rooms", {
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
        dsTienIch: filter.dsTienIch && filter.dsTienIch.length > 0 ? filter.dsTienIch.join(",") : undefined,
        sortBy: filter.sortBy,
        sortDirection: filter.sortDirection,
      },
    });
  },

  /**
   * Tìm kiếm phòng trọ bằng AI theo ngôn ngữ tự nhiên (Vector embedding)
   */
  aiSearchRooms: async (
    prompt: string,
    limit = 10,
  ): Promise<RoomSummaryResponse[]> => {
    return await axiosClient.get("/api/rooms/ai-search", {
      params: { prompt, limit },
    });
  },

  /**
   * Lấy chi tiết thông tin phòng trọ theo mã
   */
  getRoomDetail: async (roomId: string): Promise<RoomDetailResponse> => {
    return await axiosClient.get(`/api/rooms/${roomId}`);
  },

  /**
   * Lấy danh mục tất cả loại phòng trọ
   */
  getRoomTypes: async (): Promise<CategoryResponse[]> => {
    return await axiosClient.get("/api/room-types");
  },

  /**
   * Lấy danh sách tiện ích hệ thống
   */
  getAmenities: async (): Promise<AmenityResponse[]> => {
    return await axiosClient.get("/api/amenities");
  },

  /**
   * Lấy danh sách phòng yêu thích của tài khoản hiện tại
   */
  getMyFavorites: async (): Promise<RoomSummaryResponse[]> => {
    return await axiosClient.get("/api/favorites");
  },

  /**
   * Thêm phòng vào danh sách yêu thích
   */
  addFavorite: async (roomId: string): Promise<void> => {
    return await axiosClient.post(`/api/favorites/${roomId}`);
  },

  /**
   * Xóa phòng khỏi danh sách yêu thích
   */
  removeFavorite: async (roomId: string): Promise<void> => {
    return await axiosClient.delete(`/api/favorites/${roomId}`);
  },

  /**
   * Lấy danh sách đánh giá của phòng
   */
  getRoomReviews: async (roomId: string): Promise<ReviewResponseDTO[]> => {
    return await axiosClient.get(`/api/rooms/${roomId}/reviews`);
  },
};

export default roomService;
