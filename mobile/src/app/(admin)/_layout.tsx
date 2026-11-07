import React from 'react';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 5 Bottom Tabs chính */}
      <Stack.Screen name="(tabs)" />

      {/* Các màn hình chi tiết thuộc Stack */}
      <Stack.Screen
        name="landlord-requests/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="posts/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="complaints/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="transactions/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="users/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Các màn hình giám sát phụ thuộc Stack */}
      <Stack.Screen
        name="appointments/index"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="appointments/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="reviews/index"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="reviews/room-[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="reviews/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="statistics"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
