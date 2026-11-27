import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes';
import { useRealtimeEvents } from './hooks/useRealtimeEvents';

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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
