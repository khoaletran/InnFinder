import { axiosClient } from "../api/axiosClient";
import type { RoomDetailResponse } from "../types/room.types";

export const roomService = {
  /**
   * Lấy chi tiết phòng trọ theo mã phòng
   * Endpoint: GET /api/rooms/{id}
   */
  getRoomDetail: (id: string): Promise<RoomDetailResponse> => {
    return axiosClient.get<any, RoomDetailResponse>(`/api/rooms/${id}`);
  },
};

export default roomService;
