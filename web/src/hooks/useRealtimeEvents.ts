import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BASE_URL, tokenStorage } from '@/api/axiosClient';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';

const RECONNECT_DELAYS_MS = [2000, 5000, 15000];

/**
 * Kết nối Spring Boot SSE (/api/realtime/stream) qua fetch streaming để gửi Bearer JWT
 * và tự động invalidate React Query caches khi có sự kiện nghiệp vụ mới.
 */
export function useRealtimeEvents() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeToken = useAuthStore((s) => s.token);

  useEffect(() => {
    const token = storeToken || tokenStorage.getToken();
    if (!isAuthenticated || !token) return;

    let cancelled = false;
    let attempt = 0;
    let retryTimer: number | null = null;
    let activeController: AbortController | null = null;

    const handleSseEvent = (eventName: string) => {
      switch (eventName) {
        case 'APPOINTMENT_UPDATED':
          void queryClient.invalidateQueries({ queryKey: ['appointments'] });
          void queryClient.invalidateQueries({ queryKey: ['landlord', 'appointments'] });
          void queryClient.invalidateQueries({ queryKey: ['landlord', 'notifications'] });
          void queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard'] });
          void useNotificationStore.getState().fetchNotifications(true);
          break;
        case 'WALLET_UPDATED':
          void queryClient.invalidateQueries({ queryKey: ['landlord', 'wallet'] });
          void queryClient.invalidateQueries({ queryKey: ['landlord', 'transactions'] });
          void queryClient.invalidateQueries({ queryKey: ['transactions'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-stats'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications-feed'] });
          break;
        case 'ROOM_UPDATED':
          void queryClient.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications-feed'] });
          void queryClient.invalidateQueries({ queryKey: ['rooms'] });
          break;
        case 'COMPLAINT_UPDATED':
          void queryClient.invalidateQueries({ queryKey: ['complaints'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications-feed'] });
          break;
        case 'ADMIN_QUEUE_UPDATED':
          void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications-feed'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'landlord-requests'] });
          break;
        default:
          break;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      attempt += 1;
      retryTimer = window.setTimeout(() => {
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (cancelled) return;
      const controller = new AbortController();
      activeController = controller;

      try {
        const res = await fetch(`${BASE_URL}/api/realtime/stream`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
            'ngrok-skip-browser-warning': 'true',
          },
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          return;
        }
        if (!res.ok || !res.body) {
          scheduleReconnect();
          return;
        }

        attempt = 0;
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            if (!frame.trim() || frame.startsWith(':')) continue;
            let eventName = 'message';
            for (const line of frame.split(/\r?\n/)) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              }
            }
            handleSseEvent(eventName);
          }
        }

        if (!cancelled) {
          scheduleReconnect();
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          scheduleReconnect();
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
      activeController?.abort();
    };
  }, [isAuthenticated, storeToken, queryClient]);
}
