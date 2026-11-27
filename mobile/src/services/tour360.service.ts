import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { axiosClient, BASE_URL } from '../api/axiosClient';
import { ApiResponse } from '../types/api.types';
import {
  PanoramaUploadResponse,
  SaveTour360Request,
  Tour360Response,
} from '../types/tour360.types';

const TOKEN_KEY = 'innfinder_jwt_token';

function resolveWebBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_WEB_URL;
  if (configured && configured.trim().length > 0) {
    return configured.trim().replace(/\/+$/, '');
  }
  try {
    const parsed = new URL(BASE_URL);
    if (parsed.port === '8080') {
      parsed.port = '5173';
      return parsed.origin;
    }
    return parsed.origin;
  } catch {
    return 'http://localhost:5173';
  }
}

function resolveMimeType(fileName: string): string {
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : 'jpg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

interface PreparedPart {
  part: Blob | { uri: string; name: string; type: string };
  name: string;
  isBlob: boolean;
}

async function prepareFilePart(uri: string, fallbackName: string): Promise<PreparedPart> {
  const cleanName = uri.split('/').pop() || fallbackName;
  const mimeType = resolveMimeType(cleanName);

  try {
    const fileRes = await fetch(uri);
    const blob = await fileRes.blob();
    return { part: blob, name: cleanName, isBlob: true };
  } catch {
    const normalizedUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
    return {
      part: { uri: normalizedUri, name: cleanName, type: mimeType },
      name: cleanName,
      isBlob: false,
    };
  }
}

function appendPreparedPart(formData: FormData, fieldName: string, prepared: PreparedPart): void {
  if (prepared.isBlob) {
    formData.append(fieldName, prepared.part as Blob, prepared.name);
  } else {
    formData.append(fieldName, prepared.part as any);
  }
}

function parseApiResponsePayload<T>(rawText: string, status: number): T {
  let parsed: ApiResponse<T> | null = null;
  try {
    parsed = JSON.parse(rawText) as ApiResponse<T>;
  } catch {
    throw new Error(`Upload thất bại (HTTP ${status}): ${rawText || 'Lỗi máy chủ'}`);
  }

  if (status < 200 || status >= 300 || !parsed?.success) {
    throw new Error(parsed?.message || `Yêu cầu thất bại (HTTP ${status})`);
  }
  return parsed.data;
}

async function postMultipartApiResponse<T>(
  path: string,
  formData: FormData,
  timeoutMs: number,
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const endpoint = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      signal: controller.signal,
    });
    const rawText = await response.text();
    return parseApiResponsePayload<T>(rawText, response.status);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Quá thời gian xử lý ảnh Panorama. Vui lòng thử lại.');
    }
    if (err?.message?.includes('FormDataPart') || err?.message?.includes('Network')) {
      return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint);
        xhr.timeout = timeoutMs;
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.onload = () => {
          try {
            resolve(parseApiResponsePayload<T>(xhr.responseText, xhr.status));
          } catch (parseErr: any) {
            reject(parseErr);
          }
        };
        xhr.onerror = () => reject(new Error('Lỗi kết nối mạng khi tải ảnh lên server'));
        xhr.ontimeout = () => reject(new Error('Quá thời gian xử lý ảnh Panorama. Vui lòng thử lại.'));
        xhr.send(formData);
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const tour360Service = {
  uploadPanorama: async (imageUri: string): Promise<PanoramaUploadResponse> => {
    const formData = new FormData();
    const prepared = await prepareFilePart(imageUri, `panorama_${Date.now()}.jpg`);
    appendPreparedPart(formData, 'file', prepared);
    return postMultipartApiResponse<PanoramaUploadResponse>(
      '/api/landlord/tours-360/upload-panorama',
      formData,
      120000,
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

  getTourById: async (maTour: string): Promise<Tour360Response> => {
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

  getWebViewerUrl: (maTour: string): string => {
    const webBase = resolveWebBaseUrl();
    return `${webBase}/tour-360/${encodeURIComponent(maTour)}?apiBase=${encodeURIComponent(BASE_URL)}`;
  },
};
