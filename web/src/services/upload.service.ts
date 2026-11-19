import { axiosClient } from '../api/axiosClient';

export type UploadFolder = 'avatars' | 'rooms' | 'cccd' | 'reviews' | 'complaints' | 'banks';

export const uploadService = {
  uploadImage: async (file: File, folder: UploadFolder = 'avatars'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await axiosClient.post<FormData, string>(`/api/upload/image?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res;
  },

  uploadMultipleImages: async (files: File[], folder: UploadFolder = 'rooms'): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    
    const res = await axiosClient.post<FormData, string[]>(`/api/upload/images?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res;
  },
};
