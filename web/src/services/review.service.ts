import { axiosClient } from '@/api/axiosClient';
import type { ReviewRequestDTO, ReviewResponseDTO } from '@/types/review.types';

export const reviewService = {
  createReview: async (roomId: string, data: ReviewRequestDTO): Promise<ReviewResponseDTO> => {
    return axiosClient.post<unknown, ReviewResponseDTO>(`/api/rooms/${roomId}/reviews`, {
      diem: data.diem,
      noiDung: data.noiDung,
    });
  },

  getRoomReviews: async (roomId: string): Promise<ReviewResponseDTO[]> => {
    return axiosClient.get<unknown, ReviewResponseDTO[]>(`/api/rooms/${roomId}/reviews`);
  },

  getLandlordReviews: async (): Promise<ReviewResponseDTO[]> => {
    return axiosClient.get<unknown, ReviewResponseDTO[]>('/api/landlord/reviews');
  },
};

export default reviewService;
