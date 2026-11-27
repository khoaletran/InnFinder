import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function TenantTabLayout() {
  const { user, isAuthenticated } = useAuthStore();

  // Đảm bảo nếu là Admin thì không bao giờ hiển thị giao diện khách hàng
  // Tự động tải thông báo khi khách đã đăng nhập
  useEffect(() => {
    if (isAuthenticated && user?.vaiTro === 'QUAN_TRI') {
      router.replace('/(admin)');
    } else if (isAuthenticated) {
      useNotificationStore.getState().fetchNotifications(false);
    }
  }, [isAuthenticated, user?.vaiTro]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 2. Yêu thích (Trái tim sang thứ 2) */}
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Yêu thích',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color as string} />
          ),
        }}
      />

      <Tabs.Screen
        name="roommates"
        options={{
          href: user?.chuTro ? null : undefined,
          title: 'Ở ghép',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color as string} />,
        }}
      />

      {/* 4. Lịch hẹn */}
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Lịch hẹn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color as string} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{ href: null, title: 'Thông báo' }}
      />

      {/* 5. Cá nhân */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
