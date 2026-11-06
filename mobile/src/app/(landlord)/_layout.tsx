import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LandlordTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F766E', // Màu teal-700 chuẩn theo Mockup Customer
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color as string} />
          ),
        }}
      />

      {/* 2. Tab Phòng */}
      <Tabs.Screen
        name="my-rooms"
        options={{
          title: 'Phòng',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'business' : 'business-outline'} size={22} color={color as string} />
          ),
        }}
      />

      {/* 3. Tab Lịch hẹn */}
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Lịch hẹn',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color as string} />
          ),
        }}
      />

      {/* 4. Tab Thông báo (yêu cầu thuê & lịch mới) */}
      <Tabs.Screen
        name="rental-requests"
        options={{
          title: 'Thông báo',
          tabBarIcon: ({ color, focused }) => (
            <View className="relative">
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={22}
                color={color as string}
              />
              {/* Badge chấm đỏ thông báo như ảnh mẫu */}
              <View className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 border border-white" />
            </View>
          ),
        }}
      />

      {/* 5. Tab Tài khoản */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color as string} />
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
