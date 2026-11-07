import React, { useEffect } from 'react';
import { BackHandler, Alert, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';

export default function AdminTabsLayout() {
  // Ngăn chặn phím cứng Back trên Android thoát khỏi Admin ngoài ý muốn
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      Alert.alert('Thoát InnFinder', 'Bạn có muốn đóng ứng dụng không?', [
        { text: 'Ở lại', style: 'cancel', onPress: () => null },
        { text: 'Thoát', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

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

      {/* 2. Tab Xử lý (gom đơn chủ trọ, bài đăng, khiếu nại) */}
      <Tabs.Screen
        name="processing"
        options={{
          title: 'Xử lý',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 3. Tab Giao dịch (Ở chính giữa - chứa các yêu cầu giao dịch của người dùng) */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Giao dịch',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 4. Tab Quản lý (chứa quản lý danh mục và tìm kiếm người dùng) */}
      <Tabs.Screen
        name="management"
        options={{
          title: 'Quản lý',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* 5. Tab Tài khoản (đồng bộ với Tenant) */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
