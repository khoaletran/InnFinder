import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes';
import { useRoomFilterStore } from './store/useRoomFilterStore';

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

export function App() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const { userLat, userLng, setUserLocation } = useRoomFilterStore.getState();
    if (userLat !== undefined && userLng !== undefined) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Không thể lấy vị trí hiện tại tự động:', err);
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
