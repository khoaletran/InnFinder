import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function AdminTabLayout() {
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
      {/* 1. Tab Tổng quan */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 2. Tab Người dùng */}
      <Tabs.Screen
        name="users/index"
        options={{
          title: 'Người dùng',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 3. Tab Bài đăng */}
      <Tabs.Screen
        name="posts/index"
        options={{
          title: 'Bài đăng',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 4. Tab Khiếu nại */}
      <Tabs.Screen
        name="complaints/index"
        options={{
          title: 'Khiếu nại',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 5. Tab Menu */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* Các màn hình con ẩn khỏi Tab Bar */}
      <Tabs.Screen name="users/[id]" options={{ href: null }} />
      <Tabs.Screen name="posts/[id]" options={{ href: null }} />
      <Tabs.Screen name="complaints/[id]" options={{ href: null }} />
      <Tabs.Screen name="transactions/index" options={{ href: null }} />
      <Tabs.Screen name="transactions/[id]" options={{ href: null }} />
      <Tabs.Screen name="reviews/index" options={{ href: null }} />
      <Tabs.Screen name="reviews/room-[id]" options={{ href: null }} />
      <Tabs.Screen name="reviews/[id]" options={{ href: null }} />
      <Tabs.Screen name="appointments/index" options={{ href: null }} />
      <Tabs.Screen name="appointments/[id]" options={{ href: null }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="statistics" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
    </Tabs>
  );
}
