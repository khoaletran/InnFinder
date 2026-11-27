import { axiosClient, BASE_URL } from '@/api/axiosClient';
import type { ApiResponse } from '@/types/api.types';
import type {
  PanoramaUploadResponse,
  SaveTour360Request,
  Tour360Response,
} from '@/types/tour360.types';

export const tour360Service = {
  uploadPanorama: async (file: File): Promise<PanoramaUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post<FormData, PanoramaUploadResponse>(
      '/api/landlord/tours-360/upload-panorama',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      },
    );
  },

  createTour: async (payload: SaveTour360Request): Promise<Tour360Response> => {
    return axiosClient.post<SaveTour360Request, Tour360Response>(
      '/api/landlord/tours-360',
      payload,
    );
  },

  updateTour: async (maTour: string, payload: SaveTour360Request): Promise<Tour360Response> => {
    return axiosClient.put<SaveTour360Request, Tour360Response>(
      `/api/landlord/tours-360/${encodeURIComponent(maTour)}`,
      payload,
    );
  },

  attachTourToRoom: async (maPhongTro: string, maTour: string): Promise<Tour360Response> => {
    return axiosClient.post<never, Tour360Response>(
      `/api/landlord/rooms/${encodeURIComponent(maPhongTro)}/tour-360/${encodeURIComponent(maTour)}`,
    );
  },

  deleteTour: async (maTour: string): Promise<void> => {
    await axiosClient.delete(`/api/landlord/tours-360/${encodeURIComponent(maTour)}`);
  },

  getTourById: async (maTour: string, apiBaseOverride?: string): Promise<Tour360Response> => {
    if (apiBaseOverride) {
      const base = apiBaseOverride.replace(/\/+$/, '');
      const resp = await fetch(`${base}/api/tours-360/${encodeURIComponent(maTour)}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!resp.ok) {
        throw new Error(`Không tải được Tour 360° (HTTP ${resp.status})`);
      }
      const json = (await resp.json()) as ApiResponse<Tour360Response>;
      if (!json.success || !json.data) {
        throw new Error(json.message || 'Không tìm thấy Tour 360°');
      }
      return json.data;
    }
    return axiosClient.get<never, Tour360Response>(`/api/tours-360/${encodeURIComponent(maTour)}`);
  },

  getRoomTour: async (maPhongTro: string): Promise<Tour360Response | null> => {
    try {
      return await axiosClient.get<never, Tour360Response>(
        `/api/rooms/${encodeURIComponent(maPhongTro)}/tour-360`,
      );
    } catch {
      return null;
    }
  },

  getDefaultApiBase: (): string => BASE_URL,
};
