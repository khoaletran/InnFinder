import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes';
import { useRealtimeEvents } from './hooks/useRealtimeEvents';
import { useRoomFilterStore } from './store/useRoomFilterStore';

function RealtimeBridge() {
  useRealtimeEvents();
  return null;
}

const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <>
        <AppRoutes />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
          offset={{ top: '80px', right: '20px' }}
        />
      </>
    ),
  },
]);

let initialGeoRequested = false;

export function App() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const requestLocation = () => {
      const { userLat, userLng, setUserLocation } = useRoomFilterStore.getState();
      if (userLat !== undefined && userLng !== undefined) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Không thể lấy vị trí hiện tại tự động:', err);
        },
        { timeout: 15000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false },
      );
    };

    if (!initialGeoRequested) {
      initialGeoRequested = true;
      requestLocation();
    }

    const onFirstPointerDown = () => {
      const { userLat, userLng } = useRoomFilterStore.getState();
      if (userLat !== undefined && userLng !== undefined) return;
      if (navigator.permissions?.query) {
        void navigator.permissions
          .query({ name: 'geolocation' })
          .then((status) => {
            if (status.state !== 'denied') {
              requestLocation();
            }
          })
          .catch(() => {
            requestLocation();
          });
      } else {
        requestLocation();
      }
    };

    window.addEventListener('pointerdown', onFirstPointerDown, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstPointerDown);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
