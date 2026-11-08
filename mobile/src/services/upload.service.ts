import { BASE_URL } from '../api/axiosClient';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const uploadService = {
  /**
   * Upload 1 hình ảnh lên Cloudinary qua API Backend (POST /api/upload/image)
   * @param uri Đường dẫn ảnh local (file://...) hoặc URL từ camera
   * @returns URL Cloudinary HTTPS bảo mật
   */
  uploadSingleImage: async (uri: string): Promise<string> => {
    if (!uri) return '';
    // Nếu ảnh đã là URL Cloudinary hoặc URL remote thì giữ nguyên
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }

    const formData = new FormData();
    const fileName = uri.split('/').pop() || `img_${Date.now()}.jpg`;
    const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const fileUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const token = await SecureStore.getItemAsync('innfinder_jwt_token');
    const response = await fetch(`${BASE_URL}/api/upload/image`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('Lỗi upload ảnh đơn:', response.status, text);
      throw new Error(`Upload ảnh lên Cloudinary thất bại (HTTP ${response.status})`);
    }

    const json = await response.json();
    return json?.data || '';
  },

  /**
   * Upload danh sách nhiều ảnh lên Cloudinary (POST /api/upload/images)
   */
  uploadMultipleImages: async (imageUris: string[]): Promise<string[]> => {
    if (!imageUris || imageUris.length === 0) return [];

    const remoteUrls: string[] = [];
    const localUris: string[] = [];

    imageUris.forEach((uri) => {
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        remoteUrls.push(uri);
      } else {
        localUris.push(uri);
      }
    });

    if (localUris.length === 0) {
      return remoteUrls;
    }

    const formData = new FormData();
    localUris.forEach((uri, idx) => {
      const fileName = uri.split('/').pop() || `img_${Date.now()}_${idx}.jpg`;
      const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const fileUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
      formData.append('files', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);
    });

    const token = await SecureStore.getItemAsync('innfinder_jwt_token');
    const response = await fetch(`${BASE_URL}/api/upload/images`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('Lỗi upload danh sách ảnh:', response.status, text);
      throw new Error(`Upload ảnh lên Cloudinary thất bại (HTTP ${response.status})`);
    }

    const json = await response.json();
    const newUrls: string[] = json?.data || [];
    return [...remoteUrls, ...newUrls];
  },
};
