import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function TenantTabLayout() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { user, isAuthenticated } = useAuthStore();

  // Đảm bảo nếu là Admin thì không bao giờ hiển thị giao diện khách hàng
  useEffect(() => {
    if (isAuthenticated && user?.vaiTro === 'QUAN_TRI') {
      router.replace('/(admin)');
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

      {/* 3. Lịch hẹn (Ở chính giữa) */}
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Lịch hẹn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 4. Thông báo */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color as string} />
          ),
        }}
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
