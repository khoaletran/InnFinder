import { BASE_URL } from '../api/axiosClient';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Hàm phụ trợ gửi FormData an toàn tương thích cả Expo WinterCG fetch và native XHR
 */
const sendMultipartFormData = async (url: string, formData: FormData, token?: string | null): Promise<any> => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload thất bại (HTTP ${response.status}): ${text}`);
    }

    return await response.json();
  } catch (fetchError: any) {
    // Nếu fetch bị lỗi do FormDataPart implementation, fallback sang native XMLHttpRequest
    if (fetchError?.message?.includes('FormDataPart') || fetchError?.message?.includes('Network')) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Accept', 'application/json');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({ data: xhr.responseText });
            }
          } else {
            reject(new Error(`Upload thất bại (HTTP ${xhr.status}): ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Lỗi kết nối mạng khi tải ảnh lên server'));
        xhr.send(formData);
      });
    }
    throw fetchError;
  }
};

/**
 * Chuyển đổi local URI thành Blob chuẩn để tương thích với Expo WinterCG fetch
 */
const appendFileToFormData = async (formData: FormData, fieldName: string, uri: string, fallbackName?: string) => {
  const fileName = uri.split('/').pop() || fallbackName || `img_${Date.now()}.jpg`;
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  try {
    const fileRes = await fetch(uri);
    const blob = await fileRes.blob();
    formData.append(fieldName, blob, fileName);
  } catch {
    const fileUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
    formData.append(fieldName, {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);
  }
};

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
    await appendFileToFormData(formData, 'file', uri);

    const token = await SecureStore.getItemAsync('innfinder_jwt_token');
    const json = await sendMultipartFormData(`${BASE_URL}/api/upload/image`, formData, token);

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
    await Promise.all(
      localUris.map((uri, idx) =>
        appendFileToFormData(formData, 'files', uri, `img_${Date.now()}_${idx}.jpg`)
      )
    );

    const token = await SecureStore.getItemAsync('innfinder_jwt_token');
    const json = await sendMultipartFormData(`${BASE_URL}/api/upload/images`, formData, token);

    const newUrls: string[] = json?.data || [];
    return [...remoteUrls, ...newUrls];
  },
};
