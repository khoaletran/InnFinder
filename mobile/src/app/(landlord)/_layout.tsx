import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function LandlordTabLayout() {
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
      {/* 1. Tab Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 2. Tab Phòng */}
      <Tabs.Screen
        name="my-rooms"
        options={{
          title: 'Phòng',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 3. Tab Lịch hẹn */}
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Lịch hẹn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 4. Tab Thông báo */}
      <Tabs.Screen
        name="rental-requests"
        options={{
          title: 'Thông báo',
          tabBarBadge: 1,
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

      {/* 5. Tab Tài khoản */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* Các màn hình con ẩn khỏi Tab Bar */}
      <Tabs.Screen
        name="create-room/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="create-room/images"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-posts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
