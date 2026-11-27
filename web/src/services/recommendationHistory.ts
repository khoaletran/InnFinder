import { useAuthStore } from '@/store/useAuthStore';

const ROOM_ID_PATTERN = /^PT(?:\d{10}|\d{12})$/;
const key = () => `innfinder_recent_rooms:${useAuthStore.getState().user?.maNguoiDung ?? 'guest'}`;

export function getRecentRoomIds(userId = useAuthStore.getState().user?.maNguoiDung ?? 'guest'): string[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('innfinder_recent_rooms:' + userId) ?? '[]');
    return Array.isArray(data)
      ? data.filter((id): id is string => typeof id === 'string' && ROOM_ID_PATTERN.test(id)).slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

export function recordViewedRoom(id?: string) {
  if (!id || !ROOM_ID_PATTERN.test(id)) return;
  try {
    localStorage.setItem(key(), JSON.stringify([id, ...getRecentRoomIds().filter((value) => value !== id)].slice(0, 8)));
  } catch {
    /* Storage is optional. */
  }
}
