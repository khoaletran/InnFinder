import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../global.css';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tenant)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(landlord)" />
          <Stack.Screen
            name="(admin)"
            options={{
              gestureEnabled: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="room/filter-modal"
            options={{
              presentation: 'modal',
            }}
          />
        </Stack>
        </QueryClientProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
