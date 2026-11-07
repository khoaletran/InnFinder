import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const { user, isAuthenticated, activeMode, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <View style={{ flex: 1 }} className="items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  // 1. Quản trị viên -> Vào thẳng Admin Dashboard, không qua tenant
  if (isAuthenticated && user?.vaiTro === 'QUAN_TRI') {
    return <Redirect href="/(admin)" />;
  }

  // 2. Chủ trọ đang ở chế độ Landlord -> Vào Landlord Dashboard
  if (isAuthenticated && user?.chuTro && activeMode === 'LANDLORD') {
    return <Redirect href="/(landlord)" />;
  }

  // 3. Khách thuê / Khách vãng lai -> Vào giao diện Tenant
  return <Redirect href="/(tenant)" />;
}
